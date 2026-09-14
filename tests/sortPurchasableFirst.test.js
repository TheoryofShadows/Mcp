import { describe, it, expect } from "vitest";
import { sortPurchasableFirst } from "../src/lib/sortPurchasableFirst.js";

describe("sortPurchasableFirst", () => {
  it("puts purchasable paid tools before blocked paid tools", () => {
    const input = [
      { slug: "firecrawl-mcp", purchasable: false, installs: 900 },
      { slug: "railway-mcp", purchasable: true, installs: 100 },
      { slug: "exa-search-mcp", purchasable: false, installs: 800 },
      { slug: "json-tools-mcp", purchasable: true, installs: 50 },
    ];
    expect(sortPurchasableFirst(input).map((t) => t.slug)).toEqual([
      "railway-mcp",
      "json-tools-mcp",
      "firecrawl-mcp",
      "exa-search-mcp",
    ]);
  });

  it("preserves secondary order among peers", () => {
    const input = [
      { slug: "a", purchasable: true },
      { slug: "b", purchasable: false },
      { slug: "c", purchasable: true },
      { slug: "d", purchasable: false },
      { slug: "e", purchasable: undefined },
    ];
    expect(sortPurchasableFirst(input).map((t) => t.slug)).toEqual([
      "a",
      "c",
      "e",
      "b",
      "d",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [
      { slug: "blocked", purchasable: false },
      { slug: "ok", purchasable: true },
    ];
    const copy = [...input];
    sortPurchasableFirst(input);
    expect(input).toEqual(copy);
  });
});
