/**
 * Compact, human-readable summary of *why* a server scored what it did.
 *
 * The full itemized report lives in <TrustScore> on the detail page; a card has
 * room for a single line, so we surface the highest-signal factors plus any
 * penalties (which are the part users most need to see) as a native tooltip.
 * Native `title` is deliberate: it works on hover, is reachable by screen
 * readers, and costs no layout — card density at 390px is the binding
 * constraint here.
 *
 * Lives in its own module rather than beside <ToolCard> so the component file
 * only exports components (react-refresh/only-export-components).
 *
 * @param {{score:number, factors?:Array, penalties?:Array}|null} trust
 * @returns {string|null}
 */
export function trustSummary(trust) {
  if (!trust) return null;
  const { score, factors = [], penalties = [] } = trust;
  if (score == null) return null;

  // Earned points first (largest contribution first), then every penalty.
  const earned = factors
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((f) => `${f.label} +${f.points}`);
  const docked = penalties
    .filter((p) => p.points < 0)
    .map((p) => `${p.label} ${p.points}`);

  const parts = [...earned, ...docked];
  if (parts.length === 0) return `Trust Score ${score}/100`;
  return `Trust Score ${score}/100 — ${parts.join(" · ")}`;
}

export default trustSummary;
