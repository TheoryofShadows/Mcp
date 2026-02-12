export default function Footer() {
  return (
    <footer
      style={{
        padding: "40px 32px",
        borderTop: "1px solid var(--border-subtle)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: "16px",
          background:
            "linear-gradient(135deg, var(--accent-electric), var(--accent-blue))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "12px",
        }}
      >
        MCPX
      </div>
      <p
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          color: "var(--text-muted)",
          letterSpacing: "0.5px",
        }}
      >
        The marketplace for AI agent tools. Built for the MCP ecosystem.
      </p>
    </footer>
  );
}
