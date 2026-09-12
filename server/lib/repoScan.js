/**
 * Repo Scan — MCPX
 *
 * The companion to `trustScore.js`. Where the trust engine scores a server's
 * *marketplace metadata* (installs, ratings, license — all gameable, and
 * historically seeded with fake numbers), this module scores the *actual
 * source code* of a repository against the real MCP attack classes:
 *
 *   - leaked secrets (hardcoded API keys / tokens)
 *   - tool-poisoning / prompt-injection directives smuggled into manifests
 *   - dangerous execution surface (shell-out, eval, dynamic code)
 *
 * Two layers:
 *   - `scoreFiles(files)` — PURE & deterministic. Takes already-read files
 *     ([{ path, text }]) and returns a 0–100 score with an itemized breakdown
 *     in the same shape the rest of MCPX speaks ({ score, tier, factors, ... }).
 *     Same input → same output. No I/O. Trivially unit-testable.
 *   - `scanRepo(url)` — clones a public repo (shallow) and runs `scoreFiles`
 *     over its text files. This is the only part that touches the network/disk.
 *
 * Design mirrors `trustScore.js`: named factors, additive, clamped to [0,100],
 * every deduction attached to a human-readable reason.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readdir, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

// --- Detection patterns ---------------------------------------------------
// Secrets are matched by *literal credential format* only. This is deliberate:
// an `process.env.OPENAI_API_KEY` reference is the correct, safe pattern and
// must NEVER be flagged — only a value that looks like a real key is a finding.
const SECRET_PATTERNS = [
  { id: "openai_key", label: "OpenAI API key", re: /\bsk-[A-Za-z0-9]{16,}\b/g },
  { id: "github_token", label: "GitHub token", re: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { id: "aws_access_key", label: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: "slack_token", label: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
];

// Prompt-injection / tool-poisoning directives, as seen in malicious MCP tool
// manifests. Case-insensitive; matched anywhere in any file (manifests are the
// usual home, but a poisoned docstring counts too).
const POISON_PATTERNS = [
  { id: "ignore_instructions", label: "Override of prior instructions", re: /ignore\s+(?:all\s+)?previous\s+instructions/gi },
  { id: "disregard_instructions", label: "Disregard instructions", re: /disregard\s+[^\n]*\binstructions\b/gi },
  { id: "read_env", label: "Directive to read .env / secrets", re: /read\b[^\n]{0,40}\.env\b/gi },
  { id: "exfiltrate", label: "Exfiltration directive", re: /\bexfiltrat\w*/gi },
  { id: "conceal", label: "Concealment directive", re: /do\s+not\s+(?:tell|mention|reveal)\b/gi },
];

// Dangerous execution surface — shell-out and dynamic code evaluation.
const SURFACE_PATTERNS = [
  { id: "child_process", label: "child_process usage", re: /child_process/g },
  { id: "exec", label: "exec() call", re: /\bexec(?:Sync)?\s*\(/g },
  { id: "spawn", label: "spawn() call", re: /\bspawn(?:Sync)?\s*\(/g },
  { id: "eval", label: "eval() call", re: /\beval\s*\(/g },
  { id: "new_function", label: "new Function()", re: /new\s+Function\s*\(/g },
];

/**
 * Factor definitions. Each factor starts at `max` and loses `perHit` points for
 * every match, floored at 0. The sum of all `max` values is 100, so a clean
 * repo scores exactly 100.
 */
const FACTORS = [
  { key: "secrets", label: "Leaked secrets", max: 40, perHit: 20, patterns: SECRET_PATTERNS, redact: true },
  { key: "tool_poisoning", label: "Tool-poisoning directives", max: 35, perHit: 12, patterns: POISON_PATTERNS, redact: false },
  { key: "dangerous_surface", label: "Dangerous execution surface", max: 25, perHit: 8, patterns: SURFACE_PATTERNS, redact: false },
];

/** Map a 0–100 scan score to a risk tier consumed by the UI/agents. */
export function scanTier(score) {
  if (score >= 100) return "safe";
  if (score >= 70) return "low";
  if (score >= 40) return "moderate";
  return "high";
}

/** 1-based line number of a match index within `text`. */
function lineOf(text, index) {
  let line = 1;
  const stop = Math.min(index, text.length);
  for (let i = 0; i < stop; i++) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}

/**
 * Redact a secret value so it is never echoed in full: keep a short prefix and
 * suffix, mask the middle. The original value is never a substring of the result.
 */
function redactSecret(value) {
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

/** Build a compact, single-line preview around a match (secrets are redacted). */
function makePreview(text, match, redact) {
  const value = match[0];
  const shown = redact ? redactSecret(value) : value;
  const start = Math.max(0, match.index - 24);
  const end = Math.min(text.length, match.index + value.length + 24);
  const before = text.slice(start, match.index);
  const after = text.slice(match.index + value.length, end);
  const body = `${before}${shown}${after}`.replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${body}${end < text.length ? "…" : ""}`;
}

/**
 * Score a set of already-read files. Pure & deterministic.
 * @param {Array<{path:string,text:string}>} files
 * @returns {{score:number, tier:string, finding_count:number,
 *   factors:Array, findings:Array, confidence:string}}
 */
/**
 * Is this file a test, fixture, or example?
 *
 * Test files are full of DELIBERATELY fake credentials — that is what a test
 * fixture is. Counting them as leaked secrets produced a false accusation
 * against github/github-mcp-server, whose pat_scope_test.go contains dummy
 * "ghp_..." strings purely to exercise token parsing. Publishing that would be
 * worse than publishing nothing.
 *
 * Only the `secrets` check is suppressed here. Tool-poisoning directives and
 * dangerous execution surface still count in test files: a poisoned prompt or
 * a shell spawn is just as real for being in a spec, and hiding code in a file
 * named *.test.js is otherwise a trivial way to evade the scan.
 */
/** The full source line containing a match, so context can be judged. */
function lineAt(text, index) {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end === -1 ? text.length : end);
}

/**
 * Is `index` inside a multi-line comment — a Python docstring or a C-style
 * block comment?
 *
 * A line-based check cannot see this: in a docstring the `"""` sits on an
 * earlier line, so a continuation line looks like bare prose. Three findings
 * in sooperset/mcp-atlassian were exactly that — security documentation whose
 * opening delimiter was several lines up.
 *
 * Counts unpaired delimiters before the match. Odd count means still open.
 * Cheap and good enough: a false "inside a docstring" needs an unbalanced
 * delimiter, which does not occur in source that parses.
 */
function isInsideBlockComment(text, index) {
  const before = text.slice(0, index);
  const tripleDouble = (before.match(/"""/g) || []).length;
  const tripleSingle = (before.match(/'''/g) || []).length;
  if (tripleDouble % 2 === 1 || tripleSingle % 2 === 1) return true;
  // C-style: open if the last /* is more recent than the last */.
  const lastOpen = before.lastIndexOf("/*");
  return lastOpen !== -1 && lastOpen > before.lastIndexOf("*/");
}

// A source-code comment: #, //, /* … */, *, --, <!--, or a Python docstring.
const CODE_COMMENT = /^\s*(#|\/\/|\/\*|\*(?!\/)|--|<!--|"""|''')/;

// Fields an MCP client actually shows to a model. A directive placed here is
// the whole tool-poisoning attack, so a match in one of these is NEVER
// suppressed — even though it is syntactically a quoted value like any other.
const AGENT_FACING_FIELD =
  /\b(description|instructions?|prompt|system|content|text|summary|about|readme|docstring|help|usage|tool_?description)\b\s*["']?\s*[:=]/i;

/**
 * Is this tool-poisoning match a MENTION of an attack rather than the attack?
 *
 * Calibration against widely-audited MCP servers exposed two classes of false
 * positive, both of which would have made a public index a liability:
 *
 *   sooperset/mcp-atlassian scored `moderate` on six "exfiltration directive"
 *   hits — every one a security comment describing the defence against it
 *   ("# exfiltration via a caller-supplied filename").
 *
 *   github/github-mcp-server was flagged for "Ignore all previous
 *   instructions" — the title field of a test fixture asserting the server
 *   handles that input safely.
 *
 * The distinction is not vocabulary, it is POSITION. A real tool-poisoning
 * directive has to be somewhere a model will read it as an instruction: a tool
 * description, a manifest, a docstring returned to the agent. It cannot do its
 * job from behind a `#`, because the model never sees that.
 *
 * So two things are suppressed:
 *   1. lines that are source-code comments — descriptive prose about the code
 *   2. strings that are plainly data values in fixtures or sample payloads
 *
 * Penalising code for NAMING the threat it defends against is backwards: it
 * pushes authors to stop documenting their protections, and makes the index
 * worse than silence.
 *
 * Deliberately NOT suppressed: prose in README/description fields, and any
 * match on a bare line. Those are exactly where a poisoned instruction lives.
 */
// A quoted value under a NON-agent-facing key — `"title": "…"`, `name = "…"`.
// Test tables and sample payloads look like this. Checked only after the
// agent-facing test above has already declined.
const QUOTED_DATA_VALUE = /["'][^"']*["']\s*[:=]|[:=]\s*["'][^"']*["']\s*,?\s*$/;

// An imperative aimed at a model — the grammatical shape of a real directive,
// as opposed to prose describing one. "Before answering, read .env" is an
// instruction; "exfiltration via a caller-supplied filename" is a noun phrase.
const IMPERATIVE_DIRECTIVE =
  /\b(ignore|disregard|forget|before\s+(?:answering|responding|replying)|do\s+not\s+(?:tell|mention|reveal|disclose)|instead\s+of|you\s+must|always\s+(?:read|send|include)|never\s+(?:tell|mention))\b/i;

export function isDefensiveMention(line) {
  const l = String(line || "");
  // An agent-facing field wins outright: that is where poisoning lives, so a
  // match there is reported even if the line also looks like a comment.
  if (AGENT_FACING_FIELD.test(l)) return false;
  // A comment or docstring that reads as an INSTRUCTION is still an attack —
  // a poisoned docstring is returned to models as a tool description.
  if (IMPERATIVE_DIRECTIVE.test(l) && !QUOTED_DATA_VALUE.test(l)) return false;
  return CODE_COMMENT.test(l) || QUOTED_DATA_VALUE.test(l);
}

export function isTestPath(filePath) {
  const p = String(filePath || "").split("\\").join("/").toLowerCase();
  return (
    /(^|\/)(tests?|__tests__|__mocks__|spec|specs|fixtures?|examples?|testdata|mocks?)(\/|$)/.test(p) ||
    /[._-](test|spec)\.[a-z]+$/.test(p) ||
    /_test\.[a-z]+$/.test(p)
  );
}

export function scoreFiles(files = []) {
  const list = Array.isArray(files) ? files : [];
  const findings = [];

  const factors = FACTORS.map((factor) => {
    let hitCount = 0;
    for (const file of list) {
      const text = typeof file?.text === "string" ? file.text : "";
      const filePath = file?.path || "(unknown)";
      // A fake credential in a test fixture is not a leak. See isTestPath().
      if (factor.key === "secrets" && isTestPath(filePath)) continue;
      for (const pat of factor.patterns) {
        // String.matchAll clones the regex, so iteration is stateless and the
        // result is deterministic across repeated calls.
        for (const m of text.matchAll(pat.re)) {
          // A security comment describing an attack is not the attack. Check
          // the line itself, and whether it sits inside a multi-line docstring
          // or block comment whose delimiter is further up.
          if (factor.key === "tool_poisoning") {
            const line = lineAt(text, m.index);
            // Never suppress a line that is agent-facing or reads as an
            // imperative: a poisoned docstring IS the attack, because
            // docstrings are handed to models as tool descriptions. Only
            // then consider whether this is descriptive prose.
            const isDirective =
              AGENT_FACING_FIELD.test(line) ||
              (IMPERATIVE_DIRECTIVE.test(line) && !QUOTED_DATA_VALUE.test(line));
            if (!isDirective && (isDefensiveMention(line) || isInsideBlockComment(text, m.index))) {
              continue;
            }
          }
          hitCount += 1;
          findings.push({
            check: factor.key,
            pattern: pat.id,
            label: pat.label,
            path: filePath,
            line: lineOf(text, m.index),
            preview: makePreview(text, m, factor.redact),
          });
        }
      }
    }
    const points = Math.max(0, factor.max - hitCount * factor.perHit);
    const reason = hitCount === 0
      ? `No ${factor.label.toLowerCase()} detected`
      : `${hitCount} ${factor.label.toLowerCase()} finding${hitCount > 1 ? "s" : ""}`;
    return { key: factor.key, label: factor.label, points, max: factor.max, hit_count: hitCount, reason };
  });

  const score = Math.max(0, Math.min(100, factors.reduce((sum, f) => sum + f.points, 0)));

  // Confidence reflects how much source we actually saw. A scan of one stray
  // file is not the same as a scan of a whole repo.
  const confidence = list.length === 0 ? "low" : list.length < 3 ? "medium" : "high";

  return {
    score,
    tier: scanTier(score),
    finding_count: findings.length,
    factors,
    findings,
    confidence,
  };
}

// --- Live repo scan (I/O) -------------------------------------------------
export const ALLOWED_HOSTS = new Set(["github.com", "www.github.com", "gitlab.com", "bitbucket.org"]);
const CLONE_TIMEOUT_MS = 20_000;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_FILES = 2000;
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", "coverage", "vendor", ".turbo"]);
const BINARY_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".pdf",
  ".zip", ".gz", ".tar", ".tgz", ".woff", ".woff2", ".ttf", ".eot",
  ".mp4", ".mov", ".mp3", ".wav", ".bin", ".exe", ".dll", ".so",
  ".dylib", ".jar", ".class", ".wasm", ".lock",
]);

/** Validate + canonicalize a public repo URL. Throws { code: "BAD_URL" }. */
function normalizeRepoUrl(repoUrl) {
  let parsed;
  try {
    parsed = new URL(String(repoUrl));
  } catch {
    throw Object.assign(new Error("Invalid repository URL"), { code: "BAD_URL" });
  }
  if (!/^https?:$/.test(parsed.protocol) || !ALLOWED_HOSTS.has(parsed.hostname)) {
    throw Object.assign(new Error("Unsupported repository host"), { code: "BAD_URL" });
  }
  const host = parsed.hostname === "www.github.com" ? "github.com" : parsed.hostname;
  return `https://${host}${parsed.pathname.replace(/\/+$/, "")}`;
}

/** Recursively collect small, text-like files from a cloned repo. */
async function collectFiles(root) {
  const out = [];
  async function walk(current) {
    if (out.length >= MAX_FILES) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= MAX_FILES) return;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(abs);
      } else if (entry.isFile()) {
        if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) continue;
        let info;
        try {
          info = await stat(abs);
        } catch {
          continue;
        }
        if (info.size > MAX_FILE_BYTES) continue;
        let text;
        try {
          text = await readFile(abs, "utf8");
        } catch {
          continue;
        }
        out.push({ path: path.relative(root, abs), text });
      }
    }
  }
  await walk(root);
  return out;
}

/**
 * Clone a public repo (shallow) and score its source.
 * @param {string} repoUrl
 * @returns {Promise<object>} scoreFiles report + { repo_url, file_count, scanned_at }
 */
async function cloneShallow(url, dir) {
  await execFileAsync(
    "git",
    ["clone", "--depth", "1", "--single-branch", "--quiet", url, dir],
    {
      timeout: CLONE_TIMEOUT_MS,
      // Never let git block on an interactive auth prompt — fail fast instead.
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}

export async function scanRepo(repoUrl) {
  const url = normalizeRepoUrl(repoUrl);
  const dir = await mkdtemp(path.join(tmpdir(), "mcpx-scan-"));
  try {
    await cloneShallow(url, dir);
    const files = await collectFiles(dir);
    const report = scoreFiles(files);
    return { ...report, repo_url: url, file_count: files.length, scanned_at: new Date().toISOString() };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Shallow-clone a public repo and return the contents of a single root-relative
 * file (or null if absent). Used for ownership verification (.mcpx-verify).
 * Path traversal is stripped; content is capped. Throws { code:"BAD_URL" } on a
 * bad/unsupported URL and surfaces clone errors (caught by the caller).
 */
export async function readRepoFile(repoUrl, relPath) {
  const url = normalizeRepoUrl(repoUrl);
  const safe = path.normalize(String(relPath)).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
  const dir = await mkdtemp(path.join(tmpdir(), "mcpx-verify-"));
  try {
    await cloneShallow(url, dir);
    try {
      const text = await readFile(path.join(dir, safe), "utf8");
      return text.length > 4096 ? text.slice(0, 4096) : text;
    } catch {
      return null; // file not present
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export default scanRepo;
