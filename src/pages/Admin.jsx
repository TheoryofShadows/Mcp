import { useState, useEffect, useCallback } from "react";
import { Descope, useDescope, useSession, useUser } from "@descope/react-sdk";
import { Trash2, RefreshCw, Users, Server, Check, X } from "lucide-react";
import {
  adminFetchServers,
  adminFetchUsers,
  adminPatchServer,
  adminDeleteServer,
} from "../api/client";

const ADMIN_PERMISSION = import.meta.env.VITE_DESCOPE_ADMIN_PERMISSION;

const mono = { fontFamily: "var(--font-mono)", fontSize: "13px" };

const STATUS_OPTIONS = ["active", "pending", "inactive"];

const TIER_COLORS = {
  starter: "#6b7280",
  pro: "#7c6cff",
  enterprise: "#fbbf24",
};

function StatusBadge({ status }) {
  const colors = { active: "#10b981", pending: "#fbbf24", inactive: "#6b7280" };
  return (
    <span
      style={{
        ...mono,
        fontSize: "11px",
        color: colors[status] || "#6b7280",
        background: `${colors[status] || "#6b7280"}18`,
        border: `1px solid ${colors[status] || "#6b7280"}40`,
        borderRadius: "5px",
        padding: "2px 8px",
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      style={{
        width: 32,
        height: 18,
        borderRadius: "9px",
        border: "none",
        background: value ? "#7c6cff" : "#2e2e44",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: value ? 16 : 2,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
        }}
      />
    </button>
  );
}

function ServersTab() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchServers();
      setServers(data.servers || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function patch(id, updates) {
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await adminPatchServer(id, updates);
      setServers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  async function remove(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      await adminDeleteServer(id);
      setServers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  if (loading) return <div style={{ ...mono, color: "var(--text-muted)", padding: "32px 0" }}>Loading servers…</div>;
  if (error) return <div style={{ ...mono, color: "#f87171", padding: "32px 0" }}>Error: {error}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ ...mono, fontSize: "12px", color: "var(--text-muted)" }}>{servers.length} servers</span>
        <button
          onClick={load}
          style={{ ...mono, fontSize: "12px", background: "none", border: "1px solid #2e2e44", color: "var(--text-muted)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #1d1d2b" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1d1d2b", background: "#0d0d15" }}>
              {["Name", "Author", "Status", "Verified", "Trending", ""].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", ...mono, fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {servers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", ...mono, color: "var(--text-muted)" }}>
                  No servers found.
                </td>
              </tr>
            ) : servers.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #1d1d2b" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "2px" }}>{s.name}</div>
                  <div style={{ ...mono, fontSize: "11px", color: "var(--text-muted)" }}>{s.slug}</div>
                </td>
                <td style={{ padding: "12px 16px", ...mono, fontSize: "12px", color: "var(--text-muted)" }}>
                  @{s.author || s.author_username || "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <select
                    value={s.status || "pending"}
                    disabled={saving[s.id]}
                    onChange={(e) => patch(s.id, { status: e.target.value })}
                    style={{
                      ...mono,
                      fontSize: "12px",
                      background: "#1d1d2b",
                      border: "1px solid #2e2e44",
                      color: "var(--text-primary)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      cursor: "pointer",
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Toggle
                    value={!!s.verified}
                    disabled={saving[s.id]}
                    onChange={(v) => patch(s.id, { verified: v })}
                  />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Toggle
                    value={!!s.trending}
                    disabled={saving[s.id]}
                    onChange={(v) => patch(s.id, { trending: v })}
                  />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    onClick={() => remove(s.id, s.name)}
                    disabled={saving[s.id]}
                    title="Delete server"
                    style={{
                      background: "none",
                      border: "1px solid #3a1a1a",
                      color: "#f87171",
                      borderRadius: "6px",
                      padding: "5px 8px",
                      cursor: saving[s.id] ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetchUsers();
      setUsers(data.users || data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ ...mono, color: "var(--text-muted)", padding: "32px 0" }}>Loading users…</div>;
  if (error) return <div style={{ ...mono, color: "#f87171", padding: "32px 0" }}>Error: {error}</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ ...mono, fontSize: "12px", color: "var(--text-muted)" }}>{users.length} users</span>
        <button
          onClick={load}
          style={{ ...mono, fontSize: "12px", background: "none", border: "1px solid #2e2e44", color: "var(--text-muted)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div style={{ overflowX: "auto", borderRadius: "10px", border: "1px solid #1d1d2b" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1d1d2b", background: "#0d0d15" }}>
              {["User", "Email", "Tier", "Servers", "Joined"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", ...mono, fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", ...mono, color: "var(--text-muted)" }}>
                  No users found.
                </td>
              </tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #1d1d2b" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #7c6cff, #a855f7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      {(u.username || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>@{u.username || "—"}</div>
                      <div style={{ ...mono, fontSize: "11px", color: "var(--text-muted)" }}>{u.display_name || ""}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", ...mono, fontSize: "12px", color: "var(--text-muted)" }}>
                  {u.email || "—"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span
                    style={{
                      ...mono,
                      fontSize: "11px",
                      color: TIER_COLORS[u.tier] || "#6b7280",
                      background: `${TIER_COLORS[u.tier] || "#6b7280"}18`,
                      border: `1px solid ${TIER_COLORS[u.tier] || "#6b7280"}40`,
                      borderRadius: "5px",
                      padding: "2px 8px",
                      textTransform: "capitalize",
                    }}
                  >
                    {u.tier || "starter"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", ...mono, fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
                  {u.server_count ?? "—"}
                </td>
                <td style={{ padding: "12px 16px", ...mono, fontSize: "12px", color: "var(--text-muted)" }}>
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Admin() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const { user } = useUser();
  const { logout } = useDescope();
  const [activeTab, setActiveTab] = useState("Servers");

  const permissions = user?.permissions ?? [];
  const isAdmin = isAuthenticated && permissions.includes(ADMIN_PERMISSION);

  if (isSessionLoading) {
    return (
      <main id="main-content" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ ...mono, color: "var(--text-muted)" }}>Loading…</span>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main id="main-content" style={{ maxWidth: "480px", margin: "80px auto", padding: "0 24px" }}>
        <h1 style={{ ...mono, fontSize: "18px", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>
          Admin Login
        </h1>
        <p style={{ ...mono, color: "var(--text-muted)", marginBottom: "32px", fontSize: "12px" }}>
          Sign in with your admin account to continue.
        </p>
        <Descope
          flowId="sign-up-or-in"
          theme="dark"
          onSuccess={(e) => { console.log("Admin login success:", e.detail.user.email); }}
          onError={(err) => { console.error("Admin login error:", err); }}
        />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main id="main-content" style={{ maxWidth: "480px", margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
        <p style={{ ...mono, color: "#f87171", marginBottom: "24px" }}>
          Access denied — Admin permission required.
        </p>
        <button
          onClick={() => logout()}
          style={{ ...mono, background: "none", border: "1px solid #2e2e44", color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer", borderRadius: "4px" }}
        >
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main id="main-content" style={{ maxWidth: "1100px", margin: "60px auto", padding: "0 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "24px", letterSpacing: "-0.5px", marginBottom: "4px" }}>
            Admin Panel
          </h1>
          <p style={{ ...mono, fontSize: "12px", color: "var(--text-muted)" }}>
            {user?.email}
          </p>
        </div>
        <button
          onClick={() => logout()}
          style={{ ...mono, background: "none", border: "1px solid #2e2e44", color: "var(--text-muted)", padding: "6px 14px", cursor: "pointer", borderRadius: "6px", fontSize: "12px" }}
        >
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "24px", background: "#0d0d15", borderRadius: "10px", padding: "4px", border: "1px solid #1d1d2b", width: "fit-content" }}>
        {[
          { id: "Servers", icon: Server },
          { id: "Users", icon: Users },
        ].map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "8px 20px",
              borderRadius: "7px",
              border: "none",
              background: activeTab === id ? "#1d1d2b" : "transparent",
              color: activeTab === id ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "13px",
              fontWeight: activeTab === id ? 600 : 400,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              transition: "all 0.15s",
            }}
          >
            <Icon size={14} />
            {id}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Servers" && <ServersTab />}
      {activeTab === "Users" && <UsersTab />}
    </main>
  );
}
