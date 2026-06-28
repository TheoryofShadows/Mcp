# Deployment & Self-Hosting

MCPX is a full-stack app (React SPA + Express API + SQLite). Express can serve
the built SPA itself, so the **recommended deployment is a single service** —
one origin for the frontend, API, and database. No second platform, no split
origins, no CORS to configure.

- [Recommended: single Railway service](#recommended-single-railway-service)
- [Environment variables](#environment-variables)
- [Database persistence](#database-persistence)
- [Advanced: split frontend + API](#advanced-split-frontend--api)
- [GitHub Pages demo](#github-pages-demo)
- [Local development](#local-development)

---

## Recommended: single Railway service

The live site runs exactly this way. **Railway deploys from the `main` branch**
(set in the Railway dashboard, not pinned in `railway.toml`) — a change is not
live until it lands on `main`, after which Railway rebuilds automatically.

1. **Create the service** from this repo. Railway uses
   [`railway.toml`](../railway.toml): build `npm run build`, start `npm start`,
   healthcheck `GET /api/health`.
2. **Add a volume** so the database survives redeploys:
   *Service → Volumes → Add Volume → Mount Path `/data`*.
3. **Set environment variables** (see table below) — at minimum:
   - `NODE_ENV=production`
   - `DB_PATH=/data/mcpx.db`
   - `JWT_SECRET=` *(long random string — `openssl rand -hex 32`)*
   - Leave **`VITE_API_BASE_URL` unset** (SPA calls the same origin via `/api`).
   - Leave **`CORS_ORIGINS` unset** (not needed on a single origin).
4. **Deploy.** Express serves `dist/` **and** `/api/*` on one port.
5. *(Optional)* **Custom domain:** *Settings → Networking → Custom Domain*; add
   the `www.` subdomain. *(Optional)* **Seed demo data:** `npm run seed` in the
   Railway shell — though the app also auto-seeds on first boot.

**Verify:**

```bash
curl https://YOUR-APP.up.railway.app/api/health   # → {"status":"ok",...} (JSON, not HTML)
```

If `/api/health` returns HTML, the API isn't running and requests are falling
through to the SPA — check the start command and logs.

---

## Environment variables

See [`.env.example`](../.env.example) for the annotated source of truth. Summary:

| Variable | Required? | Purpose |
|----------|-----------|---------|
| `PORT` | no (default 3001) | API/server port |
| `NODE_ENV` | prod | `production` enables static SPA serving |
| `JWT_SECRET` | **prod: yes** | Signs user JWTs — set a strong random value |
| `DB_PATH` | prod: recommended | SQLite file path; set to `/data/mcpx.db` with a volume |
| `CORS_ORIGINS` | split deploy only | Comma-separated allowed origins; tolerant of pasted whitespace/`<>` |
| `VITE_API_BASE_URL` | split deploy only | API origin for the frontend (host only, no `/api`) |
| `STRIPE_SECRET_KEY` | payments | Enables all Stripe endpoints (else they return `501`) |
| `STRIPE_WEBHOOK_SECRET` | payments | Verifies incoming Stripe webhooks |
| `APP_URL` | payments | Base URL for Stripe success/cancel/return links |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE` | optional | Pin plan price IDs (auto-created otherwise) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | GitHub login | Enable Supabase OAuth (optional) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-side Supabase (never expose service role to the browser) |
| `VITE_DESCOPE_PROJECT_ID` / `DESCOPE_PROJECT_ID` | admin panel | Enable Descope admin auth |
| `VITE_DESCOPE_ADMIN_PERMISSION` / `DESCOPE_ADMIN_PERMISSION` | admin panel | Permission id required for admin routes |

> The app runs with **none** of the optional integrations — Stripe, Supabase,
> and Descope each light up only when their keys are present.

---

## Database persistence

MCPX uses SQLite. **Without a mounted volume the database lives in the ephemeral
container filesystem and is wiped on every deploy.** For durable data:

1. Mount a Railway volume at `/data`.
2. Set `DB_PATH=/data/mcpx.db`.

The app bootstraps its schema and **auto-seeds on first boot** — no shell access
required. (Locally, the default is `server/mcpx.db`.)

For a Postgres/Supabase backend instead, [`schema.sql`](../schema.sql) is the
aligned schema with row-level-security policies and triggers.

---

## Advanced: split frontend + API

Only worth it if you specifically want the SPA on a separate static/CDN host
from the API. The single-service setup above is simpler and is what production
uses — reach for this only if you have a concrete reason.

1. Deploy the **API** on a Node host (Railway, Render, Fly, or a VPS); note its
   URL.
2. On the **API host**, set `CORS_ORIGINS` to your **exact** frontend origin (no
   trailing slash).
3. On the **static host**, set `VITE_API_BASE_URL=https://your-api-host` (host
   only, no `/api`) and rebuild (env vars only apply to a fresh build).

> ⚠️ A static/serverless host **alone** can't run this app — it won't keep the
> persistent Express server or the SQLite file alive, so every `/api/*` call
> would return the SPA's HTML instead of data. The API always needs a real Node
> host.

---

## GitHub Pages demo

GitHub Pages is **static only** — it can't run the API or SQLite. But the SPA
degrades to bundled seed data, so it makes a great browsable demo. The workflow
[`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
builds with `PAGES_BASE=/Mcp/`, adds an SPA `404.html` fallback, and publishes.

**One-time setup (repo admin):** *Settings → Pages → Build and deployment →
Source = "GitHub Actions".* After that, every push to `main` redeploys the demo.
Full details in [GITHUB_PAGES.md](GITHUB_PAGES.md).

---

## Observability

- **Structured logs:** the server logs JSON via `pino` (request logs via `pino-http`).
  Set `LOG_LEVEL` (`info` default; `debug`/`warn`/`error`). The `/api/health` probe
  is excluded from request logs.
- **Error tracking (optional):** set `SENTRY_DSN` to send unhandled errors to Sentry.
  Without it, Sentry is a no-op. Tune sampling with `SENTRY_TRACES_SAMPLE_RATE`.
- **Health check is DB-aware:** `GET /api/health` runs a trivial query and returns
  **503** if the database is unreachable, so Railway restarts a half-dead instance
  instead of routing traffic to it.

## Database backups

SQLite lives in the mounted volume (`/data/mcpx.db`). Take consistent, online
snapshots with the built-in script (uses better-sqlite3's `.backup()` — safe while
the app is running):

```bash
BACKUP_DIR=/data/backups npm run backup:db    # → /data/backups/mcpx-<timestamp>.db
```

- **Schedule it** as a Railway cron service (e.g. daily) and **ship the output
  off-box** (object storage) — a volume snapshot in the same project is not a
  disaster-recovery backup.
- **Restore:** stop the service, copy a chosen `mcpx-*.db` to the path in `DB_PATH`,
  redeploy. (Validate a backup periodically by restoring it into a scratch service.)

## Source scanning & sandboxing

`/api/scan`, publish-time auto-scans, and repo ownership verification all
**clone arbitrary public repositories** (`server/lib/repoScan.js`). The clone is
already constrained — shallow `--depth 1`, 20s timeout, `GIT_TERMINAL_PROMPT=0`,
output `maxBuffer`, skipped `node_modules`/build dirs, per-file size and total
file caps — and scoring is pure regex over text (no code is executed). But a
`git clone` still runs a subprocess on the host.

For untrusted, internet-facing deployments, run the scanning workload with extra
isolation:

- Prefer a **separate worker/service** (or container) for scans, with a
  read-only root filesystem, a non-root user, and CPU/memory limits.
- On Railway, this can be a second service; elsewhere, a constrained container
  or a sandbox such as gVisor/seccomp.
- Kill switch: set **`MCPX_DISABLE_AUTO_SCAN=1`** to turn off publish/update
  auto-scans (the explicit `/api/scan` endpoint and verification still work).

Full container sandboxing is an operational task, not an app setting — treat the
above as the recommended hardening before exposing scanning at scale.

---

## Local development

```bash
git clone https://github.com/TheoryofShadows/Mcp.git
cd Mcp
npm install
cp .env.example .env          # set JWT_SECRET for anything non-trivial
npm run seed                  # sample catalog
npm run dev                   # Vite (5173) + Express (3001) together
```

Open **http://localhost:5173**. Demo account: `dev@mcpx.dev` / `demo1234`.

Production build on any Node host:

```bash
npm run build
NODE_ENV=production npm start
```
</content>
