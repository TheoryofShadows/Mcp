import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Zap, ArrowRight, Package, Download, DollarSign, Users, ShieldCheck, Bot, CreditCard } from "lucide-react";
import ToolCard from "../components/ToolCard";
import CategoryCard from "../components/CategoryCard";
import { SEED_TOOLS, SEED_CATEGORIES, SEED_STATS } from "../data/seed";
import { supabase } from "../lib/supabase";
import { fetchServers, fetchStats, fetchCategories } from "../api/client";
import RevenueSection from "../components/sections/RevenueSection";

// Map an API server object onto the fields ToolCard/seed expect.
function normalizeTool(s) {
  return {
    ...s,
    author_name: s.author_display_name || s.author || s.author_name,
    weekly_growth: s.weeklyGrowth ?? s.weekly_growth,
    category_id: s.category ?? s.category_id,
  };
}

async function loadHomeData() {
  // Supabase backend (when configured)
  if (supabase) {
    try {
      const { data: tools } = await supabase
        .from("servers").select("*").eq("published", true)
        .order("installs", { ascending: false }).limit(6);
      return { tools: tools?.length ? tools : SEED_TOOLS, stats: SEED_STATS, catCounts: null };
    } catch {
      return { tools: SEED_TOOLS, stats: SEED_STATS, catCounts: null };
    }
  }
  // Default deployment: pull live data from the Express API so the homepage
  // reflects the real catalog (not the bundled seed). Falls back to seed if the
  // API is unreachable.
  try {
    const [serversRes, stats, cats] = await Promise.all([
      fetchServers({ sort: "installs", limit: 6 }),
      fetchStats(),
      fetchCategories(),
    ]);
    const tools = (serversRes.servers || []).map(normalizeTool);
    const catCounts = {};
    for (const c of cats || []) catCounts[c.id] = c.count;
    return {
      tools: tools.length ? tools : SEED_TOOLS,
      stats: {
        total_tools: stats.server_count ?? tools.length,
        total_installs: stats.total_installs ?? 0,
        total_revenue: Math.round((stats.total_monthly_revenue ?? 0) / 100), // ¢ → $
        total_developers: stats.publisher_count ?? 0,
      },
      catCounts,
    };
  } catch {
    return { tools: SEED_TOOLS, stats: SEED_STATS, catCounts: null };
  }
}

const DISPLAY_CATEGORIES = SEED_CATEGORIES.filter((c) => c.id !== "all");

function formatCount(v) {
  const n = Number(v) || 0;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toLocaleString();
}

function formatRevenue(v) {
  const n = Number(v) || 0;
  if (n <= 0) return "$0";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

const STAT_ITEMS = [
  { icon: Package,    key: "total_tools",      label: "Tools listed",      format: (v) => formatCount(v) },
  { icon: Download,   key: "total_installs",    label: "Installs tracked",  format: (v) => formatCount(v) },
  { icon: DollarSign, key: "total_revenue",     label: "Publisher payouts", format: (v) => `${formatRevenue(v)}/mo` },
  { icon: Users,      key: "total_developers",  label: "Publishers",        format: (v) => formatCount(v) },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [tools, setTools] = useState(SEED_TOOLS);
  const [stats, setStats] = useState(SEED_STATS);
  const [catCounts, setCatCounts] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadHomeData().then(({ tools: t, stats: s, catCounts: cc }) => {
      setTools(t);
      if (s) setStats(s);
      setCatCounts(cc);
    });
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) navigate(`/marketplace?q=${encodeURIComponent(search.trim())}`);
    else navigate("/marketplace");
  }

  const featured = tools.slice(0, 6);
  const countByCategory = (catId) =>
    catCounts ? (catCounts[catId] || 0) : SEED_TOOLS.filter((t) => t.category_id === catId).length;

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
            background: "radial-gradient(ellipse at center, rgba(34, 211, 238,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", maxWidth: "760px", margin: "0 auto" }}>
          {/* Live badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 16px",
              background: "rgba(34, 211, 238,0.08)",
              border: "1px solid rgba(34, 211, 238,0.2)",
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
                color: "#67e8f9",
                letterSpacing: "0.06em",
              }}
            >
              TRUST SCORE · 85% PAYOUTS · ONE-CLICK INSTALL
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(36px, 6.5vw, 68px)",
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: "-2.2px",
              marginBottom: "20px",
              color: "var(--text-primary)",
            }}
          >
            The trusted marketplace for{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #a5f3fc 0%, #22d3ee 50%, #14b8a6 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              MCP tools
            </span>
          </h1>

          <p
            style={{
              fontSize: "17px",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              marginBottom: "40px",
              maxWidth: "560px",
              margin: "0 auto 40px",
            }}
          >
            Every listing gets a <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>computed Trust Score</strong> — not a vanity badge.
            Install into Claude, Cursor, or VS Code in one click. Publishers keep{" "}
            <span style={{ color: "#67e8f9" }}>85%</span> via Stripe Connect.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "0", maxWidth: "520px", margin: "0 auto 20px" }} className="hero-search">
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
                  background: "#12121c",
                  border: "1px solid #2e2e44",
                  borderRight: "none",
                  borderRadius: "12px 0 0 12px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
                aria-label="Search MCP tools"
              />
            </div>
            <button
              type="submit"
              style={{
                padding: "14px 22px",
                background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
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

          {/* Primary CTAs */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "28px" }}>
            <a
              href="/marketplace"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 20px",
                background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(34, 211, 238,0.25)",
              }}
            >
              Browse marketplace <ArrowRight size={14} />
            </a>
            <a
              href="/submit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 20px",
                background: "transparent",
                border: "1px solid rgba(34, 211, 238,0.35)",
                borderRadius: "10px",
                color: "#a5f3fc",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Publish a tool — keep 85%
            </a>
            <a
              href="/pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 20px",
                background: "transparent",
                border: "1px solid #2e2e44",
                borderRadius: "10px",
                color: "var(--text-secondary)",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              See pricing
            </a>
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
            {["GitHub MCP", "Postgres MCP", "Stripe MCP", "Slack MCP"].map((name) => (
              <button
                key={name}
                onClick={() => navigate(`/marketplace?q=${encodeURIComponent(name)}`)}
                style={{
                  padding: "5px 12px",
                  background: "#12121c",
                  border: "1px solid #1d1d2b",
                  borderRadius: "100px",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(34, 211, 238,0.3)";
                  e.currentTarget.style.color = "#a5f3fc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1d1d2b";
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
          borderTop: "1px solid #1d1d2b",
          borderBottom: "1px solid #1d1d2b",
          padding: "32px 24px",
          background: "#0d0d15",
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
                borderRight: i < STAT_ITEMS.length - 1 ? "1px solid #1d1d2b" : "none",
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
                <Icon size={14} color="#22d3ee" />
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
        <p style={{ textAlign: "center", marginTop: "14px", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          Live catalog stats — no vanity metrics
        </p>
      </section>

      {/* ─── Why MCPX (trust-first value prop) ─────────────────────────────────── */}
      <section style={{ padding: "64px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "30px", letterSpacing: "-0.5px", marginBottom: "10px" }}>
            Why MCPX
          </h2>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", maxWidth: "580px", margin: "0 auto", lineHeight: 1.6 }}>
            Three things no generic MCP directory gives you: <em>computed</em> trust,
            real payouts, and install configs that just work.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {[
            {
              icon: ShieldCheck, color: "#10b981",
              title: "Trust you can verify",
              body: "Every server gets a transparent Trust Score (0–100) from real signals — source, license, adoption, reviews, and capability risk — with every point explained. Not a badge someone toggled.",
            },
            {
              icon: CreditCard, color: "#22d3ee",
              title: "Builders get paid (85%)",
              body: "List a paid tool, connect Stripe once, and keep 85% of every sale. Monthly Connect payouts are live today. Solana Pay is on the roadmap — labeled Coming soon, not sold as ready.",
            },
            {
              icon: Bot, color: "#7dd3fc",
              title: "One-click for agents & IDEs",
              body: "Copy-ready configs for Claude Desktop, Cursor, and VS Code — plus machine-readable trust at /api/servers/:slug/trust so an agent can vet a tool before it installs.",
            },
          ].map(({ icon: Icon, color, title, body }) => (
            <div key={title} style={{ background: "#12121c", border: "1px solid #1d1d2b", borderRadius: "16px", padding: "24px" }}>
              <div style={{ width: 40, height: 40, borderRadius: "10px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}>
                <Icon size={20} color={color} />
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "17px", marginBottom: "8px" }}>{title}</h3>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>{body}</p>
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
              Top installs this week — each with a computed Trust Score
            </p>
          </div>
          <a
            href="/marketplace"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "13px",
              color: "#67e8f9",
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

      {/* ─── Pricing / Revenue model ──────────────────────────────────────────── */}
      <RevenueSection onAuthClick={() => navigate("/login")} />

      {/* ─── CTA Banner ───────────────────────────────────────────────────────── */}
      <section
        style={{
          margin: "0 24px 80px",
          maxWidth: "1100px",
          marginLeft: "auto",
          marginRight: "auto",
          background: "linear-gradient(135deg, rgba(34, 211, 238,0.15) 0%, rgba(139,92,246,0.1) 100%)",
          border: "1px solid rgba(34, 211, 238,0.25)",
          borderRadius: "20px",
          padding: "52px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
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
            maxWidth: "440px",
            margin: "0 auto 28px",
            lineHeight: 1.65,
          }}
        >
          Free to list. Paid tools keep 85%. Connect Stripe once — payouts land in your account on the 1st of each month.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(34, 211, 238,0.3)",
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
              border: "1px solid rgba(34, 211, 238,0.3)",
              borderRadius: "10px",
              color: "#a5f3fc",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Open Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
