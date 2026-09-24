import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JOBS } from "../src/data/jobs.js";
import { catalogIntegrity } from "../src/lib/catalogIntegrity.js";
import { buildCursorConfig, buildClaudeCommand } from "../shared/installConfig.js";

const clientSeedText = readFileSync(new URL("../src/data/seed.js", import.meta.url), "utf8");
const serverSeedText = readFileSync(new URL("../server/seed.js", import.meta.url), "utf8");

describe("catalog discrepancies", () => {
  it("client and server seeds pass the integrity gate", () => {
    const report = catalogIntegrity({ clientSeedText, serverSeedText, jobs: JOBS });
    expect(report.ok, report.issues.join("; ")).toBe(true);
  });

  it("does not ship a fake Figma repo on the client fallback", () => {
    expect(clientSeedText).not.toMatch(/designops\/figma-mcp-server/);
    expect(clientSeedText).toMatch(/figma\/mcp-server-guide|mcp\.figma\.com/);
  });

  it("install snippets use env placeholders, not secret-shaped values", () => {
    const snippet = buildCursorConfig({
      slug: "github-mcp-server",
      install_command: "npx -y @modelcontextprotocol/server-github",
      env: [{ key: "GITHUB_PERSONAL_ACCESS_TOKEN", hint: "Fine-scoped PAT" }],
    });
    expect(snippet).toContain("<GITHUB_PERSONAL_ACCESS_TOKEN>");
    expect(snippet).not.toMatch(/ghp_/);
  });

  it("remote MCP listings emit an HTTP transport, not a fake npx package", () => {
    const cmd = buildClaudeCommand({
      slug: "figma-mcp",
      remote_url: "https://mcp.figma.com/mcp",
    });
    expect(cmd).toContain("--transport http");
    expect(cmd).toContain("https://mcp.figma.com/mcp");
  });
});
