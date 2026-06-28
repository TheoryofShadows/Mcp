import { useState } from "react";
import { Copy, Check, Terminal, Code2, Cpu } from "lucide-react";
// Install-command logic lives in a shared module so the web UI and the
// `npx mcpx install` CLI always produce identical config (see shared/installConfig.js).
import { buildClaudeCommand, buildCursorConfig, buildVSCodeConfig } from "../../shared/installConfig.js";

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, style = {} }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "6px 12px",
        borderRadius: "6px",
        border: "none",
        background: copied ? "rgba(16,185,129,0.12)" : "rgba(124, 108, 255,0.12)",
        color: copied ? "#10b981" : "#a594ff",
        cursor: "pointer",
        fontSize: "12px",
        fontFamily: "var(--font-mono)",
        transition: "all 0.15s",
        flexShrink: 0,
        ...style,
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Command block ─────────────────────────────────────────────────────────────

function CommandBlock({ code, language = "bash" }) {
  return (
    <div
      style={{
        position: "relative",
        background: "#0a0a0f",
        border: "1px solid #1a1a28",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: "1px solid #1a1a28",
          background: "#0d0d1a",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "#4b5563",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {language}
        </span>
        <CopyButton text={code} />
      </div>
      <pre
        style={{
          margin: 0,
          padding: "14px 16px",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "#c4c9d4",
          overflowX: "auto",
          whiteSpace: "pre",
          lineHeight: 1.6,
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        borderRadius: "8px",
        border: "1px solid",
        borderColor: active ? "rgba(124, 108, 255,0.5)" : "rgba(255,255,255,0.06)",
        background: active ? "rgba(124, 108, 255,0.12)" : "transparent",
        color: active ? "#a594ff" : "#6b7280",
        cursor: "pointer",
        fontSize: "13px",
        fontFamily: "var(--font-mono)",
        fontWeight: active ? 600 : 400,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TABS = [
  { id: "claude", label: "Claude", icon: Terminal },
  { id: "cursor", label: "Cursor", icon: Cpu },
  { id: "vscode", label: "VS Code", icon: Code2 },
];

export default function InstallButtons({ server }) {
  const [activeTab, setActiveTab] = useState("claude");

  if (!server) return null;

  const claudeCmd = buildClaudeCommand(server);
  const cursorJson = buildCursorConfig(server);
  const vscodeJson = buildVSCodeConfig(server);

  return (
    <div
      style={{
        background: "var(--bg-card, #12121c)",
        border: "1px solid var(--border-subtle, #1a1a28)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px 0",
          borderBottom: "1px solid #1a1a28",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "#4b5563",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "12px",
          }}
        >
          One-Click Install
        </div>
        <div style={{ display: "flex", gap: "8px", paddingBottom: "0", flexWrap: "wrap" }}>
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              icon={tab.icon}
              label={tab.label}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 20px 20px" }}>
        {activeTab === "claude" && (
          <div>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Run in your terminal — adds to Claude Desktop automatically:
            </p>
            <CommandBlock code={claudeCmd} language="bash" />
            <p
              style={{
                fontSize: "11px",
                color: "#374151",
                marginTop: "10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Requires{" "}
              <a
                href="https://claude.ai/download"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#7c6cff", textDecoration: "none" }}
              >
                Claude Desktop
              </a>{" "}
              with MCP support enabled.
            </p>
          </div>
        )}

        {activeTab === "cursor" && (
          <div>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Add to{" "}
              <strong style={{ color: "#9ca3af" }}>Cursor Settings → MCP</strong> or paste into{" "}
              <code style={{ background: "#1a1a28", padding: "1px 5px", borderRadius: "4px" }}>
                ~/.cursor/mcp.json
              </code>
              :
            </p>
            <CommandBlock code={cursorJson} language="json" />
          </div>
        )}

        {activeTab === "vscode" && (
          <div>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Add to{" "}
              <code style={{ background: "#1a1a28", padding: "1px 5px", borderRadius: "4px" }}>
                .vscode/mcp.json
              </code>{" "}
              in your workspace:
            </p>
            <CommandBlock code={vscodeJson} language="json" />
            <p
              style={{
                fontSize: "11px",
                color: "#374151",
                marginTop: "10px",
                fontFamily: "var(--font-mono)",
              }}
            >
              Requires VS Code 1.99+ with MCP extension support.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
