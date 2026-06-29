import { ShieldCheck, BadgeCheck, Users, ShieldAlert } from "lucide-react";

const TRUST_LEVELS = {
  official: {
    label: "Official",
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.25)",
    icon: ShieldCheck,
    title: "Official publisher — maintained by the original project team",
  },
  verified: {
    label: "Verified",
    color: "#22d3ee",
    bg: "rgba(34, 211, 238,0.10)",
    border: "rgba(34, 211, 238,0.25)",
    icon: BadgeCheck,
    title: "Verified publisher — identity and code reviewed by MCPX team",
  },
  community: {
    label: "Community",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36,0.10)",
    border: "rgba(251, 191, 36,0.25)",
    icon: Users,
    title: "Community server — not officially verified, use with caution",
  },
  caution: {
    label: "Caution",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.25)",
    icon: ShieldAlert,
    title: "Low trust score — unverified, limited signals. Review before installing.",
  },
};

/**
 * VerifiedBadge — shows trust level for an MCP server.
 * Props:
 *   level: "official" | "verified" | "community"
 *   verified: boolean (legacy — if true & no level, shows "verified")
 *   size: "sm" | "md"
 *   showLabel: boolean (default true)
 */
export default function VerifiedBadge({ level, verified, size = "sm", showLabel = true }) {
  let trustKey = level;
  if (!trustKey) trustKey = verified ? "verified" : null;
  if (!trustKey) return null;

  const trust = TRUST_LEVELS[trustKey] || TRUST_LEVELS.verified;
  const Icon = trust.icon;
  const iconSize = size === "sm" ? 12 : 14;
  const fontSize = size === "sm" ? "11px" : "12px";

  return (
    <span
      title={trust.title}
      aria-label={trust.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: showLabel ? "2px 8px 2px 6px" : "3px",
        borderRadius: "100px",
        background: trust.bg,
        border: `1px solid ${trust.border}`,
        color: trust.color,
        fontSize,
        fontFamily: "var(--font-mono, monospace)",
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <Icon size={iconSize} strokeWidth={2.5} />
      {showLabel && <span>{trust.label}</span>}
    </span>
  );
}
