import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, Package, DollarSign, Users, TrendingUp,
  Download, Star, CreditCard, ExternalLink, Plus, AlertCircle
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import PriceTag from "../components/PriceTag";
import { SEED_TOOLS } from "../data/seed";
import { fetchServers } from "../api/client";

// Mock dashboard data for demo / no-auth mode
const MOCK_TOOLS = SEED_TOOLS.slice(0, 3);
const MOCK_STATS = {
  total_revenue: 4820,
  monthly_revenue: 580,
  total_installs: 89400,
  subscribers: 48,
  tools_count: 3,
};

async function loadDashboard(userId) {
  if (!userId) return { tools: MOCK_TOOLS, stats: MOCK_STATS };
  try {
    const data = await fetchServers({ limit: 50 });
    const tools = data.servers || [];

    if (!tools.length) return { tools: MOCK_TOOLS, stats: MOCK_STATS };

    const totalInstalls = tools.reduce((s, t) => s + (t.installs || 0), 0);
    const monthlyRevenue = tools
      .filter((t) => t.price_type === "paid")
      .reduce((s, t) => s + (t.revenue_monthly || 0), 0);

    return {
      tools,
      stats: {
        total_revenue: monthlyRevenue * 6,
        monthly_revenue: monthlyRevenue,
        total_installs: totalInstalls,
        subscribers: Math.round(monthlyRevenue / 12),
        tools_count: tools.length,
      },
    };
  } catch {
    return { tools: MOCK_TOOLS, stats: MOCK_STATS };
  }
}

function StatCard({ icon: Icon, label, value, sub, color = "#6366f1" }) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1e1e1e",
        borderRadius: "14px",
        padding: "22px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: "8px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "26px", marginBottom: "4px" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [tools, setTools] = useState([]);
  const [stats, setStats] = useState(MOCK_STATS);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDemoMode(true);
      setTools(MOCK_TOOLS);
      setStats(MOCK_STATS);
      setLoading(false);
      return;
    }
    loadDashboard(user.id).then(({ tools: t, stats: s }) => {
      setTools(t);
      setStats(s);
      setLoading(false);
    });
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "80px auto", padding: "0 24px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
        Loading dashboard…
      </div>
    );
  }

  return (
    <main id="main-content" style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "28px", letterSpacing: "-0.5px", marginBottom: "6px" }}>
            {user ? `@${user.username || user.email?.split("@")[0]}'s Dashboard` : "Dashboard Preview"}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {demoMode ? "Sign in to see your real metrics" : "Track your tools, revenue, and subscribers"}
          </p>
        </div>
        <Link
          to="/submit"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 20px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "10px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 0 20px rgba(99,102,241,0.25)",
          }}
        >
          <Plus size={14} />
          Submit Tool
        </Link>
      </div>

      {demoMode && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            padding: "14px 18px",
            background: "rgba(245,158,11,0.07)",
            border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: "12px",
            marginBottom: "28px",
          }}
        >
          <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Showing demo data.{" "}
            <Link to="/login" style={{ color: "#818cf8", textDecoration: "none", fontWeight: 600 }}>
              Sign in with GitHub
            </Link>{" "}
            to see your own tools and revenue.
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "12px",
          marginBottom: "32px",
        }}
        className="stats-grid"
      >
        <StatCard icon={Package}    label="Tools Listed"       value={stats.tools_count}                      sub="published & pending"       color="#6366f1" />
        <StatCard icon={DollarSign} label="Monthly Revenue"    value={`$${stats.monthly_revenue.toLocaleString()}`} sub={`$${(stats.monthly_revenue * 0.85).toLocaleString()} after 15% fee`} color="#10b981" />
        <StatCard icon={Download}   label="Total Installs"     value={`${(stats.total_installs / 1000).toFixed(1)}K`} sub="all time"              color="#3b82f6" />
        <StatCard icon={Users}      label="Subscribers"        value={stats.subscribers}                       sub="active this month"         color="#a78bfa" />
      </div>

      {/* Revenue placeholder chart */}
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px" }}>Revenue (last 6 months)</h2>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            Total: ${stats.total_revenue.toLocaleString()}
          </span>
        </div>
        {/* Placeholder bar chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px" }}>
          {[38, 52, 44, 68, 80, 100].map((pct, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "100%",
                  height: `${pct}%`,
                  background: i === 5
                    ? "linear-gradient(180deg, #6366f1, #8b5cf6)"
                    : "rgba(99,102,241,0.2)",
                  borderRadius: "5px 5px 0 0",
                  border: i === 5 ? "1px solid rgba(99,102,241,0.5)" : "1px solid #222",
                  transition: "background 0.15s",
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
          {["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"].map((m) => (
            <span key={m} style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", flex: 1, textAlign: "center" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Tools table */}
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "14px",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1a1a1a" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px" }}>Your Tools</h2>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{tools.length} total</span>
        </div>

        {tools.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "16px" }}>No tools published yet.</p>
            <Link
              to="/submit"
              style={{ color: "#818cf8", fontSize: "13px", textDecoration: "none" }}
            >
              Submit your first tool →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                  {["Tool", "Category", "Installs", "Rating", "Revenue", "Price", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "9px", background: tool.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                          {tool.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{tool.name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>@{tool.author_name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "capitalize" }}>{tool.category_id}</span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        <Download size={12} color="var(--text-muted)" />
                        {(tool.installs / 1000).toFixed(1)}K
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        <Star size={11} fill="#f59e0b" color="#f59e0b" />
                        {tool.rating}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: tool.revenue_monthly ? "#10b981" : "var(--text-muted)" }}>
                        {tool.revenue_monthly ? `$${tool.revenue_monthly.toLocaleString()}/mo` : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <PriceTag tool={tool} size="sm" />
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <Link
                        to={`/tool/${tool.slug}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#818cf8", textDecoration: "none" }}
                      >
                        View <ExternalLink size={11} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stripe payout section */}
      <div
        style={{
          background: "#111",
          border: "1px solid #1e1e1e",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>Payouts</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Receive monthly payouts via Stripe Connect</p>
          </div>
          <div style={{ width: 36, height: 36, background: "rgba(99,102,241,0.1)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CreditCard size={16} color="#818cf8" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }} className="payout-grid">
          <div style={{ padding: "16px", background: "#0d0d0d", borderRadius: "10px", border: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Available Balance</div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "22px", color: "#10b981" }}>
              ${(stats.monthly_revenue * 0.85).toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>after 15% platform fee</div>
          </div>
          <div style={{ padding: "16px", background: "#0d0d0d", borderRadius: "10px", border: "1px solid #1a1a1a" }}>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Payout</div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "22px" }}>Mar 1</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>monthly automatic</div>
          </div>
        </div>

        {/* TODO: Stripe Connect onboarding */}
        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "10px",
            color: "#a5b4fc",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.15s",
          }}
          onClick={() => {
            // TODO: Redirect to Stripe Connect onboarding URL
            alert("Stripe Connect onboarding coming soon! Check back after tool approval.");
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.14)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(99,102,241,0.08)")}
        >
          <CreditCard size={14} />
          {/* TODO: Show "Manage Stripe Account" if already connected */}
          Connect Stripe for Payouts
        </button>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "10px", fontFamily: "var(--font-mono)" }}>
          Powered by Stripe Connect · Payouts every 1st of the month
        </p>
      </div>
    </main>
  );
}
