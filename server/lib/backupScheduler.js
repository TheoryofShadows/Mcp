/**
 * Lightweight in-process daily SQLite backup scheduler.
 *
 * Enabled when BACKUP_S3_BUCKET (or Railway BUCKET / AWS_S3_BUCKET_NAME) is set,
 * or when BACKUP_ENABLED=1. Quiet in local dev otherwise.
 *
 * Strategy (zero cron deps): on boot + every CHECK_MS, if the newest file in
 * BACKUP_DIR is older than MAX_AGE_MS (~23h) or missing, run the backup script.
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./observability.js";
import { resolveS3Config, runBackup } from "../../scripts/backup-db.js";

const CHECK_MS = Number(process.env.BACKUP_CHECK_MS) || 60 * 60 * 1000; // hourly
const MAX_AGE_MS = Number(process.env.BACKUP_MAX_AGE_MS) || 23 * 60 * 60 * 1000; // 23h
const BOOT_DELAY_MS = Number(process.env.BACKUP_BOOT_DELAY_MS) || 15_000;

function rootDir() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function backupsEnabled(env = process.env) {
  if (env.BACKUP_ENABLED === "0" || env.BACKUP_ENABLED === "false") return false;
  if (env.BACKUP_ENABLED === "1" || env.BACKUP_ENABLED === "true") return true;
  try {
    return Boolean(resolveS3Config(env));
  } catch {
    // Bucket name present but creds incomplete — still "enabled" so we surface the error in logs.
    return Boolean(env.BACKUP_S3_BUCKET || env.AWS_S3_BUCKET_NAME || env.BUCKET_NAME || env.BUCKET);
  }
}

export function resolveBackupPaths(env = process.env) {
  const dbPath = env.DB_PATH || join(rootDir(), "server", "mcpx.db");
  const destDir = env.BACKUP_DIR || join(dirname(dbPath), "backups");
  return { dbPath, destDir };
}

export function newestBackupMtimeMs(destDir) {
  if (!existsSync(destDir)) return null;
  let newest = null;
  for (const name of readdirSync(destDir)) {
    if (!/^mcpx-.*\.db$/i.test(name)) continue;
    const mtimeMs = statSync(join(destDir, name)).mtimeMs;
    if (newest == null || mtimeMs > newest) newest = mtimeMs;
  }
  return newest;
}

export function shouldRunBackup(destDir, now = Date.now(), maxAgeMs = MAX_AGE_MS) {
  const newest = newestBackupMtimeMs(destDir);
  if (newest == null) return true;
  return now - newest >= maxAgeMs;
}

let running = false;
let timer = null;

export async function maybeRunScheduledBackup({ env = process.env, force = false } = {}) {
  if (!backupsEnabled(env)) return { skipped: true, reason: "disabled" };
  const { dbPath, destDir } = resolveBackupPaths(env);
  mkdirSync(destDir, { recursive: true });
  if (!force && !shouldRunBackup(destDir)) {
    return { skipped: true, reason: "fresh" };
  }
  if (running) return { skipped: true, reason: "in_flight" };
  running = true;
  try {
    logger.info({ destDir }, "[backup] starting scheduled SQLite backup");
    const result = await runBackup({ dbPath, destDir, env });
    logger.info(
      {
        dest: result.dest,
        s3Key: result.s3?.key || null,
        pruned: result.prune.removed.length,
      },
      "[backup] completed"
    );
    return { skipped: false, result };
  } catch (err) {
    logger.error({ err: String(err?.message || err) }, "[backup] failed");
    return { skipped: false, error: String(err?.message || err) };
  } finally {
    running = false;
  }
}

export function startBackupScheduler({ env = process.env } = {}) {
  if (!backupsEnabled(env)) {
    logger.debug("[backup] scheduler idle (BACKUP_S3_BUCKET / BACKUP_ENABLED not set)");
    return () => {};
  }
  logger.info(
    { checkMs: CHECK_MS, maxAgeMs: MAX_AGE_MS },
    "[backup] scheduler enabled"
  );
  const boot = setTimeout(() => {
    maybeRunScheduledBackup({ env }).catch(() => {});
  }, BOOT_DELAY_MS);
  boot.unref?.();
  timer = setInterval(() => {
    maybeRunScheduledBackup({ env }).catch(() => {});
  }, CHECK_MS);
  timer.unref?.();
  return () => {
    clearTimeout(boot);
    if (timer) clearInterval(timer);
    timer = null;
  };
}
