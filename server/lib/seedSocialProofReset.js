/**
 * Boot-time honesty reset for seeded catalog social proof.
 *
 * Production DBs already contain inflated installs/ratings/revenue and sample
 * reviews from older seed runs. This backfill zeros vanity metrics for slugs in
 * SEED_INSTALL_COMMANDS (the seed catalog) and deletes reviews on those rows
 * while they are still inflated. User-published tools whose slug is NOT in the
 * seed map are never touched.
 *
 * Idempotent: once seed rows are already at zero with empty weekly_growth, a
 * subsequent boot is a no-op — so real installs/reviews earned *after* the
 * honesty cutover are preserved.
 */
import { logger } from "./observability.js";
import { SEED_INSTALL_COMMANDS } from "./seedInstallCommands.js";

/**
 * @param {import("better-sqlite3").Database} db
 * @returns {{ serversUpdated: number, reviewsDeleted: number }}
 */
export function resetSeedSocialProof(db) {
  const slugs = Object.keys(SEED_INSTALL_COMMANDS);
  if (slugs.length === 0) return { serversUpdated: 0, reviewsDeleted: 0 };

  const placeholders = slugs.map(() => "?").join(", ");

  let serversUpdated = 0;
  let reviewsDeleted = 0;

  const run = db.transaction(() => {
    const inflated = db
      .prepare(
        `
      SELECT id FROM servers
      WHERE slug IN (${placeholders})
        AND (
          installs != 0
          OR rating != 0
          OR rating_count != 0
          OR monthly_revenue != 0
          OR (weekly_growth IS NOT NULL AND TRIM(weekly_growth) != '')
        )
    `
      )
      .all(...slugs);

    if (inflated.length === 0) return;

    const ids = inflated.map((r) => r.id);
    const idPh = ids.map(() => "?").join(", ");

    // Wipe seed sample reviews (and any reviews on still-inflated seed rows)
    // so Trust Score satisfaction is honest after the cutover.
    reviewsDeleted = db
      .prepare(`DELETE FROM reviews WHERE server_id IN (${idPh})`)
      .run(...ids).changes;

    serversUpdated = db
      .prepare(
        `
      UPDATE servers
      SET installs = 0,
          rating = 0,
          rating_count = 0,
          monthly_revenue = 0,
          weekly_growth = NULL,
          created_at = datetime('now')
      WHERE id IN (${idPh})
    `
      )
      .run(...ids).changes;
  });
  run();

  if (serversUpdated > 0 || reviewsDeleted > 0) {
    logger.info(
      { serversUpdated, reviewsDeleted, seedSlugs: slugs.length },
      "[seed] reset inflated social proof on seed catalog rows"
    );
  }

  return { serversUpdated, reviewsDeleted };
}
