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
