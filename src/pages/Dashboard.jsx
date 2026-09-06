import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package, DollarSign, Download, Star, CreditCard, ExternalLink, Plus, AlertCircle,
  ShieldCheck, ShieldAlert
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import PriceTag from "../components/PriceTag";
import VerifyRepoModal from "../components/VerifyRepoModal";
import { SEED_TOOLS } from "../data/seed";
import { supabase } from "../lib/supabase";
import { fetchServers, getMe, connectStripe, fetchEarnings } from "../api/client";

// Mock dashboard data for demo / no-auth mode
const MOCK_TOOLS = SEED_TOOLS.filter((t) => ["github-mcp", "filesystem-mcp", "postgres-mcp"].includes(t.slug));
const MOCK_STATS = {
  monthly_revenue: 580,
  total_installs: 89400,
  avg_rating: 4.7,
  tools_count: 3,
};

// Compute the last 6 calendar months ending at the current month
function getLastSixMonths() {
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(months[d.getMonth()]);
  }
  return result;
}

// Compute the next payout date (1st of next month if past the 15th, else 1st of this month)
function getNextPayoutDate() {
  const now = new Date();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // If we're past the 15th, next payout is 1st of next month, else 1st of this month
  let month, year;
  if (now.getDate() > 15) {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    month = months[next.getMonth()];
    year = next.getFullYear();
  } else {
    month = months[now.getMonth()];
    year = now.getFullYear();
  }
  return `${month} 1${year !== now.getFullYear() ? `, ${year}` : ""}`;
}

async function loadDashboard(user) {
  if (!user) return { tools: MOCK_TOOLS, stats: MOCK_STATS };

  // Supabase mode
  if (supabase) {
    try {
      const { data: tools } = await supabase
        .from("servers")
        .select("*")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });

      if (!tools?.length) return { tools: MOCK_TOOLS, stats: MOCK_STATS };

      const totalInstalls = tools.reduce((s, t) => s + (t.installs || 0), 0);
      const monthlyRevenue = tools
        .filter((t) => t.price_type === "paid")
        .reduce((s, t) => s + (t.revenue_monthly || 0), 0);

      const ratedTools = tools.filter((t) => t.rating);
      const avgRating = ratedTools.length ? ratedTools.reduce((s, t) => s + t.rating, 0) / ratedTools.length : null;
      return {
        tools,
        stats: {
          monthly_revenue: monthlyRevenue,
          total_installs: totalInstalls,
          avg_rating: avgRating,
          tools_count: tools.length,
        },
      };
    } catch {
      return { tools: MOCK_TOOLS, stats: MOCK_STATS };
    }
  }

  // JWT / Express API mode
  try {
    const [me, serversData] = await Promise.all([
      getMe(),
      fetchServers({ author: user.username, limit: 50 }),
    ]);

    const apiTools = (serversData.servers || []).map((s) => ({
      ...s,
      author_name: s.author_display_name || s.author,
      category_id: s.category,
      // Parse revenue string like "$500/mo" → 500; null if free
      revenue_monthly: s.revenue ? Number(s.revenue.replace(/[^0-9.]/g, "")) || 0 : 0,
    }));

    const totalMonthlyRevenue = apiTools.reduce((sum, t) => sum + (t.revenue_monthly || 0), 0);

    const ratedApiTools = apiTools.filter((t) => t.rating);
    const avgRating = ratedApiTools.length ? ratedApiTools.reduce((s, t) => s + t.rating, 0) / ratedApiTools.length : null;
    return {
      tools: apiTools,
      stats: {
        tools_count: me.server_count ?? apiTools.length,
        total_installs: me.total_installs ?? apiTools.reduce((s, t) => s + (t.installs || 0), 0),
        monthly_revenue: totalMonthlyRevenue,
        avg_rating: avgRating,
      },
    };
  } catch {
    return { tools: [], stats: { tools_count: 0, total_installs: 0, monthly_revenue: 0, avg_rating: null } };
  }
}

function StatCard({ icon: Icon, label, value, sub, color = "#22d3ee" }) {
  return (
    <div
      style={{
        background: "#12121c",
        border: "1px solid #1d1d2b",
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
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(!!user?.stripe_connected || !!user?.stripe_onboarding_done);
  useEffect(() => {
    setStripeConnected(!!user?.stripe_connected || !!user?.stripe_onboarding_done);
  }, [user?.stripe_connected, user?.stripe_onboarding_done]);
  const [verifyTool, setVerifyTool] = useState(null);
  const [earnings, setEarnings] = useState(null);

  const chartMonths = getLastSixMonths();
  const nextPayout = getNextPayoutDate();

  // Real earned revenue (cents → dollars), as a last-6-months net series aligned
  // to chartMonths. Falls back to the listed-revenue estimate when no sales yet.
  const now = new Date();
  const last6Keys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const netSeries = last6Keys.map((k) => (earnings?.by_month?.find((m) => m.month === k)?.net_cents || 0) / 100);
  const maxNet = Math.max(1, ...netSeries);
  const hasEarnings = !!earnings && earnings.sales_count > 0;
  const thisMonthNet = (earnings?.this_month_net_cents || 0) / 100;
  const totalNet = (earnings?.total_net_cents || 0) / 100;
  const availableBalance = hasEarnings ? totalNet : stats.monthly_revenue * 0.85;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setDemoMode(true);
      setTools(MOCK_TOOLS);
      setStats(MOCK_STATS);
      setLoading(false);
      return;
    }
    setDemoMode(false);
    loadDashboard(user).then(({ tools: t, stats: s }) => {
      setTools(t);
      setStats(s);
      setLoading(false);
    });
    // Real earned revenue (from completed sales) — best-effort.
    fetchEarnings().then(setEarnings).catch(() => setEarnings(null));
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div role="status" aria-live="polite" style={{ maxWidth: "1100px", margin: "80px auto", padding: "0 24px", textAlign: "center", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
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
            background: "linear-gradient(135deg, #22d3ee, #14b8a6)",
            borderRadius: "10px",
            color: "#fff",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 0 20px rgba(34, 211, 238,0.25)",
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
            background: "rgba(251, 191, 36,0.07)",
            border: "1px solid rgba(251, 191, 36,0.18)",
            borderRadius: "12px",
            marginBottom: "28px",
          }}
        >
          <AlertCircle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Showing demo data.{" "}
            <Link to="/login" style={{ color: "#67e8f9", textDecoration: "none", fontWeight: 600 }}>
              Sign in
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
        <StatCard icon={Package}    label="Tools Listed"       value={stats.tools_count}                                               sub="published & pending"              color="#22d3ee" />
        <StatCard icon={DollarSign} label="Monthly Revenue"    value={`$${stats.monthly_revenue.toLocaleString()}`}                    sub={`$${(stats.monthly_revenue * 0.85).toLocaleString()} after 15% fee`} color="#10b981" />
        <StatCard icon={Download}   label="Total Installs"     value={stats.total_installs >= 1000 ? `${(stats.total_installs / 1000).toFixed(1)}K` : stats.total_installs} sub="all time" color="#3b82f6" />
        <StatCard icon={Star}       label="Avg Rating"         value={stats.avg_rating ? stats.avg_rating.toFixed(1) : "—"}            sub="across all tools"                 color="#7dd3fc" />
      </div>

      {/* Revenue placeholder chart */}
      <div
        style={{
          background: "#12121c",
          border: "1px solid #1d1d2b",
          borderRadius: "14px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px" }}>
            {hasEarnings ? "Net revenue (last 6 months)" : "Revenue (last 6 months)"}
          </h2>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            This month: ${hasEarnings ? thisMonthNet.toLocaleString() : stats.monthly_revenue.toLocaleString()}
          </span>
        </div>
        {/* Real net-revenue bars when sales exist; demo bars otherwise */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px" }}>
          {(hasEarnings ? netSeries.map((v) => Math.round((v / maxNet) * 100)) : [38, 52, 44, 68, 80, 100]).map((pct, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
              <div
                title={hasEarnings ? `$${netSeries[i].toLocaleString()} net` : undefined}
                style={{
                  width: "100%",
                  height: `${pct}%`,
                  background: i === 5
                    ? "linear-gradient(180deg, #22d3ee, #14b8a6)"
                    : "rgba(34, 211, 238,0.2)",
                  borderRadius: "5px 5px 0 0",
                  border: i === 5 ? "1px solid rgba(34, 211, 238,0.5)" : "1px solid #1d1d2b",
                  transition: "background 0.15s",
                }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
          {chartMonths.map((m) => (
            <span key={m} style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", flex: 1, textAlign: "center" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Tools table */}
      <div
        style={{
          background: "#12121c",
          border: "1px solid #1d1d2b",
          borderRadius: "14px",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1d1d2b" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px" }}>Your Tools</h2>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{tools.length} total</span>
        </div>

        {tools.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "16px" }}>No tools published yet.</p>
            <Link
              to="/submit"
              style={{ color: "#67e8f9", fontSize: "13px", textDecoration: "none" }}
            >
              Submit your first tool →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1d1d2b" }}>
                  {["Tool", "Category", "Installs", "Rating", "Revenue", "Price", "Source", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tools.map((tool) => (
                  <tr key={tool.id} style={{ borderBottom: "1px solid #1d1d2b" }}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "9px", background: tool.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#fff", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                          {tool.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>{tool.name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>@{tool.author_name || tool.author}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "capitalize" }}>{tool.category_id || tool.category}</span>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        <Download size={12} color="var(--text-muted)" />
                        {tool.installs >= 1000 ? `${(tool.installs / 1000).toFixed(1)}K` : tool.installs}
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        <Star size={11} fill="#fbbf24" color="#fbbf24" />
                        {tool.rating ? tool.rating.toFixed(1) : "—"}
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
                      {demoMode ? (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>—</span>
                      ) : tool.repo_verified ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#10b981", fontFamily: "var(--font-mono)" }}>
                          <ShieldCheck size={13} /> Verified
                        </span>
                      ) : tool.repo_url ? (
                        <button
                          onClick={() => setVerifyTool(tool)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontFamily: "var(--font-mono)", color: "#fbbf24", background: "rgba(251, 191, 36,0.1)", border: "1px solid rgba(251, 191, 36,0.25)", borderRadius: "6px", padding: "5px 10px", cursor: "pointer" }}
                        >
                          <ShieldAlert size={13} /> Verify
                        </button>
                      ) : (
                        <Link to={`/tool/${tool.slug}`} title="Add a repository URL to verify" style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textDecoration: "none" }}>
                          add repo →
                        </Link>
                      )}
                    </td>
                    <td style={{ padding: "16px 20px" }}>
                      <Link
                        to={`/tool/${tool.slug}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#67e8f9", textDecoration: "none" }}
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
          background: "#12121c",
          border: "1px solid #1d1d2b",
          borderRadius: "14px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>Payouts</h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Receive monthly payouts via Stripe Connect</p>
          </div>
          <div style={{ width: 36, height: 36, background: "rgba(34, 211, 238,0.1)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CreditCard size={16} color="#67e8f9" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }} className="payout-grid">
          <div style={{ padding: "16px", background: "#0d0d15", borderRadius: "10px", border: "1px solid #1d1d2b" }}>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {hasEarnings ? "Net Earned (all-time)" : "Available Balance"}
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "22px", color: "#10b981" }}>
              ${availableBalance.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>
              {hasEarnings ? `from ${earnings.sales_count} sale${earnings.sales_count === 1 ? "" : "s"}, after 15% fee` : "after 15% platform fee"}
            </div>
          </div>
          <div style={{ padding: "16px", background: "#0d0d15", borderRadius: "10px", border: "1px solid #1d1d2b" }}>
            <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Next Payout</div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "22px" }}>{nextPayout}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", fontFamily: "var(--font-mono)" }}>monthly automatic</div>
          </div>
        </div>

        <button
          style={{
            width: "100%",
            padding: "12px",
            background: "rgba(34, 211, 238,0.08)",
            border: "1px solid rgba(34, 211, 238,0.2)",
            borderRadius: "10px",
            color: "#a5f3fc",
            fontSize: "13px",
            fontWeight: 600,
            cursor: stripeLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.15s",
            opacity: stripeLoading ? 0.7 : 1,
          }}
          disabled={stripeLoading}
          onClick={async () => {
            if (!user) { window.location.href = "/login"; return; }
            setStripeLoading(true);
            try {
              const data = await connectStripe();
              if (data?.onboarding_done || data?.dashboard_url) setStripeConnected(true);
              if (data?.onboarding_url) window.location.href = data.onboarding_url;
              else if (data?.dashboard_url) window.location.href = data.dashboard_url;
            } catch (err) {
              alert(`Stripe Connect error: ${err.message}`);
            } finally {
              setStripeLoading(false);
            }
          }}
          onMouseEnter={(e) => { if (!stripeLoading) e.currentTarget.style.background = "rgba(34, 211, 238,0.14)"; }}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34, 211, 238,0.08)")}
        >
          <CreditCard size={14} />
          {stripeLoading ? (stripeConnected ? "Opening…" : "Connecting…") : (stripeConnected ? "Open Stripe Dashboard" : "Connect Stripe for Payouts")}
        </button>
        <p style={{ fontSize: "11px", color: stripeConnected ? "#10b981" : "var(--text-muted)", textAlign: "center", marginTop: "10px", fontFamily: "var(--font-mono)" }}>
          {stripeConnected
            ? "Stripe Connect linked · Payouts every 1st of the month"
            : "Powered by Stripe Connect · Payouts every 1st of the month"}
        </p>
      </div>

      {verifyTool && (
        <VerifyRepoModal
          server={verifyTool}
          onClose={() => setVerifyTool(null)}
          onVerified={(slug) => {
            setTools((prev) => prev.map((t) => (t.slug === slug ? { ...t, repo_verified: true } : t)));
          }}
        />
      )}
    </main>
  );
}
