import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Every tool checkout failed with "Failed to create tool checkout session",
 * on two different accounts.
 *
 * signToken({ id }) in routes/auth.js puts ONLY the user id in the JWT, so
 * req.user.email is always undefined. Passing that as customer_email was still
 * wrong — the buyer's address belongs on the session, and the
 * platform-subscription route in the same file always read it from the
 * database — but it did NOT cause the failed purchases: the Stripe SDK drops
 * undefined keys before encoding, so the request bytes were identical.
 * An EMPTY string would be rejected, which is why the spread is conditional.
 */
const payments = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../server/routes/auth.js", import.meta.url), "utf8");

// Bound the slice at the next route, or these assertions read 10 unrelated
// handlers — /stripe/connect independently contains the same email query, so
// the positive assertion would pass even if it were deleted from this one.
const _start = payments.indexOf('router.post("/stripe/tool-checkout"');
const _next = payments.indexOf(String.fromCharCode(10) + "router.", _start + 1);
const toolHandler = payments.slice(_start, _next === -1 ? undefined : _next);

describe("tool checkout — buyer email", () => {
  it("confirms the JWT really does not carry an email", () => {
    // If this ever changes, the fix below is still correct but the reason moves.
    expect(auth).toMatch(/signToken\(\{ id[^}]*\}\)/);
    expect(auth).not.toMatch(/signToken\(\{[^}]*email/);
  });

  it("reads the buyer's email from the database, not from the JWT", () => {
    expect(toolHandler).toMatch(/SELECT email FROM users WHERE id = \?/);
    expect(toolHandler).toMatch(/const buyerEmail = \(buyer\?\.email \|\| ""\)\.trim\(\)/);
  });

  it("never sends customer_email straight from req.user", () => {
    // This is the exact line that broke every purchase.
    expect(toolHandler).not.toMatch(/customer_email: req\.user\.email/);
  });

  it("OMITS customer_email when there is none, rather than sending empty", () => {
    // Stripe rejects an empty string but is happy to collect the address itself.
    expect(toolHandler).toMatch(/\.\.\.\(buyerEmail \? \{ customer_email: buyerEmail \} : \{\}\)/);
  });

  it("reports buyer_has_email as INFORMATION, never as a blocker", () => {
    // A checkout succeeds without an address (Stripe collects one in-flow), so
    // listing it as a blocker would make would_succeed:false contradict the
    // handler the preflight exists to predict.
    const pre = payments.slice(payments.indexOf('router.get("/stripe/tool-checkout/preflight"'));
    expect(pre).toMatch(/buyer_has_email/);
    expect(pre).not.toMatch(/blockers\.push\([^)]*email/);
  });
});
