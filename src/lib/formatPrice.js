/**
 * Format a tool's display price.
 *
 * API contract:
 * - `price` / `price_label`: human string (e.g. "$16/mo", "Free")
 * - `price_amount`: integer cents (never dollars)
 *
 * Prefer the human label; if missing, convert cents → dollars. Never treat
 * cents as dollars (that produced "$100/mo" / "$1600/mo" bugs).
 */
export function formatPriceLabel(tool = {}) {
  if (!tool || tool.price_type === "free") return "Free";

  const human = [tool.price, tool.price_label]
    .find((v) => typeof v === "string" && v.trim().length > 0);
  if (human) return human.trim();

  const cents = Number(tool.price_amount);
  if (!Number.isFinite(cents) || cents <= 0) return "Paid";

  const dollars = cents / 100;
  const formatted = Number.isInteger(dollars)
    ? String(dollars)
    : dollars.toFixed(2).replace(/\.?0+$/, "");
  return `$${formatted}/mo`;
}


/**
 * Marketplace / detail price chip label.
 * Unpurchasable paid tools must not imply "buy now".
 */
export function formatPriceTagLabel(tool = {}) {
  if (tool?.price_type === "paid" && tool?.purchasable === false) {
    return "Unavailable";
  }
  return formatPriceLabel(tool);
}
