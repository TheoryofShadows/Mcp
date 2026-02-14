import { useState, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { createServer } from "../../api/client";
import { useNavigate } from "react-router-dom";

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

const INITIAL_FORM = { name: "", description: "", category_id: "ai", price_type: "free", price_amount: 0, tags: "", repo_url: "" };

export default function PublishSection({ onAuthClick }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(PUBLISH_STEPS[step].code);
  }, [step]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handlePublish(e) {
    e.preventDefault();
    setPublishError("");
    setPublishing(true);
    try {
      const tags = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const server = await createServer({ ...form, tags });
      navigate(`/servers/${server.slug}`);
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  }

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

      {/* Quick publish form */}
      <div style={{ marginTop: "var(--space-2xl)", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "var(--font-md)", marginBottom: "var(--space-md)" }}>
          Or publish directly from the web:
        </p>
        {!user ? (
          <button className="btn btn-gradient" onClick={() => onAuthClick?.()}>
            Sign in to Publish
          </button>
        ) : !showForm ? (
          <button className="btn btn-gradient" onClick={() => setShowForm(true)}>
            Publish a Server
          </button>
        ) : (
          <form
            onSubmit={handlePublish}
            style={{
              textAlign: "left",
              padding: "var(--space-lg)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-xl)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-md)",
            }}
          >
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "var(--font-lg)", marginBottom: 0 }}>
              Publish New Server
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>Name *</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="my-awesome-server"
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>Category</span>
                <select name="category_id" value={form.category_id} onChange={handleChange} style={inputStyle}>
                  <option value="ai">AI & ML</option>
                  <option value="dev">Developer</option>
                  <option value="data">Data & APIs</option>
                  <option value="infra">Infrastructure</option>
                  <option value="business">Business</option>
                  <option value="creative">Creative</option>
                </select>
              </label>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>Description *</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={2}
                placeholder="What does your server do?"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>Pricing</span>
                <select name="price_type" value={form.price_type} onChange={handleChange} style={inputStyle}>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              {form.price_type === "paid" && (
                <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>Price (cents)</span>
                  <input
                    name="price_amount"
                    type="number"
                    min="1"
                    value={form.price_amount}
                    onChange={handleChange}
                    placeholder="500"
                    style={inputStyle}
                  />
                </label>
              )}
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>Tags (comma-separated)</span>
              <input
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="ai, nlp, tool-use"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--font-xs)", color: "var(--text-muted)", textTransform: "uppercase" }}>Repository URL</span>
              <input
                name="repo_url"
                value={form.repo_url}
                onChange={handleChange}
                placeholder="https://github.com/you/your-server"
                style={inputStyle}
              />
            </label>

            {publishError && (
              <p style={{ color: "var(--accent-pink)", fontFamily: "var(--font-mono)", fontSize: "var(--font-sm)", margin: 0 }}>{publishError}</p>
            )}

            <div style={{ display: "flex", gap: "var(--space-sm)" }}>
              <button type="submit" className="btn btn-gradient" disabled={publishing}>
                {publishing ? "Publishing..." : "Publish Server"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setPublishError(""); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

const inputStyle = {
  padding: "var(--space-sm) var(--space-md)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)",
  fontFamily: "var(--font-body)",
  fontSize: "var(--font-md)",
  outline: "none",
  width: "100%",
};
