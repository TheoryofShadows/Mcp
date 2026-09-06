# MCPX — The Marketplace for AI Agent Tools

[![Live](https://img.shields.io/badge/Live-www.mcpx.digital-4DFFB4?style=flat-square&logo=globe&logoColor=black)](https://www.mcpx.digital)
[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-43853d?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/TheoryofShadows/Mcp/pulls)

> **Discover, install, publish, and get paid for Model Context Protocol servers** — the tools that give Claude, Cursor, and VS Code real-world capabilities.

**[www.mcpx.digital](https://www.mcpx.digital)** · [Demo (GitHub Pages)](https://theoryofshadows.github.io/Mcp/) · [Docs](docs/README.md)

---

## What is this?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is the open standard — backed by Anthropic, OpenAI, Google, Microsoft, and donated to the Linux Foundation — that lets AI agents connect to real tools: databases, APIs, browsers, file systems, cloud services.

There are thousands of MCP servers. Most people don't know they exist, can't tell which ones are safe, and have no easy way to install them. **MCPX fixes that.**

```
 Your AI (Claude / Cursor / VS Code)
          │
          ▼
        MCPX  ──▶  GitHub MCP     ──▶  opens pull requests for you
          │   ──▶  Playwright MCP  ──▶  drives a real browser
          │   ──▶  Postgres MCP    ──▶  queries your database
          │   ──▶  Stripe MCP      ──▶  handles payments
          └── …34 servers today and growing
```

---

## Why MCPX exists

Three problems no one else is solving well:

**1. Discovery is broken.** There are flat directories with 20,000+ servers, zero curation, and no way to know which ones actually work or are safe to run.

**2. Trust is missing.** Real CVEs have hit MCP servers — tool poisoning, RCE, supply-chain backdoors, cross-tenant exposure. An "official" badge means nothing when it's manually toggled. MCPX computes a **Trust Score (0–100)** from verifiable signals: source provenance, license clarity, adoption, reviews, maturity, and sensitive-capability risk. You can query it via API before you install anything.

**3. Builders can't make money.** If you build a great MCP server today, your monetization options are: nothing, or setting up your own Stripe account and hoping people find you. MCPX gives publishers a built-in payment rail — set a price, connect Stripe, start earning. The platform takes 15%; you keep 85%.

---

## Features

### For users
- **Search and filter** by category, rating, price, and verified status
- **One-click install commands** — copy exact config for Claude Desktop, Cursor, and VS Code
- **Trust badges** — Official / Verified / Community / Caution, computed not guessed
- **Capability warnings** — know what permissions a server needs before you install
- **Live stats** — real install counts, ratings, and weekly growth

### For publishers
- **Submit any MCP server** — free to list, takes minutes
- **Charge for your work** — set a price, Stripe handles checkout and payouts
- **Publisher analytics** — installs, revenue, ratings in one dashboard
- **Verification path** — get the Verified badge and surface higher in search

### For the ecosystem
- **Machine-readable Trust API** — `/api/servers/:slug/trust` returns a full breakdown agents can query before installing
- **Open catalog API** — `/api/servers` is public; build integrations, CLIs, and tooling on top

---

## Pricing

| Plan | Price | Who it's for |
|------|-------|-------------|
| **Starter** | Free | Individual devs getting started. 5 servers, 1,000 API calls/month, community support, basic analytics. |
| **Pro Publisher** | $29/mo | Serious publishers building a business. Unlimited servers, priority listing, revenue analytics dashboard, custom branding, webhook integrations. |
| **Enterprise** | $499/mo | Teams and organizations at scale. Private marketplace, team management, SSO/SAML, SLA (99.9% uptime), dedicated support engineer, custom contracts. |

**Publisher payouts:** The platform takes **15%** on paid tool sales. You keep **85%**. Payouts go directly to your Stripe Connect account — no minimum, no delays.

---

## Quick start

```bash
git clone https://github.com/TheoryofShadows/Mcp.git
cd Mcp
npm install
cp .env.example .env        # fill in JWT_SECRET at minimum
npm run dev                 # Vite on :5173 + Express API on :3001
```

`npm run dev` auto-loads your `.env`. Requires **Node ≥ 20**. The database is SQLite — no external services needed. On first boot with an empty DB it seeds automatically (27 users, 7 categories, 34 servers).

Demo account: `dev@mcpx.dev` / `demo1234`

Full setup in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Deploy your own

MCPX is a **React SPA + Express API + SQLite** — Express serves the SPA itself, so you deploy **one service** that handles everything.

```bash
npm run build
NODE_ENV=production DB_PATH=/data/mcpx.db JWT_SECRET=<secret> npm start
```

**Recommended: Railway** (one-click, auto-deploys from `main`). Full instructions in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

```bash
curl https://your-app.railway.app/api/health   # → {"status":"ok","timestamp":"..."}
```

Minimum production env vars: `NODE_ENV=production`, `JWT_SECRET`, `DB_PATH` (with a mounted volume so data survives redeploys).

---

## Install command examples

Every tool page generates ready-to-run install commands. A sample:

```bash
# Claude Desktop / Claude Code
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```

```json
// Cursor → Settings → MCP
{ "mcpServers": { "github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token>" }
} } }
```

More (including VS Code `.vscode/mcp.json`) in the [Users Guide](docs/USERS.md).

---

## API

The catalog is public. No auth needed for read endpoints.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/servers` | — | List, search, filter, sort, paginate |
| `GET` | `/api/servers/:slug` | — | Full detail + reviews |
| `GET` | `/api/servers/:slug/trust` | — | Machine-readable Trust Score breakdown |
| `POST` | `/api/servers` | JWT | Publish a server |
| `POST` | `/api/servers/:slug/reviews` | JWT | Submit a review |
| `POST` | `/api/servers/:slug/install` | — | Record an install |
| `GET` | `/api/categories` | — | All categories with counts |
| `GET` | `/api/stats` | — | Platform-level stats |
| `GET` | `/api/tiers` | — | Pricing tiers |
| `POST` | `/api/auth/register` · `/login` | — | Accounts + JWT |
| `POST` | `/api/payments/stripe/checkout` | JWT | Subscribe to Pro/Enterprise |
| `POST` | `/api/payments/stripe/tool-checkout` | JWT | Purchase a paid tool |
| `GET` | `/api/payments/stripe/connect` | JWT | Onboard as a paid publisher |

Full reference: [docs/API.md](docs/API.md)

---

## The Trust Score

Every server gets a computed score (0–100) built from real, verifiable signals — not a manually-toggled badge:

| Signal | Max points |
|--------|-----------|
| Source provenance (public repo on a known host) | 25 |
| License clarity (recognized OSI license) | 15 |
| Publisher identity (verified by MCPX) | 20 |
| Adoption (install count) | 15 |
| User satisfaction (rating × review count) | 15 |
| Maturity (days on marketplace) | 10 |

Sensitive capabilities (filesystem, network, secrets) apply a risk flag. The score is exposed at `/api/servers/:slug/trust` so agents and tooling can query it programmatically.

Full breakdown: [docs/TRUST.md](docs/TRUST.md)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 |
| Backend | Express 5 (Node ≥ 20) |
| Database | SQLite (`better-sqlite3`) — Postgres/Supabase schema also included |
| Auth | JWT (email/password); GitHub OAuth (Supabase, optional); admin via Descope |
| Payments | Stripe Connect — destination charges + platform subscriptions |
| Hosting | Single Railway service (recommended) |

---

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Vite + Express together, auto-loads `.env` |
| `npm run build` | Production SPA build |
| `npm start` | Production server (serves SPA + API) |
| `npm run seed` | Reset and re-seed the database |
| `npm run lint` | ESLint |
| `npm test` | Vitest tests |

---

## Project layout

```
src/          React 19 SPA — pages/, components/, hooks/, api/client.js
server/       Express 5 API — app.js, routes/, middleware/, lib/trustScore.js, db.js
docs/         Docs for every audience: users, publishers, API, deployment, trust
schema.sql    Postgres/Supabase equivalent schema (RLS + triggers)
.github/      GitHub Pages demo workflow
```

Full architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Roadmap

- [x] JWT auth, listings, search, pagination
- [x] Reviews, ratings, install tracking, categories
- [x] Computed Trust Score + transparent breakdown + agent API endpoint
- [x] One-click install for Claude, Cursor, VS Code
- [x] Capability and risk warnings
- [x] Stripe Connect payouts + Pro/Enterprise platform subscriptions
- [x] GitHub Pages demo + full documentation
- [x] `npx mcpx install <slug>` — trust-enforcing CLI installer ([`cli/`](cli/))
- [x] Repo ownership verification (`.mcpx-verify`) + source-scan-aware Trust Score
- [x] Reference MCP server: [`@mcpx/railway`](railway-mcp/)
- [x] Solana Pay — Phantom checkout for paid tools (devnet default, 85/15 on-chain)
- [ ] GitHub OAuth login (Supabase — optional, configurable)
- [ ] Server versioning and changelogs
- [ ] MCP stacks — shareable collections of tools

---

## Docs

| You are... | Read |
|------------|------|
| A user installing tools | [Users Guide](docs/USERS.md) |
| A publisher or seller | [Publishing & Monetization](docs/PUBLISHING.md) |
| A developer calling the API | [API Reference](docs/API.md) |
| A contributor | [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) |
| An operator self-hosting | [Deployment](docs/DEPLOYMENT.md) |
| Security-minded | [Trust & Security](docs/TRUST.md) · [Security Policy](SECURITY.md) |

---

## Contributing

Open an issue first for anything substantial. Keep `lint`, `test`, and `build` green. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

Found a vulnerability? See [SECURITY.md](SECURITY.md).

---

## License

MIT © 2026 [TheoryofShadows](https://github.com/TheoryofShadows)

*If this is useful, a star goes a long way.*
