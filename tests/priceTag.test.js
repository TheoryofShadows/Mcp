import { describe, it, expect } from "vitest";
import { formatPriceLabel, formatPriceTagLabel } from "../src/lib/formatPrice.js";

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
    // Production Firecrawl / Exa style: cents only, no price_label on some clients.
    // The generated fallback carries NO interval — a listing is one-time unless
    // its publisher chose monthly, and that choice lives in price_label.
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 100 })
    ).toBe("$1");
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 1600 })
    ).toBe("$16");
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 1000 })
    ).toBe("$10");
  });

  it("formats fractional dollars from cents", () => {
    expect(
      formatPriceLabel({ price_type: "paid", price_amount: 99 })
    ).toBe("$0.99");
  });

  it("still echoes a stored recurring label verbatim", () => {
    // A publisher who chose monthly billing has "/mo" saved in price_label;
    // the formatter must not strip it.
    expect(
      formatPriceLabel({ price_type: "paid", price_label: "$16/mo", price_amount: 1600 })
    ).toBe("$16/mo");
  });
});

describe("formatPriceTagLabel", () => {
  it("shows Unavailable for paid tools that are not purchasable", () => {
    expect(
      formatPriceTagLabel({
        price_type: "paid",
        price_amount: 1600,
        price_label: "$16/mo",
        purchasable: false,
      })
    ).toBe("Unavailable");
  });

  it("keeps normal paid label when purchasable", () => {
    expect(
      formatPriceTagLabel({
        price_type: "paid",
        price_label: "$16/mo",
        purchasable: true,
      })
    ).toBe("$16/mo");
  });
});
