import { describe, it, expect } from "vitest";
import { periodEndISO } from "../server/routes/payments.js";

// 2025-01-01T00:00:00Z
const TS = 1735689600;
const ISO = new Date(TS * 1000).toISOString();

describe("payments / periodEndISO (Basil+ subscription period)", () => {
  it("reads the item-level current_period_end (Basil+ shape)", () => {
    const sub = { items: { data: [{ current_period_end: TS }] } };
    expect(periodEndISO(sub)).toBe(ISO);
  });

  it("falls back to the legacy top-level field (pre-Basil webhook payload)", () => {
    const sub = { current_period_end: TS };
    expect(periodEndISO(sub)).toBe(ISO);
  });

  it("prefers the item-level field when both are present", () => {
    const sub = {
      current_period_end: 1,
      items: { data: [{ current_period_end: TS }] },
    };
    expect(periodEndISO(sub)).toBe(ISO);
  });

  it("returns null (never throws) when the value is missing", () => {
    expect(periodEndISO({ items: { data: [{}] } })).toBeNull();
    expect(periodEndISO({ items: { data: [] } })).toBeNull();
    expect(periodEndISO({})).toBeNull();
    expect(periodEndISO(null)).toBeNull();
    expect(periodEndISO(undefined)).toBeNull();
  });
});
