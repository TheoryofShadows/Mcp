# MCPX Documentation

Welcome to the MCPX docs. MCPX is **the marketplace for Model Context Protocol
(MCP) servers** — discover, install, publish, and monetize the tools that give
AI agents like Claude, Cursor, and VS Code real-world capabilities.

- 🌐 **Live app:** [www.mcpx.digital](https://www.mcpx.digital)
- 🧪 **Browsable demo (GitHub Pages):** [theoryofshadows.github.io/Mcp](https://theoryofshadows.github.io/Mcp/) — runs on bundled sample data
- 💻 **Source:** [github.com/TheoryofShadows/Mcp](https://github.com/TheoryofShadows/Mcp)

---

## Find your path

Pick the guide that matches what you're here to do.

| You are… | Start here | What it covers |
|----------|-----------|----------------|
| 🧑‍💻 **A user** discovering & installing MCP tools | [Users Guide](USERS.md) | Browsing, install commands for Claude/Cursor/VS Code, trust badges |
| 🏪 **A publisher / seller** listing a tool | [Publishing & Monetization](PUBLISHING.md) | Submitting, pricing, Stripe payouts, the 15% fee, getting verified |
| 🔌 **A developer / integrator** calling the API | [API Reference](API.md) | Every endpoint, auth, parameters, examples, errors |
| 🛠️ **A contributor** hacking on MCPX | [Architecture](ARCHITECTURE.md) + [Contributing](../CONTRIBUTING.md) | Stack, data model, request flow, dev setup, tests |
| 🚀 **An operator** self-hosting | [Deployment](DEPLOYMENT.md) | Railway single-service, env vars, DB persistence, split deploys |
| 🔐 **Security-minded** | [Trust & Security](TRUST.md) + [Security Policy](../SECURITY.md) | The computed Trust Score, risk model, reporting issues |
| ❓ **Just have a question** | [FAQ](FAQ.md) | Quick answers to the common ones |

---

## The 60-second overview

[MCP](https://modelcontextprotocol.io) is the open standard that lets AI agents
connect to real tools — databases, APIs, file systems, browsers, cloud
services. There are thousands of MCP servers and no single trustworthy place to
find them. **MCPX is that place.**

```
 Claude / Cursor / VS Code
          │
          ▼
        MCPX  ──▶  GitHub MCP    ──▶  opens PRs for you
          │   ──▶  Postgres MCP   ──▶  queries your database
          │   ──▶  Playwright MCP ──▶  drives a browser
          └ …and a growing catalog more
```

What makes MCPX different from a flat list:

- **A computed, transparent [Trust Score](TRUST.md)** (0–100) on every server —
  derived from real signals (source provenance, license, adoption, reviews,
  maturity, sensitive-capability risk), not a manually-toggled badge.
- **One-click install** commands for Claude Desktop, Cursor, and VS Code.
- **Built-in monetization** — publishers can charge for tools and get paid via
  Stripe Connect; the platform takes 15%, publishers keep 85%.

---

## Tech at a glance

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 7 (SPA) |
| Backend | Express 5 (Node ≥ 20) |
| Database | SQLite (`better-sqlite3`); Supabase/Postgres schema also provided |
| Auth | JWT (email/password); optional GitHub OAuth (Supabase); admin via Descope |
| Payments | Stripe Connect (destination charges + platform subscriptions) |
| Hosting | Single Railway service (recommended) |

Full details in [Architecture](ARCHITECTURE.md).

---

## Document map

- [USERS.md](USERS.md) — discovering and installing tools
- [PUBLISHING.md](PUBLISHING.md) — listing, pricing, and getting paid
- [API.md](API.md) — complete REST API reference
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the app is built
- [DEPLOYMENT.md](DEPLOYMENT.md) — running your own instance
- [TRUST.md](TRUST.md) — the Trust Score and security model
- [FAQ.md](FAQ.md) — frequently asked questions
- [LAUNCH.md](LAUNCH.md) — Product Hunt / HN / social paste kit + directory checklist
- [GITHUB_PAGES.md](GITHUB_PAGES.md) — about the demo site & how it's published
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — contributor workflow
- [../SECURITY.md](../SECURITY.md) — vulnerability reporting
- [../CHANGELOG.md](../CHANGELOG.md) — notable changes
</content>
