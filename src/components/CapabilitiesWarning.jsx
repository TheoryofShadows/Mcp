import { Shield, AlertTriangle, Info } from "lucide-react";

const CAPABILITY_META = {
  browser_control:      { label: "Browser Control",        icon: "🌐", desc: "Can launch and control real web browsers on your machine" },
  screenshot:           { label: "Screen Capture",          icon: "📸", desc: "Can take screenshots of browser content" },
  network_access:       { label: "Network Access",          icon: "🔌", desc: "Makes outbound HTTP/network requests" },
  database_read:        { label: "Database Read",           icon: "🗄️",  desc: "Can query your database in read-only mode" },
  database_write:       { label: "Database Write",          icon: "✏️",  desc: "Can write or modify data in your database" },
  file_read:            { label: "File System Read",        icon: "📂", desc: "Can read files and directories on your machine" },
  file_write:           { label: "File System Write",       icon: "💾", desc: "Can create, modify, or delete local files" },
  remote_code_execution:{ label: "Remote Code Execution",  icon: "⚡", desc: "Executes shell commands on remote servers — use with caution" },
  file_transfer:        { label: "File Transfer",           icon: "📤", desc: "Can transfer files to/from remote systems" },
  js_execution:         { label: "JS Execution",            icon: "⚙️",  desc: "Executes JavaScript code in browser context" },
  calendar_access:      { label: "Calendar Access",         icon: "📅", desc: "Can read and modify your calendar and events" },
  email_send:           { label: "Email / Invites",         icon: "📧", desc: "Can send emails or calendar invites on your behalf" },
  payment_access:       { label: "Payment Access",          icon: "💳", desc: "Can read or process payment information" },
  compute:              { label: "Compute",                 icon: "🖥️",  desc: "Runs local compute tasks (e.g. chess engine, ML model)" },
};

const RISK_META = {
  low:    { label: "Low Risk",    color: "#10b981", bg: "rgba(16,185,129,0.06)",  border: "rgba(16,185,129,0.2)",  icon: Shield },
  medium: { label: "Medium Risk", color: "#fbbf24", bg: "rgba(251, 191, 36,0.06)", border: "rgba(251, 191, 36,0.2)",  icon: AlertTriangle },
  high:   { label: "High Risk",   color: "#ef4444", bg: "rgba(239,68,68,0.06)",   border: "rgba(239,68,68,0.2)",   icon: AlertTriangle },
};

export default function CapabilitiesWarning({ capabilities, riskLevel }) {
  if (!capabilities?.length && !riskLevel) return null;

  const risk = RISK_META[riskLevel] || RISK_META.low;
  const RiskIcon = risk.icon;

  return (
    <div
      style={{
        background: risk.bg,
        border: `1px solid ${risk.border}`,
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Risk header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 16px",
          borderBottom: capabilities?.length ? `1px solid ${risk.border}` : "none",
        }}
      >
        <RiskIcon size={16} color={risk.color} />
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: risk.color,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {risk.label}
        </span>
        {riskLevel === "high" && (
          <span
            style={{
              fontSize: "11px",
              color: "#ef4444",
              fontFamily: "var(--font-mono)",
              marginLeft: "4px",
            }}
          >
            — Review permissions carefully before installing
          </span>
        )}
      </div>

      {/* Capabilities list */}
      {capabilities?.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "10px",
              fontSize: "11px",
              color: "#6b7280",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            <Info size={11} />
            Permissions requested
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {capabilities.map((cap) => {
              const meta = CAPABILITY_META[cap] || { label: cap, icon: "🔧", desc: cap };
              return (
                <span
                  key={cap}
                  title={meta.desc}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "100px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: "12px",
                    color: "#9ca3af",
                    fontFamily: "var(--font-mono)",
                    cursor: "help",
                  }}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
