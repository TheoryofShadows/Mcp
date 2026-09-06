import { Router } from "express";
import { v4 as uuid } from "uuid";
import { randomBytes } from "node:crypto";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { computeTrust } from "../lib/trustScore.js";
import { auditLog } from "../lib/audit.js";
import { scheduleScan, latestScanTier } from "../lib/scanService.js";
import { readProofToken, VERIFY_FILENAME } from "../lib/provenance.js";

const router = Router();

// Validate a publisher-declared install command. It is shown to users and split
// into command+args for client configs, so reject anything with shell-control
// characters that could enable command chaining/redirection.
function validateInstallCommand(value) {
  if (typeof value !== "string") return "install_command must be a string";
  const cmd = value.trim();
  if (cmd.length < 1 || cmd.length > 200) return "install_command must be 1-200 characters";
  if (/[;&|`<>\n\r\\]/.test(cmd) || cmd.includes("$(") || cmd.includes("${")) {
    return "install_command contains disallowed shell characters";
  }
  return null;
}

// GET /api/servers — list with search, filter, pagination, sort
router.get("/", (req, res) => {
  const {
    category,
    search,
    page = "1",
    limit = "20",
    sort = "installs",
    verified,
    trending,
    price_type,
    author,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let where = ["s.status = 'active'"];
  const params = [];

  if (category && category !== "all") {
    where.push("s.category_id = ?");
    params.push(category);
  }

  if (search) {
    if (String(search).length > 100) {
      return res.status(400).json({ error: "Search query too long" });
    }
    const escaped = String(search).replace(/[%_\\]/g, "\\$&");
    const q = `%${escaped}%`;
    where.push("(s.name LIKE ? ESCAPE '\\' OR s.description LIKE ? ESCAPE '\\' OR s.tags LIKE ? ESCAPE '\\')");
    params.push(q, q, q);
  }

  if (verified === "true") {
    where.push("s.verified = 1");
  }

  if (trending === "true") {
    where.push("s.trending = 1");
  }

  if (price_type === "free") {
    where.push("s.price_type = 'free'");
  } else if (price_type === "paid") {
    where.push("s.price_type = 'paid'");
  }

  if (author) {
    where.push("u.username = ?");
    params.push(author);
  }

  const SORT_MAP = {
    installs: "s.installs DESC",
    rating: "s.rating DESC",
    newest: "s.created_at DESC",
    name: "s.name ASC",
    revenue: "s.monthly_revenue DESC",
  };
  const orderBy = SORT_MAP[sort] || SORT_MAP.installs;

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // COUNT must use the same JOINs as the list query below — the WHERE clause can
  // reference u.username (the ?author= filter), so without the users join this
  // throws a 500 (which broke the dashboard's "your tools" list).
  const total = db.prepare(`
    SELECT COUNT(*) as c
    FROM servers s
    JOIN users u ON s.author_id = u.id
    JOIN categories c ON s.category_id = c.id
    ${whereClause}
  `).get(...params).c;

  const rows = db.prepare(`
    SELECT
      s.*,
      u.username as author_username,
      u.display_name as author_display_name,
      CASE WHEN u.solana_wallet IS NOT NULL AND length(trim(u.solana_wallet)) > 0 THEN 1 ELSE 0 END as publisher_has_solana_wallet,
      c.label as category_label,
      (SELECT COUNT(*) FROM flags f WHERE f.server_id = s.id AND f.status = 'open' AND f.user_id IS NOT NULL) as open_flags
    FROM servers s
    JOIN users u ON s.author_id = u.id
    JOIN categories c ON s.category_id = c.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, limitNum, offset);

  const servers = rows.map(formatServer);

  res.json({
    servers,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/servers/:slug — single server detail
router.get("/:slug", (req, res) => {
  const row = db.prepare(`
    SELECT
      s.*,
      u.username as author_username,
      u.display_name as author_display_name,
      CASE WHEN u.solana_wallet IS NOT NULL AND length(trim(u.solana_wallet)) > 0 THEN 1 ELSE 0 END as publisher_has_solana_wallet,
      c.label as category_label,
      (SELECT COUNT(*) FROM flags f WHERE f.server_id = s.id AND f.status = 'open' AND f.user_id IS NOT NULL) as open_flags
    FROM servers s
    JOIN users u ON s.author_id = u.id
    JOIN categories c ON s.category_id = c.id
    WHERE s.slug = ?
  `).get(req.params.slug);

  if (!row) {
    return res.status(404).json({ error: "Server not found" });
  }

  const reviews = db.prepare(`
    SELECT r.*, u.username, u.display_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.server_id = ?
    ORDER BY r.created_at DESC
  `).all(row.id);

  res.json({ ...formatServer(row), reviews });
});

// GET /api/servers/:slug/trust — machine-readable trust report.
// This is the "agent-native" endpoint: an agent can query trust *before* it
// installs or calls a tool, which is the whole product thesis (see MARKET.md).
router.get("/:slug/trust", (req, res) => {
  const row = db.prepare("SELECT * FROM servers WHERE slug = ?").get(req.params.slug);
  if (!row) {
    return res.status(404).json({ error: "Server not found" });
  }
  const openFlags = db.prepare("SELECT COUNT(*) c FROM flags WHERE server_id = ? AND status = 'open' AND user_id IS NOT NULL").get(row.id).c;
  res.json({
    slug: row.slug,
    name: row.name,
    ...computeTrust({
      repo_url: row.repo_url,
      repo_verified: row.repo_verified,
      license: row.license,
      verified: row.verified,
      installs: row.installs,
      rating: row.rating,
      rating_count: row.rating_count,
      created_at: row.created_at,
      tags: row.tags,
      open_flags: openFlags,
      scan_tier: latestScanTier(row.id),
    }),
  });
});

// ─── Repository ownership verification (.mcpx-verify) ────────────────────────
// Proves the publisher controls the linked repo, which unlocks full provenance
// points in the Trust Score. Verification clones the repo, so it's author-only
// and lightly cooldown-limited to curb clone abuse.
const verifyCooldown = new Map(); // server_id -> last attempt ts
const VERIFY_COOLDOWN_MS = 30_000;
setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of verifyCooldown) if (now - ts > VERIFY_COOLDOWN_MS) verifyCooldown.delete(k);
}, 300_000).unref();

// GET /api/servers/:slug/verify — issue (or return) the challenge token.
router.get("/:slug/verify", requireAuth, (req, res) => {
  const server = db.prepare(
    "SELECT id, author_id, repo_url, repo_verified, verify_token FROM servers WHERE slug = ?"
  ).get(req.params.slug);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (server.author_id !== req.user.id) return res.status(403).json({ error: "You can only verify your own servers" });
  if (!server.repo_url) return res.status(400).json({ error: "Add a repository URL before verifying ownership." });

  let token = server.verify_token;
  if (!token) {
    token = randomBytes(16).toString("hex");
    db.prepare("UPDATE servers SET verify_token = ? WHERE id = ?").run(token, server.id);
  }
  res.json({
    repo_verified: !!server.repo_verified,
    filename: VERIFY_FILENAME,
    token,
    instructions: `Add a file named ${VERIFY_FILENAME} to the root of ${server.repo_url} (default branch) containing exactly this token, commit and push, then POST to this same URL to complete verification.`,
  });
});

// POST /api/servers/:slug/verify — check the repo for the challenge token.
router.post("/:slug/verify", requireAuth, async (req, res) => {
  const server = db.prepare(
    "SELECT id, author_id, repo_url, verify_token FROM servers WHERE slug = ?"
  ).get(req.params.slug);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (server.author_id !== req.user.id) return res.status(403).json({ error: "You can only verify your own servers" });
  if (!server.repo_url) return res.status(400).json({ error: "Add a repository URL before verifying ownership." });
  if (!server.verify_token) {
    return res.status(400).json({ error: `Request a token first (GET this endpoint), then add it as ${VERIFY_FILENAME}.` });
  }

  const last = verifyCooldown.get(server.id);
  if (last && Date.now() - last < VERIFY_COOLDOWN_MS) {
    return res.status(429).json({ error: "Verification was just attempted. Wait a moment and try again." });
  }
  verifyCooldown.set(server.id, Date.now());

  let found;
  try {
    found = await readProofToken(server.repo_url);
  } catch {
    return res.status(502).json({ repo_verified: false, message: "Could not read the repository. Ensure it is public and reachable." });
  }

  if (found && found === server.verify_token) {
    db.prepare("UPDATE servers SET repo_verified = 1 WHERE id = ?").run(server.id);
    auditLog("server.repo_verified", req.user.id, { server_id: server.id, repo_url: server.repo_url });
    return res.json({ repo_verified: true, message: "Repository ownership verified." });
  }
  return res.status(422).json({
    repo_verified: false,
    message: `Verification token not found. Ensure ${VERIFY_FILENAME} is at the repo root on the default branch and contains the exact token.`,
  });
});

// POST /api/servers — create a new server (auth required)
router.post("/", requireAuth, (req, res) => {
  const recentCount = db.prepare(
    "SELECT COUNT(*) as c FROM servers WHERE author_id = ? AND created_at > datetime('now', '-1 day')"
  ).get(req.user.id).c;
  if (recentCount >= 10) {
    return res.status(429).json({ error: "You can create up to 10 servers per day" });
  }

  const { name, category_id, description, long_description, price_type, price_amount, repo_url, tags, install_command } = req.body;

  if (!name || !category_id || !description) {
    return res.status(400).json({ error: "Name, category, and description are required" });
  }

  if (install_command !== undefined && install_command !== null && install_command !== "") {
    const installErr = validateInstallCommand(install_command);
    if (installErr) return res.status(400).json({ error: installErr });
  }

  if (typeof name !== "string" || typeof description !== "string") {
    return res.status(400).json({ error: "Invalid input types" });
  }

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ error: "Name must be between 2 and 60 characters" });
  }

  if (description.length < 10 || description.length > 500) {
    return res.status(400).json({ error: "Description must be between 10 and 500 characters" });
  }

  if (long_description && String(long_description).length > 5000) {
    return res.status(400).json({ error: "Long description must be under 5000 characters" });
  }

  if (tags && (!Array.isArray(tags) || tags.length > 10)) {
    return res.status(400).json({ error: "Tags must be an array of up to 10 items" });
  }

  if (tags && tags.some((t) => typeof t !== "string" || t.length > 50)) {
    return res.status(400).json({ error: "Each tag must be a string of up to 50 characters" });
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const existingSlug = db.prepare("SELECT id FROM servers WHERE slug = ?").get(slug);
  if (existingSlug) {
    return res.status(409).json({ error: "A server with a similar name already exists" });
  }

  const cat = db.prepare("SELECT id FROM categories WHERE id = ? AND id != 'all'").get(category_id);
  if (!cat) {
    return res.status(400).json({ error: "Invalid category" });
  }

  const GRADIENTS = [
    "linear-gradient(135deg, #4DFFB4, #4D9FFF)",
    "linear-gradient(135deg, #9B6DFF, #FF6DB4)",
    "linear-gradient(135deg, #FF6DB4, #FFAA4D)",
    "linear-gradient(135deg, #4D9FFF, #4DFFB4)",
    "linear-gradient(135deg, #FFAA4D, #4D9FFF)",
  ];

  const id = uuid();
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  const priceLabel = price_type === "paid" && price_amount ? `$${(price_amount / 100).toFixed(0)}/mo` : "free";

  db.prepare(`
    INSERT INTO servers (id, name, slug, author_id, category_id, description, long_description,
      price_type, price_amount, price_label, gradient, repo_url, tags, install_command, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    id, name, slug, req.user.id, category_id,
    description, long_description || "",
    price_type || "free", price_amount || 0, priceLabel,
    gradient, repo_url || "", JSON.stringify(tags || []),
    install_command ? String(install_command).trim() : null
  );

  // Kick off a best-effort source scan (fire-and-forget; never blocks the response).
  scheduleScan(id, repo_url);

  const row = db.prepare(`
    SELECT s.*, u.username as author_username, u.display_name as author_display_name,
    c.label as category_label
    FROM servers s
    JOIN users u ON s.author_id = u.id
    JOIN categories c ON s.category_id = c.id
    WHERE s.id = ?
  `).get(id);

  res.status(201).json(formatServer(row));
});

// PATCH /api/servers/:slug — publisher updates their own server
router.patch("/:slug", requireAuth, (req, res) => {
  const server = db.prepare("SELECT id, author_id FROM servers WHERE slug = ?").get(req.params.slug);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (server.author_id !== req.user.id) {
    return res.status(403).json({ error: "You can only update your own servers" });
  }

  const allowed = ["description", "long_description", "repo_url", "tags", "license", "install_command"];
  const updates = [];
  const values = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      if (field === "tags") {
        if (!Array.isArray(req.body.tags) || req.body.tags.length > 10) {
          return res.status(400).json({ error: "Tags must be an array of up to 10 items" });
        }
        if (req.body.tags.some((t) => typeof t !== "string" || t.length > 50)) {
          return res.status(400).json({ error: "Each tag must be a string of up to 50 characters" });
        }
        updates.push("tags = ?");
        values.push(JSON.stringify(req.body.tags));
      } else if (field === "install_command") {
        const installErr = req.body.install_command ? validateInstallCommand(req.body.install_command) : null;
        if (installErr) return res.status(400).json({ error: installErr });
        updates.push("install_command = ?");
        values.push(req.body.install_command ? String(req.body.install_command).trim() : null);
      } else if (field === "description") {
        const desc = String(req.body.description);
        if (desc.length < 10 || desc.length > 500) {
          return res.status(400).json({ error: "Description must be between 10 and 500 characters" });
        }
        updates.push("description = ?");
        values.push(desc);
      } else if (field === "long_description") {
        if (String(req.body.long_description).length > 5000) {
          return res.status(400).json({ error: "Long description must be under 5000 characters" });
        }
        updates.push("long_description = ?");
        values.push(String(req.body.long_description));
      } else {
        updates.push(`${field} = ?`);
        values.push(String(req.body[field]).slice(0, 500));
      }
    }
  }

  if (!updates.length) return res.status(400).json({ error: "No fields to update" });

  // Changing the repository invalidates any prior ownership proof and triggers a
  // fresh source scan — closing the "pass review, then point at a new repo" gap.
  const repoChanged = req.body.repo_url !== undefined;
  if (repoChanged) updates.push("repo_verified = 0");

  updates.push("updated_at = datetime('now')");
  values.push(server.id);

  db.prepare(`UPDATE servers SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  if (repoChanged) scheduleScan(server.id, String(req.body.repo_url || ""));

  const row = db.prepare(`
    SELECT s.*, u.username as author_username, u.display_name as author_display_name,
           c.label as category_label,
           (SELECT COUNT(*) FROM flags f WHERE f.server_id = s.id AND f.status = 'open' AND f.user_id IS NOT NULL) as open_flags
    FROM servers s JOIN users u ON s.author_id = u.id JOIN categories c ON s.category_id = c.id
    WHERE s.id = ?
  `).get(server.id);

  res.json(formatServer(row));
});

// POST /api/servers/:slug/reviews — add a review (auth required)
router.post("/:slug/reviews", requireAuth, (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
  }

  if (comment && String(comment).length > 2000) {
    return res.status(400).json({ error: "Comment must be under 2000 characters" });
  }

  const reviewer = db.prepare("SELECT created_at FROM users WHERE id = ?").get(req.user.id);
  const accountAge = Date.now() - new Date(reviewer.created_at).getTime();
  if (accountAge < 24 * 60 * 60 * 1000) {
    return res.status(403).json({ error: "Your account must be at least 24 hours old to leave reviews" });
  }

  const server = db.prepare("SELECT id, author_id FROM servers WHERE slug = ?").get(req.params.slug);
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }

  if (server.author_id === req.user.id) {
    return res.status(400).json({ error: "You cannot review your own server" });
  }

  const existing = db.prepare("SELECT id FROM reviews WHERE server_id = ? AND user_id = ?").get(server.id, req.user.id);
  if (existing) {
    return res.status(409).json({ error: "You have already reviewed this server" });
  }

  const id = uuid();
  db.prepare("INSERT INTO reviews (id, server_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)").run(
    id, server.id, req.user.id, rating, comment || null
  );

  // Recalculate average rating
  const stats = db.prepare("SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE server_id = ?").get(server.id);
  db.prepare("UPDATE servers SET rating = COALESCE(ROUND(?, 1), 0), rating_count = ? WHERE id = ?").run(stats.avg, stats.cnt, server.id);

  const review = db.prepare(`
    SELECT r.*, u.username, u.display_name
    FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(id);

  res.status(201).json(review);
});

// Simple in-memory rate limit for install endpoint (IP + slug, 1 per minute)
const installRateLimit = new Map();
const INSTALL_RATE_LIMIT_MS = 60_000;

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of installRateLimit) {
    if (now - ts > INSTALL_RATE_LIMIT_MS) installRateLimit.delete(key);
  }
}, 300_000);

// POST /api/servers/:slug/install — record an install
router.post("/:slug/install", (req, res) => {
  const server = db.prepare("SELECT id FROM servers WHERE slug = ?").get(req.params.slug);
  if (!server) {
    return res.status(404).json({ error: "Server not found" });
  }

  // Rate limit: one install per IP per server per minute
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const key = `${ip}:${server.id}`;
  const lastInstall = installRateLimit.get(key);
  if (lastInstall && Date.now() - lastInstall < INSTALL_RATE_LIMIT_MS) {
    return res.status(429).json({ error: "Install already recorded. Try again later." });
  }
  installRateLimit.set(key, Date.now());

  const id = uuid();
  const userId = req.user?.id || null;

  if (userId) {
    // Counted install: one per (server, authenticated user). The partial UNIQUE
    // index (server/db.js) makes INSERT OR IGNORE a no-op on repeats, so the
    // adoption counter — which feeds the Trust Score — only ever reflects
    // *distinct* authenticated accounts, even under concurrent requests.
    const result = db.prepare(
      "INSERT OR IGNORE INTO installs (id, server_id, user_id) VALUES (?, ?, ?)"
    ).run(id, server.id, userId);
    if (result.changes > 0) {
      db.prepare("UPDATE servers SET installs = installs + 1 WHERE id = ?").run(server.id);
    }
  } else {
    // Anonymous install: recorded for analytics only. It never increments the
    // trust-bearing counter, so an unauthenticated booster can't game adoption.
    db.prepare("INSERT INTO installs (id, server_id, user_id) VALUES (?, ?, NULL)").run(id, server.id);
  }

  res.json({ success: true });
});

// DELETE /api/servers/:slug — a publisher removes their own server.
// (Admins use the Descope-gated /api/admin route to remove anyone's.)
router.delete("/:slug", requireAuth, (req, res) => {
  const server = db.prepare("SELECT id, author_id FROM servers WHERE slug = ?").get(req.params.slug);
  if (!server) return res.status(404).json({ error: "Server not found" });
  if (server.author_id !== req.user.id) {
    return res.status(403).json({ error: "You can only delete your own servers" });
  }
  db.prepare("DELETE FROM servers WHERE id = ?").run(server.id); // cascades reviews/installs/flags
  res.json({ success: true });
});

// ─── Reporting / flagging (community trust signal) ───────────────────────────
const VALID_FLAG_REASONS = ["malware", "impersonation", "broken", "spam", "security", "other"];

// Rate limit: max 8 reports per IP per 10 minutes (abuse guard on a public write)
const reportRateLimit = new Map();
const REPORT_WINDOW_MS = 10 * 60_000;
const REPORT_MAX = 8;
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of reportRateLimit) if (now > v.resetAt) reportRateLimit.delete(k);
}, 5 * 60_000);

// POST /api/servers/:slug/report — let users flag a server (tool poisoning,
// impersonation, rug pulls, etc.). Auth optional; attributed if present.
router.post("/:slug/report", (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  let entry = reportRateLimit.get(ip);
  if (!entry || now > entry.resetAt) { entry = { count: 0, resetAt: now + REPORT_WINDOW_MS }; reportRateLimit.set(ip, entry); }
  if (++entry.count > REPORT_MAX) {
    return res.status(429).json({ error: "Too many reports. Try again later." });
  }

  const { reason, detail } = req.body || {};
  if (!reason || !VALID_FLAG_REASONS.includes(reason)) {
    return res.status(400).json({ error: `reason must be one of: ${VALID_FLAG_REASONS.join(", ")}` });
  }
  if (detail && String(detail).length > 1000) {
    return res.status(400).json({ error: "Detail must be under 1000 characters" });
  }

  const server = db.prepare("SELECT id, name FROM servers WHERE slug = ?").get(req.params.slug);
  if (!server) return res.status(404).json({ error: "Server not found" });

  if (req.user?.id) {
    const existingFlag = db.prepare(
      "SELECT id FROM flags WHERE server_id = ? AND user_id = ? AND status = 'open'"
    ).get(server.id, req.user.id);
    if (existingFlag) {
      return res.status(409).json({ error: "You have already reported this server" });
    }
  }

  db.prepare(
    "INSERT INTO flags (id, server_id, user_id, reason, detail) VALUES (?, ?, ?, ?, ?)"
  ).run(uuid(), server.id, req.user?.id || null, reason, detail ? String(detail).slice(0, 1000) : null);

  // Persist an audit record for this safety-sensitive action.
  auditLog("server.flag", req.user?.username || "anon", {
    server_id: server.id, server_name: server.name, reason, ip,
  });

  res.status(201).json({ success: true, message: "Report received — our team will review it." });
});

// Map a server's tags onto the capability keys CapabilitiesWarning understands,
// so the UI can show what powers a tool requests. Heuristic but conservative.
const TAG_CAPABILITIES = {
  filesystem: ["file_read", "file_write"], files: ["file_read"], file: ["file_read", "file_write"],
  shell: ["remote_code_execution"], exec: ["remote_code_execution"], ssh: ["remote_code_execution", "file_transfer"],
  docker: ["remote_code_execution"], containers: ["remote_code_execution"], kubernetes: ["remote_code_execution"], k8s: ["remote_code_execution"],
  database: ["database_read", "database_write"], sql: ["database_read"], postgres: ["database_read"], postgresql: ["database_read"],
  mongodb: ["database_read"], nosql: ["database_read"], redis: ["database_read", "database_write"],
  payments: ["payment_access"], billing: ["payment_access"], stripe: ["payment_access"],
  email: ["email_send"], calendar: ["calendar_access"], scheduling: ["calendar_access"], meetings: ["calendar_access"],
  browser: ["browser_control", "js_execution"], playwright: ["browser_control", "js_execution"], puppeteer: ["browser_control", "js_execution"], chrome: ["browser_control"],
  scraping: ["network_access", "browser_control"], crawl: ["network_access"], web: ["network_access"], api: ["network_access"], search: ["network_access"], hosting: ["network_access"],
  credentials: ["file_read"],
};
const HIGH_POWER = new Set(["remote_code_execution", "file_write", "database_write", "payment_access", "email_send", "file_transfer"]);

function deriveCapabilities(tags, verified) {
  const caps = new Set();
  for (const t of tags) for (const c of (TAG_CAPABILITIES[String(t).toLowerCase()] || [])) caps.add(c);
  const capabilities = [...caps];
  if (!capabilities.length) return { capabilities: [], risk_level: null };
  const highPower = capabilities.some((c) => HIGH_POWER.has(c));
  const risk_level = highPower ? (verified ? "medium" : "high") : (verified ? "low" : "medium");
  return { capabilities, risk_level };
}

function formatServer(row) {
  const tags = JSON.parse(row.tags || "[]");
  const { capabilities, risk_level } = deriveCapabilities(tags, !!row.verified);
  const scan_tier = latestScanTier(row.id);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    author: row.author_username,
    author_display_name: row.author_display_name,
    category: row.category_id,
    category_label: row.category_label,
    description: row.description,
    long_description: row.long_description,
    installs: row.installs,
    rating: row.rating,
    rating_count: row.rating_count,
    price: row.price_label,
    price_type: row.price_type,
    price_amount: row.price_amount,
    publisher_has_solana_wallet: !!row.publisher_has_solana_wallet,
    verified: !!row.verified,
    trending: !!row.trending,
    gradient: row.gradient,
    weeklyGrowth: row.weekly_growth,
    revenue: row.monthly_revenue > 0 ? `$${(row.monthly_revenue / 100).toLocaleString()}/mo` : null,
    repo_url: row.repo_url,
    repo_verified: !!row.repo_verified,
    license: row.license || null,
    install_command: row.install_command || null,
    tags,
    capabilities,
    risk_level,
    open_flags: row.open_flags || 0,
    scan: scan_tier ? { tier: scan_tier } : null,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    // Computed, transparent trust report (see server/lib/trustScore.js)
    trust: computeTrust({
      repo_url: row.repo_url,
      repo_verified: row.repo_verified,
      license: row.license,
      verified: row.verified,
      installs: row.installs,
      rating: row.rating,
      rating_count: row.rating_count,
      created_at: row.created_at,
      tags: row.tags,
      open_flags: row.open_flags || 0,
      scan_tier,
    }),
  };
}

export default router;
