import { useState, useCallback } from "react";

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

const TERMINAL_DOTS = [
  { color: "#FF5F57", label: "close" },
  { color: "#FEBD2E", label: "minimize" },
  { color: "#27C93F", label: "maximize" },
];

export default function PublishSection() {
  const [step, setStep] = useState(0);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(PUBLISH_STEPS[step].code);
  }, [step]);

  return (
    <section
      aria-label="How to publish"
      style={{
        padding: "60px var(--section-px)",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-2xl)" }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--font-4xl)",
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: "var(--space-sm)",
          }}
        >
          Publish in{" "}
          <span style={{ color: "var(--accent-electric)" }}>3 Commands</span>
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-lg)" }}>
          From GitHub repo to monetized MCP server in under 5 minutes.
        </p>
      </div>

      {/* Step navigation */}
      <div
        className="step-nav"
        role="tablist"
        aria-label="Publishing steps"
        style={{
          display: "flex",
          gap: "var(--space-xs)",
          marginBottom: "var(--space-lg)",
          background: "var(--bg-secondary)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-xs)",
        }}
      >
        {PUBLISH_STEPS.map((s, i) => (
          <button
            key={i}
            role="tab"
            className="step-btn"
            onClick={() => setStep(i)}
            aria-selected={step === i}
            aria-controls={`step-panel-${i}`}
          >
            <span
              aria-hidden="true"
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background:
                  step === i ? "var(--accent-electric)" : "var(--border-accent)",
                color:
                  step === i ? "var(--bg-primary)" : "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--font-xs)",
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
        id={`step-panel-${step}`}
        role="tabpanel"
        className="terminal"
        aria-label={`Step ${step + 1}: ${PUBLISH_STEPS[step].title}`}
      >
        {/* Terminal header */}
        <div className="terminal-header">
          {TERMINAL_DOTS.map((dot) => (
            <div
              key={dot.label}
              className="terminal-dot"
              aria-hidden="true"
              style={{ background: dot.color }}
            />
          ))}
          <span
            style={{
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-xs)",
              color: "var(--text-muted)",
            }}
          >
            terminal
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy code to clipboard"
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-xs)",
              transition: "color var(--transition-fast)",
            }}
          >
            Copy
          </button>
        </div>

        {/* Code content */}
        <pre className="terminal-code">
          <code>{PUBLISH_STEPS[step].code}</code>
        </pre>
      </div>
    </section>
  );
}
