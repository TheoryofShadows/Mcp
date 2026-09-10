import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Every tool checkout failed with "Failed to create tool checkout session",
 * on two different accounts.
 *
 * Cause: signToken({ id }) in routes/auth.js puts ONLY the user id in the JWT,
 * so req.user.email is always undefined. tool-checkout passed that straight to
 * Stripe as customer_email, and Stripe rejects an undefined/empty address.
 *
 * The platform-subscription route in the same file had always read the address
 * from the database — the tool route just never did.
 */
const payments = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../server/routes/auth.js", import.meta.url), "utf8");

const toolHandler = payments.slice(payments.indexOf('router.post("/stripe/tool-checkout"'));

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

  it("reports a missing buyer email in the preflight", () => {
    const pre = payments.slice(payments.indexOf('router.get("/stripe/tool-checkout/preflight"'));
    expect(pre).toMatch(/buyer_has_email/);
    expect(pre).toMatch(/no email address on file/);
  });
});
