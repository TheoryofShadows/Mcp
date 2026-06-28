import { useState } from "react";
import { useTiers } from "../../hooks/useTiers";
import { subscribeTier } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function RevenueSection({ onAuthClick }) {
  const { user } = useAuth();
  const { tiers, revenue_projections, loading } = useTiers();
  const [subscribing, setSubscribing] = useState(null);
  const [subscribeMsg, setSubscribeMsg] = useState("");
  const [subscribeError, setSubscribeError] = useState("");

  async function handleSubscribe(tierId) {
    if (!user) {
      onAuthClick?.();
      return;
    }
    setSubscribing(tierId);
    setSubscribeMsg("");
    setSubscribeError("");
    try {
      const res = await subscribeTier(tierId);
      if (res?.message) setSubscribeMsg(res.message);
      // null means we redirected to Stripe — do nothing
    } catch (err) {
      const msg = err.message || "Something went wrong";
      // Surface Stripe activation errors clearly
      if (msg.toLowerCase().includes("not activated") || msg.toLowerCase().includes("live")) {
        setSubscribeError("Stripe account is not yet activated for live payments. Visit your Stripe dashboard to complete activation.");
      } else {
        setSubscribeError(msg);
      }
    } finally {
      setSubscribing(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "80px var(--section-px)", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>
        Loading...
      </div>
    );
  }

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
      {revenue_projections.length > 0 && (
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
            {revenue_projections.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: "20px",
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-lg)",
                  border: item.highlight
                    ? "1px solid rgba(124, 108, 255, 0.35)"
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
      )}

      {/* Subscribe feedback */}
      {subscribeMsg && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "var(--space-sm) var(--space-md)",
          marginBottom: "var(--space-md)",
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          borderRadius: "var(--radius-lg)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-sm)",
          color: "#10b981",
        }}>
          <CheckCircle size={14} style={{ flexShrink: 0 }} />
          {subscribeMsg}
        </div>
      )}
      {subscribeError && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          padding: "var(--space-sm) var(--space-md)",
          marginBottom: "var(--space-md)",
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: "var(--radius-lg)",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-sm)",
          color: "#f87171",
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
          {subscribeError}
        </div>
      )}

      {/* Pricing tiers */}
      {tiers.length > 0 && (
        <div
          className="pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--space-md)",
          }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.id}
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
                disabled={subscribing === tier.id}
                onClick={() => handleSubscribe(tier.id)}
                style={{
                  border: tier.popular ? "none" : `1px solid ${tier.accent}`,
                  background: tier.popular ? tier.accent : "transparent",
                  color: tier.popular ? "var(--bg-primary)" : tier.accent,
                }}
              >
                {subscribing === tier.id
                  ? "Processing..."
                  : tier.price === "Free"
                    ? "Get Started"
                    : "Subscribe"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
