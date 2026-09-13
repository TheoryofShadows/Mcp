import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeStripeKey, stripeKeyProblem, stripeKeyMode } from "../server/routes/payments.js";

/**
 * A live secret key was stored with two U+000A characters *inside* it — at
 * offsets 37 and 75 of a 109-character value — because it was copied from a
 * dashboard that soft-wraps the display across three lines.
 *
 * Node will not put a newline in an Authorization header, so the HTTPS request
 * never opened a socket. Stripe's SDK surfaced that as:
 *
 *   StripeConnectionError: An error occurred with our connection to Stripe.
 *
 * which reads as a network outage. Hours went into DNS, egress filtering and
 * TLS interception on the host. Nothing was wrong with the network.
 *
 * normalizeStripeKey already existed to defend against pasted whitespace, but
 * only called .trim() — which strips the ends and leaves the middle untouched.
 * These tests pin the interior case specifically.
 */
const body = "A".repeat(99);
const GOOD = `sk_live_${body}`;

describe("normalizeStripeKey strips interior whitespace", () => {
  it("removes newlines in the MIDDLE of the key, which trim() cannot", () => {
    const wrapped = `sk_live_${body.slice(0, 29)}\n${body.slice(29, 67)}\n${body.slice(67)}`;
    expect(wrapped).toContain("\n");
    expect(wrapped.trim()).toContain("\n"); // the original bug, in one line
    expect(normalizeStripeKey(wrapped)).toBe(GOOD);
  });

  it("produces a value legal in an HTTP header", () => {
    const wrapped = `sk_live_${body.slice(0, 29)}\r\n${body.slice(29)}`;
    expect(/^[\x21-\x7e]+$/.test(normalizeStripeKey(wrapped))).toBe(true);
  });

  it.each([
    ["carriage returns", `sk_live_${body.slice(0, 40)}\r${body.slice(40)}`],
    ["tabs", `sk_live_${body.slice(0, 40)}\t${body.slice(40)}`],
    ["interior spaces", `sk_live_${body.slice(0, 40)} ${body.slice(40)}`],
  ])("removes %s", (_label, input) => {
    expect(normalizeStripeKey(input)).toBe(GOOD);
  });

  it("still strips the quotes and brackets it always handled", () => {
    expect(normalizeStripeKey(`"${GOOD}"`)).toBe(GOOD);
    expect(normalizeStripeKey(`<${GOOD}>`)).toBe(GOOD);
    expect(normalizeStripeKey(`  ${GOOD}  `)).toBe(GOOD);
  });

  it("leaves a clean key untouched", () => {
    expect(normalizeStripeKey(GOOD)).toBe(GOOD);
  });

  it("never throws on non-strings", () => {
    for (const v of [undefined, null, 42, {}, []]) {
      expect(normalizeStripeKey(v)).toBe("");
    }
  });
});

describe("stripeKeyProblem classifies what boot should say", () => {
  it("flags a key that needed repair, so the deploy log shows it", () => {
    expect(stripeKeyProblem(`sk_live_${body.slice(0, 40)}\n${body.slice(40)}`)).toBe("repaired");
  });

  it("flags a malformed key rather than letting checkout discover it", () => {
    expect(stripeKeyProblem("not-a-key")).toBe("malformed");
    expect(stripeKeyProblem("sk_live_")).toBe("malformed");
    expect(stripeKeyProblem("pk_live_" + body)).toBe("malformed"); // publishable key pasted by mistake
  });

  it("says nothing about a clean key", () => {
    expect(stripeKeyProblem(GOOD)).toBe(null);
    expect(stripeKeyProblem(`sk_test_${body}`)).toBe(null);
    expect(stripeKeyProblem("rk_live_" + body)).toBe(null); // restricted keys are valid
  });

  it("treats unset as a separate, already-handled state", () => {
    expect(stripeKeyProblem(undefined)).toBe(null);
    expect(stripeKeyProblem("")).toBe(null);
    expect(stripeKeyProblem("   ")).toBe(null);
  });
});

describe("mode detection survives a wrapped key", () => {
  it("reads live/test from a key with interior newlines", () => {
    // Before the fix this returned "unknown", silently disabling live payments.
    expect(stripeKeyMode(`sk_live_${body.slice(0, 40)}\n${body.slice(40)}`)).toBe("live");
    expect(stripeKeyMode(`sk_test_${body.slice(0, 40)}\n${body.slice(40)}`)).toBe("test");
  });
});

describe("webhook signing secret gets the same hygiene", () => {
  const hook = "whsec_" + "B".repeat(40);

  it("normalises a wrapped signing secret so genuine events still verify", () => {
    expect(normalizeStripeKey(`whsec_${"B".repeat(20)}\n${"B".repeat(20)}`)).toBe(hook);
  });

  it("is verified at the point of use, not just checked for presence", () => {
    // Every guard on this secret was `!secret` — a wrapped value passed them all
    // and then failed constructEvent on every real event. Buyers charged, no
    // sale recorded. That is quieter and worse than the API-key failure.
    const src = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");
    expect(src).toMatch(/const secret = normalizeStripeKey\(process\.env\.STRIPE_WEBHOOK_SECRET\)/);
  });

  it("warns at boot when the secret is malformed, not merely absent", () => {
    const src = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");
    expect(src).toMatch(/does not look like a signing secret/);
    expect(src).toMatch(/buyers get charged and no sale is recorded/);
  });
});
