export default function PriceTag({ tool, size = "sm" }) {
  const isFree = tool.price_type === "free";
  const label = isFree ? "Free" : (tool.price_label || `$${tool.price_amount}/mo`);

  const sizes = {
    sm: { fontSize: "11px", padding: "2px 8px" },
    md: { fontSize: "13px", padding: "4px 12px" },
    lg: { fontSize: "15px", padding: "6px 16px" },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        borderRadius: "6px",
        letterSpacing: "0.02em",
        ...sizes[size],
        background: isFree ? "rgba(16,185,129,0.12)" : "rgba(34, 211, 238,0.15)",
        color: isFree ? "#10b981" : "#67e8f9",
        border: `1px solid ${isFree ? "rgba(16,185,129,0.25)" : "rgba(34, 211, 238,0.3)"}`,
      }}
    >
      {label}
    </span>
  );
}
