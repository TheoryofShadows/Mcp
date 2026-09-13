import { describe, it, expect } from "vitest";
import { redactInstallRecipes, redactLockedServerCopy } from "../server/lib/redactInstallRecipes.js";

describe("redactInstallRecipes", () => {
  it("strips Install: npx lines", () => {
    const src = "Local only. No network.\n\nInstall: npx -y github:TheoryofShadows/timezone-mcp";
    const out = redactInstallRecipes(src);
    expect(out).not.toMatch(/npx -y github:/i);
    expect(out).toMatch(/Local only/);
    expect(out).toMatch(/Install unlocks after purchase/i);
  });

  it("strips ## Install fenced npx blocks", () => {
    const src = [
      "Polite site checks.",
      "",
      "## Install",
      "```bash",
      "npx -y github:TheoryofShadows/site-health-mcp",
      "```",
      "",
      "Publisher: chaos",
    ].join("\n");
    const out = redactInstallRecipes(src);
    expect(out).not.toMatch(/npx -y/i);
    expect(out).not.toMatch(/## Install/i);
    expect(out).toMatch(/Polite site checks/);
    expect(out).toMatch(/Publisher: chaos/);
  });

  it("leaves prose that merely mentions npx alone", () => {
    const src = "You can use npx for many tools, but buy this one on MCPX.";
    expect(redactInstallRecipes(src)).toBe(src);
  });

  it("returns a purchase pointer when only an install recipe remains", () => {
    expect(redactInstallRecipes("Install: npx -y secret-paid-mcp")).toMatch(/Install unlocks after purchase/i);
  });
});

describe("redactLockedServerCopy", () => {
  it("only mutates when install_locked is true", () => {
    const open = {
      install_locked: undefined,
      long_description: "Install: npx -y github:TheoryofShadows/x",
    };
    redactLockedServerCopy(open);
    expect(open.long_description).toMatch(/npx -y/);

    const locked = {
      install_locked: true,
      description: "Useful helper.",
      long_description: "Useful helper.\n\nInstall: npx -y github:TheoryofShadows/x",
    };
    redactLockedServerCopy(locked);
    expect(locked.long_description).not.toMatch(/npx -y/);
    expect(locked.long_description).toMatch(/Useful helper/);
  });
});
