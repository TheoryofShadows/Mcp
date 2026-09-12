import { logger } from "./observability.js";

/**
 * Clear `verified` on listings that were never actually reviewed.
 *
 * Seed data shipped `verified: 1` on 28 of 37 catalogue rows — placeholder
 * entries for Firecrawl, Supabase, Stripe and others who never had accounts.
 * That single flag made three false claims to buyers:
 *
 *   1. Trust Score awarded the full 20/20 "Publisher identity reviewed by
 *      MCPX" for a review that never happened.
 *   2. riskPenalty() waives its deduction for verified publishers, so servers
 *      tagged payments/database/filesystem showed "reviewed" instead of
 *      "Unreviewed access to sensitive capabilities" (-15).
 *   3. deriveCapabilities() downgrades risk_level for verified publishers, so
 *      a high-power server displayed "medium" risk instead of "high".
 *
 * `verified` must mean exactly one thing: a human at MCPX reviewed this
 * publisher. Nothing in the codebase sets it except seeding, so any row
 * carrying it is a seeded assertion, not a review.
 *
 * Scores will drop. That is the correction working — a flattering score that
 * nobody earned is worth less than a lower one that is true.
 *
 * @param {import("better-sqlite3").Database} db
 * @returns {{ cleared: number }}
 */
export function unverifySeededPublishers(db) {
  const cleared = db.prepare("UPDATE servers SET verified = 0 WHERE verified = 1").run().changes || 0;
  if (cleared > 0) {
    logger.warn(
      { cleared },
      "[trust] cleared `verified` on seeded listings — no human review backed it"
    );
  }
  return { cleared };
}

export default unverifySeededPublishers;
