/**
 * @mcpx/mcp — pure tool registry for the MCPX meta-server.
 *
 * The meta-server lets an agent discover, inspect, and install *other* MCP
 * servers from the MCPX marketplace in-conversation. Tool schemas live here (no
 * SDK, no I/O) so they're easy to test; index.js wires them to the MCPX HTTP API
 * and reuses the CLI's trust gate + config merge (../cli/lib.js).
 */

export const TOOL_DEFS = [
  {
    name: "search_servers",
    description: "Search the MCPX marketplace for MCP servers by keyword.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "number" } },
      additionalProperties: false,
    },
  },
  {
    name: "discover_servers",
    description: "List recently published MCP servers with their trust tier (the agent-native feed).",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number" }, since: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "get_server",
    description: "Get full details for one server, including its verified install command and capabilities.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"], additionalProperties: false,
    },
  },
  {
    name: "inspect_trust",
    description: "Get the itemized Trust Score (factors + penalties + confidence) for a server before using it.",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"], additionalProperties: false,
    },
  },
  {
    name: "scan_repo",
    description: "Run a live source-code security scan of a public repository (secrets, tool-poisoning, dangerous execution).",
    inputSchema: {
      type: "object",
      properties: { repo_url: { type: "string" } },
      required: ["repo_url"], additionalProperties: false,
    },
  },
  {
    name: "install_server",
    description: "Install an MCP server into a local client config (claude|cursor|vscode). Refuses low-trust or unverified servers unless force=true.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        client: { type: "string", enum: ["claude", "cursor", "vscode"] },
        force: { type: "boolean" },
      },
      required: ["slug"], additionalProperties: false,
    },
  },
];

export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);
