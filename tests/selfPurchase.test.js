import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Buying your own tool cannot work: a Stripe Connect destination charge may not
 * pay the account that is making the charge. Stripe rejects the session, which
 * surfaced to the owner as a bare "Failed to create tool checkout session" with
 * no way to tell what went wrong.
 */
const src = readFileSync(new URL("../server/routes/payments.js", import.meta.url), "utf8");

describe("tool checkout — self purchase and error clarity", () => {
  it("refuses a purchase of your own tool before calling Stripe", () => {
    expect(src).toMatch(/server\.author_id === req\.user\.id/);
    expect(src).toMatch(/This is your own tool/);
  });

  it("checks self-purchase AFTER ownership and onboarding, before Stripe", () => {
    // Scope to the tool-checkout handler: there is an earlier
    // stripe.checkout.sessions.create in the platform-subscription route.
    const handler = src.slice(src.indexOf('router.post("/stripe/tool-checkout"'));
    const owned = handler.indexOf("hasPurchased(server.id, req.user.id)");
    const self = handler.indexOf("server.author_id === req.user.id");
    const stripeCall = handler.indexOf("stripe.checkout.sessions.create");
    expect(owned).toBeGreaterThan(-1);
    expect(self).toBeGreaterThan(owned);
    expect(stripeCall).toBeGreaterThan(-1);
    expect(self).toBeLessThan(stripeCall);
  });

  it("returns 400, not 500 — this is a bad request, not a server fault", () => {
    expect(src).toMatch(/author_id === req\.user\.id\)\s*\{\s*return res\.status\(400\)/);
  });

  it("surfaces Stripe's own reason instead of swallowing it", () => {
    expect(src).toMatch(/Stripe rejected this checkout: \$\{err\.message\}/);
  });

  it("only forwards Stripe error types written for end users", () => {
    // Never leak an arbitrary internal error message to the client.
    expect(src).toMatch(/StripeInvalidRequestError/);
    expect(src).toMatch(/StripeCardError/);
    expect(src).toMatch(/: "Failed to create tool checkout session"/);
  });

  it("still logs the real error server-side for debugging", () => {
    expect(src).toMatch(/console\.error\("\[stripe\] tool-checkout error:", err\.message\)/);
  });
});
