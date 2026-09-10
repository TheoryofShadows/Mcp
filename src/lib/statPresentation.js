/**
 * Honest presentation of early-stage marketplace stats.
 *
 * The homepage stat bar renders real numbers straight from /api/stats. That is
 * the right instinct — but at launch those numbers are literally
 * "Publisher payouts $0/mo" and "Installs tracked 1", which reads as an
 * abandoned marketplace to exactly the visitor we most need to convince.
 *
 * The fix is NOT to inflate them. It is to stop showing a metric that has not
 * started yet, and to say the true thing instead: the catalog is curated.
 *
 * Rules:
 *   - A stat with a real value shows the real value, always.
 *   - A stat still at zero is suppressed rather than displayed as "$0".
 *   - The catalog count is never suppressed — a small, reviewed catalog is a
 *     feature, and we say so explicitly instead of hiding the number.
 */

/** Is this stat worth showing yet? */
export function hasSignal(key, value) {
  const n = Number(value) || 0;
  // The catalog size is always meaningful, even when small — that's the pitch.
  if (key === "total_tools") return true;
  return n > 0;
}

/**
 * Filter a stat list down to the ones that carry signal.
 * Returns the original list when nothing would remain, so the bar never
 * collapses to nothing.
 */
export function withSignal(items, stats) {
  const kept = items.filter((it) => hasSignal(it.key, stats?.[it.key]));
  return kept.length > 0 ? kept : items.slice(0, 1);
}

/**
 * The curated-catalog line. The whole positioning is "reviewed, not dumped":
 * every listing carries a computed Trust Score, which is only possible because
 * the catalog is small enough to actually scan.
 */
export function catalogLine(count) {
  const n = Number(count) || 0;
  if (n <= 0) return "Every server is scanned and scored before it's listed.";
  return `${n.toLocaleString()} reviewed servers — scanned and scored, not ${(20000).toLocaleString()} dumped repos.`;
}

export default { hasSignal, withSignal, catalogLine };
