import { Router } from "express";
import { requireAdmin } from "../middleware/descopeAuth.js";
import db from "../db.js";

const router = Router();

function auditLog(action, actor, details) {
  console.log(JSON.stringify({
    type: "audit", action, actor, ...details,
    timestamp: new Date().toISOString(),
  }));
}

// All routes in this file require a valid Descope session with Admin permission.
// authenticateDescopeToken is applied globally in app.js before these routes.

// GET /api/admin/servers — list all servers including pending/inactive
router.get("/servers", requireAdmin, (req, res) => {
  const servers = db
    .prepare(
      `SELECT s.*, u.username AS author_username
       FROM servers s
       LEFT JOIN users u ON s.author_id = u.id
       ORDER BY s.created_at DESC`
    )
    .all();
  res.json({ servers });
});

// PATCH /api/admin/servers/:id — update verified, trending, or status flags
router.patch("/servers/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { verified, trending, status } = req.body;

  const server = db.prepare("SELECT id FROM servers WHERE id = ?").get(id);
  if (!server) return res.status(404).json({ error: "Server not found" });

  const updates = [];
  const values = [];

  if (verified !== undefined) { updates.push("verified = ?"); values.push(verified ? 1 : 0); }
  if (trending !== undefined) { updates.push("trending = ?"); values.push(trending ? 1 : 0); }
  if (status !== undefined) {
    if (!["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    updates.push("status = ?");
    values.push(status);
  }

  if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

  updates.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE servers SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  auditLog("admin.server.update", req.descopeUser?.sub || "unknown", {
    server_id: id, changes: { verified, trending, status },
  });
  res.json({ success: true });
});

// GET /api/admin/users — list all users
router.get("/users", requireAdmin, (req, res) => {
  const users = db
    .prepare(
      `SELECT id, email, username, display_name, tier, created_at,
              (SELECT COUNT(*) FROM servers WHERE author_id = users.id) AS server_count
       FROM users
       ORDER BY created_at DESC`
    )
    .all();
  res.json({ users });
});

// DELETE /api/admin/servers/:id — remove a server
router.delete("/servers/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const server = db.prepare("SELECT id FROM servers WHERE id = ?").get(id);
  if (!server) return res.status(404).json({ error: "Server not found" });
  db.prepare("DELETE FROM servers WHERE id = ?").run(id);
  auditLog("admin.server.delete", req.descopeUser?.sub || "unknown", { server_id: id });
  res.json({ success: true });
});

export default router;
