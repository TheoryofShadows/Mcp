import { useState } from "react";
import { Copy, Check, Terminal } from "lucide-react";

export default function InstallCommand({ command, label = "Install Command" }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea");
      el.value = command;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "8px",
            fontSize: "12px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          <Terminal size={12} />
          {label}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          background: "#0d0d15",
          border: "1px solid #1d1d2b",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 8px 12px 16px",
            color: "#a5f3fc",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            flexShrink: 0,
          }}
        >
          $
        </div>
        <code
          style={{
            flex: 1,
            padding: "12px 0",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            color: "#e2e8f0",
            whiteSpace: "nowrap",
            overflow: "auto",
            scrollbarWidth: "none",
          }}
        >
          {command}
        </code>
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied!" : "Copy to clipboard"}
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "12px 16px",
            background: copied ? "rgba(16,185,129,0.12)" : "rgba(34, 211, 238,0.08)",
            border: "none",
            borderLeft: "1px solid #1d1d2b",
            color: copied ? "#10b981" : "#67e8f9",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            if (!copied) e.currentTarget.style.background = "rgba(34, 211, 238,0.15)";
          }}
          onMouseLeave={(e) => {
            if (!copied) e.currentTarget.style.background = "rgba(34, 211, 238,0.08)";
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}
