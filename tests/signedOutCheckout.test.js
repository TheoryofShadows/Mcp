import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The tool page showed a full-price "Buy" button to signed-out visitors and,
 * when pressed, reported "Failed to create tool checkout session" — the same
 * message as a real payment failure. The console gave it away:
 *
 *     /api/auth/me:1  Failed to load resource: 401
 *
 * A logged-out buyer cannot check out (the API requires a JWT), so the button
 * could only ever fail, and the error sent them hunting a payment bug.
 */
const src = readFileSync(new URL("../src/pages/ToolDetail.jsx", import.meta.url), "utf8");

describe("signed-out checkout", () => {
  it("knows whether the visitor is signed in", () => {
    expect(src).toMatch(/const \{ user \} = useAuth\(\)/);
  });

  it("sends a signed-out visitor to log in instead of into checkout", () => {
    expect(src).toMatch(/if \(!user\) \{[\s\S]{0,200}navigate\(`\/login\?next=/);
  });

  it("labels the button honestly when signed out", () => {
    expect(src).toMatch(/Sign in to buy/);
  });

  it("returns the buyer to this tool after login", () => {
    expect(src).toMatch(/next=\$\{encodeURIComponent\(`\/tool\/\$\{tool\.slug\}`\)\}/);
  });

  it("does not report an expired session as a payment failure", () => {
    expect(src).toMatch(/err\.status === 401/);
    expect(src).toMatch(/You're signed out — sign in and try again/);
  });

  it("offers a diagnosis when checkout genuinely fails", () => {
    expect(src).toMatch(/Why can't I buy this\?/);
    expect(src).toMatch(/toolCheckoutPreflight\(tool\.slug\)/);
  });
});
