import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { createApp } from "./app.js";
import db from "./db.js";
import { logger, initSentry } from "./lib/observability.js";
import { startBackupScheduler } from "./lib/backupScheduler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;

initSentry();

// Auto-seed: if the database has no users, run the seed script
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  logger.info("Empty database detected. Running seed...");
  await import("./seed.js");
}

// Backfill NULL/empty install_command from seed map by slug.
// Does not overwrite non-empty author-provided values.
{
  const { backfillInstallCommands } = await import("./lib/seedInstallCommands.js");
  backfillInstallCommands(db);
}

// Zero inflated seed-catalog social proof (installs/ratings/revenue/reviews).
// Idempotent; never touches user-published tools outside the seed slug map.
{
  const { resetSeedSocialProof } = await import("./lib/seedSocialProofReset.js");
  const { serversUpdated, reviewsDeleted } = resetSeedSocialProof(db);
  if (serversUpdated > 0 || reviewsDeleted > 0) {
    logger.info({ serversUpdated, reviewsDeleted }, "[boot] seed social proof reset applied");
  }
}

const app = createApp();

// Serve static files in production
const distPath = join(__dirname, "..", "dist");
app.use((await import("express")).default.static(distPath));
// SPA fallback — Express 5 (path-to-regexp v8) rejects a bare "*"; a named
// wildcard splat is required so deep links resolve to index.html.
app.get("/{*splat}", (req, res) => {
  // Any path with a file extension is a static-asset request. If express.static
  // didn't serve it above, the file genuinely doesn't exist — return a real 404
  // instead of the SPA shell. Serving index.html (HTML) for a missing .js/.css
  // request makes a stale client try to execute HTML as a module and
  // white-screens the page — e.g. after a redeploy changes the hashed asset
  // filenames, or if a cached index.html points at a different base path
  // (like the /Mcp/ GitHub Pages build). A clean 404 lets a reload recover.
  // SPA routes never contain a "." (slugs are [a-z0-9-]), so this is safe.
  if (extname(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  // Always revalidate the SPA shell so a new deploy's asset hashes are picked up
  // instead of a stale cached document referencing files that no longer exist.
  res.set("Cache-Control", "no-cache");
  res.sendFile(join(distPath, "index.html"));
});

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, `MCPX API server running on http://localhost:${PORT}`);
  // Off-box SQLite backups (Railway Buckets / S3). Gated by BACKUP_S3_BUCKET or BACKUP_ENABLED=1.
  startBackupScheduler();
});

// Graceful shutdown — Railway sends SIGTERM before killing the process
process.on("SIGTERM", () => {
  logger.info("[server] SIGTERM received — shutting down gracefully");
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
