import { describe, it, expect } from "vitest";
import { computeTrust } from "../server/lib/trustScore.js";
import { trustSummary } from "../src/lib/trustSummary.js";

// Fixed "now" so maturity/staleness math is deterministic.
const NOW = new Date("2026-06-01T00:00:00Z").getTime();
const daysAgo = (n) => new Date(NOW - n * 86400_000).toISOString();

describe("trustSummary (card-level trust breakdown)", () => {
  it("returns null when there is no trust report", () => {
    expect(trustSummary(null)).toBeNull();
    expect(trustSummary(undefined)).toBeNull();
  });

  it("returns null when a report carries no score", () => {
    expect(trustSummary({ factors: [], penalties: [] })).toBeNull();
  });

  it("summarizes a strong server as score + its top earning factors", () => {
    const trust = computeTrust(
      {
        repo_url: "https://github.com/acme/postgres-mcp",
        repo_verified: 1,
        license: "MIT",
        verified: 1,
        installs: 50_000,
        rating: 4.8,
        rating_count: 120,
        created_at: daysAgo(400),
        updated_at: daysAgo(5),
        tags: ["database"],
      },
      NOW
    );
    const summary = trustSummary(trust);

    expect(summary).toContain(`Trust Score ${trust.score}/100`);
    // At most three earned factors, each rendered as "Label +N".
    expect(summary).toMatch(/ — .+ \+\d+/);
    expect(summary.split(" · ").length).toBeLessThanOrEqual(4);
  });

  it("always surfaces penalties, which are what users most need to see", () => {
    const trust = computeTrust(
      {
        repo_url: "https://github.com/sketchy/shell-mcp",
        license: "MIT",
        verified: 0,
        installs: 5,
        rating: 0,
        rating_count: 0,
        created_at: daysAgo(400),
        updated_at: daysAgo(400), // stale -> penalty
        tags: ["shell", "exec"], // sensitive + unverified -> risk penalty
        open_flags: 2, // user reports -> penalty
      },
      NOW
    );
    const summary = trustSummary(trust);

    expect(trust.penalties.length).toBeGreaterThan(0);
    // Every penalty the engine produced must appear in the card summary.
    for (const p of trust.penalties) {
      expect(summary).toContain(`${p.label} ${p.points}`);
    }
    // Penalties render with a minus sign, never "+".
    expect(summary).toMatch(/-\d+/);
  });

  it("degrades gracefully when a server earned no points at all", () => {
    const summary = trustSummary({ score: 0, factors: [], penalties: [] });
    expect(summary).toBe("Trust Score 0/100");
  });

  it("never claims a number the engine did not produce", () => {
    const trust = computeTrust(
      { repo_url: "https://github.com/a/b", license: "MIT", created_at: daysAgo(10) },
      NOW
    );
    expect(trustSummary(trust)).toContain(`${trust.score}/100`);
  });
});
