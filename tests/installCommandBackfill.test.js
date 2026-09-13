import { describe, it, expect, beforeAll } from "vitest";
import { db } from "./setup.js";
import { backfillInstallCommands, SEED_INSTALL_COMMANDS, LISTING_INSTALL_BACKFILLS } from "../server/lib/seedInstallCommands.js";
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

describe("LISTING_INSTALL_BACKFILLS", () => {
  const slug = "railway-mcp";
  const cmd = "npx -y @mcpx-digital/railway";
  let serverId;
  let authorId;
  let catId;

  beforeAll(() => {
    expect(SEED_INSTALL_COMMANDS[slug]).toBeUndefined();
    expect(LISTING_INSTALL_BACKFILLS[slug]).toBe(cmd);
    // Listing slugs must stay out of the seed map or social-proof reset
    // would zero real installs/ratings on user-published tools.
    for (const listingSlug of Object.keys(LISTING_INSTALL_BACKFILLS)) {
      expect(SEED_INSTALL_COMMANDS[listingSlug]).toBeUndefined();
    }

    let author = db.prepare("SELECT id FROM users LIMIT 1").get();
    if (!author) {
      const id = uuid();
      db.prepare(
        "INSERT INTO users (id, email, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)"
      ).run(id, "listing-backfill@example.com", "listingbackfill", "Listing", "x");
      author = { id };
    }
    authorId = author.id;
    catId = db.prepare("SELECT id FROM categories LIMIT 1").get().id;
    const existing = db.prepare("SELECT id FROM servers WHERE slug = ?").get(slug);
    if (existing) {
      serverId = existing.id;
      db.prepare("UPDATE servers SET install_command = NULL WHERE id = ?").run(serverId);
    } else {
      serverId = uuid();
      db.prepare(`
        INSERT INTO servers (
          id, name, slug, author_id, category_id, description,
          price_type, price_amount, gradient, install_command,
          installs, rating, rating_count, monthly_revenue
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
      `).run(
        serverId,
        "Railway MCP",
        slug,
        authorId,
        catId,
        "paid railway listing",
        "paid",
        300,
        "linear-gradient(135deg,#4DFFB4,#4D9FFF)",
        17,
        4.6,
        3,
        900
      );
    }
  });

  it("fills railway-mcp from LISTING_INSTALL_BACKFILLS, not the seed map", () => {
    db.prepare("UPDATE servers SET install_command = NULL WHERE id = ?").run(serverId);
    const { updated } = backfillInstallCommands(db);
    expect(updated).toBeGreaterThanOrEqual(1);
    const after = db.prepare("SELECT install_command FROM servers WHERE id = ?").get(serverId);
    expect(after.install_command).toBe(cmd);
    expect(after.install_command).not.toMatch(/@railway\/mcp-server/);
  });

  it("stays out of SEED_INSTALL_COMMANDS so social-proof reset cannot target it", async () => {
    // resetSeedSocialProof keys off SEED_INSTALL_COMMANDS only. Putting
    // railway-mcp there would zero real installs/ratings on a live paid listing.
    expect(SEED_INSTALL_COMMANDS["railway-mcp"]).toBeUndefined();
    expect(LISTING_INSTALL_BACKFILLS["railway-mcp"]).toBe(cmd);
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../server/lib/seedSocialProofReset.js", import.meta.url), "utf8");
    expect(src).toMatch(/Object\.keys\(SEED_INSTALL_COMMANDS\)/);
    expect(src).not.toMatch(/LISTING_INSTALL_BACKFILLS/);
  });
});
