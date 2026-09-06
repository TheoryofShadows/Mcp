import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Star, Download, ExternalLink,
  Copy, Check, TrendingUp, AlertCircle
} from "lucide-react";
import GithubIcon from "../components/icons/GithubIcon";
import VerifiedBadge from "../components/VerifiedBadge";
import TrustScore from "../components/TrustScore";
import PriceTag from "../components/PriceTag";
import InstallCommand from "../components/InstallCommand";
import InstallButtons from "../components/InstallButtons";
import CapabilitiesWarning from "../components/CapabilitiesWarning";
import { SEED_TOOLS, SEED_REVIEWS } from "../data/seed";
import { fetchServer, toolCheckout, recordInstall, reportServer } from "../api/client";

// Normalize the API server shape to the fields this page/seed expect.
function normalize(s) {
  if (!s) return s;
  return {
    ...s,
    author_name: s.author_display_name || s.author || s.author_name,
    weekly_growth: s.weeklyGrowth ?? s.weekly_growth,
    category_id: s.category ?? s.category_id,
  };
}

async function loadTool(slug) {
  try {
    const data = await fetchServer(slug);
    return { tool: normalize(data), reviews: data.reviews || [] };
  } catch {
    // API unreachable or 404 — fall back to static seed so the page still renders.
    const tool = SEED_TOOLS.find((t) => t.slug === slug) || null;
    return { tool, reviews: SEED_REVIEWS.filter((r) => r.tool_id === tool?.id) };
  }
}

// Minimal markdown → JSX renderer
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let inCode = false;
  let codeLines = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        elements.push(
          <pre
            key={key++}
            style={{
              background: "#0d0d15",
              border: "1px solid #1d1d2b",
              borderRadius: "10px",
              padding: "16px",
              overflowX: "auto",
              margin: "16px 0",
              fontFamily: "var(--font-mono)",
              fontSize: "12.5px",
              lineHeight: 1.7,
              color: "#e2e8f0",
            }}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) { codeLines.push(line); continue; }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={key++} style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "24px", margin: "32px 0 12px", letterSpacing: "-0.5px" }}>{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "18px", margin: "28px 0 10px", color: "#a5f3fc" }}>{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={key++} style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", margin: "20px 0 8px" }}>{line.slice(4)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={key++} style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.7, marginLeft: "20px", marginBottom: "4px" }}>
          {line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}
        </li>
      );
    } else if (line.startsWith("⚠️") || line.startsWith("> ")) {
      elements.push(
        <div key={key++} style={{ background: "rgba(251, 191, 36,0.08)", border: "1px solid rgba(251, 191, 36,0.2)", borderRadius: "8px", padding: "12px 16px", margin: "12px 0", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <AlertCircle size={14} style={{ color: "#fbbf24", marginTop: "2px", flexShrink: 0 }} />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{line.replace(/^⚠️\s*|^>\s*/, "")}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: "6px" }} />);
    } else {
      // Inline bold: **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.75, margin: "4px 0" }}>
          {parts.map((part, pi) =>
            pi % 2 === 1 ? <strong key={pi} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part}</strong> : part
          )}
        </p>
      );
    }
  }
  return elements;
}

function StarRating({ rating, size = 14 }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= Math.round(rating) ? "#fbbf24" : "transparent"}
          color={s <= Math.round(rating) ? "#fbbf24" : "#2e2e44"}
        />
      ))}
    </div>
  );
}

const TABS = ["Overview", "Install", "Reviews"];

function formatInstalls(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return v.toLocaleString();
}

export default function ToolDetail() {
  const { slug } = useParams();
  const [tool, setTool] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [installMsg, setInstallMsg] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("security");
  const [reportDetail, setReportDetail] = useState("");
  const [reportMsg, setReportMsg] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  async function submitReport(e) {
    e.preventDefault();
    setReportBusy(true);
    setReportMsg("");
    try {
      const res = await reportServer(tool.slug, reportReason, reportDetail);
      setReportMsg(res.message || "Report received.");
      setReportDetail("");
      setReportOpen(false);
    } catch (err) {
      setReportMsg(err.message || "Could not submit report.");
    } finally {
      setReportBusy(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadTool(slug).then(({ tool: t, reviews: r }) => {
      setTool(t);
      setReviews(r);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{ maxWidth: "900px", margin: "60px auto", padding: "0 24px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
        Loading…
      </div>
    );
  }

  if (!tool) {
    return (
      <div role="alert" style={{ maxWidth: "900px", margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "24px", marginBottom: "12px" }}>Tool not found</h1>
        <Link to="/marketplace" style={{ color: "#67e8f9", fontSize: "14px" }}>← Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <main id="main-content" style={{ maxWidth: "1000px", margin: "0 auto", padding: "32px 24px 80px" }}>
      {/* Back */}
      <Link
        to="/marketplace"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--text-muted)",
          textDecoration: "none",
          fontSize: "13px",
          marginBottom: "28px",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
      >
        <ArrowLeft size={14} /> Back to Marketplace
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "28px", alignItems: "start" }} className="tool-detail-grid">
        {/* Main content */}
        <div>
          {/* Tool header */}
          <div
            style={{
              background: "#12121c",
              border: "1px solid #1d1d2b",
              borderRadius: "16px",
              padding: "28px",
              marginBottom: "20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: tool.gradient,
              }}
            />
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
              <div
                aria-hidden="true"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "16px",
                  background: tool.gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}
              >
                {tool.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "22px", letterSpacing: "-0.5px" }}>
                    {tool.name}
                  </h1>
                  {tool.trust
                    ? <VerifiedBadge level={tool.trust.tier} size="md" />
                    : tool.verified && <VerifiedBadge verified={tool.verified} size="md" />}
                  <PriceTag tool={tool} size="md" />
                  {tool.trending && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#fbbf24", background: "rgba(251, 191, 36,0.1)", border: "1px solid rgba(251, 191, 36,0.2)", borderRadius: "5px", padding: "2px 8px" }}>
                      <TrendingUp size={10} /> Trending
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
                  by @{tool.author_name}
                </p>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  {tool.description}
                </p>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Download size={14} color="var(--text-muted)" />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
                  {formatInstalls(tool.installs)} installs
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <StarRating rating={tool.rating} size={13} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
                  {tool.rating} ({tool.rating_count} reviews)
                </span>
              </div>
              {tool.weekly_growth && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "#10b981" }}>
                  {tool.weekly_growth}/wk
                </span>
              )}
            </div>

            {/* Tags */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "16px" }}>
              {tool.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                    background: "#1d1d2b",
                    border: "1px solid #2e2e44",
                    borderRadius: "5px",
                    padding: "3px 9px",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* GitHub link */}
            {tool.repo_url && (
              <div style={{ marginTop: "16px" }}>
                <a
                  href={tool.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    textDecoration: "none",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <GithubIcon size={13} />
                  View Source
                  <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>

          {/* Prominent capability / risk warning — surfaced before the tabs so it
              can't be missed for tools that touch sensitive surfaces. */}
          {(tool.risk_level === "high" || tool.risk_level === "medium") && (
            <div style={{ marginBottom: "20px" }}>
              <CapabilitiesWarning capabilities={tool.capabilities} riskLevel={tool.risk_level} />
            </div>
          )}

          {/* Tabs */}
          <div role="tablist" aria-label="Tool details" style={{ display: "flex", gap: "2px", marginBottom: "20px", background: "#0d0d15", borderRadius: "10px", padding: "4px", border: "1px solid #1d1d2b" }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                role="tab"
                id={`tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "7px",
                  border: "none",
                  background: activeTab === tab ? "#1d1d2b" : "transparent",
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: "13px",
                  fontWeight: activeTab === tab ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  transition: "all 0.15s",
                }}
              >
                {tab}
                {tab === "Reviews" && reviews.length > 0 && (
                  <span style={{ marginLeft: "6px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                    ({reviews.length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "Overview" && (
            <div
              role="tabpanel"
              id="panel-Overview"
              aria-labelledby="tab-Overview"
              style={{
                background: "#12121c",
                border: "1px solid #1d1d2b",
                borderRadius: "14px",
                padding: "28px",
              }}
            >
              {tool.trust && <TrustScore trust={tool.trust} />}
              {renderMarkdown(tool.readme || tool.long_description)}
            </div>
          )}

          {activeTab === "Install" && (
            <div role="tabpanel" id="panel-Install" aria-labelledby="tab-Install" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                One-click style configs for Claude Desktop, Cursor, and VS Code. Copy, paste, restart — done.
              </p>
              <InstallButtons server={tool} />
              {(tool.capabilities?.length > 0 || tool.risk_level) && (
                <CapabilitiesWarning capabilities={tool.capabilities} riskLevel={tool.risk_level} />
              )}
              <div
                style={{
                  background: "#12121c",
                  border: "1px solid #1d1d2b",
                  borderRadius: "14px",
                  padding: "20px",
                }}
              >
                <p style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Quick install (legacy)
                </p>
                <InstallCommand command={tool.install_command} label="" />
              </div>
            </div>
          )}

          {activeTab === "Reviews" && (
            <div role="tabpanel" id="panel-Reviews" aria-labelledby="tab-Reviews" style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "14px", padding: "28px" }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "18px", marginBottom: "20px" }}>
                Reviews
              </h2>
              {reviews.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No reviews yet. Be the first!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      style={{
                        padding: "16px",
                        background: "#0d0d15",
                        borderRadius: "10px",
                        border: "1px solid #1d1d2b",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#fff",
                              fontFamily: "var(--font-mono)",
                              flexShrink: 0,
                            }}
                          >
                            {(review.user?.username || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13px" }}>@{review.user?.username || "anonymous"}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                        <StarRating rating={review.rating} size={13} />
                      </div>
                      {review.body && (
                        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                          {review.body}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside>
          {/* Pricing card */}
          <div
            style={{
              background: "#12121c",
              border: "1px solid #1d1d2b",
              borderRadius: "14px",
              padding: "24px",
              marginBottom: "16px",
              position: "sticky",
              top: "80px",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <PriceTag tool={tool} size="lg" />
              {tool.price_type === "paid" && (
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "8px", fontFamily: "var(--font-mono)" }}>
                  per month · cancel anytime
                </p>
              )}
            </div>

            <button
              style={{
                width: "100%",
                padding: "13px",
                background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: checkoutLoading ? "not-allowed" : "pointer",
                opacity: checkoutLoading ? 0.7 : 1,
                marginBottom: "10px",
                boxShadow: "0 0 20px rgba(34, 211, 238,0.25)",
                transition: "all 0.15s",
              }}
              onClick={async () => {
                if (tool.price_type === "paid") {
                  setCheckoutLoading(true);
                  setCheckoutErr("");
                  try {
                    await toolCheckout(tool.slug);
                  } catch (err) {
                    setCheckoutErr(
                      /onboard/i.test(err.message)
                        ? "This publisher hasn't enabled payouts yet, so it can't be purchased right now."
                        : err.message || "Checkout failed. Please try again."
                    );
                  } finally {
                    setCheckoutLoading(false);
                  }
                } else {
                  recordInstall(tool.slug).catch(() => {});
                  setInstallMsg(true);
                  setActiveTab("Install");
                }
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 28px rgba(34, 211, 238,0.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(34, 211, 238,0.25)")}
            >
              {checkoutLoading ? "Redirecting…" : tool.price_type === "free" ? "Install Tool" : `Subscribe — ${tool.price_label || tool.price}`}
            </button>

            {checkoutErr && (
              <p role="alert" style={{ fontSize: "12px", color: "#f87171", textAlign: "center", lineHeight: 1.5, marginBottom: "8px" }}>
                {checkoutErr}
              </p>
            )}

            {installMsg && tool.price_type === "free" && (
              <p style={{ fontSize: "12px", color: "#10b981", textAlign: "center", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>
                Open the Install tab for Claude, Cursor, or VS Code ↓
              </p>
            )}
            {tool.price_type === "paid" && (
              <div style={{ textAlign: "center", marginBottom: "4px" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: "4px" }}>
                  Secure payment via Stripe · Publishers keep 85%
                </p>
                <p style={{ fontSize: "10px", color: "#fbbf24", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                  Solana Pay · Coming soon
                </p>
              </div>
            )}

            {tool.trust && (
              <div style={{ marginBottom: "14px", padding: "12px", background: "#0d0d15", borderRadius: "10px", border: "1px solid #1d1d2b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>Trust Score</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "18px", color: "#22d3ee" }}>{tool.trust.score}</span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.45 }}>
                  Computed · open Overview → Why? for the breakdown
                </p>
              </div>
            )}

            <div style={{ borderTop: "1px solid #1d1d2b", paddingTop: "16px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Installs</span>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{formatInstalls(tool.installs)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Rating</span>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>★ {tool.rating}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Category</span>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", textTransform: "capitalize" }}>{tool.category_id}</span>
              </div>
              {tool.price_type === "paid" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Platform fee</span>
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>15%</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick install */}
          <div
            style={{
              background: "#12121c",
              border: "1px solid #1d1d2b",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <InstallCommand command={tool.install_command} label="Quick Install" />
          </div>
        </aside>
      </div>

      {/* Report / flag — community trust signal */}
      <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #1d1d2b", textAlign: "center" }}>
        {reportMsg && !reportOpen ? (
          <p role="status" style={{ fontSize: "13px", color: "#10b981" }}>{reportMsg}</p>
        ) : !reportOpen ? (
          <button
            onClick={() => { setReportOpen(true); setReportMsg(""); }}
            style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <AlertCircle size={12} /> Report this server
          </button>
        ) : (
          <form onSubmit={submitReport} style={{ maxWidth: "440px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "10px", textAlign: "left", background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "12px", padding: "18px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600 }}>Report this server</div>
            <select value={reportReason} onChange={(e) => setReportReason(e.target.value)}
              style={{ padding: "9px 12px", background: "#0d0d15", border: "1px solid #2e2e44", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px" }}>
              <option value="security">Security concern (e.g., tool poisoning)</option>
              <option value="malware">Malware or abuse</option>
              <option value="impersonation">Impersonation / fake publisher</option>
              <option value="broken">Broken or doesn't work</option>
              <option value="spam">Spam or low quality</option>
              <option value="other">Other</option>
            </select>
            <textarea value={reportDetail} onChange={(e) => setReportDetail(e.target.value)} rows={3} maxLength={1000}
              placeholder="Optional details (what's wrong, links, etc.)"
              style={{ padding: "9px 12px", background: "#0d0d15", border: "1px solid #2e2e44", borderRadius: "8px", color: "var(--text-primary)", fontSize: "13px", resize: "vertical", fontFamily: "var(--font-body)" }} />
            {reportMsg && <p style={{ fontSize: "12px", color: "#f87171" }}>{reportMsg}</p>}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" disabled={reportBusy}
                style={{ padding: "9px 16px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#f87171", fontSize: "13px", fontWeight: 600, cursor: reportBusy ? "not-allowed" : "pointer" }}>
                {reportBusy ? "Submitting…" : "Submit report"}
              </button>
              <button type="button" onClick={() => setReportOpen(false)}
                style={{ padding: "9px 16px", background: "transparent", border: "1px solid #2e2e44", borderRadius: "8px", color: "var(--text-muted)", fontSize: "13px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
