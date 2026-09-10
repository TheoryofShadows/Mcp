import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  buildClaudeCommand,
  buildCursorConfig,
  buildVSCodeConfig,
} from "../shared/installConfig.js";

/**
 * The "Works with" row on the homepage is a promise: every client it names must
 * actually be installable. These tests exist so the row can't quietly outlive
 * the support it advertises — the failure mode that turns a feature into
 * marketing.
 */
const SERVER = {
  name: "Postgres MCP",
  slug: "postgres-mcp",
  install_command: "npx -y @modelcontextprotocol/server-postgres",
};

const source = readFileSync(
  new URL("../src/components/WorksWith.jsx", import.meta.url),
  "utf8"
);

describe("WorksWith — the homepage client row", () => {
  it("names exactly the three clients we generate configs for", () => {
    for (const label of ["Claude Desktop", "Cursor", "VS Code"]) {
      expect(source).toContain(label);
    }
  });

  it("every advertised client has a real, non-empty install config", () => {
    const claude = buildClaudeCommand(SERVER);
    const cursor = buildCursorConfig(SERVER);
    const vscode = buildVSCodeConfig(SERVER);

    expect(claude).toContain("postgres-mcp");
    expect(JSON.parse(cursor).mcpServers["postgres-mcp"].command).toBe("npx");
    expect(JSON.parse(vscode).servers["postgres-mcp"].type).toBe("stdio");
  });

  it("does not advertise a client the install picker cannot serve", () => {
    // Pull the labels the row renders and assert we know how to install each.
    const labels = [...source.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(labels.length).toBeGreaterThan(0);

    const SUPPORTED = new Set(["Claude Desktop", "Cursor", "VS Code"]);
    for (const label of labels) {
      expect(SUPPORTED.has(label)).toBe(true);
    }
  });

  it("reuses the install picker's icon vocabulary, not invented brand marks", () => {
    // Same lucide glyphs as InstallButtons' tabs, so the mark a user sees on the
    // homepage is the mark they see again at the moment of install.
    const install = readFileSync(
      new URL("../src/components/InstallButtons.jsx", import.meta.url),
      "utf8"
    );
    for (const icon of ["Terminal", "Cpu", "Code2"]) {
      expect(source).toContain(icon);
      expect(install).toContain(icon);
    }
  });
});
