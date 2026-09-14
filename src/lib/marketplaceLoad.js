/**
 * Marketplace discover load — honest empty vs offline demo seed.
 *
 * Live API with zero servers → real empty catalog (never inject seed).
 * API unreachable → offline/demo seed OK, but paid tools are demoted so
 * they cannot look purchasable / checkout-ready.
 */
import { sortPurchasableFirst } from "./sortPurchasableFirst.js";

export const SORT_TO_API = {
  popular: "installs",
  newest: "newest",
  rating: "rating",
  trending: "installs",
};

export function normalizeServer(s) {
  return {
    ...s,
    author_name: s.author_display_name || s.author || s.author_name,
    weekly_growth: s.weeklyGrowth ?? s.weekly_growth,
    category_id: s.category ?? s.category_id,
  };
}

/** Offline/demo seed must never look like live checkout is available. */
export function demoteSeedPaidTools(tools = []) {
  return tools.map((t) => {
    if (t?.price_type !== "paid") return t;
    return {
      ...t,
      purchasable: false,
      purchase_blocked_reason: "Unavailable",
    };
  });
}

export function filterSeedTools(
  { search = "", category = "all", priceFilter = "all", sort = "popular" } = {},
  { offline = false, seed = [] } = {}
) {
  let tools = [...seed];
  if (search) {
    const q = search.toLowerCase();
    tools = tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.tags || []).some((tag) => tag.includes(q)) ||
        (t.author_name || "").toLowerCase().includes(q)
    );
  }
  if (category && category !== "all") {
    tools = tools.filter((t) => t.category_id === category);
  }
  if (priceFilter === "free") tools = tools.filter((t) => t.price_type === "free");
  if (priceFilter === "paid") tools = tools.filter((t) => t.price_type === "paid");

  if (sort === "popular") tools.sort((a, b) => b.installs - a.installs);
  if (sort === "rating") tools.sort((a, b) => b.rating - a.rating);
  if (sort === "trending") {
    tools.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
  }
  if (sort === "newest") tools.sort((a, b) => Number(b.id) - Number(a.id));

  tools = sortPurchasableFirst(tools);
  if (offline) tools = demoteSeedPaidTools(tools);
  return tools;
}

/**
 * @param {object} filters
 * @param {(params: object) => Promise<{servers?: object[]}>} fetchServersFn
 * @param {object[]} [seed]
 * @returns {Promise<{tools: object[], mode: 'live'|'empty'|'offline'}>}
 */
export async function loadMarketplaceTools(filters, fetchServersFn, seed = []) {
  const { search, category, priceFilter, sort } = filters;
  try {
    const params = { sort: SORT_TO_API[sort] || "installs", limit: 100 };
    if (search) params.search = search;
    if (category && category !== "all") params.category = category;
    if (priceFilter && priceFilter !== "all") params.price_type = priceFilter;
    const res = await fetchServersFn(params);
    const servers = sortPurchasableFirst((res.servers || []).map(normalizeServer));
    if (servers.length) return { tools: servers, mode: "live" };
    // Reachable API, zero servers — honest empty. Do NOT inject SEED_TOOLS.
    return { tools: [], mode: "empty" };
  } catch {
    return {
      tools: filterSeedTools(filters, { offline: true, seed }),
      mode: "offline",
    };
  }
}