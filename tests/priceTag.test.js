import { describe, it, expect } from "vitest";
import { formatPriceLabel } from "../src/lib/formatPrice.js";

describe("formatPriceLabel", () => {
  it("returns Free for free tools", () => {
    expect(formatPriceLabel({ price_type: "free", price_amount: 0 })).toBe("Free");
  });

  it("prefers API human price over cents", () => {
    expect(
      formatPriceLabel({
        price_type: "paid",
        price: "$1/mo",
        price_amount: 100,
      })
    ).toBe("$1/mo");
  });

  it("prefers price_label when price is absent", () => {
    expect(
      formatPriceLabel({
        price_type: "paid",
        price_label: "$16/mo",
        price_amount: 1600,
      })
    ).toBe("$16/mo");
  });

  it("never treats cents as dollars when falling back to price_amount", () => {
    // Production Firecrawl / Exa style: cents only, no price_label on some clients
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 100 })
    ).toBe("$1/mo");
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 1600 })
    ).toBe("$16/mo");
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 1000 })
    ).toBe("$10/mo");
  });

  it("formats fractional dollars from cents", () => {
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 99 })
    ).toBe("$0.99/mo");
  });
});
