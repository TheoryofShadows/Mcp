import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Star, Download, Github, ExternalLink,
  Copy, Check, TrendingUp, AlertCircle
} from "lucide-react";
import VerifiedBadge from "../components/VerifiedBadge";
import PriceTag from "../components/PriceTag";
import InstallCommand from "../components/InstallCommand";
import InstallButtons from "../components/InstallButtons";
import CapabilitiesWarning from "../components/CapabilitiesWarning";
import { SEED_TOOLS, SEED_REVIEWS } from "../data/seed";
import { supabase } from "../lib/supabase";
import { toolCheckout, recordInstall } from "../api/client";

async function loadTool(slug) {
  if (!supabase) {
    const tool = SEED_TOOLS.find((t) => t.slug === slug) || null;
    const reviews = tool ? SEED_REVIEWS.filter((r) => r.tool_id === tool.id) : [];
    return { tool, reviews };
  }
  try {
    const [{ data: tool }, { data: reviews }] = await Promise.all([
      supabase.from("tools").select("*").eq("slug", slug).single(),
      supabase.from("reviews").select("*, user:users(username, avatar_url)").eq("tool_id", slug).order("created_at", { ascending: false }),
    ]);
    if (!tool) {
      const fallback = SEED_TOOLS.find((t) => t.slug === slug) || null;
      return { tool: fallback, reviews: SEED_REVIEWS.filter((r) => r.tool_id === fallback?.id) };
    }
    return { tool, reviews: reviews || [] };
  } catch {
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
              background: "#0d0d0d",
              border: "1px solid #222",
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
      elements.push(<h2 key={key++} style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "18px", margin: "28px 0 10px", color: "#a5b4fc" }}>{line.slice(3)}</h2>);
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
        <div key={key++} style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "8px", padding: "12px 16px", margin: "12px 0", display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <AlertCircle size={14} style={{ color: "#f59e0b", marginTop: "2px", flexShrink: 0 }} />
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
          fill={s <= Math.round(rating) ? "#f59e0b" : "transparent"}
          color={s <= Math.round(rating) ? "#f59e0b" : "#3a3a3a"}
        />
      ))}
    </div>
  );
}

const TABS = ["Overview", "Install", "Reviews"];

export default function ToolDetail() {
  const { slug } = useParams();
  const [tool, setTool] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview");
  const [installMsg, setInstallMsg] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
      <div style={{ maxWidth: "900px", margin: "60px auto", padding: "0 24px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
        Loading…
      </div>
    );
  }

  if (!tool) {
    return (
      <div style={{ maxWidth: "900px", margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "24px", marginBottom: "12px" }}>Tool not found</h1>
        <Link to="/marketplace" style={{ color: "#818cf8", fontSize: "14px" }}>← Back to Marketplace</Link>
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
              background: "#111",
              border: "1px solid #1e1e1e",
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
                  {tool.verified && <VerifiedBadge verified={tool.verified} size="md" />}
                  <PriceTag tool={tool} size="md" />
                  {tool.trending && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "5px", padding: "2px 8px" }}>
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
                  {(tool.installs / 1000).toFixed(1)}K installs
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <StarRating rating={tool.rating} size={13} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--text-secondary)" }}>
                  {tool.rating} ({tool.review_count} reviews)
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
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "5px",
                    padding: "3px 9px",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* GitHub link */}
            {tool.github_url && (
              <div style={{ marginTop: "16px" }}>
                <a
                  href={tool.github_url}
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
                  <Github size={13} />
                  View Source
                  <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "2px", marginBottom: "20px", background: "#0d0d0d", borderRadius: "10px", padding: "4px", border: "1px solid #1a1a1a" }}>
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "7px",
                  border: "none",
                  background: activeTab === tab ? "#1a1a1a" : "transparent",
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
              style={{
                background: "#111",
                border: "1px solid #1e1e1e",
                borderRadius: "14px",
                padding: "28px",
              }}
            >
              {renderMarkdown(tool.readme)}
            </div>
          )}

          {activeTab === "Install" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <InstallButtons server={tool} />
              {(tool.capabilities?.length > 0 || tool.risk_level) && (
                <CapabilitiesWarning capabilities={tool.capabilities} riskLevel={tool.risk_level} />
              )}
              <div
                style={{
                  background: "#111",
                  border: "1px solid #1e1e1e",
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
            <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "14px", padding: "28px" }}>
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
                        background: "#0d0d0d",
                        borderRadius: "10px",
                        border: "1px solid #1a1a1a",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
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
              background: "#111",
              border: "1px solid #1e1e1e",
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
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: checkoutLoading ? "not-allowed" : "pointer",
                opacity: checkoutLoading ? 0.7 : 1,
                marginBottom: "10px",
                boxShadow: "0 0 20px rgba(99,102,241,0.25)",
                transition: "all 0.15s",
              }}
              onClick={async () => {
                if (tool.price_type === "paid") {
                  setCheckoutLoading(true);
                  try {
                    await toolCheckout(tool.slug);
                  } catch (err) {
                    alert(`Checkout error: ${err.message}`);
                  } finally {
                    setCheckoutLoading(false);
                  }
                } else {
                  recordInstall(tool.slug).catch(() => {});
                  setInstallMsg(true);
                  setActiveTab("Install");
                }
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 28px rgba(99,102,241,0.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 20px rgba(99,102,241,0.25)")}
            >
              {checkoutLoading ? "Redirecting…" : tool.price_type === "free" ? "Install Tool" : `Subscribe — ${tool.price_label}`}
            </button>

            {installMsg && tool.price_type === "free" && (
              <p style={{ fontSize: "12px", color: "#10b981", textAlign: "center", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>
                Copy the command below to install ↓
              </p>
            )}
            {tool.price_type === "paid" && (
              <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", fontFamily: "var(--font-mono)" }}>
                Secure payment via Stripe
              </p>
            )}

            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "16px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Installs</span>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{tool.installs.toLocaleString()}</span>
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
              background: "#111",
              border: "1px solid #1e1e1e",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <InstallCommand command={tool.install_command} label="Quick Install" />
          </div>
        </aside>
      </div>
    </main>
  );
}
