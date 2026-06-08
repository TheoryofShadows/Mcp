import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import ToolCard from "../components/ToolCard";
import { SEED_TOOLS, SEED_CATEGORIES } from "../data/seed";
import { fetchServers } from "../api/client";

// Map the API's server shape onto the fields ToolCard expects (which originate
// from the legacy seed shape). Keeps the card component untouched.
function normalize(s) {
  return {
    ...s,
    author_name: s.author_display_name || s.author || s.author_name,
    weekly_growth: s.weeklyGrowth ?? s.weekly_growth,
    category_id: s.category ?? s.category_id,
  };
}

// API sort keys differ from the UI's labels.
const SORT_TO_API = { popular: "installs", newest: "newest", rating: "rating", trending: "installs" };

const SORT_OPTIONS = [
  { value: "popular",  label: "Most Popular" },
  { value: "newest",   label: "Newest" },
  { value: "rating",   label: "Top Rated" },
  { value: "trending", label: "Trending" },
];

function filterSeedTools({ search, category, priceFilter, sort }) {
  let tools = [...SEED_TOOLS];
  if (search) {
    const q = search.toLowerCase();
    tools = tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q)) ||
        t.author_name.toLowerCase().includes(q)
    );
  }
  if (category && category !== "all") {
    tools = tools.filter((t) => t.category_id === category);
  }
  if (priceFilter === "free") tools = tools.filter((t) => t.price_type === "free");
  if (priceFilter === "paid") tools = tools.filter((t) => t.price_type === "paid");

  if (sort === "popular")  tools.sort((a, b) => b.installs - a.installs);
  if (sort === "rating")   tools.sort((a, b) => b.rating - a.rating);
  if (sort === "trending") tools.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
  // newest: already ordered by id desc in seed
  if (sort === "newest")   tools.sort((a, b) => Number(b.id) - Number(a.id));

  return tools;
}

async function loadTools({ search, category, priceFilter, sort }) {
  try {
    const params = { sort: SORT_TO_API[sort] || "installs", limit: 100 };
    if (search) params.search = search;
    if (category && category !== "all") params.category = category;
    if (priceFilter !== "all") params.price_type = priceFilter;
    const res = await fetchServers(params);
    const servers = (res.servers || []).map(normalize);
    // If the API is reachable but empty, fall back to seed so the page is never blank.
    return servers.length ? servers : filterSeedTools({ search, category, priceFilter, sort });
  } catch {
    // API unreachable (e.g. static-only deploy) — degrade gracefully to seed data.
    return filterSeedTools({ search, category, priceFilter, sort });
  }
}

const DISPLAY_CATEGORIES = SEED_CATEGORIES;

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const initQ    = searchParams.get("q") || "";
  const initCat  = searchParams.get("category") || "all";
  const initSort = searchParams.get("sort") || "popular";
  const initPrice = searchParams.get("price") || "all";

  const [search, setSearch]       = useState(initQ);
  const [debouncedQ, setDebouncedQ] = useState(initQ);
  const [category, setCategory]   = useState(initCat);
  const [sort, setSort]           = useState(initSort);
  const [priceFilter, setPriceFilter] = useState(initPrice);

  const debounceRef = useRef(null);

  // Sync state → URL
  useEffect(() => {
    const p = {};
    if (debouncedQ)  p.q        = debouncedQ;
    if (category !== "all")  p.category  = category;
    if (sort !== "popular")  p.sort      = sort;
    if (priceFilter !== "all") p.price  = priceFilter;
    setSearchParams(p, { replace: true });
  }, [debouncedQ, category, sort, priceFilter, setSearchParams]);

  // Load tools
  useEffect(() => {
    setLoading(true);
    loadTools({ search: debouncedQ, category, priceFilter, sort }).then((data) => {
      setTools(data);
      setLoading(false);
    });
  }, [debouncedQ, category, priceFilter, sort]);

  const handleSearch = useCallback((e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(val), 280);
  }, []);

  const clearFilters = () => {
    setSearch("");
    setDebouncedQ("");
    setCategory("all");
    setSort("popular");
    setPriceFilter("all");
  };

  const hasActiveFilters = debouncedQ || category !== "all" || priceFilter !== "all" || sort !== "popular";

  return (
    <main id="main-content" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "30px",
            letterSpacing: "-0.5px",
            marginBottom: "6px",
          }}
        >
          MCP Marketplace
        </h1>
        <p role="status" aria-live="polite" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          {loading ? "Loading…" : `${tools.length} tool${tools.length !== 1 ? "s" : ""} available`}
        </p>
      </div>

      {/* Search + filter bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
        role="search"
      >
        <div style={{ position: "relative", flex: "1 1 280px", minWidth: "200px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            value={search}
            onChange={handleSearch}
            placeholder="Search tools…"
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              background: "#111",
              border: "1px solid #2a2a2a",
              borderRadius: "10px",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
            aria-label="Search MCP tools"
          />
        </div>

        {/* Price filter */}
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {["all", "free", "paid"].map((p) => (
            <button
              key={p}
              onClick={() => setPriceFilter(p)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: priceFilter === p ? "rgba(99,102,241,0.5)" : "#2a2a2a",
                background: priceFilter === p ? "rgba(99,102,241,0.12)" : "#111",
                color: priceFilter === p ? "#a5b4fc" : "var(--text-secondary)",
                fontSize: "12px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s",
              }}
            >
              {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#111",
            border: "1px solid #2a2a2a",
            borderRadius: "8px",
            color: "var(--text-secondary)",
            fontSize: "13px",
            fontFamily: "var(--font-body)",
            cursor: "pointer",
            outline: "none",
          }}
          aria-label="Sort tools"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "8px 12px",
              background: "transparent",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "8px",
              color: "#f87171",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Category pills */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          overflowX: "auto",
          paddingBottom: "4px",
          marginBottom: "28px",
          scrollbarWidth: "none",
        }}
        role="toolbar"
        aria-label="Filter by category"
      >
        {DISPLAY_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            aria-selected={category === cat.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "100px",
              border: "1px solid",
              borderColor: category === cat.id ? "rgba(99,102,241,0.5)" : "#2a2a2a",
              background: category === cat.id ? "rgba(99,102,241,0.12)" : "#111",
              color: category === cat.id ? "#a5b4fc" : "var(--text-secondary)",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <span aria-hidden="true">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: "240px",
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: "14px",
                animation: "pulse-skeleton 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 24px" }}>
          <div
            style={{
              fontSize: "40px",
              marginBottom: "16px",
            }}
            aria-hidden="true"
          >
            ◎
          </div>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "20px",
              marginBottom: "8px",
            }}
          >
            {hasActiveFilters ? "No tools found" : "No tools yet"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "20px" }}>
            {hasActiveFilters
              ? "Try adjusting your search or filters"
              : "Be the first to publish an MCP server to the marketplace."}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              style={{
                padding: "10px 20px",
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "8px",
                color: "#a5b4fc",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Clear filters
            </button>
          ) : (
            <a
              href="/submit"
              style={{
                display: "inline-block",
                padding: "10px 20px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                borderRadius: "8px",
                color: "#fff",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Be the first to publish →
            </a>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          {tools.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
