import { describe, it, expect } from "vitest";
import { hasSignal, withSignal, catalogLine } from "../src/lib/statPresentation.js";

const ITEMS = [
  { key: "total_tools" },
  { key: "total_installs" },
  { key: "total_revenue" },
  { key: "total_developers" },
];

describe("statPresentation — honest early-stage stats", () => {
  it("suppresses a metric that has not started yet", () => {
    expect(hasSignal("total_revenue", 0)).toBe(false);
    expect(hasSignal("total_installs", 0)).toBe(false);
  });

  it("always shows the catalog size, even when small", () => {
    // A small reviewed catalog is the pitch, not something to hide.
    expect(hasSignal("total_tools", 0)).toBe(true);
    expect(hasSignal("total_tools", 37)).toBe(true);
  });

  it("shows any metric that has real activity", () => {
    expect(hasSignal("total_revenue", 1)).toBe(true);
    expect(hasSignal("total_installs", 1200)).toBe(true);
  });

  it("hides $0 payouts and 0 installs on a fresh marketplace", () => {
    // These are the live values as of launch: 37 servers, 1 install, $0 revenue.
    const stats = {
      total_tools: 37,
      total_installs: 0,
      total_revenue: 0,
      total_developers: 25,
    };
    const keys = withSignal(ITEMS, stats).map((i) => i.key);
    expect(keys).toEqual(["total_tools", "total_developers"]);
    expect(keys).not.toContain("total_revenue");
  });

  it("shows everything once the marketplace is actually running", () => {
    const stats = {
      total_tools: 120,
      total_installs: 8400,
      total_revenue: 2300,
      total_developers: 64,
    };
    expect(withSignal(ITEMS, stats)).toHaveLength(4);
  });

  it("never collapses the bar to nothing", () => {
    expect(withSignal(ITEMS, {}).length).toBeGreaterThan(0);
    expect(withSignal(ITEMS, null).length).toBeGreaterThan(0);
  });

  it("frames the catalog as curated, using the real count", () => {
    const line = catalogLine(37);
    expect(line).toContain("37 reviewed servers");
    expect(line).toMatch(/not 20,000 dumped repos/);
  });

  it("does not invent a count when there is none", () => {
    expect(catalogLine(0)).not.toMatch(/\d/);
    expect(catalogLine(undefined)).not.toMatch(/^\d/);
  });

  it("never inflates a real number", () => {
    // Whatever we render must be the value we were given.
    for (const n of [1, 37, 4210]) {
      expect(catalogLine(n)).toContain(n.toLocaleString());
    }
  });
});
