import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  // Development-only: derive a per-process ephemeral secret so no literal secret
  // is ever committed to the repository. Tokens will be invalidated on restart.
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
}
const JWT_SECRET = process.env.JWT_SECRET;

export function authenticateToken(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
