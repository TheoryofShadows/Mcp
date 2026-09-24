/**
 * Shared install-config builders — MCPX
 *
 * Single source of truth for turning a server record into the per-client install
 * configuration. Imported by BOTH the web UI (src/components/InstallButtons.jsx)
 * and the CLI (cli/), so the command a user copies from the site and the command
 * `npx @mcpx-digital/cli install` writes can never drift apart.
 *
 * Pure & dependency-free (browser- and Node-safe): no I/O, no framework imports.
 *
 * Install spec resolution order:
 *   1. server.remote_url — HTTP MCP (official Figma, etc.)
 *   2. server.install_command — the publisher-declared, verifiable spec.
 *   3. Fallback to the `@modelcontextprotocol/server-<slug>` naming convention.
 * The fallback is a GUESS at a package name; callers that care about supply-chain
 * safety (the CLI) should check `hasDeclaredInstall()` before trusting it.
 *
 * Env values are always `<KEY>` placeholders. Never interpolate real secrets.
 */

export function slugFor(server) {
  return server.slug || server.name?.toLowerCase().replace(/\s+/g, "-") || "server";
}

/** True when the publisher declared an explicit install command (not the guess). */
export function hasDeclaredInstall(server) {
  return typeof server.install_command === "string" && server.install_command.trim().length > 0;
}

/** The raw shell command string used to launch the server. */
export function resolveInstallCommand(server) {
  if (hasDeclaredInstall(server)) return server.install_command.trim();
  return `npx -y @modelcontextprotocol/server-${slugFor(server)}`;
}

function envPlaceholders(server) {
  if (!Array.isArray(server.env) || server.env.length === 0) return undefined;
  return Object.fromEntries(server.env.map((e) => [e.key, `<${e.key}>`]));
}

/** Split the install command into a { command, args } entry for JSON configs. */
export function buildServerEntry(server) {
  if (server.remote_url) {
    return { url: server.remote_url };
  }
  const parts = resolveInstallCommand(server).split(/\s+/).filter(Boolean);
  const entry = { command: parts[0], args: parts.slice(1) };
  const env = envPlaceholders(server);
  if (env) entry.env = env;
  return entry;
}

export function buildClaudeCommand(server) {
  if (server.remote_url) {
    return `claude mcp add --transport http ${slugFor(server)} ${server.remote_url}`;
  }
  return `claude mcp add ${slugFor(server)} -- ${resolveInstallCommand(server)}`;
}

export function buildCursorConfig(server) {
  return JSON.stringify({ mcpServers: { [slugFor(server)]: buildServerEntry(server) } }, null, 2);
}

export function buildVSCodeConfig(server) {
  const entry = buildServerEntry(server);
  if (entry.url) {
    return JSON.stringify({ servers: { [slugFor(server)]: { type: "http", url: entry.url } } }, null, 2);
  }
  const block = { type: "stdio", command: entry.command, args: entry.args };
  if (entry.env) block.env = entry.env;
  return JSON.stringify({ servers: { [slugFor(server)]: block } }, null, 2);
}
