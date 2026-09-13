import { describe, it, expect } from "vitest";
import {
  escapeHtmlAttr,
  parseToolSlugFromPath,
  buildToolShareMeta,
  injectToolPageMeta,
} from "../server/lib/toolPageMeta.js";

const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta name="description" content="MCPX - The marketplace for discovering, publishing, and monetizing MCP servers. Build AI agent tools and get paid." />
    <title>MCPX - The Marketplace for AI Agent Tools</title>
    <link rel="canonical" href="https://www.mcpx.digital/" />
    <meta property="og:title" content="MCPX - The Marketplace for AI Agent Tools" />
    <meta property="og:description" content="Discover, install, and publish Model Context Protocol servers that supercharge Claude, Cursor, and VS Code." />
    <meta property="og:url" content="https://www.mcpx.digital/" />
    <meta name="twitter:title" content="MCPX - The Marketplace for AI Agent Tools" />
    <meta name="twitter:description" content="Discover, install, and publish Model Context Protocol servers that supercharge Claude, Cursor, and VS Code." />
  </head>
  <body></body>
</html>`;

describe("toolPageMeta", () => {
  it("parses /tool and /tools slugs and rejects junk", () => {
    expect(parseToolSlugFromPath("/tool/railway-mcp")).toBe("railway-mcp");
    expect(parseToolSlugFromPath("/tools/Railway-MCP")).toBe("railway-mcp");
    expect(parseToolSlugFromPath("/tool/railway-mcp?x=1")).toBe("railway-mcp");
    expect(parseToolSlugFromPath("/marketplace")).toBeNull();
    expect(parseToolSlugFromPath("/tool/../evil")).toBeNull();
    expect(parseToolSlugFromPath("/tool/bad_slug")).toBeNull();
  });

  it("escapes attribute values", () => {
    expect(escapeHtmlAttr(`A "B" & <C>`)).toBe("A &quot;B&quot; &amp; &lt;C&gt;");
  });

  it("builds share meta with tool name and path-aware url", () => {
    const meta = buildToolShareMeta(
      { slug: "railway-mcp", name: "Railway MCP", description: "Deploy and manage Railway from your agent." },
      "https://www.mcpx.digital",
      "/tools/railway-mcp"
    );
    expect(meta.title).toBe("Railway MCP · MCPX");
    expect(meta.description).toMatch(/Deploy and manage Railway/);
    expect(meta.url).toBe("https://www.mcpx.digital/tools/railway-mcp");
  });

  it("injects tool-specific title, description, canonical, and social tags", () => {
    const meta = buildToolShareMeta(
      { slug: "railway-mcp", name: "Railway MCP", description: "Deploy Railway from Claude, Cursor, or VS Code." },
      "https://www.mcpx.digital",
      "/tool/railway-mcp"
    );
    const html = injectToolPageMeta(SHELL, meta);
    expect(html).toContain("<title>Railway MCP · MCPX</title>");
    expect(html).toContain('content="Railway MCP · MCPX"');
    expect(html).toContain('content="Deploy Railway from Claude, Cursor, or VS Code."');
    expect(html).toContain('href="https://www.mcpx.digital/tool/railway-mcp"');
    expect(html).toContain('content="https://www.mcpx.digital/tool/railway-mcp"');
    expect(html).not.toContain("<title>MCPX - The Marketplace for AI Agent Tools</title>");
  });
});
