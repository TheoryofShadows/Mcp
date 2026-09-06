import { formatPriceTagLabel } from "../lib/formatPrice";

export default function PriceTag({ tool, size = "sm" }) {
  const isFree = tool?.price_type === "free";
  // Paid listings without Stripe Connect must not look buyable on cards.
  const unavailable = tool?.price_type === "paid" && tool?.purchasable === false;
  const label = formatPriceTagLabel(tool);

  const sizes = {
    sm: { fontSize: "11px", padding: "2px 8px" },
    md: { fontSize: "13px", padding: "4px 12px" },
    lg: { fontSize: "15px", padding: "6px 16px" },
  };

  let background = isFree ? "rgba(16,185,129,0.12)" : "rgba(34, 211, 238,0.15)";
  let color = isFree ? "#10b981" : "#67e8f9";
  let border = `1px solid ${isFree ? "rgba(16,185,129,0.25)" : "rgba(34, 211, 238,0.3)"}`;
  if (unavailable) {
    background = "rgba(148,163,184,0.12)";
    color = "#94a3b8";
    border = "1px solid rgba(148,163,184,0.25)";
  }

  return (
    <span
      title={unavailable ? (tool.purchase_blocked_reason || "Unavailable for purchase") : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        borderRadius: "6px",
        letterSpacing: "0.02em",
        ...sizes[size],
        background,
        color,
        border,
      }}
    >
      {label}
    </span>
  );
}
