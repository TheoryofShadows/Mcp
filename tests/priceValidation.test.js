import { describe, it, expect } from "vitest";
import { validatePriceAmount, MAX_PRICE_CENTS } from "../server/routes/servers.js";

// price_amount becomes a Stripe unit_amount and drives the 15%/85% split. Stripe
// rejects nonsense eventually, but only after the value has been stored and
// shown to buyers as a real price — so it has to be rejected at the door.
describe("validatePriceAmount", () => {
  it("accepts a normal price in cents", () => {
    expect(validatePriceAmount(1600)).toBeNull();
  });

  it("accepts the maximum Stripe allows", () => {
    expect(validatePriceAmount(MAX_PRICE_CENTS)).toBeNull();
  });

  it("rejects a negative price — would invert the platform fee", () => {
    expect(validatePriceAmount(-5000)).toMatch(/greater than zero/i);
  });

  it("rejects zero on a paid tool", () => {
    expect(validatePriceAmount(0)).toMatch(/greater than zero/i);
  });

  it("rejects fractional cents", () => {
    expect(validatePriceAmount(1.5)).toMatch(/whole number/i);
  });

  it("rejects a value above Stripe's cap", () => {
    expect(validatePriceAmount(MAX_PRICE_CENTS + 1)).toMatch(/999,999/);
  });

  it("rejects non-numeric junk", () => {
    expect(validatePriceAmount("free")).toMatch(/number/i);
    expect(validatePriceAmount(NaN)).toMatch(/number/i);
    expect(validatePriceAmount(Infinity)).toMatch(/number/i);
  });

  it("rejects a missing price on a paid tool", () => {
    expect(validatePriceAmount(undefined)).toMatch(/need a price/i);
    expect(validatePriceAmount(null)).toMatch(/need a price/i);
  });
});
