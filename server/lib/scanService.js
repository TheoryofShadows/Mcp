/**
 * Scan service — MCPX
 *
 * Bridges the pure/IO scan engine (server/lib/repoScan.js) to the database and the
 * Trust Score. Responsibilities:
 *   - scheduleScan(): clone + score a server's repo OUT OF BAND (never blocks the
 *     request that triggered it) and upsert the latest result into `server_scans`.
 *   - latestScanTier(): cheap lookup used by the Trust Score so a "high"/"moderate"
 *     scan lowers a server's score.
 *
 * Auto-scanning clones arbitrary public repos, so it is best-effort and guarded:
 *   - skipped entirely when MCPX_DISABLE_AUTO_SCAN is set (tests, and a kill switch);
 *   - de-duplicated by an in-flight set so the same server isn't cloned repeatedly;
 *   - all failures are swallowed (a flaky clone must never break publish/update).
 */
import db from "../db.js";
import { scanRepo } from "./repoScan.js";

const inFlight = new Set();

const upsertStmt = db.prepare(`
  INSERT INTO server_scans (server_id, score, tier, finding_count, scanned_at)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(server_id) DO UPDATE SET
    score = excluded.score, tier = excluded.tier,
    finding_count = excluded.finding_count, scanned_at = excluded.scanned_at
`);

const tierStmt = db.prepare("SELECT tier FROM server_scans WHERE server_id = ?");

/** Latest scan tier for a server ("safe"|"low"|"moderate"|"high"), or null. */
export function latestScanTier(serverId) {
  return tierStmt.get(serverId)?.tier ?? null;
}

/** Persist a scan report for a server. Exported for direct use/testing. */
export function recordScan(serverId, report) {
  upsertStmt.run(serverId, report.score, report.tier, report.finding_count ?? 0);
}

/**
 * Fire-and-forget: scan `repoUrl` and store the result for `serverId`. Returns a
 * promise (so callers/tests can await), but request handlers should NOT await it.
 */
export async function scheduleScan(serverId, repoUrl) {
  if (process.env.MCPX_DISABLE_AUTO_SCAN) return;
  if (!repoUrl || typeof repoUrl !== "string") return;
  if (inFlight.has(serverId)) return;
  inFlight.add(serverId);
  try {
    const report = await scanRepo(repoUrl);
    recordScan(serverId, report);
  } catch (err) {
    console.warn(`[scan] auto-scan failed for ${serverId}:`, err.message);
  } finally {
    inFlight.delete(serverId);
  }
}

export default scheduleScan;
