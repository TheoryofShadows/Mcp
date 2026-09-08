import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import db from "../db.js";

// The secret that signs every session token. Requiring it to merely *exist* in
// production is not enough: the .env.example placeholder is in the public repo,
// so a deploy that pasted it verbatim would let anyone forge an admin token.
// Reject a missing, too-short, or known-placeholder secret at boot instead.
const WEAK_SECRETS = new Set([
  "change-me-to-a-secure-random-string-at-least-32-chars",
  "changeme", "secret", "jwt-secret", "password", "mcpx",
]);

// Returns an error string for a production-unsafe JWT secret, or null when it is
// acceptable. Pure so it can be tested without mutating process state.
export function jwtSecretError(secret) {
  if (!secret) return "JWT_SECRET environment variable is required in production";
  if (secret.length < 32) return "JWT_SECRET must be at least 32 characters in production";
  if (WEAK_SECRETS.has(secret)) return "JWT_SECRET is a known placeholder — set a real random secret";
  return null;
}

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  // Development-only: derive a per-process ephemeral secret so no literal secret
  // is ever committed to the repository. Tokens will be invalidated on restart.
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
} else if (process.env.NODE_ENV === "production") {
  const err = jwtSecretError(process.env.JWT_SECRET);
  if (err) throw new Error(err);
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
    // Pin the algorithm. jsonwebtoken@9 already rejects alg:none, but pinning
    // HS256 is the standard defense against algorithm-confusion attacks and
    // survives a future library change that might not.
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
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
