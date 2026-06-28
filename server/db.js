import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(__dirname, "mcpx.db");

// Ensure the database's parent directory exists. On a fresh Railway volume
// (e.g. DB_PATH=/data/mcpx.db) the mount exists, but a custom nested path or
// first local run might not — mkdir -p is idempotent and safe either way.
mkdirSync(dirname(DB_PATH), { recursive: true });

if (process.env.NODE_ENV === "production" && !process.env.DB_PATH) {
  console.warn(
    "[db] WARNING: DB_PATH is not set. Defaulting to server/mcpx.db inside the " +
    "container filesystem — data will be lost on every redeploy.\n" +
    "  → Mount a Railway volume at /data and set DB_PATH=/data/mcpx.db"
  );
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ───

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    tier TEXT DEFAULT 'starter' CHECK(tier IN ('starter','pro','enterprise')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id),
    category_id TEXT NOT NULL REFERENCES categories(id),
    description TEXT NOT NULL,
    long_description TEXT,
    installs INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    price_type TEXT DEFAULT 'free' CHECK(price_type IN ('free','paid')),
    price_amount INTEGER DEFAULT 0,
    price_label TEXT DEFAULT 'free',
    verified INTEGER DEFAULT 0,
    trending INTEGER DEFAULT 0,
    gradient TEXT NOT NULL,
    weekly_growth TEXT DEFAULT '+0%',
    monthly_revenue INTEGER DEFAULT 0,
    repo_url TEXT,
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','pending')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(server_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS installs (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    installed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    tier TEXT NOT NULL CHECK(tier IN ('starter','pro','enterprise')),
    status TEXT DEFAULT 'active' CHECK(status IN ('active','cancelled','expired')),
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS flags (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    reason TEXT NOT NULL,
    detail TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open','reviewed','dismissed')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_servers_category ON servers(category_id);
  CREATE INDEX IF NOT EXISTS idx_servers_author ON servers(author_id);
  CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
  CREATE INDEX IF NOT EXISTS idx_servers_trending ON servers(trending);
  CREATE INDEX IF NOT EXISTS idx_reviews_server ON reviews(server_id);
  CREATE INDEX IF NOT EXISTS idx_installs_server ON installs(server_id);
  CREATE INDEX IF NOT EXISTS idx_flags_server ON flags(server_id, status);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
`);

// ─── Idempotent column migrations ─────────────────────────────────────────────
for (const sql of [
  "ALTER TABLE users ADD COLUMN stripe_customer_id TEXT",
  "ALTER TABLE users ADD COLUMN stripe_account_id TEXT",        // Connect: publisher payout account
  "ALTER TABLE users ADD COLUMN stripe_onboarding_done INTEGER DEFAULT 0",
  "ALTER TABLE subscriptions ADD COLUMN stripe_subscription_id TEXT",
  "ALTER TABLE servers ADD COLUMN license TEXT",                // Trust Score: license-clarity signal
]) {
  try { db.prepare(sql).run(); } catch { /* column already exists */ }
}

// Indexes that depend on migrated columns must run *after* the ALTERs above,
// otherwise a fresh database fails ("no such column: stripe_customer_id").
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
`);

export default db;
