#!/usr/bin/env node
/**
 * mcpx — the MCPX command-line installer.
 *
 *   npx mcpx install <slug> [--client claude|cursor|vscode] [--force] [--yes]
 *   npx mcpx search <query>
 *   npx mcpx trust <slug>
 *   npx mcpx scan <repo-url>
 *   npx mcpx list
 *
 * Env:
 *   MCPX_API    base URL (default https://www.mcpx.digital)
 *   MCPX_TOKEN  optional bearer token so installs are counted to your account
 *
 * Dependency-free: Node 20+ built-ins only (fetch, fs, os, path).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { clientConfigPath, mergeMcpConfig, installBlockReason, trustSummary, CLIENTS } from "./lib.js";

const API = (process.env.MCPX_API || "https://www.mcpx.digital").replace(/\/$/, "");
const TOKEN = process.env.MCPX_TOKEN || "";

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) { flags[key] = next; i++; }
      else flags[key] = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

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
  catch { throw new Error(`Unexpected non-JSON response from ${API} (HTTP ${res.status}).`); }
  if (!res.ok) throw new Error(body.error || `Request failed (HTTP ${res.status}).`);
  return body;
}

function detectClient(env = process) {
  // Best-effort: prefer an explicit client; otherwise pick the first whose config
  // directory already exists, falling back to Claude Desktop.
  const home = homedir();
  for (const client of ["cursor", "claude"]) {
    const p = clientConfigPath(client, { home, platform: env.platform });
    if (existsSync(path.dirname(p))) return client;
  }
  return "claude";
}

async function confirm(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

async function cmdInstall(slug, flags) {
  if (!slug) throw new Error("Usage: mcpx install <slug> [--client ...] [--force] [--yes]");
  const server = await api(`/api/servers/${encodeURIComponent(slug)}`);

  console.log(`\n${server.name}  (${server.slug})`);
  console.log(`  ${server.description || ""}`);
  console.log(`  ${trustSummary(server)}`);
  if (server.repo_url) console.log(`  repo: ${server.repo_url}${server.repo_verified ? " (verified)" : " (unverified)"}`);

  const block = installBlockReason(server, { force: !!flags.force });
  if (block) {
    console.error(`\n✖ ${block}`);
    process.exitCode = 1;
    return;
  }

  const client = flags.client || detectClient();
  if (!CLIENTS.includes(client)) throw new Error(`Unknown --client '${client}'. Use one of: ${CLIENTS.join(", ")}`);

  const configPath = clientConfigPath(client, { home: homedir(), platform: process.platform, cwd: process.cwd() });

  if (!flags.yes && !flags.force) {
    const ok = await confirm(`Install "${server.slug}" into ${client} at ${configPath}?`);
    if (!ok) { console.log("Aborted."); return; }
  }

  let existing = {};
  if (existsSync(configPath)) {
    try { existing = JSON.parse(await readFile(configPath, "utf8")); }
    catch { throw new Error(`Existing config at ${configPath} is not valid JSON — fix or move it first.`); }
  }
  const merged = mergeMcpConfig(existing, client, server);
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(merged, null, 2) + "\n");
  console.log(`\n✔ Added "${server.slug}" to ${client} (${configPath}).`);

  // Record the install (counts toward adoption only if MCPX_TOKEN is set).
  try { await api(`/api/servers/${encodeURIComponent(slug)}/install`, { method: "POST", body: "{}" }); }
  catch { /* non-fatal: the config is already written */ }
}

async function cmdSearch(query) {
  const q = query ? `?search=${encodeURIComponent(query)}` : "";
  const { servers } = await api(`/api/servers${q}`);
  if (!servers.length) { console.log("No servers found."); return; }
  for (const s of servers) {
    console.log(`${s.slug.padEnd(28)} ${s.trust?.tier || "?"}  ${s.description || ""}`);
  }
}

async function cmdTrust(slug) {
  if (!slug) throw new Error("Usage: mcpx trust <slug>");
  const report = await api(`/api/servers/${encodeURIComponent(slug)}/trust`);
  console.log(JSON.stringify(report, null, 2));
}

async function cmdScan(repo) {
  if (!repo) throw new Error("Usage: mcpx scan <repo-url>");
  const report = await api(`/api/scan`, { method: "POST", body: JSON.stringify({ repo_url: repo }) });
  console.log(`score: ${report.score}/100  tier: ${report.tier}  findings: ${report.finding_count}`);
  for (const f of report.findings || []) {
    console.log(`  ${f.path}:${f.line}  ${f.label}`);
  }
}

async function cmdList() {
  const { servers } = await api(`/api/discover?limit=50`);
  for (const s of servers) {
    console.log(`${s.slug.padEnd(28)} ${s.trust?.tier || "?"}  ${s.url}`);
  }
}

function usage() {
  console.log(`mcpx — MCPX marketplace CLI

Usage:
  mcpx install <slug> [--client claude|cursor|vscode] [--force] [--yes]
  mcpx search <query>
  mcpx trust <slug>
  mcpx scan <repo-url>
  mcpx list

Env: MCPX_API (default https://www.mcpx.digital), MCPX_TOKEN (count installs)`);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [cmd, arg] = positional;
  switch (cmd) {
    case "install": return cmdInstall(arg, flags);
    case "search": return cmdSearch(arg);
    case "trust": return cmdTrust(arg);
    case "scan": return cmdScan(arg);
    case "list": return cmdList();
    case undefined:
    case "help":
    case "--help":
    case "-h": return usage();
    default:
      console.error(`Unknown command: ${cmd}\n`);
      usage();
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exitCode = 1;
});
