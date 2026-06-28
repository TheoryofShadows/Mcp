#!/usr/bin/env node
/**
 * @mcpx/mcp — a Model Context Protocol server for the MCPX marketplace itself.
 *
 * Gives an agent the ability to discover, inspect the trust of, scan, and install
 * other MCP servers without leaving the conversation. The install tool is
 * trust-enforcing: it reuses the exact same gate as the `npx mcpx install` CLI
 * (../cli/lib.js), so a low-trust or unverified server is refused unless forced.
 *
 * Env:
 *   MCPX_API    base URL (default https://www.mcpx.digital)
 *   MCPX_TOKEN  optional bearer token so installs are counted to your account
 *
 * Transport: stdio.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFS } from "./lib.js";
// Reuse the CLI's trust gate + non-clobbering config merge — one source of truth.
import { clientConfigPath, mergeMcpConfig, installBlockReason, trustSummary } from "../cli/lib.js";

const API = (process.env.MCPX_API || "https://www.mcpx.digital").replace(/\/$/, "");
const TOKEN = process.env.MCPX_TOKEN || "";

async function api(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; }
  catch { throw new Error(`Unexpected non-JSON response (HTTP ${res.status}).`); }
  if (!res.ok) throw new Error(body.error || `Request failed (HTTP ${res.status}).`);
  return body;
}

function detectClient() {
  const home = homedir();
  for (const client of ["cursor", "claude"]) {
    if (existsSync(path.dirname(clientConfigPath(client, { home, platform: process.platform })))) return client;
  }
  return "claude";
}

const handlers = {
  async search_servers({ query, limit = 20 }) {
    const qs = new URLSearchParams();
    if (query) qs.set("search", query);
    qs.set("limit", String(limit));
    const { servers } = await api(`/api/servers?${qs}`);
    return servers.map((s) => ({ slug: s.slug, name: s.name, tier: s.trust?.tier, description: s.description }));
  },
  async discover_servers({ limit = 50, since }) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (since) qs.set("since", since);
    return api(`/api/discover?${qs}`);
  },
  async get_server({ slug }) {
    return api(`/api/servers/${encodeURIComponent(slug)}`);
  },
  async inspect_trust({ slug }) {
    return api(`/api/servers/${encodeURIComponent(slug)}/trust`);
  },
  async scan_repo({ repo_url }) {
    return api(`/api/scan`, { method: "POST", body: JSON.stringify({ repo_url }) });
  },
  async install_server({ slug, client, force = false }) {
    const server = await api(`/api/servers/${encodeURIComponent(slug)}`);
    const block = installBlockReason(server, { force });
    if (block) return { installed: false, reason: block, trust: trustSummary(server) };

    const chosen = client || detectClient();
    const configPath = clientConfigPath(chosen, { home: homedir(), platform: process.platform, cwd: process.cwd() });
    let existing = {};
    if (existsSync(configPath)) {
      try { existing = JSON.parse(await readFile(configPath, "utf8")); }
      catch { throw new Error(`Existing config at ${configPath} is not valid JSON.`); }
    }
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, JSON.stringify(mergeMcpConfig(existing, chosen, server), null, 2) + "\n");
    try { await api(`/api/servers/${encodeURIComponent(slug)}/install`, { method: "POST", body: "{}" }); } catch { /* non-fatal */ }
    return { installed: true, client: chosen, path: configPath, trust: trustSummary(server) };
  },
};

const server = new Server({ name: "mcpx", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const handler = handlers[name];
  if (!handler) return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
  try {
    const result = await handler(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
  }
});

await server.connect(new StdioServerTransport());
console.error("[mcpx-mcp] ready");
