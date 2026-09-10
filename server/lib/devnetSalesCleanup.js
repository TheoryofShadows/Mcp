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
  return { updated, skipped: false };
}

export default zeroOutDevnetSales;
