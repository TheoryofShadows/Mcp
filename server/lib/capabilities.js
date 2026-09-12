/**
 * Capability detection for MCP servers.
 *
 * A companion to the threat scanner, and deliberately a DIFFERENT KIND of
 * signal. Threat detection makes accusations; capability detection states
 * facts. "This server can read your filesystem and make network calls" is not
 * a charge against the author — it is what a buyer needs to know before an
 * agent runs it with their permissions.
 *
 * That distinction is why this file can carry many signals safely. A threat
 * pattern that misfires defames a maintainer; a capability that misfires just
 * over-describes a package. Socket.dev's "70+ signals" are mostly this shape.
 *
 * Capabilities carry NO score penalty. They are disclosure.
 *
 * Sources for the indicator set:
 *   - OWASP MCP Security Cheat Sheet (12 risk categories)
 *   - Unit 42 npm threat landscape (concrete malware APIs and paths)
 *   - Equixly MCP scan: 43% command injection, 30% SSRF, 22% path traversal
 *   - Invariant Labs tool-poisoning disclosure (agent config reads)
 */

/**
 * Each capability: a stable id, a human label, the regexes that evidence it,
 * and `sensitive` for the ones a reviewer should look at first.
 */
export const CAPABILITIES = [
  // ── Network ───────────────────────────────────────────────────────────
  { id: "net_http", label: "Makes HTTP requests", group: "network", sensitive: false,
    res: [/\bfetch\s*\(/, /\baxios\b/, /require\(['"]https?['"]\)/, /from\s+['"]node:https?['"]/, /\brequests\.(get|post|put|delete)\b/, /httpx\./] },
  { id: "net_websocket", label: "Opens WebSocket connections", group: "network", sensitive: false,
    res: [/\bWebSocket\s*\(/, /\bwss?:\/\//, /websockets?\.connect/] },
  { id: "net_raw_socket", label: "Opens raw TCP/UDP sockets", group: "network", sensitive: true,
    res: [/require\(['"]net['"]\)/, /require\(['"]dgram['"]\)/, /from\s+['"]node:(net|dgram)['"]/, /socket\.socket\s*\(/] },
  { id: "net_dns", label: "Performs DNS lookups", group: "network", sensitive: false,
    res: [/require\(['"]dns['"]\)/, /from\s+['"]node:dns['"]/, /\bdns\.(resolve|lookup)/] },
  { id: "net_hardcoded_ip", label: "Connects to a hardcoded IP address", group: "network", sensitive: true,
    res: [/https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/] },
  { id: "net_url_from_param", label: "Fetches a URL built from an argument (SSRF surface)", group: "network", sensitive: true,
    // Equixly found SSRF in 30% of scanned MCP servers — a tool that fetches
    // an LLM-supplied URL can be steered at cloud metadata endpoints.
    res: [/fetch\s*\(\s*(?:url|uri|endpoint|target|link|address)\b/i, /axios\.get\s*\(\s*(?:url|uri|endpoint|target)\b/i] },
  { id: "net_cloud_metadata", label: "References a cloud metadata endpoint", group: "network", sensitive: true,
    res: [/169\.254\.169\.254/, /metadata\.google\.internal/, /metadata\.azure\.com/] },

  // ── Filesystem ────────────────────────────────────────────────────────
  { id: "fs_read", label: "Reads files", group: "filesystem", sensitive: false,
    res: [/\breadFile(?:Sync)?\s*\(/, /require\(['"]fs['"]\)/, /from\s+['"]node:fs['"]/, /\.read_text\s*\(/] },
  { id: "fs_write", label: "Writes files", group: "filesystem", sensitive: true,
    res: [/\bwriteFile(?:Sync)?\s*\(/, /\bappendFile(?:Sync)?\s*\(/, /\bcreateWriteStream\s*\(/, /\.write_text\s*\(/] },
  { id: "fs_delete", label: "Deletes files or directories", group: "filesystem", sensitive: true,
    res: [/\b(?:unlink|rmdir|rmSync)(?:Sync)?\s*\(/, /shutil\.rmtree/, /os\.remove\s*\(/] },
  { id: "fs_path_traversal", label: "Builds file paths from arguments (traversal surface)", group: "filesystem", sensitive: true,
    // 22% of scanned MCP servers allowed path traversal / arbitrary file read.
    res: [/(?:readFile|createReadStream)(?:Sync)?\s*\(\s*(?:path\.join\s*\()?\s*(?:req|args|params|input|userPath|filePath|filename)\b/i] },
  { id: "fs_home_dir", label: "Accesses the user's home directory", group: "filesystem", sensitive: true,
    res: [/os\.homedir\s*\(/, /process\.env\.HOME\b/, /Path\.home\s*\(/] },

  // ── Process & shell ───────────────────────────────────────────────────
  { id: "proc_shell", label: "Executes shell commands", group: "process", sensitive: true,
    res: [/child_process/, /\bexec(?:Sync|File)?\s*\(/, /\bspawn(?:Sync)?\s*\(/, /os\.system\s*\(/, /subprocess\.(?:run|call|Popen|check_output)/] },
  { id: "proc_shell_from_param", label: "Builds a shell command from an argument (injection surface)", group: "process", sensitive: true,
    // 43% of scanned MCP servers had command-injection flaws.
    res: [/exec(?:Sync)?\s*\(\s*[`'"][^`'"]*\$\{/, /exec(?:Sync)?\s*\(\s*(?:cmd|command|args|input|query)\b/i, /subprocess\.[a-z_]+\([^)]*shell\s*=\s*True/] },
  { id: "proc_dynamic_code", label: "Evaluates code at runtime", group: "process", sensitive: true,
    res: [/\beval\s*\(/, /new\s+Function\s*\(/, /\bvm\.runIn/, /__import__\s*\(/] },
  { id: "proc_native_addon", label: "Loads a native binary addon", group: "process", sensitive: true,
    res: [/\.node['"]\s*\)/, /require\(['"]bindings['"]\)/, /ctypes\.(?:CDLL|WinDLL)/] },

  // ── Credentials & environment ─────────────────────────────────────────
  { id: "cred_env_read", label: "Reads environment variables", group: "credentials", sensitive: false,
    res: [/process\.env\b/, /os\.environ\b/, /getenv\s*\(/] },
  { id: "cred_env_bulk", label: "Reads the ENTIRE environment at once", group: "credentials", sensitive: true,
    res: [/JSON\.stringify\s*\(\s*process\.env/, /Object\.(?:keys|entries|assign)\s*\(\s*process\.env\s*\)/, /\{\s*\.\.\.\s*process\.env\s*\}/, /dict\s*\(\s*os\.environ\s*\)/] },
  { id: "cred_ssh_keys", label: "Accesses SSH keys", group: "credentials", sensitive: true,
    res: [/\.ssh\/(?:id_[a-z0-9]+|identity|authorized_keys|known_hosts)/] },
  { id: "cred_cloud_files", label: "Accesses cloud credential files", group: "credentials", sensitive: true,
    res: [/\.aws\/credentials/, /\.config\/gcloud/, /\.azure\/credentials/, /\.kube\/config/] },
  { id: "cred_npm_token", label: "Accesses npm/registry credentials", group: "credentials", sensitive: true,
    // The Shai-Hulud worm used a stolen .npmrc token to self-publish.
    res: [/\.npmrc\b/, /NPM_TOKEN\b/] },
  { id: "cred_agent_config", label: "Accesses AI agent configuration files", group: "credentials", sensitive: true,
    // The canonical MCP tool-poisoning payload reads ~/.cursor/mcp.json.
    res: [/\.cursor\/mcp\.json/, /\.claude\/(?:mcp\.json|settings)/, /claude_desktop_config\.json/, /\.continue\/config/, /\.vscode\/mcp\.json/] },
  { id: "cred_keychain", label: "Accesses the OS keychain or credential store", group: "credentials", sensitive: true,
    res: [/\bkeytar\b/, /security\s+find-generic-password/, /CredentialManager/, /libsecret/, /\bkeyring\./] },
  { id: "cred_browser_store", label: "Accesses browser profile or cookie storage", group: "credentials", sensitive: true,
    res: [/Login\s?Data\b/, /Cookies\.sqlite/, /Application Support\/Google\/Chrome/] },
  { id: "cred_gh_cli", label: "Extracts a token from the GitHub CLI", group: "credentials", sensitive: true,
    // Observed in real npm malware: `gh auth token` via execSync.
    res: [/gh\s+auth\s+token/] },
  { id: "cred_crypto_wallet", label: "Accesses cryptocurrency wallet files", group: "credentials", sensitive: true,
    res: [/wallet\.dat\b/, /\.ethereum\/keystore/, /exodus\.wallet/, /MetaMask/] },

  // ── Install-time behaviour ────────────────────────────────────────────
  { id: "install_script", label: "Runs code at install time", group: "install", sensitive: true,
    // Socket treats ANY new install script as noteworthy — it is rare and
    // runs before a user ever invokes the tool.
    res: [/"(?:pre|post)?install"\s*:/] },
  { id: "install_downloads", label: "Downloads content during install", group: "install", sensitive: true,
    res: [/"(?:pre|post)?install"\s*:\s*"[^"]*(?:curl|wget|Invoke-WebRequest|iwr)\b/i] },

  // ── Obfuscation & anti-analysis ───────────────────────────────────────
  { id: "obfus_encoded", label: "Decodes encoded strings at runtime", group: "obfuscation", sensitive: true,
    res: [/\batob\s*\(/, /Buffer\.from\s*\([^)]*['"]base64['"]/, /base64\.b64decode/, /String\.fromCharCode\s*\(\s*\d+\s*,/] },
  { id: "obfus_hex_identifiers", label: "Uses machine-generated hex identifiers", group: "obfuscation", sensitive: true,
    // Real npm malware mangles every identifier to _0x3865d8-style names.
    res: [/\b_0x[0-9a-f]{4,}\b/] },
  { id: "anti_locale_check", label: "Changes behaviour based on system locale", group: "obfuscation", sensitive: true,
    // A killswitch: real malware exits silently on a Russian locale.
    res: [/resolvedOptions\s*\(\s*\)\.locale/, /process\.env\.(?:LC_ALL|LC_MESSAGES|LANGUAGE)\b/] },
  { id: "anti_daemonize", label: "Re-spawns itself as a background process", group: "obfuscation", sensitive: true,
    res: [/__DAEMONIZED\b/, /detached\s*:\s*true/, /setsid\s*\(/] },
  { id: "anti_ci_detect", label: "Detects a CI environment", group: "obfuscation", sensitive: true,
    res: [/GITHUB_ACTIONS\s*===?\s*['"]true['"]/, /\bGITLAB_CI\b/] },

  // ── Exotic exfiltration channels ──────────────────────────────────────
  { id: "exfil_p2p", label: "Uses a peer-to-peer or blockchain channel", group: "exfiltration", sensitive: true,
    // Observed C2 fallbacks: BitTorrent DHT, Nostr relays, Ethereum RPC.
    res: [/router\.bittorrent\.com/, /dht\.transmissionbt\.com/, /wss:\/\/relay\.(?:damus|nostr)/, /eth_call|web3\.eth\b/] },
  { id: "exfil_paste_site", label: "Contacts a paste or file-drop service", group: "exfiltration", sensitive: true,
    res: [/pastebin\.com\/(?:api|raw)/, /hastebin\.com/, /transfer\.sh/, /file\.io/] },
  { id: "exfil_webhook", label: "Posts to a generic webhook endpoint", group: "exfiltration", sensitive: true,
    res: [/discord(?:app)?\.com\/api\/webhooks/, /hooks\.slack\.com\/services/, /api\.telegram\.org\/bot/] },

  // ── Scheduling & persistence ──────────────────────────────────────────
  { id: "persist_autostart", label: "Installs itself to run automatically", group: "persistence", sensitive: true,
    res: [/crontab\b/, /LaunchAgents\b/, /systemd\/user\b/, /schtasks\s+\/create/] },
];

/**
 * Detect which capabilities a set of files demonstrates.
 *
 * Deliberately NOT scored: the return value is a description, not a verdict.
 * Each capability reports the first file that evidences it so a reviewer can
 * check the claim rather than trust it.
 *
 * @param {Array<{path:string,text:string}>} files
 * @returns {{capabilities:Array, sensitive_count:number, total_signals:number, groups:object}}
 */
export function detectCapabilities(files = []) {
  const list = Array.isArray(files) ? files : [];
  const found = [];

  for (const cap of CAPABILITIES) {
    let evidencePath = null;
    for (const file of list) {
      const text = typeof file?.text === "string" ? file.text : "";
      if (!text) continue;
      // None of these carry /g, so there is no lastIndex to leak between files.
      if (cap.res.some((re) => re.test(text))) {
        evidencePath = file?.path || "(unknown)";
        break;
      }
    }
    if (evidencePath) {
      found.push({
        id: cap.id,
        label: cap.label,
        group: cap.group,
        sensitive: cap.sensitive,
        evidence_path: evidencePath,
      });
    }
  }

  const groups = {};
  for (const c of found) (groups[c.group] ||= []).push(c.id);

  return {
    capabilities: found,
    sensitive_count: found.filter((c) => c.sensitive).length,
    total_signals: CAPABILITIES.length,
    groups,
  };
}

export default detectCapabilities;
