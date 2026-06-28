/**
 * Shared install-config builders — MCPX
 *
 * Single source of truth for turning a server record into the per-client install
 * configuration. Imported by BOTH the web UI (src/components/InstallButtons.jsx)
 * and the CLI (cli/), so the command a user copies from the site and the command
 * `npx mcpx install` writes can never drift apart.
 *
 * Pure & dependency-free (browser- and Node-safe): no I/O, no framework imports.
 *
 * Install spec resolution order:
 *   1. server.install_command — the publisher-declared, verifiable spec.
 *   2. Fallback to the `@modelcontextprotocol/server-<slug>` naming convention.
 * The fallback is a GUESS at a package name; callers that care about supply-chain
 * safety (the CLI) should check `hasDeclaredInstall()` before trusting it.
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

/** Split the install command into a { command, args } entry for JSON configs. */
export function buildServerEntry(server) {
  const parts = resolveInstallCommand(server).split(/\s+/).filter(Boolean);
  return { command: parts[0], args: parts.slice(1) };
}

export function buildClaudeCommand(server) {
  return `claude mcp add ${slugFor(server)} -- ${resolveInstallCommand(server)}`;
}

export function buildCursorConfig(server) {
  const { command, args } = buildServerEntry(server);
  return JSON.stringify({ mcpServers: { [slugFor(server)]: { command, args } } }, null, 2);
}

export function buildVSCodeConfig(server) {
  const { command, args } = buildServerEntry(server);
  return JSON.stringify({ servers: { [slugFor(server)]: { type: "stdio", command, args } } }, null, 2);
}
