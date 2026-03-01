import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/stats — platform-wide statistics
router.get("/", (_req, res) => {
  const serverCount = db.prepare("SELECT COUNT(*) as c FROM servers WHERE status = 'active'").get().c;
  const totalInstalls = db.prepare("SELECT COALESCE(SUM(installs), 0) as c FROM servers").get().c;
  const publisherCount = db.prepare("SELECT COUNT(DISTINCT author_id) as c FROM servers WHERE status = 'active'").get().c;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(monthly_revenue), 0) as c FROM servers").get().c;
  const verifiedCount = db.prepare("SELECT COUNT(*) as c FROM servers WHERE verified = 1 AND status = 'active'").get().c;
  const trendingCount = db.prepare("SELECT COUNT(*) as c FROM servers WHERE trending = 1 AND status = 'active'").get().c;
  const avgRating = db.prepare("SELECT ROUND(AVG(rating), 1) as c FROM servers WHERE rating > 0").get().c;
  const reviewCount = db.prepare("SELECT COUNT(*) as c FROM reviews").get().c;

  res.json({
    server_count: serverCount,
    total_installs: totalInstalls,
    publisher_count: publisherCount,
    total_monthly_revenue: totalRevenue,
    verified_count: verifiedCount,
    trending_count: trendingCount,
    avg_rating: avgRating || 0,
    review_count: reviewCount,
    hero_stats: [
      { label: "Monthly Installs", value: formatNumber(totalInstalls) + "+", color: "var(--accent-electric)" },
      { label: "Active Publishers", value: formatNumber(publisherCount) + "+", color: "var(--accent-blue)" },
      { label: "Revenue Shared", value: "$" + formatCurrency(totalRevenue), color: "var(--accent-purple)" },
    ],
  });
});

// GET /api/stats/publisher — per-server stats for the authenticated publisher
router.get("/publisher", requireAuth, (req, res) => {
  const servers = db.prepare(`
    SELECT
      s.id, s.name, s.slug, s.description, s.installs as installs_total,
      s.rating, s.rating_count, s.price_type, s.price_label, s.monthly_revenue,
      (SELECT COUNT(*) FROM installs i
       WHERE i.server_id = s.id AND i.installed_at >= datetime('now', '-7 days')) as installs_7d,
      (SELECT COUNT(*) FROM installs i
       WHERE i.server_id = s.id AND i.installed_at >= datetime('now', '-30 days')) as installs_30d
    FROM servers s
    WHERE s.author_id = ? AND s.status = 'active'
    ORDER BY s.installs DESC
  `).all(req.user.id);

  res.json({ servers });
});

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function formatCurrency(cents) {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return (dollars / 1_000_000).toFixed(1) + "M";
  if (dollars >= 1_000) return (dollars / 1_000).toFixed(0) + "K";
  return dollars.toFixed(0);
}

export default router;
