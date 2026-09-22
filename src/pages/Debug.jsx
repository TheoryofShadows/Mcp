import { useMemo } from "react";
import { JOBS, jobsIntegrity } from "../data/jobs";
import { SEED_TOOLS } from "../data/seed";
import { catalogIntegrity } from "../lib/catalogIntegrity";
import clientSeedText from "../data/seed.js?raw";
import serverSeedText from "../../server/seed.js?raw";

function Badge({ ok, children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: "22px",
        padding: "0 8px",
        borderRadius: "999px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: ok ? "#34d399" : "#f87171",
        background: ok ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)",
        border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "rgba(248,113,113,0.3)"}`,
      }}
    >
      {children}
    </span>
  );
}

export default function Debug() {
  const catalog = useMemo(
    () => catalogIntegrity({ clientSeedText, serverSeedText, jobs: JOBS }),
    [],
  );
  const jobs = useMemo(
    () => {
      const slugs = [
        ...clientSeedText.matchAll(/slug:\s*"([^"]+)"/g),
        ...serverSeedText.matchAll(/slug:\s*"([^"]+)"/g),
      ].map((m) => m[1]);
      return jobsIntegrity(slugs);
    },
    [],
  );

  const checks = [
    { id: "catalog-static", ok: catalog.ok, detail: catalog.ok ? `${catalog.serverCount} server seed + ${catalog.clientCount} client seed` : catalog.issues.join("; ") },
    { id: "jobs-static", ok: jobs.ok, detail: jobs.ok ? `${jobs.jobCount} jobs linked` : jobs.issues.join("; ") },
    { id: "client-fallback", ok: SEED_TOOLS.length > 0, detail: `${SEED_TOOLS.length} fallback tools` },
  ];
  const passed = checks.filter((c) => c.ok).length;

  return (
    <main id="main-content" style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 24px 80px" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.16em", color: "var(--accent)" }}>
        INTEGRITY
      </p>
      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(32px, 5vw, 44px)",
          letterSpacing: "-1.2px",
          margin: "12px 0 12px",
        }}
      >
        Debug
      </h1>
      <p style={{ color: "var(--text-secondary)", maxWidth: "560px", lineHeight: 1.6, fontSize: "15px" }}>
        Catalog and job matcher checks. Unowned seed data only — no accounts, no emails.
        Live production rows stay on the API; this page audits the source of truth in git.
      </p>

      <div style={{ marginTop: "28px", fontFamily: "var(--font-mono)", fontSize: "13px", color: passed === checks.length ? "#34d399" : "#fbbf24" }}>
        {passed}/{checks.length} pass
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: "8px" }}>
        {checks.map((c) => (
          <li
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "72px 160px 1fr",
              gap: "12px",
              alignItems: "center",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
            }}
          >
            <Badge ok={c.ok}>{c.ok ? "pass" : "fail"}</Badge>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>{c.id}</span>
            <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{c.detail}</span>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: "40px", fontSize: "20px" }}>Jobs</h2>
      <div style={{ overflowX: "auto", marginTop: "12px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ padding: "8px 10px" }}>Id</th>
              <th style={{ padding: "8px 10px" }}>Title</th>
              <th style={{ padding: "8px 10px" }}>State</th>
              <th style={{ padding: "8px 10px" }}>Tools</th>
            </tr>
          </thead>
          <tbody>
            {JOBS.map((j) => (
              <tr key={j.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{j.id}</td>
                <td style={{ padding: "8px 10px" }}>{j.title}</td>
                <td style={{ padding: "8px 10px" }}>{j.filled ? "filled" : "bounty"}</td>
                <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{j.toolSlugs.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
