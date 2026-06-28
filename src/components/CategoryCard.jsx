import { Link } from "react-router-dom";

export default function CategoryCard({ category, count, active, onClick }) {
  const isLink = !onClick;

  const content = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        padding: "24px 16px",
        background: active ? "rgba(124, 108, 255,0.12)" : "#12121c",
        border: `1px solid ${active ? "rgba(124, 108, 255,0.4)" : "#1d1d2b"}`,
        borderRadius: "14px",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.18s ease",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(124, 108, 255,0.07)";
          e.currentTarget.style.borderColor = "rgba(124, 108, 255,0.25)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "#12121c";
          e.currentTarget.style.borderColor = "#1d1d2b";
        }
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <span
        style={{
          fontSize: "24px",
          display: "block",
          lineHeight: 1,
          filter: active ? "none" : "grayscale(0.3)",
        }}
        aria-hidden="true"
      >
        {category.icon}
      </span>
      <div>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            color: active ? "#b9adff" : "var(--text-primary)",
            marginBottom: "3px",
          }}
        >
          {category.label}
        </div>
        {count !== undefined && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {count} tools
          </div>
        )}
      </div>
    </div>
  );

  if (isLink) {
    return (
      <Link
        to={`/marketplace?category=${category.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
        aria-label={`Browse ${category.label} tools`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
