import { useState } from "react";

const PUBLISH_STEPS = [
  {
    title: "Connect Your Repo",
    code: `# Install MCPX CLI
npm install -g @mcpx/cli

# Initialize in your project
mcpx init

# Link your GitHub repo
mcpx connect --repo your-org/your-mcp-server`,
  },
  {
    title: "Configure & Test",
    code: `# mcpx.config.json
{
  "name": "my-awesome-tool",
  "version": "1.0.0",
  "pricing": {
    "model": "per-use",
    "rate": "$0.002/call"
  },
  "capabilities": [
    "read-data",
    "write-data",
    "execute-actions"
  ],
  "auth": "oauth2"
}`,
  },
  {
    title: "Publish & Earn",
    code: `# Run validation
mcpx validate

# Publish to marketplace
mcpx publish --public

# \u2713 Published! Live at:
# https://mcpx.dev/tools/my-awesome-tool
#
# Revenue dashboard:
# https://mcpx.dev/dashboard/revenue`,
  },
];

export default function PublishSection() {
  const [step, setStep] = useState(0);

  return (
    <section
      style={{ padding: "60px 32px", maxWidth: "900px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: "12px",
          }}
        >
          Publish in{" "}
          <span style={{ color: "var(--accent-electric)" }}>3 Commands</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
          From GitHub repo to monetized MCP server in under 5 minutes.
        </p>
      </div>

      {/* Step navigation */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "24px",
          background: "var(--bg-secondary)",
          borderRadius: "12px",
          padding: "4px",
        }}
      >
        {PUBLISH_STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              background: step === i ? "var(--bg-card)" : "transparent",
              color:
                step === i ? "var(--accent-electric)" : "var(--text-muted)",
              fontFamily: "'Space Mono', monospace",
              fontSize: "12px",
              fontWeight: 700,
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background:
                  step === i
                    ? "var(--accent-electric)"
                    : "var(--border-accent)",
                color:
                  step === i ? "var(--bg-primary)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              {i + 1}
            </span>
            {s.title}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        {/* Terminal header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#FF5F57",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#FEBD2E",
            }}
          />
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#27C93F",
            }}
          />
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            terminal
          </span>
        </div>

        {/* Code content */}
        <pre
          style={{
            padding: "24px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "13px",
            lineHeight: 1.7,
            color: "var(--accent-electric)",
            overflowX: "auto",
            margin: 0,
          }}
        >
          {PUBLISH_STEPS[step].code}
        </pre>
      </div>
    </section>
  );
}
