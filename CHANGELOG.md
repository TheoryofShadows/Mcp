# Changelog

All notable changes to MCPX are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). MCPX deploys
continuously from `main`, so "released" means "merged to `main` and live".

## [Unreleased]

### Added
- **GitHub Pages demo** — a static, seed-data build of the marketplace published
  via `.github/workflows/deploy-pages.yml`, with a build-time configurable base
  path (`PAGES_BASE`) and an SPA `404.html` fallback. Does not affect the
  Railway production build.
- **Comprehensive documentation** under `docs/` for every audience: users,
  publishers, API integrators, contributors, operators, and security — plus
  root `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and this
  changelog.

### Changed
- Router now respects `import.meta.env.BASE_URL` (`basename`) so the same build
  works at `/` (Railway) and `/Mcp/` (GitHub Pages).

## [2026-06-28]

### Security
- **Comprehensive security audit** (PR #44): global sliding-window rate limiting
  (120 req/min per IP), tightened CSP with HSTS, reduced JSON payload limit to
  256KB, proper raw body parsing for Stripe webhooks.
- **JWT hardening** — tokens now include `jti` (unique ID) and expiry reduced
  from 7 days to 24 hours.
- **Stripe webhook idempotency** — `processed_events` table prevents duplicate
  event processing.
- **Post-audit hardening** — rate limiter memory bounded (fixed-window counters
  with IP eviction cap), scan route input validation for owner/repo params,
  discover feed `since` parameter validation, scan cache size-bounded.
- Reduced information leakage in error responses, added audit logging for admin
  actions.

### Added
- **Live repo security scan** — `POST /api/scan` and `GET /api/scan/:owner/:repo`
  shallow-clone public repos and score them against real MCP attack classes
  (leaked secrets, tool-poisoning, dangerous execution surface).
- **Agent-readable discovery feed** — `GET /api/discover` with incremental
  polling via `?since=` and 5-minute cache headers.
- **Author self-delete** — `DELETE /api/servers/:slug` lets publishers remove
  their own servers.
- **Community flagging** — `POST /api/servers/:slug/report` with rate limiting
  and duplicate prevention.
- **Publisher server updates** — `PATCH /api/servers/:slug` lets publishers
  update description, tags, repo URL, and license (resets staleness penalty).
- **Admin flag management** — `GET /api/admin/flags` and
  `PATCH /api/admin/flags/:id` to review or dismiss community reports.

### Changed
- **Trust engine** — staleness penalty (servers >180 days without update lose up
  to 5 points), flag penalty capped at 10 points (was uncapped), anonymous
  reports excluded from score calculation.
- **TRUST.md** updated with staleness, flag cap, and repo scan documentation.

## [2026-06-05]

### Fixed
- **iOS Safari blank screen** — hardened startup so every visitor gets a working
  page; the Descope provider only mounts when configured, and the build target
  is pinned for older Safari/Android browsers.
- **`CORS_ORIGINS` parsing** — tolerates pasted whitespace and angle brackets.

### Added
- **Accessibility sweep** across routed pages — screen-reader live regions
  (`role="status"`/`aria-live`), proper ARIA tabs on the tool detail page,
  `role="alert"` error states, and `aria-hidden` on decorative elements.
- **`CLAUDE.md`** project memory file.

### Security
- **Zero dependency vulnerabilities** — patched `react-router`/`react-router-dom`
  (RCE/XSS/open-redirect/DoS advisories), `ajv`, and `brace-expansion`; upgraded
  `@descope/react-sdk`; and overrode the transitive `js-cookie` to a patched
  release. `npm audit` reports 0.

## [2026-06-02]

### Added
- First-boot **auto-seed** in production (no volume/shell required).
- Browse pages wired to the live API with the **Trust Score** surfaced
  throughout.
</content>
