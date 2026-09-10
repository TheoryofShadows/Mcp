import { logger } from "./observability.js";

/**
 * Strip the "/mo" suffix from listings that are not actually monthly.
 *
 * Every paid listing used to render "$16/mo" even though tool checkout has
 * always been a single Stripe `mode: "payment"` charge — the label described a
 * subscription that did not exist. The label generator was fixed, but
 * price_label is STORED, and seeding only runs on an empty database, so rows
 * created before the fix keep the wrong suffix forever without this.
 *
 * Only rows whose billing_period is not 'monthly' are touched. A publisher who
 * genuinely chose monthly billing keeps their "/mo" — that one is true.
 *
 * @param {import("better-sqlite3").Database} db
 * @returns {{ updated: number }}
 */
export function backfillPriceLabels(db) {
  const info = db.prepare(`
    UPDATE servers
    SET price_label = RTRIM(REPLACE(price_label, '/mo', ''))
    WHERE price_label LIKE '%/mo'
      AND COALESCE(billing_period, 'one_time') != 'monthly'
  `).run();

  const updated = info.changes || 0;
  if (updated > 0) {
    logger.info({ updated }, "[seed] removed /mo from one-time price labels");
  }
  return { updated };
}

export default backfillPriceLabels;
