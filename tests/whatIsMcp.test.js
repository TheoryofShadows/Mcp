import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The site never explained what MCP is.
 *
 * An audit found the phrase "Model Context Protocol" appeared EXACTLY ONCE
 * across the whole UI — buried in a Pricing FAQ answer. The /start route, which
 * should be the newcomer's entry point, redirected to a "New here?" block whose
 * first line is "Open marketplace → copy install command": written for someone
 * who already knows what an MCP server is.
 *
 * That breaks the funnel at step zero. Someone who has heard "MCP" in passing
 * lands on "The trusted marketplace for MCP tools", learns nothing, and leaves
 * before ever seeing the Trust Score — which is the only differentiated thing
 * here.
 */
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const explainer = read("src/components/WhatIsMcp.jsx");
const home = read("src/pages/Home.jsx");
const app = read("src/App.jsx");

describe("the site explains MCP to someone who has never heard of it", () => {
  it("spells out the acronym in full", () => {
    expect(explainer).toMatch(/Model Context Protocol/);
  });

  it("says what an MCP server actually DOES, in plain words", () => {
    // Not "a server that implements the protocol" — concrete abilities.
    expect(explainer).toMatch(/reading your files|querying a database|deploying code/i);
  });

  it("names the AI clients a reader will recognise", () => {
    for (const client of ["Claude", "Cursor", "VS Code"]) {
      expect(explainer).toContain(client);
    }
  });

  it("is honest that an MCP server runs locally with the user's permissions", () => {
    // This is the risk disclosure AND the reason the Trust Score exists.
    expect(explainer).toMatch(/runs on your machine/i);
    expect(explainer).toMatch(/your permissions/i);
    expect(explainer).toMatch(/SSH keys|API tokens/i);
  });

  it("connects that risk to why listings are scanned", () => {
    expect(explainer).toMatch(/scanned and scored/i);
  });

  it("appears BEFORE anything that assumes prior knowledge", () => {
    // Specifically before the stats bar and the marketplace teaser: a visitor
    // who cannot evaluate those has already bounced.
    const explainerAt = home.indexOf("<WhatIsMcp />");
    const statsAt = home.indexOf("Stats Bar");
    expect(explainerAt).toBeGreaterThan(-1);
    expect(statsAt).toBeGreaterThan(-1);
    expect(explainerAt).toBeLessThan(statsAt);
  });

  it("/start lands a newcomer on the explanation, not on install steps", () => {
    expect(app).toMatch(/path="\/start"[\s\S]{0,120}what-is-mcp-heading/);
  });

  it("uses a heading id that the /start redirect can anchor to", () => {
    expect(explainer).toMatch(/id="what-is-mcp-heading"/);
  });
});
