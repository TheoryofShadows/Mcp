/**
 * Canonical install_command map for seeded marketplace tools (by slug).
 * Used by seed.js on empty DB and by boot-time backfill for rows that still
 * have NULL/empty install_command — never overwrites non-empty author values.
 */
import { logger } from "./observability.js";

export const SEED_INSTALL_COMMANDS = Object.freeze({
  "github-mcp-server": "npx -y @modelcontextprotocol/server-github",
  "filesystem-mcp": "npx -y @modelcontextprotocol/server-filesystem /path/to/allow",
  "playwright-mcp": "npx -y @playwright/mcp",
  "context7": "npx -y @upstash/context7-mcp",
  "git-mcp": "npx -y @modelcontextprotocol/server-git",
  "puppeteer-mcp": "npx -y @modelcontextprotocol/server-puppeteer",
  "docker-mcp": "npx -y mcp-server-docker",
  "sequential-thinking": "npx -y @modelcontextprotocol/server-sequential-thinking",
  "memory-mcp": "npx -y @modelcontextprotocol/server-memory",
  "hugging-face-mcp": "npx -y @llmindset/hf-mcp-server",
  "postgres-mcp": "npx -y @modelcontextprotocol/server-postgres postgresql://user:pass@localhost/db",
  "supabase-mcp": "npx -y @supabase/mcp-server-supabase",
  "fetch-mcp": "npx -y @modelcontextprotocol/server-fetch",
  "firecrawl-mcp": "npx -y firecrawl-mcp",
  "exa-search-mcp": "npx -y exa-mcp-server",
  "tavily-mcp": "npx -y tavily-mcp",
  "redis-mcp": "npx -y @redis/mcp-redis",
  "mongodb-mcp": "npx -y mongodb-mcp-server",
  "qdrant-mcp": "uvx mcp-server-qdrant",
  "notion-mcp": "npx -y @notionhq/notion-mcp-server",
  "stripe-mcp": "npx -y @stripe/mcp",
  "slack-mcp": "npx -y @modelcontextprotocol/server-slack",
  "linear-mcp": "npx -y @linear/mcp-server",
  "atlassian-mcp": "uvx mcp-atlassian",
  "blender-mcp": "uvx blender-mcp",
  "figma-context-mcp": "npx -y figma-developer-mcp",
  "elevenlabs-mcp": "uvx elevenlabs-mcp",
  "cloudflare-mcp": "npx -y @cloudflare/mcp-server-cloudflare",
  "aws-mcp": "npx -y @awslabs/mcp",
  "sentry-mcp": "npx -y @sentry/mcp-server",
  "grafana-mcp": "npx -y @grafana/mcp-grafana",
  "kubernetes-mcp": "npx -y mcp-server-kubernetes",
  "time-mcp": "npx -y @modelcontextprotocol/server-time",
  "chess-analysis-mcp": "npx -y mcp-chess",
});

/**
 * Fill empty install_command rows from the seed map by slug.
 * Does NOT overwrite non-empty values (author-published commands win).
 * @param {import("better-sqlite3").Database} db
 * @returns {{ updated: number, skipped: number }}
 */
export function backfillInstallCommands(db) {
  const update = db.prepare(`
    UPDATE servers
    SET install_command = ?
    WHERE slug = ?
      AND (install_command IS NULL OR TRIM(install_command) = '')
  `);

  let updated = 0;
  let skipped = 0;
  const run = db.transaction(() => {
    for (const [slug, cmd] of Object.entries(SEED_INSTALL_COMMANDS)) {
      const info = update.run(cmd, slug);
      if (info.changes > 0) updated += 1;
      else skipped += 1;
    }
  });
  run();

  if (updated > 0) {
    logger.info({ updated, skipped }, "[seed] backfilled empty install_command rows");
  }
  return { updated, skipped };
}
