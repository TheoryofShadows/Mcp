const BADGE_STYLES = {
  default: {
    background: "rgba(77, 255, 180, 0.1)",
    color: "var(--accent-electric)",
    border: "1px solid rgba(77, 255, 180, 0.2)",
  },
  trending: {
    background: "rgba(255, 109, 180, 0.1)",
    color: "var(--accent-pink)",
    border: "1px solid rgba(255, 109, 180, 0.2)",
  },
  paid: {
    background: "rgba(155, 109, 255, 0.1)",
    color: "var(--accent-purple)",
    border: "1px solid rgba(155, 109, 255, 0.2)",
  },
  free: {
    background: "rgba(77, 159, 255, 0.1)",
    color: "var(--accent-blue)",
    border: "1px solid rgba(77, 159, 255, 0.2)",
  },
  verified: {
    background: "rgba(77, 255, 180, 0.08)",
    color: "var(--accent-electric)",
    border: "1px solid rgba(77, 255, 180, 0.15)",
  },
};

export default function Badge({ children, variant = "default" }) {
  return (
    <span
      style={{
        ...BADGE_STYLES[variant],
        padding: "3px 10px",
        borderRadius: "20px",
        fontSize: "11px",
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
    >
      {children}
    </span>
  );
}
