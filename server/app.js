import express from "express";
import cors from "cors";
import { authenticateToken } from "./middleware/auth.js";
import { authenticateDescopeToken } from "./middleware/descopeAuth.js";
import authRoutes from "./routes/auth.js";
import serverRoutes from "./routes/servers.js";
import categoryRoutes from "./routes/categories.js";
import statsRoutes from "./routes/stats.js";
import tierRoutes from "./routes/tiers.js";
import paymentRoutes from "./routes/payments.js";
import adminRoutes from "./routes/admin.js";

export function createApp() {
  const app = express();

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

  // Stripe webhook needs the raw body for signature verification — must be
  // registered BEFORE express.json() consumes and parses the body.
  app.use("/api/payments/stripe/webhook", express.raw({ type: "application/json" }));

  app.use(express.json({ limit: "1mb" }));
  app.use(authenticateToken);
  app.use(authenticateDescopeToken);

  app.use("/api/auth", authRoutes);
  app.use("/api/servers", serverRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/tiers", tierRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/admin", adminRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return app;
}
