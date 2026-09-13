import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The preflight route exists because a failed checkout was undiagnosable: one
 * opaque string to the client, and the real Stripe error only in a server log
 * that is unreachable on a hosted deploy.
 *
 * It reports on someone else's Connect account, so what it exposes matters.
 */
const src = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");
// Bound at the NEXT route rather than a named one: pinning the end to
// `/stripe/config` broke the moment `/stripe/health` was inserted between
// them, and the slice silently grew to cover an unrelated handler.
const route = src.slice(src.indexOf('router.get("/stripe/tool-checkout/preflight"'));
const nextRoute = route.indexOf("\nrouter.", 1);
const body = route.slice(0, nextRoute === -1 ? undefined : nextRoute);

describe("checkout preflight", () => {
  it("requires authentication", () => {
    expect(src).toMatch(/router\.get\("\/stripe\/tool-checkout\/preflight", requireAuth/);
  });

  it("never returns a full Connect account id", () => {
    // Truncated to a prefix — enough to identify in a support thread, not
    // enough to use against the account.
    expect(body).toMatch(/slice\(0, 8\)/);
    // The id only ever reaches the response through the truncating template.
    const emissions = body.match(/stripe_account_id\)\.slice\(0, 8\)/g) || [];
    expect(emissions.length).toBe(1);
  });

  it("never exposes secret keys or tokens", () => {
    expect(body).not.toMatch(/STRIPE_SECRET_KEY|sk_live|sk_test|webhook_secret/);
  });

  it("creates no checkout session and charges nothing", () => {
    expect(body).not.toMatch(/checkout\.sessions\.create/);
    expect(body).not.toMatch(/paymentIntents\.create/);
  });

  it("reports the self-purchase case that blocked the owner", () => {
    expect(body).toMatch(/is_your_own_tool/);
    expect(body).toMatch(/Stripe cannot pay your own account/);
  });

  it("asks Stripe for LIVE readiness, not just our stored flag", () => {
    // stripe_onboarding_done is only reconciled when the publisher visits
    // /connect, so it can be stale at checkout time.
    expect(body).toMatch(/stripe\.accounts\.retrieve\(server\.stripe_account_id\)/);
    expect(body).toMatch(/payoutReadiness\(live\)/);
    expect(body).toMatch(/charges_enabled/);
  });

  it("caps how many requirement strings it echoes back", () => {
    expect(body).toMatch(/currently_due \|\| \[\]\)\.slice\(0, 8\)/);
  });

  it("summarises blockers in plain language", () => {
    expect(body).toMatch(/would_succeed: blockers\.length === 0/);
  });
});
