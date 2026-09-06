import { describe, it, expect, beforeAll } from "vitest";
import { db } from "./setup.js";
import { backfillInstallCommands, SEED_INSTALL_COMMANDS } from "../server/lib/seedInstallCommands.js";
import { v4 as uuid } from "uuid";

describe("backfillInstallCommands", () => {
  const slug = "github-mcp-server";
  let serverId;

  beforeAll(() => {
    let author = db.prepare("SELECT id FROM users LIMIT 1").get();
    if (!author) {
      const id = uuid();
      db.prepare(
        "INSERT INTO users (id, email, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)"
      ).run(id, "backfill@example.com", "backfilluser", "Backfill", "x");
      author = { id };
    }
    const catId = db.prepare("SELECT id FROM categories LIMIT 1").get().id;
    const existing = db.prepare("SELECT id FROM servers WHERE slug = ?").get(slug);
    if (existing) {
      serverId = existing.id;
      db.prepare("UPDATE servers SET install_command = NULL WHERE id = ?").run(serverId);
    } else {
      serverId = uuid();
      db.prepare(`
        INSERT INTO servers (
          id, name, slug, author_id, category_id, description,
          price_type, gradient, install_command
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `).run(
        serverId,
        "GitHub MCP Server",
        slug,
        author.id,
        catId,
        "test",
        "free",
        "linear-gradient(135deg,#4DFFB4,#4D9FFF)"
      );
    }
  });

  it("fills NULL install_command from seed map by slug", () => {
    db.prepare("UPDATE servers SET install_command = NULL WHERE id = ?").run(serverId);
    const { updated } = backfillInstallCommands(db);
    expect(updated).toBeGreaterThanOrEqual(1);
    const after = db.prepare("SELECT install_command FROM servers WHERE id = ?").get(serverId);
    expect(after.install_command).toBe(SEED_INSTALL_COMMANDS[slug]);
  });

  it("does not overwrite non-empty author install_command", () => {
    const custom = "npx -y @author/custom-mcp";
    db.prepare("UPDATE servers SET install_command = ? WHERE id = ?").run(custom, serverId);
    backfillInstallCommands(db);
    const row = db.prepare("SELECT install_command FROM servers WHERE id = ?").get(serverId);
    expect(row.install_command).toBe(custom);
  });
});
