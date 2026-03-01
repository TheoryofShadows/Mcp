import { BadgeCheck } from "lucide-react";

export default function VerifiedBadge({ size = 14 }) {
  return (
    <span
      title="Verified publisher"
      aria-label="Verified"
      style={{ display: "inline-flex", alignItems: "center", color: "#6366f1" }}
    >
      <BadgeCheck size={size} strokeWidth={2.5} />
    </span>
  );
}
