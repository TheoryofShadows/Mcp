import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validatePriceAmount, MIN_PRICE_CENTS } from "../server/routes/servers.js";

/**
 * A destination charge bills Stripe's fee (~2.9% + 30c) to the PLATFORM, while
 * platform revenue is the 15% application fee. Below break-even every sale
 * loses money — the $1 test tool cost 18c per purchase.
 */
describe("minimum price", () => {
  it("sits at or above the real break-even point", () => {
    // 0.15g = 0.029g + 30  ->  g = 30 / 0.121 = 247.9c
    const breakEven = 30 / 0.121;
    expect(MIN_PRICE_CENTS).toBeGreaterThanOrEqual(Math.ceil(breakEven));
  });

  it("actually profits at the minimum", () => {
    const g = MIN_PRICE_CENTS;
    const platformFee = Math.round(g * 0.15);
    const stripeFee = Math.round(g * 0.029) + 30;
    expect(platformFee - stripeFee).toBeGreaterThan(0);
  });

  it("rejects the prices that lose money", () => {
    for (const cents of [1, 50, 100, 200, 247]) {
      expect(validatePriceAmount(cents)).toMatch(/start at \$3\.00/);
    }
  });

  it("accepts the minimum and above", () => {
    for (const cents of [300, 500, 1999, 99999999]) {
      expect(validatePriceAmount(cents)).toBeNull();
    }
  });

  it("still rejects zero and negatives with the clearer message", () => {
    expect(validatePriceAmount(0)).toMatch(/greater than zero/);
    expect(validatePriceAmount(-100)).toMatch(/greater than zero/);
  });

  it("tells the publisher what to do instead of just refusing", () => {
    expect(validatePriceAmount(100)).toMatch(/list it free/i);
  });

  it("explains the floor on the submit page, not just in the API", () => {
    const ui = readFileSync(new URL("../src/pages/Submit.jsx", import.meta.url), "utf8");
    expect(ui).toMatch(/Minimum \$3/);
    expect(ui).toMatch(/2\.9% \+ 30¢/);
    expect(ui).toMatch(/min="3"/);
  });
});
