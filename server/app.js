import express from "express";
import cors from "cors";
import db from "./db.js";
import { httpLogger, captureError, logger } from "./lib/observability.js";
import { authenticateToken } from "./middleware/auth.js";
import { authenticateDescopeToken } from "./middleware/descopeAuth.js";
import authRoutes from "./routes/auth.js";
import serverRoutes from "./routes/servers.js";
import categoryRoutes from "./routes/categories.js";
import statsRoutes from "./routes/stats.js";
import tierRoutes from "./routes/tiers.js";
import paymentRoutes from "./routes/payments.js";
import earningsRoutes from "./routes/earnings.js";
import adminRoutes from "./routes/admin.js";
import discoverRoutes from "./routes/discover.js";
import scanRoutes from "./routes/scan.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Structured request logging (pino-http). Skips the health probe; silent in tests.
  app.use(httpLogger);

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",")
        // Tolerate stray whitespace and angle brackets that sneak in when
        // pasting env values (e.g. "<https://mcpx.digital>, https://www...").
        .map((o) => o.trim().replace(/^<|>$/g, ""))
        .filter(Boolean)
    : ["http://localhost:5173", "http://localhost:4173", "http://localhost:3001"];

  app.use(cors({
    origin(origin, callback) {
      // Never pass an Error to this callback. A thrown CORS rejection becomes a
      // 500 from Express's default error handler — and because the Vite build's
      // <script>/<link> tags carry `crossorigin`, the browser sends an Origin
      // header even on SAME-ORIGIN asset fetches. A 500 there means the module
      // never executes and the whole SPA white-screens. Disallowed cross-origin
      // requests simply receive no CORS headers (the browser blocks them, which
      // is the intent); same-origin requests don't need the header and succeed.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }));

  // Security headers on EVERY response (previously only Express's error handler
  // emitted any). Deliberately compatible with the app: same-origin scripts
  // only, React inline styles ('unsafe-inline' for style), and the Google Fonts
  // the stylesheet @imports. If you later enable Descope/Supabase/Stripe.js,
  // add their origins to script-src/connect-src.
  app.use((_req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: https:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src 'self' https://api.descope.com https://*.supabase.co https://api.stripe.com${process.env.CSP_CONNECT_ORIGINS ? " " + process.env.CSP_CONNECT_ORIGINS : ""}`,
    ].join("; "));
    next();
  });

  // Global API rate limiter — fixed window, 120 req/min per IP.
  // Uses a counter per window instead of storing every timestamp to bound memory.
  const globalHits = new Map();
  const GLOBAL_WINDOW = 60_000;
  const GLOBAL_MAX = 120;
  const MAX_TRACKED_IPS = 50_000;
  app.use("/api", (req, res, next) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    let entry = globalHits.get(ip);
    if (!entry || now - entry.windowStart >= GLOBAL_WINDOW) {
      if (!entry && globalHits.size >= MAX_TRACKED_IPS) {
        const toDelete = Math.floor(MAX_TRACKED_IPS * 0.1);
        let deleted = 0;
        for (const k of globalHits.keys()) {
          if (deleted >= toDelete) break;
          globalHits.delete(k);
          deleted++;
        }
      }
      entry = { count: 0, windowStart: now };
      globalHits.set(ip, entry);
    }
    entry.count++;
    if (entry.count > GLOBAL_MAX) {
      res.set("Retry-After", "60");
      return res.status(429).json({ error: "Rate limit exceeded. Try again later." });
    }
    next();
  });
  setInterval(() => {
    const cutoff = Date.now() - GLOBAL_WINDOW;
    for (const [k, v] of globalHits) {
      if (v.windowStart < cutoff) globalHits.delete(k);
    }
  }, 300_000).unref();

  // Stripe webhook needs the raw body for signature verification — must be
  // registered BEFORE express.json() consumes and parses the body.
  app.use("/api/payments/stripe/webhook", express.raw({ type: "application/json" }));

  app.use(express.json({ limit: "256kb" }));
  app.use(authenticateToken);
  app.use(authenticateDescopeToken);

  app.use("/api/auth", authRoutes);
  app.use("/api/servers", serverRoutes);
  app.use("/api/discover", discoverRoutes);
  app.use("/api/scan", scanRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/tiers", tierRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/earnings", earningsRoutes);
  app.use("/api/admin", adminRoutes);

  // Liveness + readiness: confirm the process is up AND the database answers a
  // trivial query. A failing DB returns 503 so Railway's healthcheck restarts
  // the container instead of serving a half-dead instance.
  app.get("/api/health", (_req, res) => {
    try {
      db.prepare("SELECT 1").get();
      res.json({ status: "ok", db: "ok", timestamp: new Date().toISOString() });
    } catch (err) {
      captureError(err);
      res.status(503).json({ status: "degraded", db: "error", timestamp: new Date().toISOString() });
    }
  });

  // Global error handler — last middleware. Logs + reports to Sentry, returns a
  // generic JSON 500 (no internals leaked). Express 5 routes pass thrown/async
  // errors here.
  app.use((err, req, res, _next) => {
    captureError(err);
    logger.error({ err, path: req.path, method: req.method }, "unhandled request error");
    if (res.headersSent) return;
    res.status(err.status || 500).json({ error: "Internal server error" });
  });

  return app;
}
