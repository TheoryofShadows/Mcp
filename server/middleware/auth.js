import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mcpx-dev-secret-change-in-production";
const REFRESH_SECRET = process.env.REFRESH_SECRET || JWT_SECRET + "-refresh";

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not set — using insecure default. Set JWT_SECRET env var for production.");
}

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d" });
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch {
    return null;
  }
}
