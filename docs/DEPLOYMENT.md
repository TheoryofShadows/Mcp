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
| `BACKUP_S3_BUCKET` | backups | Enables off-box uploads (+ in-process daily scheduler). Aliases: `BUCKET`, `AWS_S3_BUCKET_NAME` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | backups | S3 credentials (Railway: `${{mcpx-backups.ACCESS_KEY_ID}}` / `SECRET_ACCESS_KEY`) |
| `AWS_ENDPOINT_URL` / `AWS_REGION` | backups | S3 endpoint + region (Railway: `${{mcpx-backups.ENDPOINT}}` / `REGION`) |
| `BACKUP_DIR` | backups | Local snapshot dir (default `<db dir>/backups`; prod: `/data/backups`) |
| `BACKUP_ENABLED` | backups | `1` forces scheduler on (local-only); `0` forces off |
| `BACKUP_KEEP_LOCAL` | backups | Local retention count (default `3`) |
| `SOLANA_TREASURY_WALLET` | Solana Pay | Platform fee recipient (base58). Enables Phantom checkout |
| `SOLANA_CLUSTER` | Solana Pay | `devnet` (default) \| `mainnet-beta` \| `testnet` |
| `SOLANA_RPC_URL` | Solana Pay | Custom RPC; otherwise public cluster URL |
| `SOLANA_USD_PER_SOL` | Solana Pay | FX stub for USD→lamports (default `150`) |

> The app runs with **none** of the optional integrations — Stripe, Supabase,
> Descope, and S3 backups each light up only when their keys are present.

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

## Going live with Stripe

Money only moves for real when **every** item below is true. Nothing in the code
can switch this on by itself — the live key and the Connect activation come from
your Stripe Dashboard.

### Verify from outside

```bash
curl -s https://www.mcpx.digital/api/payments/stripe/config
```

`mode` is derived from the secret key's prefix and is the answer to "are we live?":

| `mode` | Meaning |
|--------|---------|
| `live` | `sk_live_`/`rk_live_` key — real charges, real payouts |
| `test` | `sk_test_`/`rk_test_` key — sandbox only, **no real money moves** |
| `unset` | `STRIPE_SECRET_KEY` missing — every Stripe endpoint returns `501` |

A `label` of `Live (mainnet money)` means the key is live *and*
`STRIPE_WEBHOOK_SECRET` is set. The endpoint never returns key material.

### Checklist

1. **Live secret key** — `STRIPE_SECRET_KEY=sk_live_…` in Railway. A restricted
   key (`rk_live_…`) also works, but it must carry write access to Checkout
   Sessions, Products, Prices, Customers, Subscriptions, **and Connect accounts +
   account links** — Connect is easy to leave unchecked, and without it publisher
   onboarding fails at `POST /v1/accounts`.
2. **Live webhook endpoint** — Stripe Dashboard → Developers → Webhooks → add
   `https://www.mcpx.digital/api/payments/stripe/webhook` **in live mode** (test
   and live endpoints are separate), then put its `whsec_…` into
   `STRIPE_WEBHOOK_SECRET`. Send these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `account.updated` — **check "listen to Connect events"**, or publisher
     onboarding never gets marked complete from the webhook.
3. **Connect activated in live mode** — Dashboard → Connect → complete the
   platform profile. Until this is done, `stripe.accounts.create` fails and no
   publisher can onboard.
4. **Your own payout details** — Dashboard → Settings → Bank accounts and
   scheduling. Platform subscription revenue and the 15% application fee land in
   *your* Stripe balance and pay out on that schedule.
5. **`APP_URL=https://www.mcpx.digital`** — Checkout success/cancel and Connect
   return links are built from it. Left at the localhost default, buyers get
   bounced to a dead URL after paying.

### Who gets paid what

- **Platform subscriptions** (Pro $29, Enterprise $499) — Checkout in
  `subscription` mode, straight to the platform balance.
- **Paid tool sales** — destination charges: the publisher's connected account
  receives the charge, `application_fee_amount` (15%) is retained by the platform.
  Publishers keep 85%.

A buyer is never charged twice for the same tool: a recorded sale *is* ownership,
so both checkout rails hand back existing access rather than opening a second
payment. This matters most on Solana, where an on-chain payment has no chargeback
to undo it, and on Stripe, where refunding a destination charge claws the money
back out of the publisher's balance.

A paid listing is only offered for sale once its publisher's connected account is
genuinely payable — Stripe reports `details_submitted`, `charges_enabled`,
`payouts_enabled`, **and** an `active` transfers capability. Anything short of
that shows as "Publisher payouts not enabled" rather than taking money that
couldn't be paid out. `GET /api/payments/stripe/connect` re-syncs a publisher's
status from Stripe on every visit, so a missed `account.updated` webhook is
self-healing in both directions.

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

SQLite lives in the mounted volume (`/data/mcpx.db`). Volume snapshots alone are
**not** disaster recovery — ship copies off-box to a Railway Storage Bucket (or
any S3-compatible store).

### Manual / CLI

```bash
BACKUP_DIR=/data/backups npm run backup:db    # → /data/backups/mcpx-<timestamp>.db
# If BACKUP_S3_BUCKET (+ AWS_* creds) are set, also uploads to:
#   s3://$BACKUP_S3_BUCKET/mcpx/YYYY/mm/dd/mcpx-<timestamp>.db
```

Local retention keeps the newest **3** `mcpx-*.db` files (`BACKUP_KEEP_LOCAL`).

### In-process daily scheduler

On boot the API starts a lightweight checker (no `node-cron`): every ~1h it looks
at `BACKUP_DIR` mtimes and runs a backup if the newest file is missing or older
than ~23h. **Quiet in local dev** unless you set `BACKUP_S3_BUCKET` (or Railway
`BUCKET` / `AWS_S3_BUCKET_NAME`) **or** `BACKUP_ENABLED=1`.

### Railway Buckets wiring

1. Create a bucket (e.g. display name `mcpx-backups`) in the same project.
2. On the **Mcp** service, add variable references (AWS SDK names):

```text
BACKUP_S3_BUCKET=${{mcpx-backups.BUCKET}}
AWS_ACCESS_KEY_ID=${{mcpx-backups.ACCESS_KEY_ID}}
AWS_SECRET_ACCESS_KEY=${{mcpx-backups.SECRET_ACCESS_KEY}}
AWS_ENDPOINT_URL=${{mcpx-backups.ENDPOINT}}
AWS_REGION=${{mcpx-backups.REGION}}
BACKUP_DIR=/data/backups
```

(Also accepted without remapping: bare `BUCKET` / `ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` /
`ENDPOINT` / `REGION` from the bucket.)

3. Redeploy. Check logs for `[backup] scheduler enabled` / `[backup] completed`.

**Restore:** stop the service, copy a chosen `mcpx-*.db` (from local retention or
downloaded from the bucket) to the path in `DB_PATH`, redeploy. Validate backups
periodically in a scratch service.

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

## Solana Pay (optional)

Set these Railway / host env vars to enable Phantom checkout for paid tools:

| Variable | Required | Notes |
|----------|----------|-------|
| `SOLANA_TREASURY_WALLET` | ✅ | Platform fee recipient (base58). Enables the feature. |
| `SOLANA_CLUSTER` | — | `devnet` (default) \| `mainnet-beta` \| `testnet` |
| `SOLANA_RPC_URL` | — | Custom RPC; otherwise public cluster URL |
| `SOLANA_USD_PER_SOL` | — | FX stub for USD→lamports (default `150`) |

Publishers must also save a Solana wallet under Dashboard → Payouts.
