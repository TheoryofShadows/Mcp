import { useState } from "react";
import { Badge } from "../ui";

export default function ServerCard({ server, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="animate-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        animationDelay: `${index * 0.08}s`,
        background: hovered ? "var(--bg-card-hover)" : "var(--bg-card)",
        border: `1px solid ${hovered ? "var(--border-accent)" : "var(--border-subtle)"}`,
        borderRadius: "16px",
        padding: "24px",
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? "0 12px 40px rgba(0,0,0,0.3)" : "none",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background: server.gradient,
          opacity: hovered ? 1 : 0.4,
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: server.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--bg-primary)",
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {server.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "15px",
                }}
              >
                {server.name}
              </span>
              {server.verified && (
                <span
                  style={{ fontSize: "12px", color: "var(--accent-electric)" }}
                >
                  {"\u2713"}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              by @{server.author}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {server.trending && <Badge variant="trending">{"🔥"} Trending</Badge>}
          <Badge variant={server.price === "free" ? "free" : "paid"}>
            {server.price === "free" ? "Free" : server.price}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: "16px",
          minHeight: "42px",
        }}
      >
        {server.description}
      </p>

      {/* Tags */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {server.tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              background: "var(--bg-secondary)",
              fontSize: "11px",
              fontFamily: "'Space Mono', monospace",
              color: "var(--text-muted)",
            }}
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Footer stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "14px",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", gap: "16px" }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {"\u2193"} {(server.installs / 1000).toFixed(1)}K
          </span>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {"\u2605"} {server.rating}
          </span>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: "var(--accent-electric)",
            }}
          >
            {server.weeklyGrowth}
          </span>
        </div>
        {server.revenue && (
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: "var(--accent-purple)",
              fontWeight: 700,
            }}
          >
            {server.revenue}
          </span>
        )}
      </div>
    </div>
  );
}
