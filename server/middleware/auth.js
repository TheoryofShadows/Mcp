import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import db from "../db.js";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  // Development-only: derive a per-process ephemeral secret so no literal secret
  // is ever committed to the repository. Tokens will be invalidated on restart.
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
}
const JWT_SECRET = process.env.JWT_SECRET;

const isRevokedStmt = db.prepare("SELECT 1 FROM revoked_tokens WHERE jti = ?");

function isRevoked(jti) {
  return !!(jti && isRevokedStmt.get(jti));
}

// Prune revoked-token records once they've passed their original expiry — after
// that the JWT is invalid anyway, so the row is no longer needed. Keeps the
// table bounded without a migration or cron. .unref() so it never holds the
// process open (matters for clean test teardown).
setInterval(() => {
  try {
    db.prepare("DELETE FROM revoked_tokens WHERE expires_at IS NOT NULL AND expires_at < ?")
      .run(new Date().toISOString());
  } catch { /* best-effort cleanup */ }
}, 60 * 60 * 1000).unref();

export function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // A revoked token (explicit logout) is treated as no token at all.
    req.user = isRevoked(decoded.jti) ? null : decoded;
    next();
  } catch {
    req.user = null;
    next();
  }
}

// Revoke a token by its jti so it can no longer authenticate (logout). The
// decoded payload carries `exp` (seconds); we store it so the row can be pruned
// once the token would have expired anyway.
export function revokeToken(decoded) {
  if (!decoded?.jti) return;
  const expiresAt = decoded.exp
    ? new Date(decoded.exp * 1000).toISOString()
    : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    "INSERT OR IGNORE INTO revoked_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)"
  ).run(decoded.jti, decoded.id || null, expiresAt);
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function signToken(payload) {
  return jwt.sign({ ...payload, jti: randomBytes(8).toString("hex") }, JWT_SECRET, { expiresIn: "24h" });
}
