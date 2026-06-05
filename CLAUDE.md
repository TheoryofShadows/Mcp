# Project Memory — MCPX

This file is read automatically at the start of every session. Keep the
hard-won facts here so we never have to rediscover them.

## What this is
- A web app served at **www.mcpx.digital**.
- Stack: Node app, `npm run build` → `npm start`. SQLite database.
- Health check: `GET /api/health`.

## Deployment — IMPORTANT
- **Hosted on Railway. Railway deploys from the `main` branch.**
- Confirmed empirically: the live bundle's build time matched the head of
  `main`, and commits pushed only to feature branches never triggered a
  redeploy.
- **A fix is NOT live until it is merged into `main`.** Nothing in the
  Railway dashboard alone makes feature-branch code go live — the code has
  to land on `main`, then Railway rebuilds automatically.
- `railway.toml` holds build/start/healthcheck config but does NOT pin a
  branch — the branch is set in the Railway dashboard (default `main`).

## Database / persistence
- SQLite. Without a mounted volume, the DB lives in the ephemeral container
  and is wiped on every deploy.
- For persistence: mount a Railway volume at `/data` and set
  `DB_PATH=/data/mcpx.db`. App auto-seeds on first boot (no shell needed).

## Environment variables
- `CORS_ORIGINS` — parsing was hardened to tolerate pasted whitespace and
  angle brackets, since values are often copy-pasted from a browser.

## Known gotchas (fixed)
- **iOS Safari blank screen** — fixed; app was hardened for all visitors.
- The user (heatherjones530@gmail.com) is non-technical about deploy
  mechanics — explain *why*, and prefer one PR to `main` over multiple
  merges.

## Working agreement
- Develop on feature branches; **do not push to `main` or open PRs without
  explicit permission.**
- When the user wants a fix live, the goal is: merge to `main` → Railway
  redeploys. Bundle related work into a single PR when possible.
