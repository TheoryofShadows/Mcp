# Architecture

How MCPX is put together, for contributors and operators.

---

## Big picture

MCPX is a **single full-stack app**: a React SPA and an Express API that can be
served together from one Node process, backed by SQLite.

```
                         ┌─────────────────────────────────────┐
   Browser  ───────────▶ │  Express 5 (server/)                │
   (React SPA)           │   • serves built SPA (dist/)        │
        │                │   • /api/* JSON routes              │
        │   fetch /api   │   • JWT + Descope middleware        │
        └───────────────▶│   • better-sqlite3 ──▶ mcpx.db      │
                         └─────────────────────────────────────┘
                                          │
                          optional: Stripe · Supabase · Descope
```

Because one origin serves both the SPA and the API, the default production
deployment needs **no CORS configuration and no second service**. The frontend
also ships **bundled seed data** and degrades to it when the API is unreachable
— which is what makes a static-only deploy (e.g. GitHub Pages) work as a demo.

---

## Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| UI | **React 19** + **Vite 7** | SPA, code-split routes via `React.lazy` |
| Routing | `react-router-dom` 7 | `basename` follows Vite `base` (root on Railway, `/Mcp/` on Pages) |
| Server | **Express 5**, Node ≥ 20 | `server/app.js` builds the app; `server/index.js` boots it |
| Database | **SQLite** via `better-sqlite3` | Synchronous, fast, file-backed; schema in `server/db.js` |
| Auth (users) | **JWT** + `bcryptjs` | `server/middleware/auth.js` |
| Auth (admin) | **Descope** | `server/middleware/descopeAuth.js`, permission-gated |
| Payments | **Stripe Connect** | Destination charges + platform subscriptions |
| OAuth (optional) | **Supabase** | GitHub login; app runs fine without it |
| Tests | **Vitest** + `supertest` | `tests/`, node environment |
| Lint | **ESLint** flat config | `eslint.config.js` |

A Postgres/Supabase version of the schema (with RLS policies and triggers) lives
in [`schema.sql`](../schema.sql), kept aligned with the SQLite schema.

---

## Directory map

```
├── index.html                  # SPA entry; social/meta tags
├── vite.config.js              # base path, build target, dev proxy, test config
├── src/                        # React frontend
│   ├── main.jsx                # Root render; Router (basename), providers, ErrorBoundary
│   ├── App.jsx                 # Routes + layout (Navbar, footer, skip-link)
│   ├── api/client.js           # fetch wrapper: base URL, JWT header, 30s timeout, HTML-guard
│   ├── pages/                  # Home, Marketplace, ToolDetail, ServerDetail, Submit,
│   │                           #   Dashboard, Login, AuthCallback, Admin
│   ├── components/             # ToolCard, InstallButtons, TrustScore, VerifiedBadge,
│   │   ├── sections/           #   CapabilitiesWarning, ErrorBoundary, AuthModal, …
│   │   └── ui/                 # Badge, GlowOrb, …
│   ├── hooks/                  # useServers, useStats, useCategories, useTiers, useAuth
│   ├── context/                # AuthContext (JWT)
│   ├── data/                   # seed.js — bundled fallback catalog
│   └── styles/globals.css      # design tokens, reduced-motion, skeletons
├── server/                     # Express backend
│   ├── app.js                  # CORS, body parsing, middleware, route mounting, /api/health
│   ├── index.js                # HTTP boot + (in prod) static SPA serving
│   ├── db.js                   # SQLite connection + schema bootstrap
│   ├── seed.js                 # DB seeder (npm run seed)
│   ├── lib/trustScore.js       # pure, deterministic Trust Score engine
│   ├── middleware/             # auth.js (JWT), descopeAuth.js (admin)
│   └── routes/                 # auth, servers, categories, stats, tiers, payments, admin
├── schema.sql                  # Supabase/Postgres equivalent (RLS + triggers)
├── tests/                      # Vitest + supertest suites
├── railway.toml                # Build/start/healthcheck config for Railway
└── .github/workflows/          # GitHub Pages demo deploy
```

---

## Request lifecycle (API)

1. `server/index.js` boots the app from `createApp()` and, in production, also
   serves `dist/` (the built SPA) so deep links fall through to `index.html`.
2. `server/app.js` wires middleware **in order**:
   - CORS (allow-list from `CORS_ORIGINS`, tolerant of pasted whitespace/brackets),
   - the Stripe webhook **raw-body** handler *before* `express.json()` (signature verification needs the unparsed body),
   - `express.json({ limit: "1mb" })`,
   - `authenticateToken` (decodes a JWT if present → `req.user`),
   - `authenticateDescopeToken` (decodes a Descope session → `req.descopeUser`).
3. Route handlers run. `requireAuth` / `requireAdmin` guard protected routes.
4. Queries hit SQLite synchronously through `better-sqlite3` prepared
   statements.

---

## Data model

Six tables (SQLite mirrors the Postgres schema in `schema.sql`):

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `categories` | Catalog taxonomy | `id`, `label`, `icon`, `sort_order` |
| `users` | Accounts & publishers | `username`, `tier`, `stripe_customer_id`, `stripe_account_id`, `stripe_onboarding_done` |
| `servers` | The MCP tools | `slug`, `author_id`, `category_id`, `price_type`, `price_amount` (cents), `verified`, `trending`, `installs`, `rating`, `tags`, `status` |
| `reviews` | Ratings + comments | `server_id`, `user_id`, `rating` (1–5), unique per (server,user) |
| `installs` | Install events | `server_id`, `user_id?` |
| `subscriptions` | Publisher plans | `tier`, `status`, `stripe_subscription_id`, `expires_at` |

Money is stored in **cents** everywhere (`price_amount`, `monthly_revenue`).
Server `rating`/`rating_count` are denormalized and recomputed on each review.

---

## The Trust Score engine

`server/lib/trustScore.js` is intentionally **pure and deterministic** — no I/O,
`now` is injected — which makes it trivially unit-testable and transparent. It
turns stored signals into a 0–100 score with an itemized breakdown. The same
function powers both the `trust` field on server objects and the dedicated
`/servers/:slug/trust` endpoint. Full model in [TRUST.md](TRUST.md).

---

## Frontend resilience

A few deliberate hardening choices worth knowing before you change them:

- **`import.meta.env.BASE_URL` basename** keeps routing correct under both `/`
  (Railway) and `/Mcp/` (Pages). Don't hard-code paths.
- **Seed fallback** in `Marketplace`/`ToolDetail` (`loadTools`/`loadTool`) means
  the catalog never renders blank if the API is down.
- **Build target** is pinned (`es2019, safari13, …`) in `vite.config.js` so old
  iOS Safari can parse the bundle — removing it risks white-screening older
  devices.
- **Descope provider is only mounted when configured** (`main.jsx`); mounting it
  with an empty project id previously white-screened iOS Safari.
- **Reduced-motion** is globally honored in `globals.css`; loading/error states
  expose `role="status"`/`role="alert"` and decorative elements are
  `aria-hidden`.

---

## Tests & quality gates

```bash
npm run lint      # ESLint (flat config)
npm test          # Vitest + supertest (100 tests across 6 files)
npm run build     # Vite production build
```

All three should pass before any commit. See [CONTRIBUTING](../CONTRIBUTING.md).
</content>
