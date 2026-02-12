import { useState } from "react";
import { CATEGORIES, MCP_SERVERS } from "../../data";
import ServerCard from "./ServerCard";

export default function Marketplace() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = MCP_SERVERS.filter((s) => {
    const matchCat =
      activeCategory === "all" || s.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <section
      style={{ padding: "40px 32px", maxWidth: "1200px", margin: "0 auto" }}
    >
      {/* Search */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "28px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              fontSize: "16px",
            }}
          >
            {"\u2315"}
          </span>
          <input
            type="text"
            placeholder="Search MCP servers\u2026"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px 12px 40px",
              borderRadius: "12px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              outline: "none",
              transition: "border 0.2s ease",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--accent-electric)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--border-subtle)")
            }
          />
        </div>
      </div>

      {/* Categories */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "32px",
          overflowX: "auto",
          paddingBottom: "4px",
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              border:
                activeCategory === cat.id
                  ? "1px solid var(--accent-electric)"
                  : "1px solid var(--border-subtle)",
              background:
                activeCategory === cat.id
                  ? "rgba(77, 255, 180, 0.08)"
                  : "var(--bg-secondary)",
              color:
                activeCategory === cat.id
                  ? "var(--accent-electric)"
                  : "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "11px" }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Server grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "16px",
        }}
      >
        {filtered.map((server, i) => (
          <ServerCard key={server.id} server={server} index={i} />
        ))}
      </div>
    </section>
  );
}
