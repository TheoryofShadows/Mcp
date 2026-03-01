import { Router } from "express";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const KEY_LIMITS = { starter: 3, pro: 25, enterprise: 999 };

// GET /api/keys — list user's API keys (masked)
router.get("/", requireAuth, (req, res) => {
  const keys = db.prepare(`
    SELECT id, name, key_prefix, is_active, call_count, last_used_at, created_at
    FROM api_keys
    WHERE user_id = ? AND is_active = 1
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json({ keys });
});

// POST /api/keys — generate a new API key
router.post("/", requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({ error: "Key name is required" });
  }

  const user = db.prepare("SELECT tier FROM users WHERE id = ?").get(req.user.id);
  const tier = user?.tier || "starter";
  const limit = KEY_LIMITS[tier] ?? 3;

  const activeCount = db.prepare(
    "SELECT COUNT(*) as c FROM api_keys WHERE user_id = ? AND is_active = 1"
  ).get(req.user.id).c;

  if (activeCount >= limit) {
    return res.status(403).json({
      error: `API key limit reached for ${tier} plan (${limit} keys). Upgrade to create more.`,
      upgrade_url: "/revenue",
    });
  }

  // Generate: mcpx_sk_<32 hex chars>
  const rawKey = `mcpx_sk_${crypto.randomBytes(16).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.substring(0, 14); // "mcpx_sk_xxxxxxxx"

  const id = uuid();
  db.prepare(
    "INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name) VALUES (?, ?, ?, ?, ?)"
  ).run(id, req.user.id, keyHash, keyPrefix, name.trim());

  // Return the full key ONCE — never stored in plaintext
  res.status(201).json({
    id,
    name: name.trim(),
    key_prefix: keyPrefix,
    key: rawKey,
    created_at: new Date().toISOString(),
  });
});

// DELETE /api/keys/:id — revoke a key
router.delete("/:id", requireAuth, (req, res) => {
  const key = db.prepare(
    "SELECT id FROM api_keys WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!key) {
    return res.status(404).json({ error: "API key not found" });
  }

  db.prepare("UPDATE api_keys SET is_active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

export default router;
