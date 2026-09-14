/**
 * Format a tool's display price.
 *
 * API contract:
 * - `price` / `price_label`: human string (e.g. "$16", "Free")
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

  return formatCents(cents);
}

/**
 * Cents → a one-time price string. Server purchases are a single charge
 * (Stripe Checkout `mode: "payment"` with a destination split), never a
 * recurring subscription, so no interval suffix belongs here.
 */
export function formatCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n) || n <= 0) return "Paid";
  const dollars = n / 100;
  const formatted = Number.isInteger(dollars)
    ? String(dollars)
    : dollars.toFixed(2).replace(/\.?0+$/, "");
  return `$${formatted}`;
}

function stripPurchasePrefix(label) {
  return String(label || "")
    .replace(/^Buy once\s*[·•\-]\s*/i, "")
    .replace(/^Subscribe\s*[·•\-]\s*/i, "")
    .trim();
}

function isMonthlyBilling(tool, amountLabel) {
  const period = String(tool?.billing_period || "").toLowerCase();
  if (period === "monthly" || period === "month" || period === "recurring") return true;
  if (period === "one_time" || period === "once" || period === "one-time") return false;
  return /\/mo\b/i.test(amountLabel);
}

/**
 * Marketplace / detail price chip label.
 * Unpurchasable paid tools must not imply "buy now".
 * Purchasable paid tools advertise buy-once vs subscribe for buyers.
 */
export function formatPriceTagLabel(tool = {}) {
  if (tool?.price_type === "paid" && tool?.purchasable === false) {
    return "Unavailable";
  }
  if (!tool || tool.price_type === "free") return "Free";

  const amount = stripPurchasePrefix(formatPriceLabel(tool));
  if (isMonthlyBilling(tool, amount)) {
    const bare = amount.replace(/\s*\/mo\b/i, "").trim();
    return `Subscribe · ${bare}/mo`;
  }
  return `Buy once · ${amount}`;
}