import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error("FATAL: JWT_SECRET environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
