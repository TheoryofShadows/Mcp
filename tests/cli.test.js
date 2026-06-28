import { describe, it, expect } from "vitest";
import {
  clientConfigPath, mergeMcpConfig, installBlockReason, CLIENTS,
} from "../cli/lib.js";
import {
  buildServerEntry, resolveInstallCommand, buildVSCodeConfig, buildCursorConfig,
} from "../shared/installConfig.js";

describe("shared/installConfig", () => {
  it("parses a declared install_command into command + args", () => {
    const entry = buildServerEntry({ slug: "x", install_command: "npx -y @foo/bar --flag" });
    expect(entry).toEqual({ command: "npx", args: ["-y", "@foo/bar", "--flag"] });
  });

  it("falls back to the package-name convention when none is declared", () => {
    expect(resolveInstallCommand({ slug: "github" })).toBe("npx -y @modelcontextprotocol/server-github");
  });

  it("VS Code config uses a stdio servers map", () => {
    const cfg = JSON.parse(buildVSCodeConfig({ slug: "x", install_command: "node srv.js" }));
    expect(cfg.servers.x).toEqual({ type: "stdio", command: "node", args: ["srv.js"] });
  });

  it("Cursor config uses mcpServers", () => {
    const cfg = JSON.parse(buildCursorConfig({ slug: "x", install_command: "node srv.js" }));
    expect(cfg.mcpServers.x).toEqual({ command: "node", args: ["srv.js"] });
  });
});

describe("cli/clientConfigPath", () => {
  it("resolves Claude Desktop per-platform", () => {
    expect(clientConfigPath("claude", { home: "/h", platform: "darwin" }))
      .toBe("/h/Library/Application Support/Claude/claude_desktop_config.json");
    expect(clientConfigPath("claude", { home: "/h", platform: "linux" }))
      .toBe("/h/.config/Claude/claude_desktop_config.json");
  });
  it("resolves Cursor under home and VS Code under cwd", () => {
    expect(clientConfigPath("cursor", { home: "/h" })).toBe("/h/.cursor/mcp.json");
    expect(clientConfigPath("vscode", { cwd: "/proj" })).toBe("/proj/.vscode/mcp.json");
  });
  it("exposes the supported client list", () => {
    expect(CLIENTS).toContain("claude");
    expect(CLIENTS).toContain("cursor");
    expect(CLIENTS).toContain("vscode");
  });
});

describe("cli/mergeMcpConfig", () => {
  it("adds a server without clobbering existing ones", () => {
    const existing = { mcpServers: { other: { command: "node", args: ["a.js"] } } };
    const merged = mergeMcpConfig(existing, "cursor", { slug: "new", install_command: "npx -y pkg" });
    expect(merged.mcpServers.other).toEqual({ command: "node", args: ["a.js"] });
    expect(merged.mcpServers.new).toEqual({ command: "npx", args: ["-y", "pkg"] });
  });
  it("does not mutate the input object", () => {
    const existing = { mcpServers: {} };
    mergeMcpConfig(existing, "cursor", { slug: "x", install_command: "node x.js" });
    expect(existing.mcpServers.x).toBeUndefined();
  });
  it("starts a fresh config when none exists", () => {
    const merged = mergeMcpConfig(null, "vscode", { slug: "x", install_command: "node x.js" });
    expect(merged.servers.x.type).toBe("stdio");
  });
});

describe("cli/installBlockReason (trust gate)", () => {
  const good = { install_command: "npx -y pkg", repo_verified: true, trust: { tier: "verified" }, risk_level: "low" };

  it("allows a verified, declared, trusted server", () => {
    expect(installBlockReason(good)).toBeNull();
  });
  it("blocks when no install command is declared (guessed package)", () => {
    expect(installBlockReason({ repo_verified: true, trust: { tier: "verified" } })).toMatch(/no verified install/i);
  });
  it("blocks an unverified repo", () => {
    expect(installBlockReason({ ...good, repo_verified: false })).toMatch(/ownership is not verified/i);
  });
  it("blocks a caution-tier server", () => {
    expect(installBlockReason({ ...good, trust: { tier: "caution" } })).toMatch(/caution/i);
  });
  it("blocks a high-risk server", () => {
    expect(installBlockReason({ ...good, risk_level: "high" })).toMatch(/high-risk/i);
  });
  it("--force overrides every block", () => {
    expect(installBlockReason({}, { force: true })).toBeNull();
    expect(installBlockReason({ ...good, trust: { tier: "caution" } }, { force: true })).toBeNull();
  });
});
