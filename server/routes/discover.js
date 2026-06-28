import { Router } from "express";
import db from "../db.js";
import { computeTrust } from "../lib/trustScore.js";

const router = Router();
const SITE = (process.env.APP_URL || "https://www.mcpx.digital").replace(/\/$/, "");

// GET /api/discover — a stable, agent-readable feed of recently published MCP
// servers with their computed trust. Designed for agents and external tools to
// poll (optionally incrementally via ?since=ISO). This is the "agent-native"
// distribution surface: machines can discover tools AND read trust in one call.
router.get("/", (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const since = req.query.since; // optional ISO timestamp for incremental polls

  const where = ["s.status = 'active'"];
  const params = [];
  if (since) { where.push("s.created_at >= ?"); params.push(since); }

  const rows = db.prepare(`
    SELECT s.*, u.username AS author_username, c.label AS category_label,
      (SELECT COUNT(*) FROM flags f WHERE f.server_id = s.id AND f.status = 'open' AND f.user_id IS NOT NULL) AS open_flags
    FROM servers s
    JOIN users u ON s.author_id = u.id
    JOIN categories c ON s.category_id = c.id
    WHERE ${where.join(" AND ")}
    ORDER BY s.created_at DESC
    LIMIT ?
  `).all(...params, limit);

  const servers = rows.map((r) => {
    const trust = computeTrust({
      repo_url: r.repo_url, license: r.license, verified: r.verified,
      installs: r.installs, rating: r.rating, rating_count: r.rating_count,
      created_at: r.created_at, tags: r.tags, open_flags: r.open_flags,
    });
    return {
      name: r.name,
      slug: r.slug,
      url: `${SITE}/tool/${r.slug}`,
      trust_url: `${SITE}/api/servers/${r.slug}/trust`,
      repo_url: r.repo_url || null,
      category: r.category_id,
      description: r.description,
      author: r.author_username,
      price_type: r.price_type,
      installs: r.installs,
      rating: r.rating,
      verified: !!r.verified,
      tags: JSON.parse(r.tags || "[]"),
      trust: { score: trust.score, tier: trust.tier, confidence: trust.confidence },
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  res.set("Cache-Control", "public, max-age=300");
  res.json({
    feed: "mcpx-discover",
    docs: `${SITE}/docs/API.md`,
    generated_at: new Date().toISOString(),
    count: servers.length,
    servers,
  });
});

export default router;
