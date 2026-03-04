import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authenticateToken } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import serverRoutes from "./routes/servers.js";
import categoryRoutes from "./routes/categories.js";
import statsRoutes from "./routes/stats.js";
import tierRoutes from "./routes/tiers.js";

export function createApp() {
  const app = express();

  // Security headers (CSP disabled — frontend served by Vite in dev)
  app.use(helmet({ contentSecurityPolicy: false }));

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
    : ["http://localhost:5173", "http://localhost:3001"];

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(authenticateToken);

  app.use("/api/auth", authRoutes);
  app.use("/api/servers", serverRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/tiers", tierRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global error handler
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({
      error: status === 500 ? "Internal server error" : err.message,
    });
  });

  return app;
}
