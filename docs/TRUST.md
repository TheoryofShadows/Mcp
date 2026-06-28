# Trust & Security Model

A marketplace's only durable moat is **trust** — and on MCPX trust is
**computed and transparent**, not a manually-toggled badge. This document
explains exactly how the Trust Score works, so a human (or an agent) can see
*why* a server is trusted, not just that someone said so.

The engine lives in [`server/lib/trustScore.js`](../server/lib/trustScore.js)
and is pure and deterministic: the same inputs always produce the same score.

---

## Where to see it

- On every **server card** and **detail page** as a badge + expandable breakdown.
- As structured JSON at **`GET /api/servers/:slug/trust`** — the *agent-native*
  endpoint, so an agent can check trust **before** it installs or calls a tool.

---

## The score (0–100)

The score is the sum of six weighted factors, then risk penalties are applied,
clamped to `[0, 100]`.

| Factor | Max | What earns the points |
|--------|-----|-----------------------|
| **Source provenance** | 25 | **Verified-ownership** repo on a known host = full (25); a linked-but-unverified repo, or any other URL = partial (12); none = 0 |
| **License clarity** | 15 | Recognized OSI license (MIT, Apache-2.0, BSD, ISC, MPL, GPL/LGPL/AGPL) = full; other declared = partial; none = 0 |
| **Publisher identity** | 20 | MCPX-verified publisher = full; community (unreviewed) = small base |
| **Adoption** | 15 | Logarithmic in install count (**distinct authenticated installers** only — anonymous installs don't count) — rewards real traction without letting whales max it out |
| **User satisfaction** | 15 | Average rating scaled by review volume; needs ~25+ reviews for full credit; <3 reviews barely counts |
| **Maturity** | 10 | Logarithmic in days listed — ~1 year reaches full |

### Provenance verification

Linking a repository URL is **not** enough to earn the full 25 provenance points —
otherwise anyone could paste a link to a famous repo they don't control. Full
provenance requires **proven ownership**: either an MCPX-verified publisher, or a
completed `.mcpx-verify` challenge (you place a per-server token file in the repo
root; MCPX clones and confirms it). Until then the repo counts as a partial
(unverified) source. See [PUBLISHING](PUBLISHING.md#verify-repository-ownership).

### Source-scan penalty

The live source scan (below) is **bound into the score**: a server whose latest
repository scan comes back **High** risk loses **15 points**, and **Moderate**
loses **5**. The scan re-runs when a server is published and whenever its repo URL
changes, so a server can't pass review and then point at malicious code.

### Risk penalties

Servers tagged with **sensitive capabilities** —
`filesystem`, `exec`, `shell`, `payments`, `credentials`, `email`, `database`,
`admin` — lose up to **15 points** *while unverified*. Verification (which
implies a review) **removes** the penalty. This mirrors real MCP attack classes
(tool poisoning, over-broad permissions): powerful tools must earn trust through
review, not just exist.

### Staleness penalty

Servers that go **more than 180 days** without an update to their marketplace
listing lose up to **5 points**, increasing by 1 point for every additional 90
days of inactivity. Publishers can reset this by updating their server's
metadata (description, tags, repo URL, etc.) via `PATCH /api/servers/:slug`.

### Community flag penalty

Open user reports (flags) reduce trust by **5 points per open report**, capped
at **10 points total**. Only reports from authenticated users count — anonymous
flags do not affect the score. An admin dismissing a flag removes its penalty.
This prevents a few malicious reports from zeroing out an otherwise-strong
server while still surfacing genuine community concerns.

### Confidence

Alongside the score, the report includes a `confidence` of `high` / `medium` /
`low`, based on how many real signals were available (repo, license, reviews,
age). **Missing signals lower confidence rather than silently inflating the
score** — honesty over optimism.

---

## Tiers (the badge)

The numeric score plus the `verified` flag map to a tier:

| Tier | Condition | Reading |
|------|-----------|---------|
| **Official** | `verified` **and** score ≥ 80 | First-party / audited |
| **Verified** | score ≥ 70 | Well-established, strong provenance |
| **Community** | score ≥ 40 | Community-published, fewer signals |
| **Caution** | score < 40 | New, unsourced, or unreviewed sensitive access |

---

## Worked example

A new, MIT-licensed tool with a public GitHub repo, no reviews yet, and no
sensitive tags:

```
provenance    12  (repo linked but ownership not yet verified)
license       15  (MIT)
publisher      6  (community — not yet reviewed)
adoption       0  (no installs yet)
satisfaction   0  (no reviews yet)
maturity       0  (just listed)
penalties      0
────────────────
score         33  → "Caution", confidence "medium"
```

After the publisher completes `.mcpx-verify`, provenance jumps to **25** (score
→ 46, "Community"). As the tool then gains installs, earns reviews, ages, and
(optionally) gets verified, it climbs toward **Verified** and **Official** —
automatically, from real signals.

---

## Live repository scanning

Beyond marketplace metadata, MCPX can scan the **actual source code** of a
server's repository via `POST /api/scan` or `GET /api/scan/:owner/:repo`. This
is the unfakeable trust signal — it reads real code and checks for:

| Check | Max | What it detects |
|-------|-----|-----------------|
| **Leaked secrets** | 40 | Hardcoded API keys (OpenAI, GitHub, AWS, Slack) |
| **Tool-poisoning directives** | 35 | "Ignore previous instructions", exfiltration directives, concealment |
| **Dangerous execution surface** | 25 | `eval()`, `child_process`, `spawn()`, `new Function()` |

A clean repo scores **100** ("safe"). Each finding deducts points from its
category. The scan returns the same `{ score, tier, factors, findings }` shape
as the trust report, so agents can gate behavior on both.

Scan tiers: **Safe** (100) → **Low** (70–99) → **Moderate** (40–69) → **High** (<40).

The latest scan tier is stored per server and **feeds the Trust Score** (see the
source-scan penalty above): publishing a server and changing its repo URL both
trigger a re-scan, so this signal stays current rather than being a one-time check.

---

## What this means for each audience

- **Users:** prefer higher tiers for anything that touches your files,
  credentials, or money. Expand the breakdown — the *reasons* tell you what's
  missing.
- **Publishers:** you raise your score by linking a real repo, declaring an OSI
  license, being honest about capabilities, and getting verified. See
  [PUBLISHING](PUBLISHING.md#3-earn-a-higher-trust-score).
- **Agents:** call `/api/servers/:slug/trust` and gate behavior on `tier`,
  `score`, and the `penalties` array before invoking a tool.

---

## Application security notes

Defensive measures already in the codebase:

- **Passwords** hashed with `bcrypt` (cost 10); credentials never logged.
- **JWT** bearer auth for user actions; **Descope** permission-gating for admin.
- **Input validation** on every write (lengths, formats, types, enums).
- **Rate limiting** on auth (20 / 15 min / IP) and installs (1 / min / IP /
  server).
- **CORS allow-list** via `CORS_ORIGINS` (tolerant of pasted whitespace/brackets).
- **Stripe webhooks** verified against `STRIPE_WEBHOOK_SECRET` using the raw
  request body.
- **Non-JSON response guard** in the API client so an upstream HTML error page
  never gets parsed as data.

To report a vulnerability, see [SECURITY.md](../SECURITY.md). **Please don't file
security issues as public GitHub issues.**
</content>
