import { Router } from "express";
import db from "../db.js";

const router = Router();

// GET /api/categories — list all categories with server counts
router.get("/", (_req, res) => {
  const rows = db.prepare(`
    SELECT
      c.id, c.label, c.icon, c.sort_order,
      COUNT(CASE WHEN s.status = 'active' THEN 1 END) as server_count
    FROM categories c
    LEFT JOIN servers s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order
  `).all();

  // "all" category gets the total active count
  const totalActive = db.prepare("SELECT COUNT(*) as c FROM servers WHERE status = 'active'").get().c;

  const categories = rows.map((r) => ({
    id: r.id,
    label: r.label,
    icon: r.icon,
    count: r.id === "all" ? totalActive : r.server_count,
  }));

  res.json(categories);
});

export default router;
