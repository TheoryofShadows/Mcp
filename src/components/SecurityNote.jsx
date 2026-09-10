import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * The homepage security note.
 *
 * MCP has a real and public attack story — tool poisoning, prompt-injected
 * instructions, over-broad execution surface, leaked credentials. A marketplace
 * that says nothing about it invites the reader to assume the worst, and
 * someone else gets to write that narrative first.
 *
 * Every category below is one the scanner actually looks for
 * (server/lib/repoScan.js): SECRET_PATTERNS, POISON_PATTERNS and
 * SURFACE_PATTERNS. Findings feed the Trust Score as a penalty
 * (scanPenalty in server/lib/trustScore.js), which is what makes this a
 * mechanism rather than a promise.
 *
 * If those scanner categories change, this copy must change with them.
 */
const CHECKS = [
  {
    id: "poisoning",
    title: "Tool poisoning",
    body: "We flag hidden directives in source — instruction overrides, exfiltration, and concealment prompts aimed at your agent.",
  },
  {
    id: "secrets",
    title: "Leaked credentials",
    body: "Committed API keys and tokens are detected and redacted before anyone sees the finding.",
  },
  {
    id: "surface",
    title: "Execution surface",
    body: "Shell spawns, exec() and eval() are surfaced so you know what a server can reach before you install it.",
  },
];

export default function SecurityNote({ style }) {
  return (
    <section
      aria-labelledby="security-note-heading"
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "0 24px 64px",
        ...style,
      }}
    >
      <div
        style={{
          border: "1px solid #1d1d2b",
          borderRadius: "14px",
          background: "#0f0f18",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <ShieldAlert size={16} color="#67e8f9" aria-hidden="true" />
          <h2
            id="security-note-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "18px",
              fontWeight: 700,
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            MCP has a security problem. We scan for it.
          </h2>
        </div>

        <p
          style={{
            margin: "0 0 18px",
            fontSize: "14px",
            lineHeight: 1.6,
            color: "var(--text-secondary)",
            maxWidth: "70ch",
          }}
        >
          A malicious MCP server runs with your agent&apos;s permissions. Every listing
          here is scanned before it is scored, and what the scan finds lowers the
          server&apos;s Trust Score — publicly, on the listing itself.
        </p>

        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            listStyle: "none",
            margin: "0 0 18px",
            padding: 0,
          }}
        >
          {CHECKS.map(({ id, title, body }) => (
            <li key={id}>
              <h3
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  margin: "0 0 4px",
                  color: "var(--text-primary)",
                }}
              >
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.55, color: "var(--text-secondary)" }}>
                {body}
              </p>
            </li>
          ))}
        </ul>

        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.6 }}>
          Scanning is automated and not a guarantee — review anything you install
          with access to real systems.{" "}
          <Link to="/marketplace" style={{ color: "#67e8f9", textDecoration: "none" }}>
            See the scores
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
