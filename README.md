# MCPX — The Marketplace for AI Agent Tools (MCP Servers)

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/TheoryofShadows/Mcp/pulls)

> **npm + Product Hunt for Model Context Protocol servers** — discover, install,
> publish, and monetize the MCP servers that supercharge Claude, Cursor, and
> VS Code.

- 🌐 **Live app:** **[www.mcpx.digital](https://www.mcpx.digital)**
- 🧪 **Demo (GitHub Pages):** **[theoryofshadows.github.io/Mcp](https://theoryofshadows.github.io/Mcp/)** — the real UI on sample data
- 📚 **Docs:** **[docs/](docs/README.md)**

---

## 📖 Documentation — find your angle

Full docs live in **[`docs/`](docs/README.md)**. Jump straight to what you need:

| You are… | Read |
|----------|------|
| 🧑‍💻 **A user** installing MCP tools | **[Users Guide](docs/USERS.md)** |
| 🏪 **A publisher / seller** | **[Publishing & Monetization](docs/PUBLISHING.md)** |
| 🔌 **A developer / integrator** | **[API Reference](docs/API.md)** |
| 🛠️ **A contributor** | **[Architecture](docs/ARCHITECTURE.md)** · **[Contributing](CONTRIBUTING.md)** |
| 🚀 **An operator** self-hosting | **[Deployment](docs/DEPLOYMENT.md)** |
| 🔐 **Security-minded** | **[Trust & Security](docs/TRUST.md)** · **[Security Policy](SECURITY.md)** |
| ❓ **Curious** | **[FAQ](docs/FAQ.md)** |

---

## What is MCPX?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is the open
standard that lets AI agents like Claude connect to real tools — databases,
APIs, file systems, cloud services, and more. **MCPX is the central registry**
where developers publish MCP servers and AI power-users find the best ones.

```
 Claude / Cursor / VS Code
          │
          ▼
        MCPX  ──▶  GitHub MCP    ──▶  opens PRs for you
          │   ──▶  Postgres MCP   ──▶  queries your database
          │   ──▶  Playwright MCP ──▶  drives a browser
          └ …and a growing catalog more
```

What sets it apart from a flat list:

- **Computed, transparent [Trust Score](docs/TRUST.md)** (0–100) on every
  server — from real signals (source, license, adoption, reviews, maturity,
  sensitive-capability risk), with a `/api/servers/:slug/trust` endpoint agents
  can query *before* installing.
- **One-click install** commands for Claude Desktop, Cursor, and VS Code.
- **Built-in monetization** — charge for tools, get paid via Stripe Connect
  (publishers keep 85%, platform fee 15%).

---

## Features

- **Discover** — search and filter by category, rating, price, and verification.
- **One-Click Install** — copy exact `claude mcp add`, Cursor, and VS Code config.
- **Trust badges** — Official / Verified / Community / Caution, computed not guessed.
- **Safety warnings** — capability and risk levels on every detail page.
- **Live stats** — installs, ratings, weekly growth, creator revenue.
- **Publish & monetize** — submit tools; Stripe Connect payouts for paid ones.
- **Reviews** — authenticated star ratings that feed the Trust Score.
- **Resilient & accessible** — degrades to seed data offline; screen-reader and
  reduced-motion friendly; hardened for older mobile browsers.

---

## Quick start — local dev

```bash
git clone https://github.com/TheoryofShadows/Mcp.git
cd Mcp
npm install
cp .env.example .env       # set JWT_SECRET for anything non-trivial
npm run seed               # sample catalog
npm run dev                # Vite (5173) + Express (3001)
```

Open **http://localhost:5173**. Demo account: `dev@mcpx.dev` / `demo1234`.
Requires **Node ≥ 20**. Full setup in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Deploy your own

MCPX is a **React SPA + Express API + SQLite**, and Express can serve the SPA
itself — so the simplest, recommended deployment is **one Railway service**
hosting frontend, API, and database together (no second platform, no CORS).

```bash
# any Node host
npm run build
NODE_ENV=production npm start    # Express serves dist/ AND /api on one port
```

Minimum production env: `NODE_ENV=production`, `DB_PATH=/data/mcpx.db` (with a
mounted volume), `JWT_SECRET`. Step-by-step Railway setup, the advanced
split-hosting alternative, and the full env-var table are in
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

```bash
curl https://YOUR-APP.up.railway.app/api/health   # → {"status":"ok",...}
```

> The live site deploys from **`main`** via Railway — a change isn't live until
> it's merged to `main`.

---

## One-click install examples

Every server page generates ready-to-run commands. A taste:

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

More (incl. VS Code `.vscode/mcp.json`) in the [Users Guide](docs/USERS.md).

---

## API at a glance

Full reference: **[docs/API.md](docs/API.md)**.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/servers` | — | List / search / filter / sort |
| `GET` | `/api/servers/:slug` | — | Detail + reviews |
| `GET` | `/api/servers/:slug/trust` | — | Machine-readable trust report |
| `POST` | `/api/servers` | JWT | Publish a server |
| `POST` | `/api/servers/:slug/reviews` | JWT | Add a review |
| `POST` | `/api/servers/:slug/install` | — | Record an install |
| `POST` | `/api/auth/register` · `/login` | — | Accounts + JWT |
| `GET` | `/api/categories` · `/stats` · `/tiers` | — | Catalog metadata |
| `POST` | `/api/payments/stripe/*` | JWT | Checkout & payouts |
| `GET/PATCH/DELETE` | `/api/admin/*` | Admin | Moderation |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend (Vite) + backend (Express) together |
| `npm run build` | Production build of the SPA |
| `npm start` | Start the production server |
| `npm run seed` | Reset and re-seed the SQLite database |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit/integration tests |

---

## Project structure

A short map (full version in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

```
src/        React 19 SPA  — pages/, components/, hooks/, api/client.js, data/seed.js
server/     Express 5 API — app.js, routes/, middleware/, lib/trustScore.js, db.js
docs/       Documentation — users, publishing, API, architecture, deployment, trust
schema.sql  Supabase/Postgres equivalent schema (RLS + triggers)
.github/    GitHub Pages demo workflow
```

---

## Roadmap

- [x] JWT auth (register/login), listings, search, pagination
- [x] Reviews & ratings, install tracking, categories
- [x] Computed Trust Score + transparent breakdown + agent endpoint
- [x] One-click install (Claude, Cursor, VS Code)
- [x] Capability & risk warnings
- [x] Stripe Connect payouts (destination charges) + platform subscriptions
- [x] GitHub Pages demo + full documentation set
- [ ] Solana Pay (crypto-native payments) — stubbed
- [ ] GitHub OAuth login (Supabase) — optional/configurable
- [ ] Server versioning & changelogs
- [ ] CLI: `npx mcpx install <server-slug>`
- [ ] Collections / "MCP stacks" sharing

---

## Contributing

PRs welcome — please open an issue first for anything substantial, and keep
`lint` + `test` + `build` green. See **[CONTRIBUTING.md](CONTRIBUTING.md)** and
the **[Code of Conduct](CODE_OF_CONDUCT.md)**. Found a security issue? See
**[SECURITY.md](SECURITY.md)**.

---

## License

MIT © 2026 [TheoryofShadows](https://github.com/TheoryofShadows). See [LICENSE](LICENSE).

*Built for the MCP ecosystem. Star the repo if you find it useful!*
</content>
