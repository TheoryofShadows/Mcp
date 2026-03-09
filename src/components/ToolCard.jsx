import { memo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Star, Download } from "lucide-react";
import VerifiedBadge from "./VerifiedBadge";
import PriceTag from "./PriceTag";

const ToolCard = memo(function ToolCard({ tool, index = 0 }) {
  return (
    <Link
      to={`/tool/${tool.slug}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
      aria-label={`${tool.name} by @${tool.author_name}${tool.verified ? ", verified" : ""}`}
    >
      <article
        className="tool-card"
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "14px",
          padding: "20px",
          cursor: "pointer",
          transition: "all 0.18s ease",
          animationDelay: `${index * 0.06}s`,
          position: "relative",
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#1e1e1e";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Gradient accent line */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "2px",
            background: tool.gradient,
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
            {/* Icon */}
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: "11px",
                background: tool.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                fontWeight: 800,
                color: "#fff",
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
              }}
            >
              {tool.name.charAt(0)}
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  marginBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "var(--text-primary)",
                  }}
                >
                  {tool.name}
                </span>
                {tool.verified && <VerifiedBadge verified={tool.verified} showLabel={false} />}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                @{tool.author_name}
              </span>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
            <PriceTag tool={tool} size="sm" />
            {tool.trending && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  color: "#f59e0b",
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "5px",
                  padding: "2px 6px",
                }}
              >
                <TrendingUp size={9} />
                Trending
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            marginBottom: "14px",
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {tool.description}
        </p>

        {/* Tags */}
        <div
          style={{
            display: "flex",
            gap: "5px",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          {tool.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--text-muted)",
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "5px",
                padding: "2px 7px",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "12px",
            borderTop: "1px solid #1a1a1a",
          }}
        >
          <div style={{ display: "flex", gap: "14px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <Download size={10} />
              {(tool.installs / 1000).toFixed(1)}K
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <Star size={10} />
              {tool.rating}
            </div>
          </div>
          {tool.weekly_growth && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "#10b981",
              }}
            >
              {tool.weekly_growth} /wk
            </span>
          )}
        </div>
      </article>
    </Link>
  );
});

export default ToolCard;
