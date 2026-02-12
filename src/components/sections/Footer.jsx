export default function Footer() {
  return (
    <footer
      role="contentinfo"
      style={{
        padding: "40px var(--section-px)",
        borderTop: "1px solid var(--border-subtle)",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: "var(--font-lg)",
          background:
            "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "var(--space-sm)",
        }}
      >
        MCPX
      </div>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--font-xs)",
          color: "var(--text-muted)",
          letterSpacing: "0.5px",
        }}
      >
        The marketplace for AI agent tools. Built for the MCP ecosystem.
      </p>
    </footer>
  );
}
