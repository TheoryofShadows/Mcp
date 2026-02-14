import { Router } from "express";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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
    where.push("(s.name LIKE ? OR s.description LIKE ? OR s.tags LIKE ?)");
    const q = `%${search}%`;
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

  const SORT_MAP = {
    installs: "s.installs DESC",
    rating: "s.rating DESC",
    newest: "s.created_at DESC",
    name: "s.name ASC",
    revenue: "s.monthly_revenue DESC",
  };
  const orderBy = SORT_MAP[sort] || SORT_MAP.installs;

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = db.prepare(
    `SELECT COUNT(*) as c FROM servers s ${whereClause}`
  ).get(...params).c;

  const rows = db.prepare(`
    SELECT
      s.*,
      u.username as author_username,
      u.display_name as author_display_name,
      c.label as category_label
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
      c.label as category_label
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

// POST /api/servers — create a new server (auth required)
router.post("/", requireAuth, (req, res) => {
  const { name, category_id, description, long_description, price_type, price_amount, repo_url, tags } = req.body;

  if (!name || !category_id || !description) {
    return res.status(400).json({ error: "Name, category, and description are required" });
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
  const parsedPrice = parseInt(price_amount, 10) || 0;
  const priceLabel = price_type === "paid" && parsedPrice ? `$${(parsedPrice / 100).toFixed(0)}/mo` : "free";

  db.prepare(`
    INSERT INTO servers (id, name, slug, author_id, category_id, description, long_description,
      price_type, price_amount, price_label, gradient, repo_url, tags, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    id, name, slug, req.user.id, category_id,
    description, long_description || "",
    price_type || "free", parsedPrice, priceLabel,
    gradient, repo_url || "", JSON.stringify(tags || [])
  );

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

// POST /api/servers/:slug/reviews — add a review (auth required)
router.post("/:slug/reviews", requireAuth, (req, res) => {
  const { rating, comment } = req.body;

  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
  }

  if (comment && String(comment).length > 2000) {
    return res.status(400).json({ error: "Comment must be under 2000 characters" });
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
  db.prepare("UPDATE servers SET rating = ROUND(?, 1), rating_count = ? WHERE id = ?").run(stats.avg, stats.cnt, server.id);

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
  db.prepare("INSERT INTO installs (id, server_id, user_id) VALUES (?, ?, ?)").run(id, server.id, userId);
  db.prepare("UPDATE servers SET installs = installs + 1 WHERE id = ?").run(server.id);

  res.json({ success: true });
});

function formatServer(row) {
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
    verified: !!row.verified,
    trending: !!row.trending,
    gradient: row.gradient,
    weeklyGrowth: row.weekly_growth,
    revenue: row.monthly_revenue > 0 ? `$${(row.monthly_revenue / 100).toLocaleString()}/mo` : null,
    repo_url: row.repo_url,
    tags: JSON.parse(row.tags || "[]"),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export default router;
