/**
 * Browser session cookie for the email/password JWT.
 *
 * Host-only (no Domain attribute): www.mcpx.digital and the apex do not share
 * it. No `__Host-` prefix — that prefix is also host-only, but it additionally
 * requires Secure on every set, which local HTTP dev cannot satisfy. When
 * CANONICAL_HOST is set, a browser may only receive the cookie on that host.
 *
 * Non-browser clients (no Origin: tests, curl, the CLI) still get the token in
 * the JSON body and send it as Authorization: Bearer. A browser never does.
 */

export const SESSION_COOKIE = "mcpx_token";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const DEV_ORIGINS = ["http://localhost:5173", "http://localhost:4173", "http://localhost:3001"];

export function canonicalHost() {
  return (process.env.CANONICAL_HOST || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

export function allowedOrigins() {
  if (!process.env.CORS_ORIGINS) return DEV_ORIGINS;
  return process.env.CORS_ORIGINS.split(",")
    .map((o) => o.trim().replace(/^<|>$/g, ""))
    .filter(Boolean);
}

/** True when this request's host is allowed to hold the session cookie. */
export function maySetSessionCookie(req) {
  const canonical = canonicalHost();
  if (!canonical) return true;
  return req.hostname === canonical;
}

function originAllowed(req) {
  const origin = req.get("origin");
  if (!origin) return true;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  if (originHost === req.get("host")) return true;
  return allowedOrigins().includes(origin);
}

/**
 * Browser requests from a foreign origin, or from the non-canonical host, do
 * not get a session. Returns true when the handler should stop.
 */
export function rejectBrowserSession(req, res) {
  const origin = req.get("origin");
  if (!origin) return false;
  if (!originAllowed(req)) {
    res.status(403).json({ error: "This origin cannot start a session" });
    return true;
  }
  if (!maySetSessionCookie(req)) {
    res.status(400).json({ error: `Sign in at https://${canonicalHost()}` });
    return true;
  }
  return false;
}

function cookieSecure(req) {
  return process.env.NODE_ENV === "production" || req.secure === true;
}

function cookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(req),
    path: "/",
    maxAge: MAX_AGE_MS,
  };
}

export function setSessionCookie(req, res, token) {
  res.cookie(SESSION_COOKIE, token, cookieOptions(req));
}

export function clearSessionCookie(req, res) {
  const { path, sameSite, secure, httpOnly } = cookieOptions(req);
  res.clearCookie(SESSION_COOKIE, { path, sameSite, secure, httpOnly });
}

export function readSessionCookie(req) {
  const raw = req.headers.cookie;
  if (!raw || typeof raw !== "string") return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(idx + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/**
 * Attach the cookie when this host may hold it. Put the raw token in the body
 * only for non-browser clients, or when the caller explicitly asks
 * (`X-MCPX-Issue-Token: 1`) — the CLI and the test suite.
 */
export function issueSession(req, res, token, user, status = 200) {
  if (maySetSessionCookie(req)) setSessionCookie(req, res, token);
  const browser = Boolean(req.get("origin"));
  const expose = !browser || req.get("x-mcpx-issue-token") === "1";
  const body = { user };
  if (expose) body.token = token;
  return res.status(status).json(body);
}
