import { describe, it, expect } from "vitest";
import { computeTrust, trustTier } from "../server/lib/trustScore.js";

// Fixed "now" so maturity math is deterministic.
const NOW = new Date("2026-06-01T00:00:00Z").getTime();
const daysAgo = (n) => new Date(NOW - n * 86400_000).toISOString();

describe("computeTrust", () => {
  it("scores a fully-signalled, verified server highly and marks it official", () => {
    const trust = computeTrust(
      {
        repo_url: "https://github.com/acme/postgres-mcp",
        license: "MIT",
        verified: 1,
        installs: 50_000,
        rating: 4.8,
        rating_count: 120,
        created_at: daysAgo(400),
        tags: ["database"],
      },
      NOW
    );
    expect(trust.score).toBeGreaterThanOrEqual(80);
    expect(trust.tier).toBe("official");
    expect(trust.confidence).toBe("high");
  });

  it("gives a brand-new community server with no signals a low/caution score", () => {
    const trust = computeTrust(
      {
        repo_url: null,
        license: null,
        verified: 0,
        installs: 0,
        rating: 0,
        rating_count: 0,
        created_at: daysAgo(0),
        tags: [],
      },
      NOW
    );
    expect(trust.score).toBeLessThan(40);
    expect(trust.tier).toBe("caution");
    expect(trust.confidence).toBe("low");
  });

  it("penalizes unverified servers that touch sensitive capabilities", () => {
    const base = {
      repo_url: "https://github.com/x/y",
      license: "MIT",
      verified: 0,
      installs: 100,
      rating: 4,
      rating_count: 10,
      created_at: daysAgo(90),
    };
    const safe = computeTrust({ ...base, tags: ["productivity"] }, NOW);
    const risky = computeTrust({ ...base, tags: ["shell", "credentials"] }, NOW);
    expect(risky.score).toBeLessThan(safe.score);
    expect(risky.penalties.length).toBe(1);
    expect(risky.penalties[0].points).toBeLessThan(0);
  });

  it("does NOT penalize a verified server for sensitive capabilities", () => {
    const trust = computeTrust(
      {
        repo_url: "https://github.com/x/y",
        license: "MIT",
        verified: 1,
        installs: 100,
        rating: 4,
        rating_count: 10,
        created_at: daysAgo(90),
        tags: ["shell", "credentials"],
      },
      NOW
    );
    expect(trust.penalties[0].points).toBe(0);
  });

  it("is deterministic and clamps to 0..100", () => {
    const input = {
      repo_url: "https://github.com/x/y",
      license: "MIT",
      verified: 1,
      installs: 999_999_999,
      rating: 5,
      rating_count: 9999,
      created_at: daysAgo(5000),
      tags: [],
    };
    const a = computeTrust(input, NOW);
    const b = computeTrust(input, NOW);
    expect(a).toEqual(b);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(a.score).toBeGreaterThanOrEqual(0);
  });

  it("every factor's reason is populated", () => {
    const trust = computeTrust(
      {
        repo_url: "https://github.com/x/y",
        license: "MIT",
        verified: 1,
        installs: 10,
        rating: 4,
        rating_count: 5,
        created_at: daysAgo(30),
        tags: [],
      },
      NOW
    );
    for (const f of trust.factors) {
      expect(f.reason).toBeTruthy();
      expect(typeof f.points).toBe("number");
    }
  });
});

describe("trustTier", () => {
  it("maps scores to tiers", () => {
    expect(trustTier(85, true)).toBe("official");
    expect(trustTier(85, false)).toBe("verified");
    expect(trustTier(50, false)).toBe("community");
    expect(trustTier(20, false)).toBe("caution");
  });
});

describe("computeTrust — open flags", () => {
  const base = {
    repo_url: "https://github.com/acme/x", license: "MIT", verified: 1,
    installs: 50000, rating: 4.8, rating_count: 120,
    created_at: new Date("2025-04-01T00:00:00Z").toISOString(), tags: ["data"],
  };
  it("lowers the score when there are open user reports", () => {
    const clean = computeTrust({ ...base, open_flags: 0 });
    const flagged = computeTrust({ ...base, open_flags: 3 });
    expect(flagged.score).toBeLessThan(clean.score);
    expect(flagged.penalties.some((p) => p.key === "flags")).toBe(true);
  });
  it("scales the penalty with flag count below the cap", () => {
    const oneFlag = computeTrust({ ...base, open_flags: 1 });   // -5
    const threeFlags = computeTrust({ ...base, open_flags: 3 }); // -10 (capped)
    expect(oneFlag.score).toBeGreaterThan(threeFlags.score);
  });
  it("caps the flag penalty at 10", () => {
    const a = computeTrust({ ...base, open_flags: 2 });  // 2*5 = 10, at cap
    const b = computeTrust({ ...base, open_flags: 50 }); // 50*5 capped to 10
    expect(a.score).toBe(b.score); // both hit the -10 cap
  });
});

describe("computeTrust — staleness", () => {
  const FIXED_NOW = new Date("2026-06-01T00:00:00Z").getTime();
  const daysBefore = (n) => new Date(FIXED_NOW - n * 86400_000).toISOString();
  const base = {
    repo_url: "https://github.com/acme/x", license: "MIT", verified: 1,
    installs: 50000, rating: 4.8, rating_count: 120, tags: ["data"],
    created_at: daysBefore(800),
  };

  it("does not penalize a recently-updated server", () => {
    const fresh = computeTrust({ ...base, updated_at: daysBefore(30) }, FIXED_NOW);
    expect(fresh.penalties.some((p) => p.key === "staleness")).toBe(false);
  });

  it("penalizes a server not updated in over 180 days", () => {
    const fresh = computeTrust({ ...base, updated_at: daysBefore(30) }, FIXED_NOW);
    const stale = computeTrust({ ...base, updated_at: daysBefore(400) }, FIXED_NOW);
    const stalePenalty = stale.penalties.find((p) => p.key === "staleness");
    expect(stalePenalty).toBeTruthy();
    expect(stalePenalty.points).toBeLessThan(0);
    expect(stale.score).toBeLessThan(fresh.score);
  });

  it("caps the staleness penalty at -5", () => {
    const veryStale = computeTrust({ ...base, updated_at: daysBefore(5000) }, FIXED_NOW);
    const stalePenalty = veryStale.penalties.find((p) => p.key === "staleness");
    expect(stalePenalty.points).toBe(-5);
  });
});
