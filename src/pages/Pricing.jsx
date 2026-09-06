import { useNavigate } from "react-router-dom";
import { Check, Zap, Building2, Users, ArrowRight, AlertCircle, CheckCircle, CreditCard, ShieldCheck, Clock } from "lucide-react";
import { useState } from "react";
import { useTiers } from "../hooks/useTiers";
import { subscribeTier } from "../api/client";
import { useAuth } from "../hooks/useAuth";

const TIER_ICONS = { starter: Zap, pro: Users, enterprise: Building2 };

const FAQ = [
  {
    q: "How does the 15% platform fee work?",
    a: "When a user purchases your paid tool, MCPX retains 15% of the sale and 85% goes directly to your Stripe Connect account. There's no fee on free tools, and no monthly charge for the Starter plan.",
  },
  {
    q: "When do I get paid?",
    a: "Connect Stripe once from your Dashboard. Payouts go to your connected Stripe account on the 1st of each month, automatically. No minimums, no manual requests.",
  },
  {
    q: "Can I list free tools on any plan?",
    a: "Yes. Free tools can be listed on any plan including Starter. The 15% fee only applies to paid tool transactions.",
  },
  {
    q: "What's live on Pro vs Enterprise?",
    a: "Pro (live today): unlimited servers, priority listing, revenue analytics, and webhooks. Enterprise is for teams that need contracts, dedicated support, and a private catalog — SSO/SAML and private marketplace features are available on request and may require a custom rollout. Contact us via GitHub if you're evaluating Enterprise.",
  },
  {
    q: "Is Solana Pay available?",
    a: "Not yet. Solana Pay is stubbed on the API and labeled Coming soon in the product. Stripe Connect is the live payment path for publisher payouts and tool purchases.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel anytime from your Dashboard. Your tier stays active until the end of the billing period.",
  },
  {
    q: "What is an MCP server?",
    a: "A Model Context Protocol server is a tool that AI agents like Claude connect to in order to access real-world capabilities — databases, APIs, browsers, file systems, and more. MCPX is the marketplace where they're discovered, scored for trust, and installed.",
  },
];

const GET_PAID_STEPS = [
  {
    icon: ShieldCheck,
    title: "Publish with a Trust Score",
    body: "Submit your MCP server. We compute a transparent Trust Score from source, license, identity, and usage — buyers see why they can trust it.",
  },
  {
    icon: CreditCard,
    title: "Connect Stripe once",
    body: "From Dashboard → Payouts, link Stripe Connect. When linked, you'll see Open Stripe Dashboard. That's the live path.",
  },
  {
    icon: CheckCircle,
    title: "Keep 85% every month",
    body: "Buyers pay via Stripe. You keep 85%; MCPX takes 15%. Automatic payouts on the 1st — no minimums.",
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tiers, loading } = useTiers();
  const [subscribing, setSubscribing] = useState(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  async function handleSubscribe(tierId) {
    if (!user) { navigate("/login"); return; }
    setSubscribing(tierId);
    setMsg(""); setErr("");
    try {
      const res = await subscribeTier(tierId);
      if (res?.message) setMsg(res.message);
    } catch (e) {
      const m = e.message || "Something went wrong";
      setErr(m.includes("not activated") || m.includes("live")
        ? "Stripe account is not yet activated for live payments. Visit your Stripe dashboard to complete activation."
        : m);
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <main id="main-content" style={{ padding: "80px 24px", maxWidth: "1100px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 14px", background: "rgba(34, 211, 238,0.08)", border: "1px solid rgba(34, 211, 238,0.2)", borderRadius: "100px", marginBottom: "24px" }}>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "#67e8f9", letterSpacing: "0.06em" }}>PRICING</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "clamp(36px, 5vw, 58px)", letterSpacing: "-1.5px", marginBottom: "16px", lineHeight: 1.1 }}>
          Simple, honest pricing
        </h1>
        <p style={{ fontSize: "17px", color: "var(--text-secondary)", maxWidth: "520px", margin: "0 auto 12px", lineHeight: 1.7 }}>
          List free. Publish paid tools. Keep 85% of every sale via Stripe Connect. Upgrade only when you need Pro or Enterprise.
        </p>
        <p style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          No hidden fees · Cancel anytime · Stripe live · Solana Pay coming soon
        </p>
      </div>

      {/* How publishers get paid */}
      <div style={{ marginBottom: "64px" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "22px", letterSpacing: "-0.4px", marginBottom: "8px", textAlign: "center" }}>
          How publishers get paid
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", textAlign: "center", marginBottom: "24px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
          The wedge isn't ads — it's Trust Score + Connect payouts. Three steps, no theater.
        </p>
        <div className="pricing-steps" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
          {GET_PAID_STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "14px", padding: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "8px", background: "rgba(34,211,238,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "12px", color: "#67e8f9", fontWeight: 700 }}>
                  {i + 1}
                </div>
                <Icon size={16} color="#22d3ee" />
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "15px" }}>{title}</div>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {msg && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 18px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", marginBottom: "24px", fontSize: "13px", fontFamily: "var(--font-mono)", color: "#10b981" }}>
          <CheckCircle size={14} style={{ flexShrink: 0 }} />{msg}
        </div>
      )}
      {err && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "14px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", marginBottom: "24px", fontSize: "13px", fontFamily: "var(--font-mono)", color: "#f87171" }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: "1px" }} />{err}
        </div>
      )}

      {/* Tier cards */}
      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px", padding: "40px" }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "48px" }}>
          {tiers.map((tier) => {
            const Icon = TIER_ICONS[tier.id] || Zap;
            return (
              <div
                key={tier.id}
                style={{
                  background: tier.popular ? "linear-gradient(135deg, rgba(34, 211, 238,0.08), rgba(56,189,248,0.05))" : "var(--bg-card)",
                  border: tier.popular ? `1px solid ${tier.accent}` : "1px solid var(--border-subtle)",
                  borderRadius: "18px",
                  padding: "32px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {tier.popular && (
                  <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: tier.accent, color: "#07070a", fontFamily: "var(--font-mono)", fontSize: "10px", fontWeight: 700, padding: "4px 14px", borderRadius: "100px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                    MOST POPULAR
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "10px", background: `${tier.accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={18} color={tier.accent} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: tier.accent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "2px" }}>{tier.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{tier.desc}</div>
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "42px", letterSpacing: "-1.5px", color: "var(--text-primary)" }}>
                    {tier.price_amount === 0 ? "Free" : `$${tier.price_amount / 100}`}
                  </span>
                  {tier.price_amount > 0 && (
                    <span style={{ fontSize: "14px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginLeft: "4px" }}>/month</span>
                  )}
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <Check size={14} color={tier.accent} style={{ flexShrink: 0, marginTop: "2px" }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={subscribing === tier.id}
                  onClick={() => handleSubscribe(tier.id)}
                  style={{
                    width: "100%",
                    padding: "13px",
                    background: tier.popular ? tier.accent : "transparent",
                    border: tier.popular ? "none" : `1px solid ${tier.accent}`,
                    borderRadius: "10px",
                    color: tier.popular ? "#07070a" : tier.accent,
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: subscribing === tier.id ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-body)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    opacity: subscribing === tier.id ? 0.7 : 1,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { if (subscribing !== tier.id && !tier.popular) e.currentTarget.style.background = `${tier.accent}18`; }}
                  onMouseLeave={(e) => { if (!tier.popular) e.currentTarget.style.background = "transparent"; }}
                >
                  {subscribing === tier.id ? "Processing…" : tier.price_amount === 0 ? "Get Started — Free" : tier.id === "enterprise" ? `Talk about ${tier.name}` : `Subscribe to ${tier.name}`}
                  {subscribing !== tier.id && <ArrowRight size={14} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Solana honesty + publisher split */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "80px" }}>
        <div style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "18px", padding: "28px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "12px" }}>Publisher Revenue Split</div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "28px", letterSpacing: "-1px", marginBottom: "12px" }}>
            You keep <span style={{ color: "#10b981" }}>85%</span>
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "20px" }}>
            For every paid tool sale, 85% lands in your Stripe account. MCPX takes 15% for discovery, Trust Scores, and infrastructure.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { label: "Publisher", value: "85%", color: "#10b981" },
              { label: "MCPX fee", value: "15%", color: "#22d3ee" },
              { label: "Payout", value: "Monthly", color: "#7dd3fc" },
              { label: "Minimum", value: "$0", color: "#fbbf24" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center", padding: "12px 14px", background: "#0d0d15", borderRadius: "10px", border: "1px solid #1d1d2b", minWidth: "72px" }}>
                <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "18px", color, marginBottom: "2px" }}>{value}</div>
                <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#12121c", border: "1px dashed rgba(251,191,36,0.35)", borderRadius: "18px", padding: "28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 10px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "100px", marginBottom: "14px" }}>
            <Clock size={12} color="#fbbf24" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "#fbbf24", letterSpacing: "0.05em" }}>COMING SOON</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "22px", letterSpacing: "-0.5px", marginBottom: "10px" }}>
            Solana Pay
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "14px" }}>
            Crypto-native checkout is on the roadmap. The API stub returns Coming soon — it is <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>not</strong> live for purchases or payouts.
          </p>
          <p style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Live today: Stripe Connect for publisher payouts and tool subscriptions.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px", marginBottom: "32px", textAlign: "center" }}>
          Frequently asked questions
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {FAQ.map((item, i) => (
            <div
              key={i}
              style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "12px", overflow: "hidden", marginBottom: "4px" }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: "100%", padding: "18px 20px", background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "14px", fontWeight: 600, fontFamily: "var(--font-body)", textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}
              >
                {item.q}
                <span style={{ fontSize: "18px", color: "var(--text-muted)", flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.15s" }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: "0 20px 18px", fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", marginTop: "80px" }}>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "16px" }}>
          Questions? Open an issue on{" "}
          <a href="https://github.com/TheoryofShadows/Mcp" target="_blank" rel="noopener noreferrer" style={{ color: "#67e8f9", textDecoration: "none" }}>GitHub</a>
          {" "}or explore the marketplace first.
        </p>
        <a
          href="/marketplace"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", background: "transparent", border: "1px solid rgba(34, 211, 238,0.3)", borderRadius: "10px", color: "#a5f3fc", fontSize: "14px", fontWeight: 600, textDecoration: "none" }}
        >
          Browse the marketplace <ArrowRight size={14} />
        </a>
      </div>
    </main>
  );
}
