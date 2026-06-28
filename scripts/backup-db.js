/**
 * SQLite backup — MCPX
 *
 * Writes a consistent, point-in-time copy of the database using better-sqlite3's
 * online `.backup()` (safe while the app is running — no need to stop writes).
 * Run on a schedule (e.g. a Railway cron) and ship the output off-box.
 *
 *   DB_PATH     source database (default server/mcpx.db)
 *   BACKUP_DIR  destination directory (default <db dir>/backups)
 *
 *   node scripts/backup-db.js     # or: npm run backup:db
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function backupDatabase(dbPath, destDir) {
  mkdirSync(destDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = join(destDir, `mcpx-${stamp}.db`);
  const src = new Database(dbPath, { readonly: true });
  try {
    await src.backup(dest);
  } finally {
    src.close();
  }
  return dest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dbPath = process.env.DB_PATH || join(root, "server", "mcpx.db");
  const destDir = process.env.BACKUP_DIR || join(dirname(dbPath), "backups");
  const dest = await backupDatabase(dbPath, destDir);
  console.log(`Backup written: ${dest}`);
}
