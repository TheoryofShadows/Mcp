import { Descope, useDescope, useSession, useUser } from "@descope/react-sdk";

const ADMIN_PERMISSION = "PERM3AginJK2YlsHu6UrjhQcz7wf2iR";

const mono = { fontFamily: "var(--font-mono)", fontSize: "13px" };

export default function Admin() {
  const { isAuthenticated, isSessionLoading } = useSession();
  const { user } = useUser();
  const { logout } = useDescope();

  const hasAdminPermission =
    isAuthenticated &&
    Array.isArray(user?.roleNames)
      ? false // roles checked via permissions below
      : isAuthenticated &&
        (user?.userTenants ?? []).some((t) =>
          (t.roleNames ?? []).includes("Admin")
        );

  // Check permissions array if available
  const permissions = user?.customAttributes?.permissions ?? [];
  const isAdmin =
    isAuthenticated &&
    (hasAdminPermission || permissions.includes(ADMIN_PERMISSION));

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
          onSuccess={(e) => {
            console.log("Admin login success:", e.detail.user.email);
          }}
          onError={(err) => {
            console.error("Admin login error:", err);
          }}
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
          style={{ ...mono, background: "none", border: "1px solid #333", color: "var(--text-muted)", padding: "8px 16px", cursor: "pointer", borderRadius: "4px" }}
        >
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main id="main-content" style={{ maxWidth: "900px", margin: "60px auto", padding: "0 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <h1 style={{ ...mono, fontSize: "18px", fontWeight: 600, color: "var(--text-primary)" }}>
          Admin Panel
        </h1>
        <button
          onClick={() => logout()}
          style={{ ...mono, background: "none", border: "1px solid #333", color: "var(--text-muted)", padding: "6px 14px", cursor: "pointer", borderRadius: "4px", fontSize: "12px" }}
        >
          Sign out
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
        {[
          { label: "Logged in as", value: user?.email ?? "—" },
          { label: "Permission", value: "Admin ✓" },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: "8px", padding: "20px" }}>
            <div style={{ ...mono, fontSize: "11px", color: "var(--text-muted)", marginBottom: "6px" }}>{label}</div>
            <div style={{ ...mono, fontSize: "13px", color: "var(--text-primary)" }}>{value}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
