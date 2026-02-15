import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import { signToken, signRefreshToken, verifyRefreshToken, requireAuth } from "../middleware/auth.js";

const router = Router();

// Strict rate limit on auth endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in 15 minutes." },
  skip: () => !!(process.env.NODE_ENV === "test" || process.env.VITEST),
});

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  const { email, username, password, display_name } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, username, and password are required" });
  }

  if (typeof email !== "string" || typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid input types" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  if (username.length < 2 || username.length > 30) {
    return res.status(400).json({ error: "Username must be between 2 and 30 characters" });
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: "Username may only contain letters, numbers, and underscores" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
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

  const tokenPayload = { id, email, username };
  const token = signToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);
  const user = db.prepare("SELECT id, email, username, display_name, tier, created_at FROM users WHERE id = ?").get(id);

  res.status(201).json({ token, refresh_token: refreshToken, user });
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
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

  const tokenPayload = { id: user.id, email: user.email, username: user.username };
  const token = signToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  res.json({
    token,
    refresh_token: refreshToken,
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

// POST /api/auth/refresh — exchange a refresh token for a new access token
router.post("/refresh", (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const payload = verifyRefreshToken(refresh_token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  // Verify user still exists
  const user = db.prepare(
    "SELECT id, email, username, display_name, tier, created_at FROM users WHERE id = ?"
  ).get(payload.id);

  if (!user) {
    return res.status(401).json({ error: "User no longer exists" });
  }

  const tokenPayload = { id: user.id, email: user.email, username: user.username };
  const token = signToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);

  res.json({ token, refresh_token: newRefreshToken });
});

export default router;
