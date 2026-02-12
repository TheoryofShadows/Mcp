import { memo } from "react";
import { Badge } from "../ui";

const ServerCard = memo(function ServerCard({ server, index }) {
  return (
    <article
      className="card animate-in"
      tabIndex={0}
      style={{ animationDelay: `${index * 0.08}s`, cursor: "pointer" }}
      aria-label={`${server.name} by ${server.author}${server.verified ? ", verified" : ""}`}
    >
      {/* Gradient accent line */}
      <div
        className="card-accent-line"
        style={{ background: server.gradient }}
      />

      {/* Header */}
      <div
        className="card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div
            aria-hidden="true"
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
              fontFamily: "var(--font-mono)",
            }}
          >
            {server.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "15px",
                }}
              >
                {server.name}
              </span>
              {server.verified && (
                <span
                  role="img"
                  aria-label="Verified"
                  style={{ fontSize: "var(--font-sm)", color: "var(--accent-electric)" }}
                >
                  {"\u2713"}
                </span>
              )}
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
                color: "var(--text-muted)",
              }}
            >
              by @{server.author}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          {server.trending && <Badge variant="trending">Trending</Badge>}
          <Badge variant={server.price === "free" ? "free" : "paid"}>
            {server.price === "free" ? "Free" : server.price}
          </Badge>
        </div>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "var(--font-base)",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: "var(--space-md)",
          minHeight: "42px",
        }}
      >
        {server.description}
      </p>

      {/* Tags */}
      <div
        role="list"
        aria-label="Tags"
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        {server.tags.map((tag) => (
          <span key={tag} role="listitem" className="tag">
            #{tag}
          </span>
        ))}
      </div>

      {/* Footer stats */}
      <dl
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "14px",
          borderTop: "1px solid var(--border-subtle)",
          margin: 0,
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-md)" }}>
          <div>
            <dt className="sr-only">Downloads</dt>
            <dd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              {"\u2193"} {(server.installs / 1000).toFixed(1)}K
            </dd>
          </div>
          <div>
            <dt className="sr-only">Rating</dt>
            <dd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
                color: "var(--text-muted)",
                margin: 0,
              }}
            >
              {"\u2605"} {server.rating}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Weekly growth</dt>
            <dd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
                color: "var(--accent-electric)",
                margin: 0,
              }}
            >
              {server.weeklyGrowth}
            </dd>
          </div>
        </div>
        {server.revenue && (
          <div>
            <dt className="sr-only">Monthly revenue</dt>
            <dd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
                color: "var(--accent-purple)",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {server.revenue}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
});

export default ServerCard;
