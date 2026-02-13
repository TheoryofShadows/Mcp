import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { email, username, password, display_name } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, username, and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: "Username may only contain letters, numbers, and underscores" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").get(email, username);
  if (existing) {
    return res.status(409).json({ error: "Email or username already taken" });
  }

  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (id, email, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)`
  ).run(id, email, username, display_name || username, password_hash);

  const token = signToken({ id, email, username });
  const user = db.prepare("SELECT id, email, username, display_name, tier, created_at FROM users WHERE id = ?").get(id);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ id: user.id, email: user.email, username: user.username });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      tier: user.tier,
      created_at: user.created_at,
    },
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(
    "SELECT id, email, username, display_name, tier, created_at FROM users WHERE id = ?"
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const serverCount = db.prepare("SELECT COUNT(*) as c FROM servers WHERE author_id = ?").get(user.id).c;
  const totalInstalls = db.prepare(
    "SELECT COALESCE(SUM(installs), 0) as c FROM servers WHERE author_id = ?"
  ).get(user.id).c;

  res.json({ ...user, server_count: serverCount, total_installs: totalInstalls });
});

export default router;
