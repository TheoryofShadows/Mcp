import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";

const router = Router();

// Simple in-memory rate limiter for auth endpoints
// key: IP address, value: { count, resetAt }
const authRateLimit = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_ATTEMPTS = 20; // per window (generous for devs, stops bots)

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of authRateLimit) {
    if (now > entry.resetAt) authRateLimit.delete(key);
  }
}, 5 * 60 * 1000);

function checkAuthRateLimit(req, res) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  let entry = authRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + AUTH_WINDOW_MS };
    authRateLimit.set(ip, entry);
  }
  entry.count++;
  if (entry.count > AUTH_MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return false;
  }
  return true;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  if (!checkAuthRateLimit(req, res)) return;
  const { email, username, password, display_name } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, username, and password are required" });
  }

  if (typeof email !== "string" || typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input types" });
  }

  // Field-format checks first, so a weak password doesn't mask a malformed
  // email/username — each field reports its own structural problem.
  if (username.length < 2 || username.length > 30) {
    return res.status(400).json({ error: "Username must be between 2 and 30 characters" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: "Username may only contain letters, numbers, and underscores" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  if (password.length < 10) {
    return res.status(400).json({ error: "Password must be at least 10 characters" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").get(email, username);
  if (existing) {
    return res.status(409).json({ error: "Email or username already taken" });
  }

  const id = uuid();
  const password_hash = await bcrypt.hash(password, 10);

  db.prepare(
    `INSERT INTO users (id, email, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)`
  ).run(id, email, username, String(display_name || username).slice(0, 50), password_hash);

  const token = signToken({ id, email, username });
  const user = db.prepare("SELECT id, email, username, display_name, tier, created_at FROM users WHERE id = ?").get(id);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  if (!checkAuthRateLimit(req, res)) return;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
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
