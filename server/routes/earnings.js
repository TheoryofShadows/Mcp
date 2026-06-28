import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import db from "../db.js";

const router = Router();

// GET /api/earnings — real earned revenue for the authenticated publisher,
// aggregated from completed paid-tool sales of their servers. Net is the 85%
// the publisher keeps after the platform fee. All amounts in cents.
router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', s.created_at) AS month,
           SUM(s.gross_cents) AS gross_cents,
           SUM(s.fee_cents)   AS fee_cents,
           COUNT(*)           AS sales_count
    FROM sales s
    JOIN servers sv ON sv.id = s.server_id
    WHERE sv.author_id = ?
    GROUP BY month
    ORDER BY month
  `).all(req.user.id);

  const by_month = rows.map((r) => ({
    month: r.month,
    gross_cents: r.gross_cents,
    net_cents: r.gross_cents - r.fee_cents,
    sales_count: r.sales_count,
  }));

  const sum = (key) => by_month.reduce((acc, m) => acc + m[key], 0);
  const thisMonth = new Date().toISOString().slice(0, 7);

  res.json({
    currency: "usd",
    platform_fee_pct: 15,
    total_gross_cents: sum("gross_cents"),
    total_net_cents: sum("net_cents"),
    this_month_net_cents: by_month.find((m) => m.month === thisMonth)?.net_cents || 0,
    sales_count: sum("sales_count"),
    by_month,
  });
});

export default router;
