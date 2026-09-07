/**
 * Live USD→SOL price feed for MCPX Solana Pay.
 *
 * Replaces the old fixed $150/SOL stub with a real quote so paid tools are
 * priced honestly on-chain. Design constraints (this touches real money):
 *
 *   - NEVER throws into the checkout path. Any failure — network, timeout, bad
 *     shape, absurd value — falls back to the env stub (SOLANA_USD_PER_SOL) so a
 *     price-feed outage can never take down buying.
 *   - Cached with a short TTL so we don't hammer the public API (and so a burst
 *     of buyers all price off one quote).
 *   - Sanity-bounded: a feed returning $0 or $10,000,000 is rejected as bogus
 *     rather than mispricing every tool. SOL has never been outside [1, 100000].
 *   - The *rate is locked at request time* by the caller (solana/request stores
 *     publisher_lamports/platform_lamports), so a price move mid-checkout never
 *     breaks an in-flight purchase — this module only supplies the rate.
 *
 * Source: CoinGecko simple price API (no key required for low volume).
 */

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

// Cache one quote for this long. Short enough to track the market, long enough
// that a wave of buyers shares a single upstream call.
const CACHE_TTL_MS = 60_000;

// Reject quotes outside this band as obviously bogus (feed error, wrong asset).
// SOL's all-time range sits comfortably inside this; the point is to catch $0,
// negative, NaN, or a decimal-place / wrong-symbol mistake — not to cap price.
const MIN_PLAUSIBLE_USD = 1;
const MAX_PLAUSIBLE_USD = 100_000;

const FETCH_TIMEOUT_MS = 4_000;

let _cache = { usdPerSol: null, at: 0, source: null };

/** The documented stub rate — the floor everything falls back to. */
export function stubRate(env = process.env) {
  const n = Number(env.SOLANA_USD_PER_SOL);
  return Number.isFinite(n) && n > 0 ? n : 150;
}

function isPlausible(n) {
  return Number.isFinite(n) && n >= MIN_PLAUSIBLE_USD && n <= MAX_PLAUSIBLE_USD;
}

/** Test seam — inject a fake fetcher so tests never hit the network. */
let _fetchImpl = null;
export function setPriceFetchImpl(fn) {
  _fetchImpl = fn;
}
export function resetPriceFetchImpl() {
  _fetchImpl = null;
}

/** Clear the cache (tests, or a manual refresh). */
export function clearPriceCache() {
  _cache = { usdPerSol: null, at: 0, source: null };
}

async function fetchLiveRate() {
  if (_fetchImpl) return _fetchImpl();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(COINGECKO_URL, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`price feed HTTP ${res.status}`);
    const json = await res.json();
    const usd = Number(json?.solana?.usd);
    if (!isPlausible(usd)) throw new Error(`implausible SOL price: ${usd}`);
    return usd;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Get the current USD→SOL rate and where it came from.
 * Always resolves — falls back to the stub on any failure.
 * @returns {Promise<{ usdPerSol:number, source:"live"|"cache"|"stub", live:boolean }>}
 */
export async function getUsdPerSol(env = process.env) {
  const now = Date.now();
  if (_cache.usdPerSol && now - _cache.at < CACHE_TTL_MS) {
    return { usdPerSol: _cache.usdPerSol, source: "cache", live: true };
  }

  try {
    const usd = await fetchLiveRate();
    _cache = { usdPerSol: usd, at: now, source: "live" };
    return { usdPerSol: usd, source: "live", live: true };
  } catch (err) {
    // Serve a stale-but-real quote before falling all the way back to the stub:
    // a 2-minute-old real price beats a hardcoded guess.
    if (_cache.usdPerSol) {
      return { usdPerSol: _cache.usdPerSol, source: "cache", live: true };
    }
    if (process.env.NODE_ENV !== "test") {
      console.warn(`[sol-price] live feed failed, using stub: ${err.message}`);
    }
    return { usdPerSol: stubRate(env), source: "stub", live: false };
  }
}

export const _internal = { COINGECKO_URL, CACHE_TTL_MS, isPlausible };
