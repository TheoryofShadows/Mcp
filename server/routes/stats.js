import { Router } from "express";
import db from "../db.js";

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
    total_tools: serverCount,
    total_installs: totalInstalls,
    total_developers: publisherCount,
    total_revenue: totalRevenue,
    verified_count: verifiedCount,
    trending_count: trendingCount,
    avg_rating: avgRating || 0,
    review_count: reviewCount,
  });
});


export default router;
