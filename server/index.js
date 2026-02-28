import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { authenticateToken } from "./middleware/auth.js";
import authRoutes from "./routes/auth.js";
import serverRoutes from "./routes/servers.js";
import categoryRoutes from "./routes/categories.js";
import statsRoutes from "./routes/stats.js";
import tierRoutes from "./routes/tiers.js";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Auto-seed: if the database has no users, run the seed script
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  console.log("Empty database detected. Running seed...");
  await import("./seed.js");
}

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3001"];

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // In development, allow all; tighten in production
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(authenticateToken);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/tiers", tierRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files in production
const distPath = join(__dirname, "..", "dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
} else {
  console.warn("⚠  dist/ not found — run `npm run build` before `npm start` to serve the frontend.");
  app.get("/{*splat}", (_req, res) => {
    res.status(503).send("Frontend not built. Run `npm run build` first.");
  });
}

app.listen(PORT, () => {
  console.log(`MCPX API server running on http://localhost:${PORT}`);
});
