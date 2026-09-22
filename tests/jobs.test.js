import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JOBS, matchQuery, jobsIntegrity } from "../src/data/jobs.js";

const serverSeed = readFileSync(new URL("../server/seed.js", import.meta.url), "utf8");
const clientSeed = readFileSync(new URL("../src/data/seed.js", import.meta.url), "utf8");
const known = [
  ...serverSeed.matchAll(/slug:\s*"([^"]+)"/g),
  ...clientSeed.matchAll(/slug:\s*"([^"]+)"/g),
].map((m) => m[1]);

describe("job matcher", () => {
  it("links filled jobs only to slugs that exist in seed", () => {
    const report = jobsIntegrity(known);
    expect(report.ok, report.issues.join("; ")).toBe(true);
  });

  it("maps github PRs to the GitHub listing", () => {
    const m = matchQuery("open pull requests");
    expect(m.empty).toBe(false);
    expect(m.job?.id).toBe("ship-code");
    expect(m.toolSlugs).toContain("github-mcp-server");
  });

  it("maps tavily / web search to filled search-web", () => {
    const m = matchQuery("tavily research");
    expect(m.job?.id).toBe("search-web");
    expect(m.toolSlugs).toContain("tavily-mcp");
    expect(m.unmatched).toHaveLength(0);
  });

  it("maps linear tickets to the live Linear listing", () => {
    const m = matchQuery("linear tickets");
    expect(m.job?.id).toBe("linear");
    expect(m.toolSlugs).toContain("linear-mcp");
    expect(m.unmatched).toHaveLength(0);
  });

  it("files gmail as an open bounty", () => {
    const m = matchQuery("gmail inbox");
    expect(m.unmatched[0]?.id).toBe("gmail");
    expect(m.unmatched[0]?.filled).toBe(false);
  });

  it("empty query is an empty match, not a custom bounty", () => {
    const m = matchQuery("  ");
    expect(m.empty).toBe(true);
    expect(JOBS.filter((j) => !j.filled).length).toBeGreaterThan(0);
  });
});
