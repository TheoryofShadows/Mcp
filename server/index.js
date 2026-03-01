import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createApp } from "./app.js";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;

// Auto-seed: if the database has no users, run the seed script
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  console.log("Empty database detected. Running seed...");
  await import("./seed.js");
}

const app = createApp();

// Serve static files in production
const distPath = join(__dirname, "..", "dist");
app.use((await import("express")).default.static(distPath));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`MCPX API server running on http://localhost:${PORT}`);
});
