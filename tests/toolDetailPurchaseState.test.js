import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Bugs found by buying a real tool on production (2026-09-10):
 *
 *  1. A one-time listing said "per month · cancel anytime".
 *  2. A tool the buyer ALREADY OWNED still showed a "Subscribe — $1" button.
 *     The server returns { already_purchased: true, checkout_url: null } for
 *     those, so pressing it could only ever say "Redirecting…" and then stop.
 *  3. The button said "Subscribe" for a single charge.
 *  4. A response with neither a redirect nor ownership failed silently.
 */
const src = readFileSync(new URL("../src/pages/ToolDetail.jsx", import.meta.url), "utf8");

describe("ToolDetail — purchase state", () => {
  it("only says 'per month' when the listing is actually monthly", () => {
    expect(src).toMatch(/billing_period === "monthly"[\s\S]{0,120}per month · cancel anytime/);
    expect(src).toMatch(/one-time purchase · yours forever/);
  });

  it("never renders a buy button to someone who already owns the tool", () => {
    // The owned branch must come FIRST, before purchaseBlocked and the buy button.
    expect(src).toMatch(/\{isPaid && canInstall \? \(/);
    expect(src).toMatch(/Purchased — go to install/);
    const owned = src.indexOf("isPaid && canInstall ?");
    const blocked = src.indexOf("purchaseBlocked ? (");
    expect(owned).toBeGreaterThan(-1);
    expect(owned).toBeLessThan(blocked);
  });

  it("says Buy for a one-time charge and Subscribe only for monthly", () => {
    expect(src).toMatch(/billing_period === "monthly" \? "Subscribe" : "Buy"/);
  });

  it("helper copy says Buy once for one-time and Subscribe only for monthly", () => {
    expect(src).toMatch(/billing_period === "monthly"[\s\S]{0,80}Subscribe with Stripe \(primary\)/);
    expect(src).toMatch(/Buy once with Stripe \(primary\)/);
  });

  it("does not leave the button stuck on a redirect that never happens", () => {
    // "Redirecting…" promised navigation that could not occur for an owned
    // tool. Check the rendered label specifically — the word still appears in
    // a code comment explaining why it was removed.
    expect(src).not.toMatch(/checkoutLoading \? "Redirecting…"/);
    expect(src).toMatch(/"Opening Stripe…"/);
  });

  it("surfaces an error when no checkout link comes back", () => {
    expect(src).toMatch(/else if \(result !== null\)/);
    expect(src).toMatch(/didn't return a checkout link/);
  });
});
