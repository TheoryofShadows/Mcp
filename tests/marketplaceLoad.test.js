import { describe, it, expect, vi } from "vitest";
import {
  demoteSeedPaidTools,
  filterSeedTools,
  loadMarketplaceTools,
} from "../src/lib/marketplaceLoad.js";

const SEED = [
  {
    id: "1",
    slug: "free-tool",
    name: "Free Tool",
    description: "A free sample",
    author_name: "alice",
    category_id: "dev",
    tags: ["dev"],
    price_type: "free",
    purchasable: true,
    installs: 10,
    rating: 4.5,
    trending: false,
  },
  {
    id: "2",
    slug: "paid-fake",
    name: "Paid Fake",
    description: "Looks buyable but must not be",
    author_name: "bob",
    category_id: "dev",
    tags: ["paid"],
    price_type: "paid",
    purchasable: true, // dishonest seed flag — offline path must demote
    price_amount: 9,
    installs: 99,
    rating: 5,
    trending: true,
  },
];

describe("marketplaceLoad — seed-fallback honesty", () => {
  it("demotes paid seed tools to purchasable:false / Unavailable", () => {
    const out = demoteSeedPaidTools(SEED);
    const paid = out.find((t) => t.slug === "paid-fake");
    expect(paid.purchasable).toBe(false);
    expect(paid.purchase_blocked_reason).toBe("Unavailable");
    expect(out.find((t) => t.slug === "free-tool").purchasable).toBe(true);
  });

  it("offline filterSeedTools demotes paid tools", () => {
    const tools = filterSeedTools(
      { search: "", category: "all", priceFilter: "all", sort: "popular" },
      { offline: true, seed: SEED }
    );
    expect(tools.find((t) => t.slug === "paid-fake").purchasable).toBe(false);
    expect(tools.find((t) => t.slug === "paid-fake").purchase_blocked_reason).toBe(
      "Unavailable"
    );
  });

  it("reachable API with zero servers returns honest empty (no seed inject)", async () => {
    const fetchServers = vi.fn().mockResolvedValue({ servers: [] });
    const result = await loadMarketplaceTools(
      { search: "", category: "all", priceFilter: "all", sort: "popular" },
      fetchServers,
      SEED
    );
    expect(result.mode).toBe("empty");
    expect(result.tools).toEqual([]);
    expect(fetchServers).toHaveBeenCalledOnce();
  });

  it("reachable API with servers sorts purchasable-first and mode=live", async () => {
    const fetchServers = vi.fn().mockResolvedValue({
      servers: [
        { id: "a", slug: "blocked", purchasable: false, author_display_name: "x" },
        { id: "b", slug: "ready", purchasable: true, author_display_name: "y" },
      ],
    });
    const result = await loadMarketplaceTools(
      { search: "", category: "all", priceFilter: "all", sort: "popular" },
      fetchServers,
      SEED
    );
    expect(result.mode).toBe("live");
    expect(result.tools.map((t) => t.slug)).toEqual(["ready", "blocked"]);
    expect(result.tools[0].author_name).toBe("y");
  });

  it("unreachable API falls back to offline demo seed with demoted paid", async () => {
    const fetchServers = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await loadMarketplaceTools(
      { search: "", category: "all", priceFilter: "all", sort: "popular" },
      fetchServers,
      SEED
    );
    expect(result.mode).toBe("offline");
    expect(result.tools).toHaveLength(2);
    expect(result.tools.find((t) => t.slug === "paid-fake").purchasable).toBe(false);
    expect(result.tools.find((t) => t.slug === "paid-fake").purchase_blocked_reason).toBe(
      "Unavailable"
    );
  });
});

describe("Marketplace.jsx — offline banner wiring", () => {
  it("shows an offline/demo banner and uses loadMarketplaceTools", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../src/pages/Marketplace.jsx", import.meta.url), "utf8");
    expect(src).toMatch(/loadMarketplaceTools/);
    expect(src).toMatch(/marketplace-offline-banner/);
    expect(src).toMatch(/Offline demo catalog/);
    expect(src).toMatch(/Live checkout is unavailable/);
    // Must not inject seed on empty live responses (logic lives in marketplaceLoad).
    expect(src).not.toMatch(/servers\.length \? servers : filterSeedTools/);
  });
});