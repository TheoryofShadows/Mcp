import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  getBillingStatus,
  createPortalSession,
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  fetchPublisherStats,
} from "../api/client";

const TABS = ["Overview", "My Servers", "API Keys", "Billing"];

export default function DashboardPage({ onAuthClick }) {
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("Overview");
  const [billing, setBilling] = useState(null);
  const [servers, setServers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyLoading, setKeyLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const upgraded = searchParams.get("upgraded") === "true";

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [billingData, statsData, keysData] = await Promise.allSettled([
        getBillingStatus(),
        fetchPublisherStats(),
        fetchApiKeys(),
      ]);
      if (billingData.status === "fulfilled") setBilling(billingData.value);
      if (statsData.status === "fulfilled") setServers(statsData.value.servers || []);
      if (keysData.status === "fulfilled") setKeys(keysData.value.keys || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (upgraded) {
      refreshUser?.();
      setMsg("Your plan has been upgraded! Welcome to the new tier.");
      setActiveTab("Overview");
    }
  }, [upgraded, refreshUser]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (!user) {
    return (
      <div style={{ padding: "80px var(--section-px)", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
          Sign in to access your dashboard.
        </p>
        <button className="btn btn-gradient" onClick={onAuthClick}>Sign In</button>
      </div>
    );
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setMsg(err.message);
      setPortalLoading(false);
    }
  }

  async function handleCreateKey(e) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setKeyLoading(true);
    setNewKeyResult(null);
    try {
      const result = await createApiKey(newKeyName.trim());
      setNewKeyResult(result);
      setKeys((prev) => [{ ...result, call_count: 0 }, ...prev]);
      setNewKeyName("");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setKeyLoading(false);
    }
  }

  async function handleRevokeKey(id) {
    try {
      await revokeApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setMsg(err.message);
    }
  }

  const tierColor = {
    starter: "var(--accent-blue)",
    pro: "var(--accent-electric)",
    enterprise: "var(--accent-purple)",
  }[user.tier || "starter"];

  const tierLabel = { starter: "Starter", pro: "Pro", enterprise: "Enterprise" }[user.tier || "starter"];

  return (
    <div style={{ padding: "40px var(--section-px)", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-2xl)", fontWeight: 800, marginBottom: "4px" }}>
              @{user.username}
            </h1>
            <span style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)",
              color: tierColor, border: `1px solid ${tierColor}`,
              padding: "2px 10px", borderRadius: "var(--radius-pill)", textTransform: "uppercase",
            }}>
              {tierLabel}
            </span>
          </div>
        </div>
        {msg && (
          <div style={{
            marginTop: "var(--space-md)", padding: "var(--space-sm) var(--space-md)",
            background: "rgba(77, 255, 180, 0.08)", border: "1px solid rgba(77, 255, 180, 0.25)",
            borderRadius: "var(--radius-lg)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
            color: "var(--accent-electric)",
          }}>
            {msg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "var(--space-xl)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px", border: "none", cursor: "pointer",
              fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
              background: "transparent",
              color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              borderBottom: activeTab === tab ? "2px solid var(--accent-electric)" : "2px solid transparent",
              marginBottom: "-1px", transition: "color 0.15s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>
          Loading...
        </div>
      )}

      {/* ─── Overview Tab ─── */}
      {!loading && activeTab === "Overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-md)" }}>
            {[
              { label: "Servers Published", value: servers.length },
              { label: "Total Installs", value: servers.reduce((s, x) => s + (x.installs_total || 0), 0) },
              { label: "API Keys", value: keys.length },
              { label: "Avg Rating", value: servers.length ? (servers.reduce((s, x) => s + x.rating, 0) / servers.length).toFixed(1) : "—" },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)", padding: "var(--space-md)",
              }}>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-2xl)", fontWeight: 800, color: "var(--accent-electric)" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", marginTop: "4px" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Plan info */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", padding: "var(--space-lg)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "var(--space-md)" }}>
              Current Plan
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-xl)", fontWeight: 700, color: tierColor }}>
                  {tierLabel}
                </div>
                {billing?.subscription?.current_period_end && (
                  <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)", marginTop: "4px" }}>
                    Renews {new Date(billing.subscription.current_period_end).toLocaleDateString()}
                    {billing.subscription.cancel_at_period_end ? " (cancels at end)" : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                {user.tier === "starter" ? (
                  <Link to="/revenue" className="btn btn-gradient" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                    Upgrade Plan
                  </Link>
                ) : (
                  <button className="btn btn-outline-green" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading ? "Loading..." : "Manage Billing"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap" }}>
            <Link to="/publish" className="btn btn-outline-green" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              + Publish Server
            </Link>
            <button className="btn btn-outline-green" onClick={() => setActiveTab("My Servers")}>View My Servers</button>
            <button className="btn btn-outline-green" onClick={() => setActiveTab("API Keys")}>Manage API Keys</button>
          </div>
        </div>
      )}

      {/* ─── My Servers Tab ─── */}
      {!loading && activeTab === "My Servers" && (
        <div>
          {servers.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
                You haven&#39;t published any servers yet.
              </p>
              <Link to="/publish" className="btn btn-gradient" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Publish Your First Server
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              {servers.map((s) => (
                <div key={s.id} style={{
                  background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-xl)", padding: "var(--space-lg)",
                  display: "flex", gap: "var(--space-lg)", alignItems: "flex-start", flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <Link to={`/servers/${s.slug}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px" }}>
                        {s.name}
                      </div>
                    </Link>
                    <div style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>{s.description}</div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-xl)", flexShrink: 0 }}>
                    {[
                      { label: "Installs", value: s.installs_total || s.installs || 0 },
                      { label: "7d", value: s.installs_7d || 0 },
                      { label: "30d", value: s.installs_30d || 0 },
                      { label: "Rating", value: s.rating > 0 ? `${s.rating}★` : "—" },
                    ].map((stat) => (
                      <div key={stat.label} style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--font-lg)", color: "var(--accent-electric)" }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── API Keys Tab ─── */}
      {!loading && activeTab === "API Keys" && (
        <div>
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-sm)", marginBottom: "var(--space-lg)" }}>
            Use API keys to authenticate your MCP servers and integrations.
            Keys are shown once — store them securely.
          </p>

          {/* Create new key form */}
          <form onSubmit={handleCreateKey} style={{
            background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)", padding: "var(--space-lg)", marginBottom: "var(--space-lg)",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "var(--space-md)" }}>
              Generate New Key
            </div>
            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <input
                type="text"
                placeholder="Key name (e.g. Production, CI)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                style={{
                  flex: 1, padding: "10px 14px",
                  background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
                }}
              />
              <button type="submit" className="btn btn-gradient" disabled={keyLoading || !newKeyName.trim()}>
                {keyLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>

          {/* Show newly created key */}
          {newKeyResult && (
            <div style={{
              background: "rgba(77, 255, 180, 0.06)", border: "1px solid rgba(77, 255, 180, 0.3)",
              borderRadius: "var(--radius-xl)", padding: "var(--space-lg)", marginBottom: "var(--space-lg)",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--accent-electric)", textTransform: "uppercase", marginBottom: "var(--space-sm)" }}>
                Copy your key now — it won&#39;t be shown again
              </div>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)",
                background: "var(--bg-secondary)", padding: "10px 14px",
                borderRadius: "var(--radius-md)", wordBreak: "break-all",
                color: "var(--text-primary)", userSelect: "all",
              }}>
                {newKeyResult.key}
              </div>
              <button
                className="btn btn-outline-green"
                style={{ marginTop: "var(--space-sm)" }}
                onClick={() => { navigator.clipboard?.writeText(newKeyResult.key); }}
              >
                Copy to Clipboard
              </button>
            </div>
          )}

          {/* Key list */}
          {keys.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)" }}>
              No API keys yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {keys.map((k) => (
                <div key={k.id} style={{
                  background: "var(--bg-card)", border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)", padding: "14px var(--space-md)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-md)", flexWrap: "wrap",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--font-sm)", marginBottom: "2px" }}>{k.name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                      {k.key_prefix}... &nbsp;·&nbsp; {k.call_count || 0} calls
                      {k.last_used_at ? ` &nbsp;·&nbsp; last used ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    style={{
                      background: "transparent", border: "1px solid var(--accent-pink)",
                      color: "var(--accent-pink)", borderRadius: "var(--radius-md)",
                      padding: "4px 12px", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)",
                    }}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Billing Tab ─── */}
      {!loading && activeTab === "Billing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", padding: "var(--space-lg)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "var(--space-md)" }}>
              Subscription
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "var(--font-2xl)", fontWeight: 800, color: tierColor, marginBottom: "var(--space-sm)" }}>
              {tierLabel}
            </div>
            {billing?.subscription ? (
              <>
                <div style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
                  {billing.subscription.cancel_at_period_end
                    ? `Cancels on ${new Date(billing.subscription.current_period_end).toLocaleDateString()}`
                    : `Renews on ${new Date(billing.subscription.current_period_end).toLocaleDateString()}`}
                </div>
                <button className="btn btn-outline-green" onClick={handlePortal} disabled={portalLoading}>
                  {portalLoading ? "Loading..." : "Manage Billing & Invoices"}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: "var(--font-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-md)" }}>
                  You&#39;re on the free Starter plan.
                </p>
                <Link to="/revenue" className="btn btn-gradient" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  Upgrade to Pro
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
