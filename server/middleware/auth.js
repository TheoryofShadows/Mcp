import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mcpx-dev-secret-change-in-production";

const TIER_RANK = { starter: 0, pro: 1, enterprise: 2 };

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

export function requireTier(minTier) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userRank = TIER_RANK[req.user.tier] ?? -1;
    if (userRank < (TIER_RANK[minTier] ?? 0)) {
      return res.status(403).json({
        error: `This feature requires ${minTier} tier or higher.`,
        required_tier: minTier,
        upgrade_url: "/revenue",
      });
    }
    next();
  };
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
