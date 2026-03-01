import { Router } from "express";
import db from "../db.js";

const router = Router();

function formatServer(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    author: row.author_username,
    description: row.description,
    installs: row.installs,
    rating: row.rating,
    rating_count: row.rating_count,
    price: row.price_label,
    price_type: row.price_type,
    verified: !!row.verified,
    trending: !!row.trending,
    gradient: row.gradient,
    tags: JSON.parse(row.tags || "[]"),
  };
}

// GET /api/collections — list all collections with server previews
router.get("/", (_req, res) => {
  const collections = db.prepare(
    "SELECT id, slug, title, description, sort_order FROM collections ORDER BY sort_order"
  ).all();

  const result = collections.map((col) => {
    const servers = db.prepare(`
      SELECT s.*, u.username as author_username, c.label as category_label
      FROM collection_servers cs
      JOIN servers s ON cs.server_id = s.id
      JOIN users u ON s.author_id = u.id
      JOIN categories c ON s.category_id = c.id
      WHERE cs.collection_id = ? AND s.status = 'active'
      ORDER BY cs.position
      LIMIT 4
    `).all(col.id).map(formatServer);

    const total = db.prepare(
      "SELECT COUNT(*) as c FROM collection_servers cs JOIN servers s ON cs.server_id = s.id WHERE cs.collection_id = ? AND s.status = 'active'"
    ).get(col.id).c;

    return { ...col, servers, total };
  });

  res.json(result);
});

// GET /api/collections/:slug — full server list for a collection
router.get("/:slug", (req, res) => {
  const col = db.prepare(
    "SELECT id, slug, title, description FROM collections WHERE slug = ?"
  ).get(req.params.slug);

  if (!col) return res.status(404).json({ error: "Collection not found" });

  const servers = db.prepare(`
    SELECT s.*, u.username as author_username, c.label as category_label
    FROM collection_servers cs
    JOIN servers s ON cs.server_id = s.id
    JOIN users u ON s.author_id = u.id
    JOIN categories c ON s.category_id = c.id
    WHERE cs.collection_id = ? AND s.status = 'active'
    ORDER BY cs.position
  `).all(col.id).map(formatServer);

  res.json({ ...col, servers });
});

export default router;
