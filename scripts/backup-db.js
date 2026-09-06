/**
 * SQLite backup — MCPX
 *
 * Writes a consistent, point-in-time copy via better-sqlite3's online `.backup()`
 * (safe while the app is running). Optionally uploads to an S3-compatible bucket
 * (Railway Buckets / AWS / R2) and retains the last N local copies.
 *
 * Upload uses AWS Signature Version 4 over fetch (zero new deps; S3 PutObject).
 * Compatible with the AWS SDK v3 env var names Railway injects for buckets.
 *
 * Env:
 *   DB_PATH              source database (default server/mcpx.db)
 *   BACKUP_DIR           destination directory (default <db dir>/backups)
 *   BACKUP_KEEP_LOCAL    local retention count (default 3)
 *   BACKUP_S3_BUCKET     bucket name — also accepts BUCKET / AWS_S3_BUCKET_NAME / BUCKET_NAME
 *   AWS_ACCESS_KEY_ID    (or ACCESS_KEY_ID / BUCKET_ACCESS_KEY_ID)
 *   AWS_SECRET_ACCESS_KEY (or SECRET_ACCESS_KEY / BUCKET_SECRET_ACCESS_KEY)
 *   AWS_ENDPOINT_URL     (or ENDPOINT / BUCKET_ENDPOINT / AWS_ENDPOINT)
 *   AWS_REGION           (or REGION / AWS_DEFAULT_REGION; default "auto")
 *
 *   node scripts/backup-db.js     # or: npm run backup:db
 */
import Database from "better-sqlite3";
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_KEEP = 3;

export function resolveS3Config(env = process.env) {
  const bucket =
    env.BACKUP_S3_BUCKET ||
    env.AWS_S3_BUCKET_NAME ||
    env.BUCKET_NAME ||
    env.BUCKET ||
    null;
  const accessKeyId =
    env.AWS_ACCESS_KEY_ID ||
    env.ACCESS_KEY_ID ||
    env.BUCKET_ACCESS_KEY_ID ||
    null;
  const secretAccessKey =
    env.AWS_SECRET_ACCESS_KEY ||
    env.SECRET_ACCESS_KEY ||
    env.BUCKET_SECRET_ACCESS_KEY ||
    null;
  const endpoint =
    env.AWS_ENDPOINT_URL ||
    env.AWS_ENDPOINT ||
    env.ENDPOINT ||
    env.BUCKET_ENDPOINT ||
    null;
  const region =
    env.AWS_REGION ||
    env.AWS_DEFAULT_REGION ||
    env.REGION ||
    "auto";
  if (!bucket) return null;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "BACKUP_S3_BUCKET is set but AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (or Railway ACCESS_KEY_ID / SECRET_ACCESS_KEY) are missing"
    );
  }
  return { bucket, accessKeyId, secretAccessKey, endpoint, region };
}

export function objectKeyForBackup(destPath, when = new Date()) {
  const yyyy = String(when.getUTCFullYear());
  const mm = String(when.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(when.getUTCDate()).padStart(2, "0");
  return `mcpx/${yyyy}/${mm}/${dd}/${basename(destPath)}`;
}

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

export function pruneLocalBackups(destDir, keep = DEFAULT_KEEP) {
  mkdirSync(destDir, { recursive: true });
  const files = readdirSync(destDir)
    .filter((name) => /^mcpx-.*\.db$/i.test(name))
    .map((name) => {
      const path = join(destDir, name);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  const removed = [];
  for (const file of files.slice(Math.max(0, keep))) {
    unlinkSync(file.path);
    removed.push(file.path);
  }
  return { kept: files.slice(0, keep).map((f) => f.path), removed };
}

function hmac(key, data) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function hashHex(data) {
  return createHash("sha256").update(data).digest("hex");
}

function amzDate(when = new Date()) {
  const iso = when.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amz: iso, day: iso.slice(0, 8) };
}

/** AWS SigV4-signed PutObject via fetch (S3 / Railway Buckets / R2). */
export async function uploadBackupToS3(destPath, s3Config, key = objectKeyForBackup(destPath)) {
  const region = s3Config.region || "auto";
  const forcePath = process.env.AWS_S3_FORCE_PATH_STYLE === "1";
  const endpoint = (s3Config.endpoint || `https://s3.${region}.amazonaws.com`).replace(/\/$/, "");
  const endpointUrl = new URL(endpoint);
  const host = forcePath ? endpointUrl.host : `${s3Config.bucket}.${endpointUrl.host}`;
  const basePath = endpointUrl.pathname.replace(/\/$/, "") || "";
  const objectPath = forcePath
    ? `${basePath}/${s3Config.bucket}/${key}`
    : `${basePath}/${key}`;
  const canonicalUri = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
  const body = readFileSync(destPath);
  const payloadHash = hashHex(body);
  const { amz, day } = amzDate();
  const contentType = "application/x-sqlite3";
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amz}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${day}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amz,
    credentialScope,
    hashHex(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${s3Config.secretAccessKey}`, day);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${s3Config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const url = `${endpointUrl.protocol}//${host}${canonicalUri}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amz,
      "Content-Length": String(body.length),
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`S3 PutObject failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return { bucket: s3Config.bucket, key };
}

export async function runBackup({
  dbPath,
  destDir,
  keepLocal = Number(process.env.BACKUP_KEEP_LOCAL) || DEFAULT_KEEP,
  env = process.env,
  upload = true,
} = {}) {
  const dest = await backupDatabase(dbPath, destDir);
  const prune = pruneLocalBackups(destDir, keepLocal);
  let s3 = null;
  if (upload) {
    const cfg = resolveS3Config(env);
    if (cfg) {
      s3 = await uploadBackupToS3(dest, cfg);
    }
  }
  return { dest, prune, s3 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const dbPath = process.env.DB_PATH || join(root, "server", "mcpx.db");
  const destDir = process.env.BACKUP_DIR || join(dirname(dbPath), "backups");
  const result = await runBackup({ dbPath, destDir });
  console.log(`Backup written: ${result.dest}`);
  if (result.s3) {
    console.log(`Uploaded s3://${result.s3.bucket}/${result.s3.key}`);
  }
  if (result.prune.removed.length) {
    console.log(`Pruned ${result.prune.removed.length} old local backup(s); keeping ${result.prune.kept.length}`);
  }
}
