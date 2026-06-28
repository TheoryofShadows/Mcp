/**
 * Trust Score Engine — MCPX
 *
 * The thesis (see MARKET.md): a marketplace's only durable moat is *trust*, and
 * trust must be **computed and transparent**, not a manually-toggled "verified"
 * flag. This module turns the raw signals we already store about an MCP server
 * into a 0–100 score with a fully itemized breakdown, so a human (or an agent)
 * can see *why* a server is trusted, not just that someone said so.
 *
 * Design goals:
 *   - Pure & deterministic: same input → same output. No I/O, no Date.now in math
 *     (caller passes `now` for age). Trivially unit-testable.
 *   - Transparent: every point is attached to a named factor with a reason.
 *   - Honest: missing signals lower confidence rather than silently scoring high.
 *
 * Scoring is additive across weighted factors, clamped to [0, 100].
 */

/**
 * Factor definitions. Each returns { points, max, reason } given the server.
 * `max` is the best achievable for that factor; the sum of all `max` is 100.
 */
const FACTORS = [
  {
    key: "provenance",
    label: "Source provenance",
    max: 25,
    score(s) {
      if (!s.repo_url) {
        return { points: 0, reason: "No public source repository linked" };
      }
      const isGit = /github\.com|gitlab\.com|bitbucket\.org/i.test(s.repo_url);
      // Full provenance requires *proven* control of the repo (verified ownership
      // or an admin-reviewed publisher). Simply pasting a link to a famous repo
      // you don't own no longer earns the top score — it's treated like any other
      // unproven source URL until verified.
      const proven = !!(s.repo_verified || s.verified);
      if (isGit && proven) {
        return { points: 25, reason: "Verified public source repository on a known host" };
      }
      if (isGit) {
        return { points: 12, reason: "Source repo linked but ownership not yet verified" };
      }
      return { points: 12, reason: "Source URL present but not a recognized host" };
    },
  },
  {
    key: "license",
    label: "License clarity",
    max: 15,
    score(s) {
      const lic = (s.license || "").trim().toUpperCase();
      if (!lic || lic === "UNKNOWN" || lic === "NONE") {
        return { points: 0, reason: "No declared license — legal/redistribution risk" };
      }
      const OSI = ["MIT", "APACHE-2.0", "BSD-3-CLAUSE", "BSD-2-CLAUSE", "ISC", "MPL-2.0", "GPL-3.0", "LGPL-3.0", "AGPL-3.0"];
      if (OSI.includes(lic)) {
        return { points: 15, reason: `Recognized OSI license (${lic})` };
      }
      return { points: 8, reason: `Declared license (${lic}) — not a common OSI license` };
    },
  },
  {
    key: "publisher",
    label: "Publisher identity",
    max: 20,
    score(s) {
      // `verified` is the manual official-review flag; treat it as a strong but
      // not sole signal. An unverified publisher is "community", not untrusted.
      if (s.verified) {
        return { points: 20, reason: "Publisher identity reviewed by MCPX" };
      }
      return { points: 6, reason: "Community publisher — identity not yet reviewed" };
    },
  },
  {
    key: "adoption",
    label: "Adoption",
    max: 15,
    score(s) {
      // `installs` is the count of *distinct authenticated* installers — the
      // install route only increments it once per (server, real account), and a
      // partial UNIQUE index enforces that. Anonymous installs are analytics-only
      // and never reach this signal, so adoption can't be inflated by a botnet.
      const n = Number(s.installs) || 0;
      // Logarithmic: rewards real traction without letting whales max out trust.
      // 0 installs → 0; ~10 → 5; ~1k → ~10; ~100k → 15.
      if (n <= 0) return { points: 0, reason: "No recorded installs yet" };
      const pts = Math.min(15, Math.round((Math.log10(n + 1) / 5) * 15));
      return { points: pts, reason: `${n.toLocaleString()} installs` };
    },
  },
  {
    key: "satisfaction",
    label: "User satisfaction",
    max: 15,
    score(s) {
      const rating = Number(s.rating) || 0;
      const count = Number(s.rating_count) || 0;
      if (count < 3) {
        return { points: count > 0 ? 3 : 0, reason: `Only ${count} review(s) — not yet significant` };
      }
      // rating is 0–5; scale to 0–15, but require volume to earn the top band.
      const base = (rating / 5) * 15;
      const volumeFactor = Math.min(1, count / 25); // full credit at 25+ reviews
      return {
        points: Math.round(base * volumeFactor),
        reason: `${rating.toFixed(1)}★ across ${count} reviews`,
      };
    },
  },
  {
    key: "maturity",
    label: "Maturity",
    max: 10,
    score(s, now) {
      if (!s.created_at) return { points: 0, reason: "Unknown creation date" };
      const created = new Date(s.created_at).getTime();
      if (Number.isNaN(created)) return { points: 0, reason: "Unparseable creation date" };
      const days = Math.max(0, (now - created) / (1000 * 60 * 60 * 24));
      // 0 days → 0; 30 → ~4; 180 → ~8; 365+ → 10.
      const pts = Math.min(10, Math.round((Math.log10(days + 1) / Math.log10(366)) * 10));
      return { points: pts, reason: `${Math.round(days)} days on the marketplace` };
    },
  },
];

function stalenessPenalty(s, now) {
  const updated = new Date(s.updated_at || s.created_at).getTime();
  if (Number.isNaN(updated)) return { points: 0, reason: null };
  const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 180) return { points: 0, reason: null };
  const penalty = Math.min(5, Math.floor((daysSinceUpdate - 180) / 90));
  if (penalty <= 0) return { points: 0, reason: null };
  return { points: -penalty, reason: `Not updated in ${Math.round(daysSinceUpdate)} days` };
}

/**
 * Source-scan penalty — couples the Trust Score to the actual code scan
 * (server/lib/repoScan.js, persisted in server_scans). A repository whose source
 * scans as risky drags the listing's trust down, regardless of installs/ratings.
 */
function scanPenalty(s) {
  const tier = s.scan_tier;
  if (tier === "high") return { points: -15, reason: "Source scan flagged high-risk findings" };
  if (tier === "moderate") return { points: -5, reason: "Source scan flagged moderate findings" };
  return { points: 0, reason: null };
}

/**
 * Risk penalties — sensitive capabilities reduce trust *until* the publisher is
 * verified, mirroring real MCP attack classes (tool poisoning, over-broad
 * permissions). A verified publisher with audited code is not penalized.
 */
const SENSITIVE_TAGS = ["filesystem", "exec", "shell", "payments", "credentials", "email", "database", "admin"];

function riskPenalty(s) {
  const tags = Array.isArray(s.tags)
    ? s.tags
    : (() => { try { return JSON.parse(s.tags || "[]"); } catch { return []; } })();
  const sensitive = tags
    .map((t) => String(t).toLowerCase())
    .filter((t) => SENSITIVE_TAGS.includes(t));
  if (sensitive.length === 0) return { points: 0, reason: null };
  if (s.verified) {
    return { points: 0, reason: `Handles sensitive capabilities (${sensitive.join(", ")}) — reviewed` };
  }
  // Up to -15 for unverified servers touching sensitive surfaces.
  const penalty = Math.min(15, sensitive.length * 6);
  return { points: -penalty, reason: `Unreviewed access to sensitive capabilities (${sensitive.join(", ")})` };
}

/**
 * Map a numeric score (+ verified flag) to a trust tier consumed by the UI badge.
 */
export function trustTier(score, verified) {
  if (verified && score >= 80) return "official";
  if (score >= 70) return "verified";
  if (score >= 40) return "community";
  return "caution";
}

/**
 * Compute the full trust report for a server row.
 * @param {object} server - server fields (repo_url, license, verified, installs,
 *   rating, rating_count, created_at, tags)
 * @param {number} [now] - epoch ms, injected for deterministic testing
 * @returns {{ score:number, tier:string, factors:Array, penalties:Array, confidence:string }}
 */
export function computeTrust(server, now = Date.now()) {
  const factors = FACTORS.map((f) => {
    const { points, reason } = f.score(server, now);
    return { key: f.key, label: f.label, points, max: f.max, reason };
  });

  const penalty = riskPenalty(server);
  const penalties = penalty.reason
    ? [{ key: "risk", label: "Risk review", points: penalty.points, reason: penalty.reason }]
    : [];

  const staleness = stalenessPenalty(server, now);
  if (staleness.reason) {
    penalties.push({ key: "staleness", label: "Freshness", points: staleness.points, reason: staleness.reason });
  }

  const scan = scanPenalty(server);
  if (scan.reason) {
    penalties.push({ key: "scan", label: "Source scan", points: scan.points, reason: scan.reason });
  }

  // Community reports lower trust. Unreviewed ("open") flags only — an admin
  // dismissing a flag removes its penalty. Capped so a couple of malicious
  // reports can't zero out an otherwise-strong server (rate-limited too).
  const openFlags = Number(server.open_flags) || 0;
  const flagPenalty = openFlags > 0 ? Math.min(10, openFlags * 5) : 0;
  if (flagPenalty > 0) {
    penalties.push({
      key: "flags",
      label: "User reports",
      points: -flagPenalty,
      reason: `${openFlags} open user report${openFlags > 1 ? "s" : ""} pending review`,
    });
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0) + penalty.points + staleness.points + scan.points - flagPenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  // Confidence reflects how many signals we actually had to work with.
  const present = [server.repo_url, server.license, server.rating_count > 0, server.created_at].filter(Boolean).length;
  const confidence = present >= 3 ? "high" : present === 2 ? "medium" : "low";

  return { score, tier: trustTier(score, !!server.verified), factors, penalties, confidence };
}

export default computeTrust;
