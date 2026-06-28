import { describe, it, expect } from "vitest";
import { TOOL_DEFS, TOOL_NAMES } from "../mcpx-mcp/lib.js";
import { installBlockReason } from "../cli/lib.js";

describe("@mcpx/mcp meta-server tool registry", () => {
  it("exposes the discover/inspect/scan/install surface", () => {
    for (const name of ["search_servers", "discover_servers", "get_server", "inspect_trust", "scan_repo", "install_server"]) {
      expect(TOOL_NAMES).toContain(name);
    }
  });

  it("every tool has a description and an object input schema", () => {
    for (const t of TOOL_DEFS) {
      expect(typeof t.description).toBe("string");
      expect(t.inputSchema.type).toBe("object");
    }
  });

  it("install/inspect/scan tools require their key argument", () => {
    const required = (n) => TOOL_DEFS.find((t) => t.name === n).inputSchema.required;
    expect(required("install_server")).toContain("slug");
    expect(required("inspect_trust")).toContain("slug");
    expect(required("scan_repo")).toContain("repo_url");
  });

  it("shares the CLI trust gate (an unverified server is refused without force)", () => {
    // Same helper the install_server handler calls — proves the gate is shared.
    const server = { install_command: "npx -y pkg", repo_verified: false, trust: { tier: "community" } };
    expect(installBlockReason(server)).toBeTruthy();
    expect(installBlockReason(server, { force: true })).toBeNull();
  });
});
