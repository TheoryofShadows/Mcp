import { Router } from "express";
import db from "../db.js";

const router = Router();
const SITE = (process.env.APP_URL || "https://www.mcpx.digital").replace(/\/$/, "");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, { changefreq = "weekly", priority = "0.5", lastmod } = {}) {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${escapeXml(lastmod)}</lastmod>`);
  parts.push(`    <changefreq>${changefreq}</changefreq>`);
  parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join("\n")}\n  </url>`;
}

// GET /sitemap.xml — key marketing routes + active tool detail pages from DB.
router.get("/", (_req, res) => {
  const staticRoutes = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/marketplace", changefreq: "daily", priority: "0.9" },
    { path: "/pricing", changefreq: "weekly", priority: "0.8" },
    { path: "/submit", changefreq: "weekly", priority: "0.8" },
    { path: "/docs", changefreq: "weekly", priority: "0.7" },
    { path: "/start", changefreq: "monthly", priority: "0.6" },
  ];

  let toolRows = [];
  try {
    toolRows = db.prepare(`
      SELECT slug, updated_at, created_at
      FROM servers
      WHERE status = 'active'
      ORDER BY installs DESC, name ASC
    `).all();
  } catch {
    toolRows = [];
  }

  const entries = [
    ...staticRoutes.map((r) =>
      urlEntry(`${SITE}${r.path}`, { changefreq: r.changefreq, priority: r.priority })
    ),
    ...toolRows.map((row) => {
      const stamp = row.updated_at || row.created_at;
      let lastmod;
      if (stamp) {
        const normalized = String(stamp).includes("T")
          ? String(stamp)
          : String(stamp).replace(" ", "T") + "Z";
        const ms = Date.parse(normalized);
        if (!Number.isNaN(ms)) lastmod = new Date(ms).toISOString().slice(0, 10);
      }
      return urlEntry(`${SITE}/tool/${row.slug}`, {
        changefreq: "weekly",
        priority: "0.6",
        lastmod,
      });
    }),
  ];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</urlset>`,
    ``,
  ].join("\n");

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.set("Cache-Control", "public, max-age=300");
  res.send(xml);
});

export default router;
