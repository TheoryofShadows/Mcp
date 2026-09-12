import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { computeTrust } from "../server/lib/trustScore.js";
import { unverifySeededPublishers } from "../server/lib/unverifySeededPublishers.js";

/**
 * 28 of 37 live listings displayed "Publisher identity reviewed by MCPX" for
 * publishers nobody had reviewed, because seed data hardcoded `verified: 1`.
 *
 * The scoring engine was correct — it faithfully reported what it was given.
 * The DATA was the lie, and it made three separate false claims at once.
 */
describe("trust integrity — `verified` must mean a real review", () => {
  it("seed data never asserts verification", () => {
    // Nothing but a human review may set this flag.
    const serverSeed = readFileSync(new URL("../server/seed.js", import.meta.url), "utf8");
    const clientSeed = readFileSync(new URL("../src/data/seed.js", import.meta.url), "utf8");
    expect(serverSeed).not.toMatch(/verified:\s*1\b/);
    expect(clientSeed).not.toMatch(/verified:\s*true\b/);
  });

  it("an unreviewed publisher does not claim MCPX review", () => {
    const t = computeTrust(
      { repo_url: "https://github.com/a/b", license: "MIT", verified: 0, created_at: new Date().toISOString() },
      Date.now()
    );
    const pub = t.factors.find((f) => f.key === "publisher");
    expect(pub.points).toBe(6);
    expect(pub.reason).toMatch(/not yet reviewed/i);
  });

  it("an unreviewed server touching sensitive surfaces IS penalised", () => {
    // This is the dangerous case the fake flag was silently waiving.
    const t = computeTrust(
      { repo_url: "https://github.com/a/b", license: "MIT", verified: 0, tags: ["payments"], created_at: new Date().toISOString() },
      Date.now()
    );
    const risk = t.penalties.find((p) => p.key === "risk");
    expect(risk).toBeDefined();
    expect(risk.points).toBeLessThan(0);
    expect(risk.reason).toMatch(/Unreviewed access to sensitive capabilities/);
  });

  it("the score is exactly the sum of its parts — no hidden adjustment", () => {
    const t = computeTrust(
      {
        repo_url: "https://github.com/a/b", repo_verified: 1, license: "MIT", verified: 1,
        installs: 1200, rating: 4.5, rating_count: 40, tags: ["database"],
        created_at: new Date(Date.now() - 400 * 86400_000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      Date.now()
    );
    const sum =
      t.factors.reduce((a, f) => a + f.points, 0) + t.penalties.reduce((a, p) => a + p.points, 0);
    expect(t.score).toBe(Math.max(0, Math.min(100, sum)));
  });

  it("never awards more than a factor's stated maximum", () => {
    const t = computeTrust(
      {
        repo_url: "https://github.com/a/b", repo_verified: 1, license: "MIT", verified: 1,
        installs: 10_000_000, rating: 5, rating_count: 100_000,
        created_at: new Date(Date.now() - 5000 * 86400_000).toISOString(),
      },
      Date.now()
    );
    for (const f of t.factors) expect(f.points).toBeLessThanOrEqual(f.max);
    expect(t.score).toBeLessThanOrEqual(100);
  });

  describe("the backfill", () => {
    let db;
    beforeEach(() => {
      db = new Database(":memory:");
      db.exec("CREATE TABLE servers (id TEXT PRIMARY KEY, verified INTEGER DEFAULT 0);");
    });

    it("clears verified rows and is idempotent", () => {
      db.prepare("INSERT INTO servers (id, verified) VALUES ('a',1),('b',1),('c',0)").run();
      expect(unverifySeededPublishers(db).cleared).toBe(2);
      expect(unverifySeededPublishers(db).cleared).toBe(0);
      expect(db.prepare("SELECT COUNT(*) c FROM servers WHERE verified = 1").get().c).toBe(0);
    });
  });
});
