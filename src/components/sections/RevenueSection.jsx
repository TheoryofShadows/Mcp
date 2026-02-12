import { REVENUE_PROJECTIONS, PRICING_TIERS } from "../../data";

export default function RevenueSection() {
  return (
    <section
      aria-label="Revenue model"
      style={{
        padding: "60px var(--section-px)",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-2xl)" }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--font-4xl)",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: "var(--space-sm)",
          }}
        >
          Revenue{" "}
          <span style={{ color: "var(--accent-purple)" }}>Model</span>
        </h2>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--font-lg)",
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
          borderRadius: "var(--radius-xl)",
          padding: "28px",
          marginBottom: "40px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--font-sm)",
            color: "var(--text-muted)",
            letterSpacing: "1px",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          {"\u25C8"} Revenue Projection
        </div>
        <div
          className="projection-grid"
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
                borderRadius: "var(--radius-lg)",
                border: item.highlight
                  ? "1px solid rgba(77, 255, 180, 0.3)"
                  : "1px solid var(--border-subtle)",
              }}
            >
              <dt
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--font-xs)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.5px",
                  marginBottom: "var(--space-sm)",
                }}
              >
                {item.label}
              </dt>
              <dd
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "var(--font-2xl)",
                  fontWeight: 800,
                  color: item.highlight
                    ? "var(--accent-electric)"
                    : "var(--text-primary)",
                  letterSpacing: "-0.5px",
                  margin: 0,
                }}
              >
                {item.value}
              </dd>
              <dd
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--font-sm)",
                  color: "var(--text-muted)",
                  marginTop: "var(--space-xs)",
                }}
              >
                {item.note}
              </dd>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing tiers */}
      <div
        className="pricing-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-md)",
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
              borderRadius: "var(--radius-xl)",
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
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: "var(--radius-pill)",
                  letterSpacing: "0.5px",
                }}
              >
                MOST POPULAR
              </div>
            )}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--font-xs)",
                color: tier.accent,
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "var(--space-sm)",
              }}
            >
              {tier.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--font-3xl)",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-1px",
                marginBottom: "var(--space-xs)",
              }}
            >
              {tier.price}
            </div>
            <p
              style={{
                fontSize: "var(--font-base)",
                color: "var(--text-secondary)",
                marginBottom: "20px",
              }}
            >
              {tier.desc}
            </p>
            <ul
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                listStyle: "none",
                padding: 0,
              }}
            >
              {tier.features.map((f, j) => (
                <li
                  key={j}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-sm)",
                    fontSize: "var(--font-base)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span aria-hidden="true" style={{ color: tier.accent, fontSize: "10px" }}>
                    {"\u2713"}
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="tier-btn"
              aria-label={`${tier.price === "Free" ? "Get started with" : "Subscribe to"} ${tier.name} plan`}
              style={{
                border: tier.popular ? "none" : `1px solid ${tier.accent}`,
                background: tier.popular ? tier.accent : "transparent",
                color: tier.popular ? "var(--bg-primary)" : tier.accent,
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
