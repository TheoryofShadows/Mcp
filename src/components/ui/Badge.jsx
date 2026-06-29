import { memo } from "react";

const BADGE_STYLES = {
  default: {
    background: "rgba(34, 211, 238, 0.12)",
    color: "var(--accent-light)",
    border: "1px solid rgba(34, 211, 238, 0.25)",
  },
  trending: {
    background: "rgba(236, 72, 153, 0.12)",
    color: "var(--accent-pink)",
    border: "1px solid rgba(236, 72, 153, 0.25)",
  },
  paid: {
    background: "rgba(20, 184, 166, 0.12)",
    color: "var(--accent-purple)",
    border: "1px solid rgba(20, 184, 166, 0.25)",
  },
  free: {
    background: "rgba(56, 189, 248, 0.12)",
    color: "var(--accent-blue)",
    border: "1px solid rgba(56, 189, 248, 0.25)",
  },
  verified: {
    background: "rgba(34, 211, 238, 0.1)",
    color: "var(--accent-cyan)",
    border: "1px solid rgba(34, 211, 238, 0.22)",
  },
};

const BASE_STYLE = {
  padding: "3px 10px",
  borderRadius: "20px",
  fontSize: "var(--font-xs)",
  fontFamily: "var(--font-mono)",
  fontWeight: 700,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
};

const Badge = memo(function Badge({ children, variant = "default" }) {
  const variantStyle = BADGE_STYLES[variant] || BADGE_STYLES.default;

  return (
    <span style={{ ...BASE_STYLE, ...variantStyle }}>
      {children}
    </span>
  );
});

export default Badge;
