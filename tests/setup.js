import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { unlinkSync, existsSync } from "fs";

// Use a unique temp file per test worker so concurrent workers don't collide
const dbFile = join(tmpdir(), `mcpx-test-${randomBytes(6).toString("hex")}.db`);
process.env.DB_PATH = dbFile;
process.env.JWT_SECRET = randomBytes(32).toString("hex");
process.env.CORS_ORIGINS = "http://localhost:5173";
// Never let publish/update tests trigger a real `git clone` source scan.
process.env.MCPX_DISABLE_AUTO_SCAN = "1";

// Seed the test database with minimal data needed for tests
const { default: db } = await import("../server/db.js");

db.prepare(`INSERT OR IGNORE INTO categories (id, label, icon, sort_order) VALUES
  ('dev-tools', 'Dev Tools', '⚙', 1),
  ('data', 'Data', '📊', 2)
`).run();

export function backdateUser(email) {
  db.prepare("UPDATE users SET created_at = datetime('now', '-2 days') WHERE email = ?").run(email);
}

export { db, dbFile };

// Cleanup the temp database file after all tests
export async function cleanup() {
  db.close();
  if (existsSync(dbFile)) unlinkSync(dbFile);
  const walFile = dbFile + "-wal";
  const shmFile = dbFile + "-shm";
  if (existsSync(walFile)) unlinkSync(walFile);
  if (existsSync(shmFile)) unlinkSync(shmFile);
}
