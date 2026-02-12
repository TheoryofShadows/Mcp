import { useState, useMemo } from "react";
import { CATEGORIES, MCP_SERVERS } from "../../data";
import ServerCard from "./ServerCard";

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return MCP_SERVERS.filter((s) => {
      const matchCat =
        activeCategory === "all" || s.category === activeCategory;
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some((t) => t.includes(query));
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <section
      id="main-content"
      aria-label="MCP Server Marketplace"
      style={{
        padding: "40px var(--section-px)",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      {/* Search */}
      <div
        role="search"
        aria-label="Search MCP servers"
        style={{
          display: "flex",
          gap: "var(--space-sm)",
          marginBottom: "28px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              fontSize: "var(--font-lg)",
              pointerEvents: "none",
            }}
          >
            {"\u2315"}
          </span>
          <input
            type="search"
            className="search-input"
            placeholder="Search MCP servers\u2026"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search MCP servers"
          />
        </div>
      </div>

      {/* Categories */}
      <div
        role="toolbar"
        aria-label="Filter by category"
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "var(--space-xl)",
          overflowX: "auto",
          paddingBottom: "var(--space-xs)",
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className="category-btn"
            onClick={() => setActiveCategory(cat.id)}
            aria-selected={activeCategory === cat.id}
            aria-label={`Filter by ${cat.label}`}
          >
            <span aria-hidden="true" style={{ fontSize: "var(--font-xs)" }}>
              {cat.icon}
            </span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results count for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {filtered.length} {filtered.length === 1 ? "server" : "servers"} found
      </div>

      {/* Server grid */}
      {filtered.length > 0 ? (
        <div
          className="server-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
            gap: "var(--space-md)",
          }}
        >
          {filtered.map((server, i) => (
            <ServerCard key={server.id} server={server} index={i} />
          ))}
        </div>
      ) : (
        <div className="empty-state" role="status">
          <div className="empty-state-icon" aria-hidden="true">{"\u2315"}</div>
          <p className="empty-state-text">No MCP servers found</p>
          <p className="empty-state-hint">
            Try a different search term or category filter.
          </p>
        </div>
      )}
    </section>
  );
}
