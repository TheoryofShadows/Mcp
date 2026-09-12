import { Plug, ShieldAlert, Download } from "lucide-react";

/**
 * "What's an MCP server?" — the missing on-ramp.
 *
 * Audited the whole site and found the phrase "Model Context Protocol" appears
 * EXACTLY ONCE, buried in a Pricing FAQ. The /start route redirects to a "New
 * here?" block that says "Open marketplace → copy install command" — written
 * for someone who already knows what an MCP server is and why they'd want one.
 *
 * That breaks the funnel at step zero: a visitor who has heard "MCP" in passing
 * but never tried it lands on "The trusted marketplace for MCP tools", learns
 * nothing, and leaves before ever seeing the Trust Score.
 *
 * The last card does double duty. Explaining that an MCP server runs locally
 * with your permissions is both the honest risk disclosure AND the reason this
 * marketplace scores them — it makes the product's value obvious in a sentence
 * rather than asserting "trusted" and hoping.
 */
const CARDS = [
  {
    Icon: Plug,
    title: "It's a plug-in for your AI",
    body: "An MCP server gives Claude, Cursor or VS Code a real ability — reading your files, querying a database, deploying code, searching the web.",
  },
  {
    Icon: Download,
    title: "You install it once",
    body: "Copy a small config into your AI client and restart. Your assistant can suddenly do that thing, in every conversation, without you pasting anything.",
  },
  {
    Icon: ShieldAlert,
    title: "It runs on your machine",
    body: "With your permissions and your files. A malicious one can read your SSH keys or leak your API tokens — which is why every server here is scanned and scored before you install it.",
  },
];

export default function WhatIsMcp({ style }) {
  return (
    <section
      aria-labelledby="what-is-mcp-heading"
      style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 56px", ...style }}
    >
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <h2
          id="what-is-mcp-heading"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "24px",
            marginBottom: "8px",
            letterSpacing: "-0.4px",
          }}
        >
          New to MCP? Start here.
        </h2>
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
            margin: "0 auto",
            maxWidth: "64ch",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>MCP</strong> stands for{" "}
          <strong style={{ color: "var(--text-primary)" }}>Model Context Protocol</strong> — an open
          standard that lets AI assistants use real tools instead of just talking about them.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        {CARDS.map(({ Icon, title, body }) => (
          <div
            key={title}
            style={{
              background: "#0f0f18",
              border: "1px solid #1d1d2b",
              borderRadius: "14px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Icon size={16} color="#67e8f9" aria-hidden="true" />
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                }}
              >
                {title}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
