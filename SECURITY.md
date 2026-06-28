# Security Policy

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues,
discussions, or pull requests.**

Instead, report privately through one of:

- **GitHub Security Advisories** — the preferred channel:
  [Report a vulnerability](https://github.com/TheoryofShadows/Mcp/security/advisories/new)
  (Repository → **Security** tab → *Report a vulnerability*). This keeps the
  report private until a fix is ready.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (proof-of-concept if possible).
- Affected versions / commit, and any suggested remediation.

You'll get an acknowledgement, a fix timeline once triaged, and credit in the
release notes if you'd like it.

---

## Scope

In scope: the MCPX application in this repository — the Express API, the React
SPA, authentication, payments handling, and the Trust Score engine.

Out of scope: vulnerabilities in **third-party MCP servers listed in the
marketplace** (report those to their respective maintainers), and issues in
upstream dependencies (report upstream; we track and patch dependency advisories
separately).

---

## What we already do

Defensive measures built into the app:

- **Password hashing** with `bcrypt` (cost 10); credentials are never logged.
- **JWT** bearer auth for user actions; **Descope** permission-gating for admin
  routes.
- **Input validation** on every write — lengths, formats, types, and enum
  whitelists.
- **Rate limiting** — global API (120 req/min/IP with bounded memory), auth
  (20 / 15 min / IP), installs (1 / min / IP / server), scans (8 / min / IP),
  reports (8 / 10 min / IP), server creation (10 / day / user).
- **CORS allow-list** via `CORS_ORIGINS`.
- **Security headers** — HSTS (2 years, includeSubDomains, preload),
  X-Content-Type-Options, X-Frame-Options DENY, strict CSP, Referrer-Policy.
- **Stripe webhook signature verification** against `STRIPE_WEBHOOK_SECRET`
  using the raw request body.
- **Response-type guarding** in the API client so an upstream HTML error page is
  never parsed as data.
- **Dependency hygiene** — we keep `npm audit` at zero known vulnerabilities and
  patch transitive advisories (via upgrades or `overrides`) promptly.

See [docs/TRUST.md](docs/TRUST.md) for the trust/risk model that surfaces
sensitive-capability servers to users.

---

## Supported versions

MCPX is deployed continuously from `main`; security fixes land on `main` and
deploy automatically. Please test against the latest `main` before reporting.
</content>
