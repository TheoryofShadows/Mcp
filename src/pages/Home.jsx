import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Zap, ArrowRight, Package, Download, DollarSign, Users } from "lucide-react";
import ToolCard from "../components/ToolCard";
import CategoryCard from "../components/CategoryCard";
import { SEED_TOOLS, SEED_CATEGORIES, SEED_STATS } from "../data/seed";
import { supabase } from "../lib/supabase";

async function loadHomeData() {
  if (!supabase) return { tools: SEED_TOOLS, stats: SEED_STATS };
  try {
    const [{ data: tools }] = await Promise.all([
      supabase.from("tools").select("*").eq("published", true).order("installs", { ascending: false }).limit(6),
      supabase.from("tools").select("installs.sum(), price_amount.sum()"),
    ]);
    return {
      tools: tools?.length ? tools : SEED_TOOLS,
      stats: SEED_STATS,
    };
  } catch {
    return { tools: SEED_TOOLS, stats: SEED_STATS };
  }
}

const DISPLAY_CATEGORIES = SEED_CATEGORIES.filter((c) => c.id !== "all");

const STAT_ITEMS = [
  { icon: Package,   key: "total_tools",     label: "Tools Published",  format: (v) => v.toLocaleString() },
  { icon: Download,  key: "total_installs",   label: "Total Installs",   format: (v) => `${(v / 1000).toFixed(0)}K+` },
  { icon: DollarSign,key: "total_revenue",    label: "Creator Revenue",  format: (v) => `$${(v / 1000).toFixed(1)}K/mo` },
  { icon: Users,     key: "total_developers", label: "Developers",       format: (v) => `${v.toLocaleString()}+` },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [tools, setTools] = useState(SEED_TOOLS);
  const [stats] = useState(SEED_STATS);
  const navigate = useNavigate();

  useEffect(() => {
    loadHomeData().then(({ tools: t }) => setTools(t));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/marketplace?q=${encodeURIComponent(search.trim())}`);
    else navigate("/marketplace");
  }

  const featured = tools.slice(0, 6);
  const countByCategory = (catId) => SEED_TOOLS.filter((t) => t.category_id === catId).length;

  return (
    <main id="main-content">
      {/* ─── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          padding: "100px 24px 80px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-60px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "400px",
            background: "radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: "720px", margin: "0 auto" }}>
          {/* Live badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: "100px",
              marginBottom: "32px",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                animation: "pulse 2s ease-in-out infinite",
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                color: "#818cf8",
                letterSpacing: "0.06em",
              }}
            >
              {SEED_TOOLS.length} MCP TOOLS &amp; GROWING
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(40px, 7vw, 76px)",
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-2.5px",
              marginBottom: "20px",
              color: "var(--text-primary)",
            }}
          >
            The App Store for{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #a5b4fc 0%, #6366f1 50%, #8b5cf6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI Agents
            </span>
          </h1>

          <p
            style={{
              fontSize: "17px",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              marginBottom: "40px",
              maxWidth: "520px",
              margin: "0 auto 40px",
            }}
          >
            Discover, install, and monetize MCP tools. Build integrations for Claude and
            earn revenue — we handle the marketplace.{" "}
            <span style={{ color: "#818cf8" }}>15% fee model.</span>
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "0", maxWidth: "520px", margin: "0 auto 28px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search GitHub, Stripe, Figma, AWS…"
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 44px",
                  background: "#111",
                  border: "1px solid #2a2a2a",
                  borderRight: "none",
                  borderRadius: "12px 0 0 12px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
                aria-label="Search MCP tools"
              />
            </div>
            <button
              type="submit"
              style={{
                padding: "14px 22px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "0 12px 12px 0",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              Search <ArrowRight size={14} />
            </button>
          </form>

          {/* Quick links */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
            {["GitHub MCP", "Postgres MCP", "Stripe MCP", "Slack MCP"].map((name) => (
              <button
                key={name}
                onClick={() => navigate(`/marketplace?q=${encodeURIComponent(name)}`)}
                style={{
                  padding: "5px 12px",
                  background: "#111",
                  border: "1px solid #222",
                  borderRadius: "100px",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
                  e.currentTarget.style.color = "#a5b4fc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#222";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ────────────────────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          padding: "32px 24px",
          background: "#0d0d0d",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0",
          }}
          className="stats-grid"
        >
          {STAT_ITEMS.map(({ icon: Icon, key, label, format }, i) => (
            <div
              key={key}
              style={{
                textAlign: "center",
                padding: "8px 16px",
                borderRight: i < STAT_ITEMS.length - 1 ? "1px solid #1a1a1a" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  marginBottom: "4px",
                }}
              >
                <Icon size={14} color="#6366f1" />
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "26px",
                    fontWeight: 800,
                    color: "var(--text-primary)",
                  }}
                >
                  {format(stats[key])}
                </span>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                  letterSpacing: "0.04em",
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Categories ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "64px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "22px",
                marginBottom: "4px",
              }}
            >
              Browse by Category
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Find tools by integration type
            </p>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "12px",
          }}
        >
          {DISPLAY_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              count={countByCategory(cat.id)}
            />
          ))}
        </div>
      </section>

      {/* ─── Featured Tools ───────────────────────────────────────────────────── */}
      <section style={{ padding: "0 24px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "22px",
                marginBottom: "4px",
              }}
            >
              Featured Tools
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Top-rated MCP integrations this week
            </p>
          </div>
          <a
            href="/marketplace"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "13px",
              color: "#818cf8",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            View all <ArrowRight size={13} />
          </a>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          {featured.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>
      </section>

      {/* ─── CTA Banner ───────────────────────────────────────────────────────── */}
      <section
        style={{
          margin: "0 24px 80px",
          maxWidth: "1100px",
          marginLeft: "auto",
          marginRight: "auto",
          background: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "20px",
          padding: "52px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Zap size={24} color="#fff" />
        </div>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "28px",
            marginBottom: "12px",
            letterSpacing: "-0.5px",
          }}
        >
          Publish your MCP tool
        </h2>
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
            marginBottom: "28px",
            maxWidth: "400px",
            margin: "0 auto 28px",
            lineHeight: 1.65,
          }}
        >
          Join 847+ developers earning revenue from their MCP tools. 85% goes straight to you.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(99,102,241,0.3)",
            }}
          >
            Submit a Tool <ArrowRight size={14} />
          </a>
          <a
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "10px",
              color: "#a5b4fc",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            View Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
