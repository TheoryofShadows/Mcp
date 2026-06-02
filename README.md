# MCPX — The Marketplace for AI Agent Tools (MCP Servers)

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/TheoryofShadows/Mcp/pulls)

> **npm + Product Hunt for Model Context Protocol servers** — discover, install, and publish MCP servers that supercharge Claude, Cursor, and VS Code.

---

## 🚀 Deploy your own (one click)

MCPX is a single full-stack service (React SPA + Express API + SQLite), so it runs anywhere Node runs. The fastest path to a live URL is Railway:

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template?code=https://github.com/TheoryofShadows/Mcp)

**After it deploys, set two things in the Railway dashboard:**

1. **Add a volume** so your data survives redeploys: *Service → Volumes → Add Volume*, mount path `/data`.
2. **Set environment variables** (see [`.env.example`](.env.example) for the full list):
   - `DB_PATH=/data/mcpx.db`
   - `JWT_SECRET=` *(any long random string)*
   - `NODE_ENV=production`

Then open the generated `*.up.railway.app` URL — that's your live marketplace. Seed demo data once with `npm run seed` (Railway shell) if you want the catalog pre-filled.

> Prefer split hosting (Vercel frontend + separate API)? The repo also ships `vercel.json`; point `VITE_API_URL` at your API host. Railway is recommended because the Express server already serves the built frontend on one port.

---

## What is MCPX?

[Model Context Protocol (MCP)](https://modelcontextprotocol.io) is the open standard that lets AI agents like Claude connect to real tools — databases, APIs, file systems, cloud services, and more. **MCPX is the central registry** where developers publish MCP servers and AI power-users find the best ones.

```
Claude  ──▶  MCPX  ──▶  GitHub MCP   ──▶  opens PRs for you
              │     ──▶  Postgres MCP  ──▶  queries your DB
              │     ──▶  Playwright    ──▶  automates browsers
              └ ...500+ more tools
```

---

## Screenshots

> **Add real screenshots before launch:**
> 1. Run `npm run dev`, go to `http://localhost:5173`
> 2. Screenshot the homepage hero + featured grid → `docs/screenshots/home.png`
> 3. Screenshot a server detail page with Install Buttons → `docs/screenshots/detail.png`
> 4. Screenshot the marketplace search → `docs/screenshots/marketplace.png`

| Homepage | Server Detail | Marketplace |
|----------|--------------|-------------|
| _(add screenshot)_ | _(add screenshot)_ | _(add screenshot)_ |

---

## One-Click Install Examples

Every server on MCPX shows ready-to-run install commands for all major AI tools:

### Add to Claude Desktop

```bash
# GitHub MCP (official)
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Playwright browser automation
claude mcp add playwright -- npx -y @playwright/mcp

# PostgreSQL database access
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://localhost/mydb
```

### Add to Cursor

Open **Cursor → Settings → MCP** and paste:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token>" }
    }
  }
}
```

### Add to VS Code

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp"]
    }
  }
}
```

---

## Featured Servers (Seeded)

| Server | Category | Installs | Trust |
|--------|----------|----------|-------|
| GitHub MCP | Developer | 89K+ | Official |
| Playwright MCP | Developer | 67K+ | Official |
| PostgreSQL MCP | Data & APIs | 48K+ | Official |
| GitHub Actions+ | Developer | 52K+ | Verified |
| AWS Commander | Infrastructure | 38K+ | Verified |
| Puppeteer MCP | Developer | 41K+ | Official |
| SSH Commander | Infrastructure | 22K+ | Community |
| Chess Analysis MCP | Creative | 8K+ | Community |

---

## Features

- **Discover** — Search and filter MCP servers by category, rating, and verification status
- **One-Click Install** — Copy exact `claude mcp add`, Cursor, and VS Code install commands
- **Verified Badges** — Trust indicators: Official, Verified publisher, Community
- **Safety Warnings** — Capability and permission levels shown on every server detail page
- **Live Stats** — Install counts, ratings, weekly growth, and creator revenue
- **Publish** — Submit your own MCP server to the marketplace
- **Monetize** — Stripe + Solana Pay support for paid servers (coming soon)
- **Reviews** — Authenticated user reviews and star ratings
- **Dark Theme** — Polished dark-first UI with custom design system

---

## Quick Start — Local Dev

```bash
# 1. Clone
git clone https://github.com/TheoryofShadows/Mcp.git
cd Mcp

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET for production

# 4. Seed the database with sample servers
npm run seed

# 5. Start dev server (frontend + backend)
npm run dev
```

Open **http://localhost:5173** — the app is live.

**Demo account:** `dev@mcpx.dev` / `demo1234`

---

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TheoryofShadows/Mcp)

> **Note:** Vercel serves the static frontend. For full API functionality (auth, reviews, install tracking) you need a backend deployment.

### Deployment Options

**Option A — Vercel (frontend) + Railway/Render (backend)**
1. Deploy the Express API to [Railway](https://railway.app) or [Render](https://render.com)
2. Set `VITE_API_BASE_URL` in Vercel env vars to your Railway URL
3. Deploy frontend to Vercel — `npm run build` produces `dist/`

**Option B — Single VPS (full stack)**
```bash
npm run build
NODE_ENV=production npm start
```

The Express server serves `dist/` as static files in production.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend (Vite) + backend (Express) concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express API only |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |
| `npm run seed` | Reset and re-seed the SQLite database |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port |
| `JWT_SECRET` | dev fallback | JWT signing secret — **always set in production** |
| `CORS_ORIGINS` | `localhost` | Comma-separated allowed origins |
| `VITE_API_BASE_URL` | _(auto)_ | Override API base URL for Vercel deployments |
| `VITE_SUPABASE_URL` | _(optional)_ | Supabase project URL (optional — app works without it) |
| `VITE_SUPABASE_ANON_KEY` | _(optional)_ | Supabase anon key |

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Sign in, get JWT |
| `GET` | `/api/auth/me` | Yes | Current user |
| `GET` | `/api/servers` | No | List/search/filter servers |
| `POST` | `/api/servers` | Yes | Publish a server |
| `GET` | `/api/servers/:slug` | No | Server detail + reviews |
| `POST` | `/api/servers/:slug/reviews` | Yes | Submit a review |
| `POST` | `/api/servers/:slug/install` | No | Record install |
| `GET` | `/api/categories` | No | List categories |
| `GET` | `/api/stats` | No | Platform stats |
| `GET` | `/api/health` | No | Health check |

---

## Project Structure

```
├── src/                         # React 19 frontend
│   ├── api/client.js            # API client (fetch wrapper)
│   ├── components/
│   │   ├── InstallButtons.jsx   # One-click install (Claude/Cursor/VS Code)
│   │   ├── VerifiedBadge.jsx    # Trust badge component
│   │   ├── InstallCommand.jsx   # Copy-to-clipboard command
│   │   ├── ToolCard.jsx         # Server card for grids
│   │   └── ...
│   ├── context/AuthContext.jsx  # JWT auth context
│   ├── data/seed.js             # Frontend seed data (fallback)
│   ├── pages/
│   │   ├── Home.jsx             # Landing + featured grid
│   │   ├── Marketplace.jsx      # Search + filter
│   │   ├── ServerDetail.jsx     # Detail + install + reviews
│   │   ├── Dashboard.jsx        # Creator dashboard
│   │   └── Submit.jsx           # Publish a server
│   └── styles/globals.css       # Design tokens
├── server/                      # Express 5 backend
│   ├── db.js                    # SQLite schema (better-sqlite3)
│   ├── seed.js                  # Database seeder
│   ├── routes/                  # API route handlers
│   └── middleware/auth.js       # JWT middleware
├── vercel.json                  # Vercel deployment config
└── vite.config.js
```

---

## Roadmap

- [x] Auth (JWT register/login)
- [x] Server listing, search, pagination
- [x] Reviews & ratings
- [x] Install tracking
- [x] Categories & filtering
- [x] Verified badges + trust levels
- [x] One-click install commands (Claude, Cursor, VS Code)
- [x] Rich seed data (real MCP servers)
- [x] Capability & risk warnings on server detail
- [ ] Stripe Connect payouts for paid servers
- [ ] Solana Pay (crypto-native payments)
- [ ] GitHub OAuth login
- [ ] Server versioning & changelogs
- [ ] API usage analytics dashboard
- [ ] Featured / sponsored listings
- [ ] CLI: `npx mcpx install <server-slug>`
- [ ] Collections / "MCP stacks" sharing

---

## Contributing

PRs welcome! Please open an issue first for major changes.

```bash
git clone https://github.com/TheoryofShadows/Mcp.git
cd Mcp
npm install
npm run dev
```

---

## License

MIT © 2026 [TheoryofShadows](https://github.com/TheoryofShadows)

---

*Built for the MCP ecosystem. Star this repo if you find it useful!*
