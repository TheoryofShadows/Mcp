import { describe, it, expect, beforeAll } from "vitest";
import { db } from "./setup.js";
import { resetSeedSocialProof } from "../server/lib/seedSocialProofReset.js";
import { SEED_INSTALL_COMMANDS } from "../server/lib/seedInstallCommands.js";
import { computeTrust } from "../server/lib/trustScore.js";
import { v4 as uuid } from "uuid";

describe("resetSeedSocialProof", () => {
  const seedSlug = "github-mcp-server";
  const userSlug = "user-published-honest-tool";
  let seedServerId;
  let userServerId;
  let authorId;
  let catId;

  beforeAll(() => {
    let author = db.prepare("SELECT id FROM users LIMIT 1").get();
    if (!author) {
      const id = uuid();
      db.prepare(
        "INSERT INTO users (id, email, username, display_name, password_hash) VALUES (?, ?, ?, ?, ?)"
      ).run(id, "social-proof@example.com", "socialproof", "Social", "x");
      author = { id };
    }
    authorId = author.id;
    catId = db.prepare("SELECT id FROM categories LIMIT 1").get().id;

    // Inflated seed-catalog row (slug in SEED_INSTALL_COMMANDS)
    const existingSeed = db.prepare("SELECT id FROM servers WHERE slug = ?").get(seedSlug);
    if (existingSeed) {
      seedServerId = existingSeed.id;
      db.prepare(
        `UPDATE servers SET installs = 142000, rating = 4.9, rating_count = 980,
         monthly_revenue = 50000, weekly_growth = '+24%' WHERE id = ?`
      ).run(seedServerId);
    } else {
      seedServerId = uuid();
      db.prepare(`
        INSERT INTO servers (
          id, name, slug, author_id, category_id, description,
          price_type, gradient, installs, rating, rating_count,
          monthly_revenue, weekly_growth
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        seedServerId,
        "GitHub MCP Server",
        seedSlug,
        authorId,
        catId,
        "test",
        "free",
        "linear-gradient(135deg,#4DFFB4,#4D9FFF)",
        142000,
        4.9,
        980,
        50000,
        "+24%"
      );
    }

    // Fake sample review on the seed server
    db.prepare("DELETE FROM reviews WHERE server_id = ?").run(seedServerId);
    db.prepare(
      "INSERT INTO reviews (id, server_id, user_id, rating, comment) VALUES (?, ?, ?, ?, ?)"
    ).run(uuid(), seedServerId, authorId, 5, "Fake seed review");

    // User-published tool — must NOT be touched
    const existingUser = db.prepare("SELECT id FROM servers WHERE slug = ?").get(userSlug);
    if (existingUser) {
      userServerId = existingUser.id;
      db.prepare(
        `UPDATE servers SET installs = 42, rating = 4.2, rating_count = 7,
         monthly_revenue = 1200, weekly_growth = '+3%' WHERE id = ?`
      ).run(userServerId);
    } else {
      userServerId = uuid();
      db.prepare(`
        INSERT INTO servers (
          id, name, slug, author_id, category_id, description,
          price_type, gradient, installs, rating, rating_count,
          monthly_revenue, weekly_growth
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userServerId,
        "User Published Tool",
        userSlug,
        authorId,
        catId,
        "real user tool",
        "free",
        "linear-gradient(135deg,#4DFFB4,#4D9FFF)",
        42,
        4.2,
        7,
        1200,
        "+3%"
      );
    }

    expect(SEED_INSTALL_COMMANDS[seedSlug]).toBeTruthy();
    expect(SEED_INSTALL_COMMANDS[userSlug]).toBeUndefined();
  });

  it("zeros inflated metrics on seed-catalog slugs and deletes their reviews", () => {
    const { serversUpdated, reviewsDeleted } = resetSeedSocialProof(db);
    expect(serversUpdated).toBeGreaterThanOrEqual(1);
    expect(reviewsDeleted).toBeGreaterThanOrEqual(1);

    const seed = db
      .prepare(
        "SELECT installs, rating, rating_count, monthly_revenue, weekly_growth FROM servers WHERE id = ?"
      )
      .get(seedServerId);
    expect(seed.installs).toBe(0);
    expect(seed.rating).toBe(0);
    expect(seed.rating_count).toBe(0);
    expect(seed.monthly_revenue).toBe(0);
    expect(seed.weekly_growth == null || seed.weekly_growth === "").toBe(true);

    const reviewCount = db
      .prepare("SELECT COUNT(*) AS c FROM reviews WHERE server_id = ?")
      .get(seedServerId).c;
    expect(reviewCount).toBe(0);
  });

  it("does not touch user-published tools outside the seed map", () => {
    // Ensure seed row is already honest, then re-inflate user row and re-run
    resetSeedSocialProof(db);
    db.prepare(
      `UPDATE servers SET installs = 99, rating = 4.5, rating_count = 11,
       monthly_revenue = 900, weekly_growth = '+9%' WHERE id = ?`
    ).run(userServerId);

    const { serversUpdated } = resetSeedSocialProof(db);
    expect(serversUpdated).toBe(0);

    const user = db
      .prepare(
        "SELECT installs, rating, rating_count, monthly_revenue, weekly_growth FROM servers WHERE id = ?"
      )
      .get(userServerId);
    expect(user.installs).toBe(99);
    expect(user.rating).toBe(4.5);
    expect(user.rating_count).toBe(11);
    expect(user.monthly_revenue).toBe(900);
    expect(user.weekly_growth).toBe("+9%");
  });

  it("is idempotent when seed rows are already zeroed", () => {
    resetSeedSocialProof(db);
    const second = resetSeedSocialProof(db);
    expect(second.serversUpdated).toBe(0);
    expect(second.reviewsDeleted).toBe(0);
  });
});

describe("Trust Score honesty with zero social proof", () => {
  it("gives low adoption and satisfaction when installs and reviews are zero", () => {
    const trust = computeTrust(
      {
        repo_url: "https://github.com/acme/x",
        license: "MIT",
        verified: 1,
        installs: 0,
        rating: 0,
        rating_count: 0,
        created_at: new Date().toISOString(),
        tags: [],
      },
      Date.now()
    );
    const adoption = trust.factors.find((f) => f.key === "adoption");
    const satisfaction = trust.factors.find((f) => f.key === "satisfaction");
    expect(adoption.points).toBe(0);
    expect(satisfaction.points).toBe(0);
    expect(adoption.reason).toMatch(/no recorded installs/i);
    expect(satisfaction.reason).toMatch(/0 review/i);
  });
});
