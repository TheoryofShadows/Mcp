import { useState, useCallback } from "react";
import { useServers } from "../../hooks/useServers";
import { useCategories } from "../../hooks/useCategories";
import ServerCard from "./ServerCard";

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState(null);

  const { categories } = useCategories();
  const { servers, pagination, loading, error } = useServers({
    category: activeCategory,
    search: debouncedSearch,
  });

  const handleSearch = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => setDebouncedSearch(val), 300));
  }, [debounceTimer]);

  return (
    <section
      id="main-content"
      aria-label="MCP Server Marketplace"
      style={{ padding: "40px var(--section-px)", maxWidth: "1200px", margin: "0 auto" }}
    >
      {/* Search */}
      <div
        role="search"
        aria-label="Search MCP servers"
        style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "28px", alignItems: "center" }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <span
            aria-hidden="true"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "var(--font-lg)", pointerEvents: "none" }}
          >
            {"\u2315"}
          </span>
          <input
            type="search"
            className="search-input"
            placeholder="Search MCP servers\u2026"
            value={searchQuery}
            onChange={handleSearch}
            aria-label="Search MCP servers"
          />
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div
          role="toolbar"
          aria-label="Filter by category"
          style={{ display: "flex", gap: "6px", marginBottom: "var(--space-xl)", overflowX: "auto", paddingBottom: "var(--space-xs)" }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="category-btn"
              onClick={() => setActiveCategory(cat.id)}
              aria-selected={activeCategory === cat.id}
              aria-label={`Filter by ${cat.label} (${cat.count})`}
            >
              <span aria-hidden="true" style={{ fontSize: "var(--font-xs)" }}>{cat.icon}</span>
              {cat.label}
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {pagination ? `${pagination.total} servers found` : "Loading..."}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "var(--space-2xl)", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>
          Loading servers...
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="empty-state" role="alert">
          <div className="empty-state-icon" aria-hidden="true">{"\u26A0"}</div>
          <p className="empty-state-text">Failed to load servers</p>
          <p className="empty-state-hint">{error}</p>
        </div>
      )}

      {/* Server grid */}
      {!loading && !error && servers.length > 0 && (
        <div
          className="server-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))", gap: "var(--space-md)" }}
        >
          {servers.map((server, i) => (
            <ServerCard key={server.id} server={server} index={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && servers.length === 0 && (
        <div className="empty-state" role="status">
          <div className="empty-state-icon" aria-hidden="true">{"\u2315"}</div>
          <p className="empty-state-text">No MCP servers found</p>
          <p className="empty-state-hint">Try a different search term or category filter.</p>
        </div>
      )}

      {/* Pagination info */}
      {pagination && pagination.total > 0 && (
        <div style={{ textAlign: "center", marginTop: "var(--space-xl)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
          Showing {servers.length} of {pagination.total} servers
        </div>
      )}
    </section>
  );
}
