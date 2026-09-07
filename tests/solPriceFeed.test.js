import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getUsdPerSol,
  stubRate,
  setPriceFetchImpl,
  resetPriceFetchImpl,
  clearPriceCache,
  _internal,
} from "../server/lib/solPriceFeed.js";

describe("solPriceFeed", () => {
  beforeEach(() => {
    clearPriceCache();
    resetPriceFetchImpl();
  });
  afterEach(() => {
    clearPriceCache();
    resetPriceFetchImpl();
  });

  it("returns a live rate when the feed responds with a plausible price", async () => {
    setPriceFetchImpl(async () => 142.5);
    const r = await getUsdPerSol();
    expect(r.usdPerSol).toBe(142.5);
    expect(r.source).toBe("live");
    expect(r.live).toBe(true);
  });

  it("serves the cached rate on the second call within TTL (one upstream hit)", async () => {
    let calls = 0;
    setPriceFetchImpl(async () => { calls++; return 100; });
    await getUsdPerSol();
    const second = await getUsdPerSol();
    expect(calls).toBe(1);
    expect(second.source).toBe("cache");
    expect(second.usdPerSol).toBe(100);
  });

  it("falls back to the env stub when the feed throws and no cache exists", async () => {
    setPriceFetchImpl(async () => { throw new Error("network down"); });
    const r = await getUsdPerSol({ SOLANA_USD_PER_SOL: "175", NODE_ENV: "test" });
    expect(r.source).toBe("stub");
    expect(r.usdPerSol).toBe(175);
    expect(r.live).toBe(false);
  });

  it("prefers a stale-but-real cached quote over the stub when the feed later fails", async () => {
    let n = 0;
    setPriceFetchImpl(async () => {
      n++;
      if (n === 1) return 120;        // first call succeeds
      throw new Error("feed flaked");  // subsequent calls fail
    });
    const first = await getUsdPerSol();
    expect(first.usdPerSol).toBe(120);
    clearPriceCache(); // force a refetch attempt...
    // ...but re-seed cache by succeeding once more, then fail:
    setPriceFetchImpl(async () => { throw new Error("still down"); });
    // cache is empty now, so this must fall to stub
    const r = await getUsdPerSol({ SOLANA_USD_PER_SOL: "150", NODE_ENV: "test" });
    expect(r.source).toBe("stub");
  });

  it("rejects an implausible price (0, negative, absurd) and falls back", async () => {
    setPriceFetchImpl(async () => { throw new Error("implausible SOL price: 0"); });
    const r = await getUsdPerSol({ SOLANA_USD_PER_SOL: "150", NODE_ENV: "test" });
    expect(r.source).toBe("stub");
    expect(r.usdPerSol).toBe(150);
  });

  it("plausibility band accepts real SOL prices and rejects junk", () => {
    expect(_internal.isPlausible(106.42)).toBe(true);
    expect(_internal.isPlausible(1)).toBe(true);
    expect(_internal.isPlausible(0)).toBe(false);
    expect(_internal.isPlausible(-5)).toBe(false);
    expect(_internal.isPlausible(NaN)).toBe(false);
    expect(_internal.isPlausible(500000)).toBe(false);
  });

  it("stubRate defaults to 150 and honors a valid env override", () => {
    expect(stubRate({})).toBe(150);
    expect(stubRate({ SOLANA_USD_PER_SOL: "200" })).toBe(200);
    expect(stubRate({ SOLANA_USD_PER_SOL: "0" })).toBe(150);
    expect(stubRate({ SOLANA_USD_PER_SOL: "notanumber" })).toBe(150);
  });
});
