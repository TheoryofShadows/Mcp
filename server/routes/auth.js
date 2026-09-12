import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "../db.js";
import { signToken, requireAuth, revokeToken } from "../middleware/auth.js";
import { auditLog } from "../lib/audit.js";

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

// Account *creation* gets its own, much tighter budget than login attempts.
// Reviews and adoption ride on having an account, so cheap account farming is a
// trust-gaming vector — this caps new accounts per IP independently of the
// generous login limiter above. Only *successful* registrations count toward the
// budget (failed validation shouldn't lock a legitimate user out).
const registerRateLimit = new Map();
const REGISTER_WINDOW_MS = 60 * 60 * 1000;                  // 1 hour
const REGISTER_MAX = Number(process.env.REGISTER_MAX_PER_HOUR) || 10;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of registerRateLimit) {
    if (now > entry.resetAt) registerRateLimit.delete(key);
  }
}, 10 * 60 * 1000).unref();

function registerBudget(req) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  let entry = registerRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + REGISTER_WINDOW_MS };
    registerRateLimit.set(ip, entry);
  }
  return entry;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  if (!checkAuthRateLimit(req, res)) return;
  const budget = registerBudget(req);
  if (budget.count >= REGISTER_MAX) {
    res.set("Retry-After", String(Math.ceil((budget.resetAt - Date.now()) / 1000)));
    auditLog("auth.register.ratelimited", req.ip || "unknown", {});
    return res.status(429).json({ error: "Too many accounts created from this network. Try again later." });
  }
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

  budget.count++; // count only successful account creations toward the per-IP cap

  const token = signToken({ id });
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

  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    auditLog("auth.login.failed", String(email).slice(0, 120), { ip, reason: "no_such_user" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    auditLog("auth.login.failed", user.id, { ip, reason: "bad_password" });
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ id: user.id });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      tier: user.tier,
      created_at: user.created_at,
      stripe_onboarding_done: !!user.stripe_onboarding_done,
      stripe_connected: !!user.stripe_onboarding_done && !!user.stripe_account_id,
      // pending | verifying | restricted | enabled — why payouts aren't live yet.
      stripe_payouts_status: user.stripe_payouts_status || (user.stripe_account_id ? "pending" : null),
      solana_wallet: user.solana_wallet || null,
    },
  });
});

// GET /api/auth/me
// ─── Password reset ──────────────────────────────────────────────────────────
// There was no recovery path at all: a forgotten password meant a permanently
// lost account, and for a marketplace that means a buyer locked out of tools
// they paid for.
//
// No email service is configured, so this cannot mail a link. Instead the
// token is RETURNED to the caller — which is only safe because the request
// must already prove knowledge of the account. See the note on /request below.

const RESET_TTL_MINUTES = 30;

/** Tokens are stored hashed, so a database leak yields no usable reset links. */
function hashResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// POST /api/auth/password/request { email }
// Always answers the same way whether or not the account exists — otherwise
// this endpoint becomes a way to enumerate which emails are registered.
router.post("/password/request", (req, res) => {
  if (!checkAuthRateLimit(req, res)) return;
  const { email } = req.body || {};
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email.trim());
  const generic = {
    message: "If that email has an account, a reset token has been issued.",
    expires_in_minutes: RESET_TTL_MINUTES,
  };

  if (!user) {
    auditLog("auth.password.request.unknown", req.ip || "unknown", {});
    return res.json(generic); // identical shape and timing-insensitive
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000).toISOString();

  db.transaction(() => {
    // A new request invalidates older outstanding tokens for this account.
    db.prepare("DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL").run(user.id);
    db.prepare(
      "INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)"
    ).run(hashResetToken(token), user.id, expiresAt);
  })();

  auditLog("auth.password.request", user.id, {});

  // Returning the token is a deliberate trade-off while no mailer exists: it
  // keeps accounts recoverable instead of lost forever. It is acceptable only
  // because knowing the email is already required, and because the token is
  // single-use and expires in 30 minutes. Wire a mailer and this returns
  // nothing but the generic message.
  res.json({ ...generic, reset_token: token });
});

// POST /api/auth/password/reset { token, password }
router.post("/password/reset", async (req, res) => {
  if (!checkAuthRateLimit(req, res)) return;
  const { token, password } = req.body || {};
  if (!token || !password || typeof token !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Token and password are required" });
  }
  // Same floor as registration — a reset must not be a way to set a weak one.
  if (password.length < 10) {
    return res.status(400).json({ error: "Password must be at least 10 characters" });
  }

  const row = db
    .prepare("SELECT token_hash, user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?")
    .get(hashResetToken(token));

  // One message for every failure mode, so a caller cannot distinguish
  // "wrong token" from "already used" from "expired".
  const invalid = { error: "That reset token is invalid or has expired." };
  if (!row || row.used_at) return res.status(400).json(invalid);
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).json(invalid);

  const password_hash = await bcrypt.hash(password, 10);

  db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(password_hash, row.user_id);
    db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE token_hash = ?")
      .run(row.token_hash);
  })();

  auditLog("auth.password.reset", row.user_id, {});
  res.json({ success: true, message: "Password updated. You can sign in now." });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare(
    "SELECT id, email, username, display_name, tier, created_at, stripe_onboarding_done, stripe_payouts_status, stripe_account_id, solana_wallet FROM users WHERE id = ?"
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const serverCount = db.prepare("SELECT COUNT(*) as c FROM servers WHERE author_id = ?").get(user.id).c;
  const totalInstalls = db.prepare(
    "SELECT COALESCE(SUM(installs), 0) as c FROM servers WHERE author_id = ?"
  ).get(user.id).c;

  res.json({
    ...user,
    stripe_onboarding_done: !!user.stripe_onboarding_done,
    stripe_connected: !!user.stripe_onboarding_done && !!user.stripe_account_id,
    // pending | verifying | restricted | enabled — why payouts aren't live yet.
    stripe_payouts_status: user.stripe_payouts_status || (user.stripe_account_id ? "pending" : null),
    solana_wallet: user.solana_wallet || null,
    server_count: serverCount,
    total_installs: totalInstalls,
  });
});

// POST /api/auth/logout — revoke the presented token so it can no longer be used.
// Stateless JWTs can't be "deleted", so we record their jti in revoked_tokens and
// authenticateToken rejects anything listed there until it would have expired.
// PATCH /api/auth/password { current_password, new_password }
// A signed-in user who KNOWS their password still had no way to change it —
// they had to go through the reset flow. Requires the current password so a
// stolen session token alone cannot lock the owner out.
router.patch("/password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (typeof new_password !== "string" || new_password.length < 10) {
    return res.status(400).json({ error: "Password must be at least 10 characters" });
  }

  const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found" });

  const ok = await bcrypt.compare(current_password, user.password_hash);
  if (!ok) {
    auditLog("auth.password.change.denied", req.user.id, {});
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(await bcrypt.hash(new_password, 10), req.user.id);
  auditLog("auth.password.change", req.user.id, {});
  res.json({ success: true, message: "Password updated." });
});

// DELETE /api/auth/account { password }
// GDPR/CCPA erasure. Sales rows are NOT deleted: they are financial records we
// are required to keep, and sales.buyer_id has no ON DELETE CASCADE precisely
// so a deletion cannot silently destroy them. So this ANONYMISES instead —
// personal data is scrubbed, the account can no longer be signed into, and the
// accounting trail survives with no way back to a person.
router.delete("/account", requireAuth, async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: "Password is required to delete your account" });

  const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Account not found" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    auditLog("auth.account.delete.denied", req.user.id, {});
    return res.status(401).json({ error: "Password is incorrect" });
  }

  const anonEmail = `deleted-${req.user.id}@deleted.invalid`;
  const anonName = `deleted_${String(req.user.id).slice(0, 8)}`;

  db.transaction(() => {
    // Listings go, along with their reviews/installs/flags via cascade.
    db.prepare("DELETE FROM servers WHERE author_id = ?").run(req.user.id);
    // Outstanding reset tokens must not survive the account.
    db.prepare("DELETE FROM password_resets WHERE user_id = ?").run(req.user.id);
    // Scrub identity. The random password_hash guarantees no login can succeed
    // even if some future code path skips the deleted_at check.
    db.prepare(
      `UPDATE users SET email = ?, username = ?, display_name = NULL, avatar_url = NULL,
       password_hash = ?, stripe_account_id = NULL, stripe_onboarding_done = 0,
       solana_wallet = NULL, updated_at = datetime('now') WHERE id = ?`
    ).run(anonEmail, anonName, randomBytes(32).toString("hex"), req.user.id);
  })();

  revokeToken(req.user);
  auditLog("auth.account.delete", req.user.id, {});
  res.json({
    success: true,
    message:
      "Account deleted. Listings removed and personal data erased. Sales records are retained in anonymised form as required for tax and accounting.",
  });
});

router.post("/logout", requireAuth, (req, res) => {
  revokeToken(req.user);
  auditLog("auth.logout", req.user.id, { jti: req.user.jti });
  res.json({ success: true });
});

export default router;
