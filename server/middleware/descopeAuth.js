import DescopeClient from "@descope/node-sdk";

const DESCOPE_PROJECT_ID = process.env.DESCOPE_PROJECT_ID;
const ADMIN_PERMISSION = "PERM3AginJK2YlsHu6UrjhQcz7wf2iR";

let descopeClient = null;
if (DESCOPE_PROJECT_ID) {
  descopeClient = DescopeClient({ projectId: DESCOPE_PROJECT_ID });
}

/**
 * Validates a Descope session token from Authorization: Bearer header.
 * Sets req.descopeUser on success, leaves it null otherwise.
 */
export async function authenticateDescopeToken(req, res, next) {
  if (!descopeClient) {
    req.descopeUser = null;
    return next();
  }

  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    req.descopeUser = null;
    return next();
  }

  try {
    const authInfo = await descopeClient.validateSession(token);
    req.descopeUser = authInfo.token;
    next();
  } catch {
    req.descopeUser = null;
    next();
  }
}

/**
 * Middleware: requires a valid Descope session with the Admin permission.
 */
export function requireAdmin(req, res, next) {
  if (!req.descopeUser) {
    return res.status(401).json({ error: "Descope authentication required" });
  }

  const permissions = req.descopeUser.permissions ?? [];
  if (!permissions.includes(ADMIN_PERMISSION)) {
    return res.status(403).json({ error: "Admin permission required" });
  }

  next();
}
