import { Router } from "express";
import { scanRepo, ALLOWED_HOSTS } from "../lib/repoScan.js";

const router = Router();

/**
 * /api/scan — live security scan of any public MCP server repo.
 *
 * This is the agent-native, fakeable-data-proof trust surface: instead of
 * scoring installs and ratings (gameable, and historically seeded with fake
 * numbers), it reads the actual source and reports real findings — secrets,
 * tool-poisoning directives, dangerous execution surface — in the same
 * itemized {score, tier, factors} shape the rest of MCPX already speaks.
 *
 * No auth: this is meant to be called *before* you trust a server, by humans
 * and by agents alike. Lightly rate-limited per-process to keep clone abuse
 * in check (swap for your shared limiter in production).
 */

// --- tiny in-process rate limiter (per IP, sliding window) ---------------
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map(); // ip -> number[] (timestamps)

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // crude memory cap
  return arr.length > MAX_PER_WINDOW;
}

// --- naive single-flight cache so repeated scans of the same repo are cheap
const CACHE_TTL_MS = 10 * 60_000;
const cache = new Map(); // url -> { at, report }

async function runScan(repoUrl) {
  const cached = cache.get(repoUrl);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ...cached.report, cached: true };
  }
  const report = await scanRepo(repoUrl);
  cache.set(repoUrl, { at: Date.now(), report });
  return report;
}

function handleError(err, res) {
  if (err.code === "BAD_URL") {
    return res.status(400).json({
      error: "Invalid repository URL. Provide a public github.com, gitlab.com, or bitbucket.org repo.",
    });
  }
  if (err.killed || /timed out|ETIMEDOUT/i.test(err.message || "")) {
    return res.status(504).json({ error: "Repository clone timed out — repo may be too large or unreachable." });
  }
  if (/not found|repository .* not found|could not read|authentication failed|exit code 128/i.test(err.stderr || err.message || "")) {
    return res.status(404).json({ error: "Repository not found or not public." });
  }
  console.error("[scan] unexpected error:", err);
  return res.status(500).json({ error: "Scan failed unexpectedly." });
}

// POST /api/scan  { repo_url }
router.post("/", async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many scans — try again in a minute." });
  }
  const repoUrl = req.body?.repo_url || req.body?.repoUrl;
  if (!repoUrl) {
    return res.status(400).json({ error: "Missing repo_url in request body." });
  }
  try {
    const report = await runScan(repoUrl);
    res.json(report);
  } catch (err) {
    handleError(err, res);
  }
});

// GET /api/scan/:owner/:repo  — convenience for agents / curl / shareable links
router.get("/:owner/:repo", async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many scans — try again in a minute." });
  }
  const host = (req.query.host || "github.com").toString();
  if (!ALLOWED_HOSTS.has(host)) {
    return res.status(400).json({
      error: "Unsupported host. Use github.com, gitlab.com, or bitbucket.org.",
    });
  }
  const url = `https://${host}/${req.params.owner}/${req.params.repo}`;
  try {
    const report = await runScan(url);
    res.json(report);
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
