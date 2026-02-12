import { REVENUE_PROJECTIONS, PRICING_TIERS } from "../../data";

export default function RevenueSection() {
  return (
    <section
      style={{ padding: "60px 32px", maxWidth: "1100px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: "12px",
          }}
        >
          Revenue{" "}
          <span style={{ color: "var(--accent-purple)" }}>Model</span>
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "16px",
            maxWidth: "500px",
            margin: "0 auto",
          }}
        >
          Publishers earn 85% of every transaction. We take 15% to keep the
          lights on and the marketplace growing.
        </p>
      </div>

      {/* Revenue projections */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "28px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "12px",
            color: "var(--text-muted)",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          {"\u25C8"} Revenue Projection
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
          }}
        >
          {REVENUE_PROJECTIONS.map((item, i) => (
            <div
              key={i}
              style={{
                padding: "20px",
                background: "var(--bg-secondary)",
                borderRadius: "12px",
                border: item.highlight
                  ? "1px solid rgba(77, 255, 180, 0.3)"
                  : "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  letterSpacing: "0.5px",
                  marginBottom: "8px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: "24px",
                  fontWeight: 800,
                  color: item.highlight
                    ? "var(--accent-electric)"
                    : "var(--text-primary)",
                  letterSpacing: "-0.5px",
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing tiers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {PRICING_TIERS.map((tier, i) => (
          <div
            key={i}
            style={{
              background: tier.gradient,
              border: tier.popular
                ? `1px solid ${tier.accent}`
                : "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "28px",
              position: "relative",
            }}
          >
            {tier.popular && (
              <div
                style={{
                  position: "absolute",
                  top: "-10px",
                  right: "20px",
                  background: tier.accent,
                  color: "var(--bg-primary)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: "20px",
                  letterSpacing: "0.5px",
                }}
              >
                MOST POPULAR
              </div>
            )}
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                color: tier.accent,
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              {tier.name}
            </div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "32px",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-1px",
                marginBottom: "4px",
              }}
            >
              {tier.price}
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                marginBottom: "20px",
              }}
            >
              {tier.desc}
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {tier.features.map((f, j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span style={{ color: tier.accent, fontSize: "10px" }}>
                    {"\u2713"}
                  </span>
                  {f}
                </div>
              ))}
            </div>
            <button
              style={{
                marginTop: "24px",
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: tier.popular
                  ? "none"
                  : `1px solid ${tier.accent}`,
                background: tier.popular ? tier.accent : "transparent",
                color: tier.popular
                  ? "var(--bg-primary)"
                  : tier.accent,
                cursor: "pointer",
                fontFamily: "'Syne', sans-serif",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              {tier.price === "Free" ? "Get Started" : "Subscribe"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
