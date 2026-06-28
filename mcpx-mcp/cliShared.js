// GENERATED FILE — do not edit. Regenerate with: npm run sync:vendored

/**
 * mcpx CLI — pure helpers
 *
 * All decision logic lives here (no I/O, no network) so it is trivially testable.
 * The thin orchestration in index.js wires these to fetch + the filesystem.
 */
import path from "node:path";
// Local generated copy of shared/installConfig.js (kept in sync by
// scripts/sync-shared.js) so the published CLI package is self-contained.
import { buildServerEntry, hasDeclaredInstall, slugFor } from "./installConfig.js";

export const CLIENTS = ["claude", "cursor", "vscode"];

/**
 * Resolve the on-disk config path for a client. Pure: all environment is injected
 * via `env` ({ home, platform, cwd, appData }) so it can be unit-tested per-OS.
 */
export function clientConfigPath(client, env = {}) {
  const home = env.home || "";
  const platform = env.platform || "linux";
  const cwd = env.cwd || ".";
  switch (client) {
    case "cursor":
      return path.join(home, ".cursor", "mcp.json");
    case "vscode":
      return path.join(cwd, ".vscode", "mcp.json");
    case "claude": {
      if (platform === "darwin") {
        return path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
      }
      if (platform === "win32") {
        return path.join(env.appData || path.join(home, "AppData", "Roaming"), "Claude", "claude_desktop_config.json");
      }
      return path.join(home, ".config", "Claude", "claude_desktop_config.json");
    }
    default:
      throw new Error(`Unknown client: ${client}`);
  }
}

/** VS Code uses a top-level `servers` map of stdio entries; others use `mcpServers`. */
function configKey(client) {
  return client === "vscode" ? "servers" : "mcpServers";
}

/**
 * Merge a server into an existing client config WITHOUT clobbering other servers.
 * Returns a new object (does not mutate `existing`). Pure.
 */
export function mergeMcpConfig(existing, client, server) {
  const key = configKey(client);
  const slug = slugFor(server);
  const { command, args } = buildServerEntry(server);
  const entry = client === "vscode" ? { type: "stdio", command, args } : { command, args };

  const base = existing && typeof existing === "object" ? existing : {};
  return {
    ...base,
    [key]: {
      ...(base[key] && typeof base[key] === "object" ? base[key] : {}),
      [slug]: entry,
    },
  };
}

/**
 * Decide whether an install should be blocked. Returns a reason string to block,
 * or null to proceed. The CLI is a *trust-enforcing* install path: low-trust or
 * unverified-artifact installs are refused unless the user passes --force.
 */
export function installBlockReason(server, { force = false } = {}) {
  if (force) return null;
  if (!hasDeclaredInstall(server)) {
    return "This server has no verified install command (the package name would be guessed). Re-run with --force to install the conventional package anyway.";
  }
  if (server.repo_verified === false) {
    return "This server's source repository ownership is not verified. Re-run with --force to install anyway.";
  }
  const tier = server.trust?.tier;
  if (tier === "caution") {
    return "This server's trust tier is 'caution'. Re-run with --force to install anyway.";
  }
  if (server.risk_level === "high") {
    return "This server requests high-risk capabilities and is not verified. Re-run with --force to install anyway.";
  }
  return null;
}

/** Short human summary of a server's trust/risk for the confirmation prompt. */
export function trustSummary(server) {
  const tier = server.trust?.tier || "unknown";
  const score = server.trust?.score;
  const risk = server.risk_level ? `, risk: ${server.risk_level}` : "";
  const caps = server.capabilities?.length ? ` [${server.capabilities.join(", ")}]` : "";
  return `trust: ${tier}${score != null ? ` (${score}/100)` : ""}${risk}${caps}`;
}
