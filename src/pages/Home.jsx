import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Zap, ArrowRight, Package, Download, DollarSign, Users, ShieldCheck, Bot } from "lucide-react";
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

const STAT_ITEMS = [
  { icon: Package,   key: "total_tools",     label: "Tools Published",  format: (v) => v.toLocaleString() },
  { icon: Download,  key: "total_installs",   label: "Total Installs",   format: (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M+` : `${(v / 1000).toFixed(0)}K+`) },
  { icon: DollarSign,key: "total_revenue",    label: "Creator Revenue",  format: (v) => `$${(v / 1000).toFixed(1)}K/mo` },
  { icon: Users,     key: "total_developers", label: "Developers",       format: (v) => `${v.toLocaleString()}+` },
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
            background: "radial-gradient(ellipse at center, rgba(124, 108, 255,0.12) 0%, transparent 70%)",
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
              background: "rgba(124, 108, 255,0.08)",
              border: "1px solid rgba(124, 108, 255,0.2)",
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
                color: "#a594ff",
                letterSpacing: "0.06em",
              }}
            >
              {stats.total_tools || SEED_TOOLS.length} MCP TOOLS &amp; GROWING
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
                background: "linear-gradient(135deg, #b9adff 0%, #7c6cff 50%, #a855f7 100%)",
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
            <span style={{ color: "#a594ff" }}>15% fee model.</span>
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
                  background: "#12121c",
                  border: "1px solid #2e2e44",
                  borderRight: "none",
                  borderRadius: "12px 0 0 12px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124, 108, 255,0.4)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#2e2e44")}
                aria-label="Search MCP tools"
              />
            </div>
            <button
              type="submit"
              style={{
                padding: "14px 22px",
                background: "linear-gradient(135deg, #7c6cff, #a855f7)",
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
                  e.currentTarget.style.borderColor = "rgba(124, 108, 255,0.3)";
                  e.currentTarget.style.color = "#b9adff";
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
                <Icon size={14} color="#7c6cff" />
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

      {/* ─── Why MCPX (trust-first value prop) ─────────────────────────────────── */}
      <section style={{ padding: "64px 24px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "30px", letterSpacing: "-0.5px", marginBottom: "10px" }}>
            Why MCPX
          </h2>
          <p style={{ fontSize: "15px", color: "var(--text-muted)", maxWidth: "560px", margin: "0 auto", lineHeight: 1.6 }}>
            The trust-first marketplace for MCP — where safety is <em>computed</em>, not claimed,
            and builders actually get paid.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {[
            {
              icon: ShieldCheck, color: "#10b981",
              title: "Trust you can verify",
              body: "Every server gets a transparent Trust Score (0–100) computed from real signals — source, license, adoption, reviews, and capability risk — with every point explained. Not a badge someone toggled.",
            },
            {
              icon: DollarSign, color: "#7c6cff",
              title: "Builders get paid",
              body: "List a paid tool and keep 85%. Real Stripe payouts to publishers, not just exposure — monetization is built in, not bolted on.",
            },
            {
              icon: Bot, color: "#a78bfa",
              title: "Built for agents",
              body: "Machine-readable trust at /api/servers/:slug/trust and a live discovery feed, so an agent can vet a tool before it installs — plus one-click install for Claude, Cursor, and VS Code.",
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
              color: "#a594ff",
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
          background: "linear-gradient(135deg, rgba(124, 108, 255,0.15) 0%, rgba(139,92,246,0.1) 100%)",
          border: "1px solid rgba(124, 108, 255,0.25)",
          borderRadius: "20px",
          padding: "52px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            background: "linear-gradient(135deg, #7c6cff, #a855f7)",
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
              background: "linear-gradient(135deg, #7c6cff, #a855f7)",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 0 24px rgba(124, 108, 255,0.3)",
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
              border: "1px solid rgba(124, 108, 255,0.3)",
              borderRadius: "10px",
              color: "#b9adff",
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
