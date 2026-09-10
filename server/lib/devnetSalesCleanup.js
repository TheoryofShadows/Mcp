import { logger } from "./observability.js";

/**
 * Zero out sales that were paid with devnet/testnet SOL.
 *
 * Solana Pay runs on devnet in production. Devnet SOL is free from a faucet, so
 * those "purchases" cost the buyer nothing — but they were recorded as ordinary
 * `solana` sales carrying real gross_cents, which fed straight into publisher
 * earnings. A dashboard showing revenue nobody paid is exactly the kind of
 * claim this codebase exists to avoid.
 *
 * Buyers KEEP their access: the sales row stays (access is gated on a
 * non-refunded sale), it is just re-labelled and valued at zero.
 *
 * Only runs while the configured cluster is not mainnet-beta. Once real money
 * is switched on, existing rows are left exactly as they are.
 *
 * @param {import("better-sqlite3").Database} db
 * @param {{ is_real_money?: boolean }} solanaConfig
 * @returns {{ updated: number, skipped: boolean }}
 */
export function zeroOutDevnetSales(db, solanaConfig = {}) {
  if (solanaConfig.is_real_money) {
    return { updated: 0, skipped: true };
  }

  const info = db.prepare(`
    UPDATE sales
    SET payment_method = 'solana-devnet',
        gross_cents = 0,
        fee_cents = 0
    WHERE payment_method = 'solana'
  `).run();

  const updated = info.changes || 0;
  if (updated > 0) {
    logger.warn(
      { updated },
      "[solana] re-labelled devnet SOL sales as zero-value — they were never real money"
    );
  }

  // Optionally revoke the access those free unlocks granted. Off by default —
  // silently taking away something a user already has is worse than leaving a
  // zero-value row — but needed to test the real Stripe path from scratch on a
  // tool that was unlocked with faucet SOL. Set MCPX_REVOKE_DEVNET_UNLOCKS=1.
  let revoked = 0;
  if (/^(1|true|yes)$/i.test((process.env.MCPX_REVOKE_DEVNET_UNLOCKS || "").trim())) {
    // Stamp rather than delete: the audit trail keeps the row, and access is
    // gated on refunded_at IS NULL, so stamping is exactly what locks the tool.
    revoked = db.prepare(`
      UPDATE sales
      SET refunded_at = datetime('now')
      WHERE payment_method = 'solana-devnet' AND refunded_at IS NULL
    `).run().changes || 0;
    if (revoked > 0) {
      logger.warn({ revoked }, "[solana] revoked devnet unlocks (MCPX_REVOKE_DEVNET_UNLOCKS)");
    }
  }

  return { updated, revoked, skipped: false };
}

export default zeroOutDevnetSales;
