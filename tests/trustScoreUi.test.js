import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/components/TrustScore.jsx", import.meta.url), "utf8");

describe("TrustScore — buyer clarity", () => {
  it("defaults the breakdown open for caution / low scores", () => {
    expect(src).toMatch(/tier === "caution"/);
    expect(src).toMatch(/score < 40/);
    expect(src).toMatch(/useState\(\s*\(\)\s*=>/);
  });

  it("surfaces a headline reason when the breakdown is collapsed", () => {
    expect(src).toMatch(/!open && headlineReason/);
    expect(src).toMatch(/topPenalty/);
  });
});
