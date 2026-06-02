import { ShieldCheck, ShieldAlert, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

/**
 * TrustScore — renders the computed, transparent trust report for a server.
 *
 * This is the visual heart of the MCPX thesis (MARKET.md): trust is *computed
 * and explained*, never just asserted. We show the headline score, the tier,
 * and — crucially — an itemized breakdown of how every point was earned, so
 * users and agents can audit the verdict instead of taking it on faith.
 *
 * Props:
 *   trust: { score, tier, factors[], penalties[], confidence } (from the API)
 */
const TIER_META = {
  official:  { label: "Official",  color: "#10b981", Icon: ShieldCheck },
  verified:  { label: "Verified",  color: "#6366f1", Icon: ShieldCheck },
  community: { label: "Community", color: "#f59e0b", Icon: Shield },
  caution:   { label: "Caution",   color: "#ef4444", Icon: ShieldAlert },
};

export default function TrustScore({ trust }) {
  const [open, setOpen] = useState(false);
  if (!trust) return null;

  const { score, tier, factors = [], penalties = [], confidence } = trust;
  const meta = TIER_META[tier] || TIER_META.community;
  const { Icon } = meta;

  const rows = [...factors, ...penalties];

  return (
    <div
      style={{
        border: "1px solid var(--border, rgba(255,255,255,0.1))",
        borderRadius: "16px",
        padding: "var(--space-lg, 20px)",
        background: "var(--surface, rgba(255,255,255,0.02))",
        marginBottom: "var(--space-xl, 32px)",
      }}
    >
      {/* Header: score dial + tier */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            position: "relative",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: `conic-gradient(${meta.color} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "var(--bg, #0d0d12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: "18px",
              color: meta.color,
            }}
          >
            {score}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Icon size={18} color={meta.color} strokeWidth={2.5} />
            <span style={{ fontWeight: 700, fontSize: "var(--font-md, 15px)", color: meta.color }}>
              {meta.label}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-tertiary, #888)" }}>
              · {confidence} confidence
            </span>
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary, #aaa)", marginTop: "2px" }}>
            MCPX Trust Score — computed from source, license, identity & usage
          </div>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary, #aaa)", fontSize: "13px", padding: "4px",
          }}
        >
          {open ? "Hide" : "Why?"}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Breakdown */}
      {open && (
        <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {rows.map((r) => {
            const negative = r.points < 0;
            return (
              <div
                key={r.key}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: "12px", fontSize: "13px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ color: "var(--text-primary, #fff)", fontWeight: 600 }}>{r.label}</span>
                  {r.reason && (
                    <span style={{ color: "var(--text-tertiary, #888)" }}> — {r.reason}</span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)", fontWeight: 600,
                    color: negative ? "#ef4444" : r.points > 0 ? "#10b981" : "var(--text-tertiary, #888)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {negative ? "" : "+"}{r.points}{r.max ? ` / ${r.max}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
