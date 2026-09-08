# MCPX (Mcp) — NEXT

**What this is:** Marketplace for AI agent tools (MCP servers). Live at
www.mcpx.digital. Flagship #2. Timely — MCP is a hot standard right now.

**You are close. Finishing job, not a building job.**

Last reviewed: 2026-09-07. Repo is CLEAN: 1 branch (`main`), 0 open PRs,
0 open issues, 0 Dependabot alerts, 313 tests passing, lint clean, CI green,
production healthy. Tagged `v1.0.0`.

---

## ⬜ The ONE next action

Pick the top unchecked box. Do only that. Then check it and come back.

- [ ] **Finish Search Console (nearly done).** Guide: `docs/GOOGLE-SEARCH-CONSOLE.md`.
      ✅ mcpx.digital VERIFIED (TXT record added in Railway) + sitemap submitted.
      ✅ thebookandme.com was already verified.
      Remaining:
      1. Submit The Book's sitemap: `https://thebookandme.com/sitemap.xml`
         (2,724 URLs) in its already-verified property.
      2. **Railway has stopped deploying from `main`.** Two separate changes
         failed to reach production: `CANONICAL_HOST` (set in the dashboard) and
         a code change merged in PR #96 with green CI. Since #96 is pure code,
         this is NOT a variable-scope problem — Railway is not redeploying at
         all. The live site is healthy but running older code.
         Check: mcpx service → **Deployments** (any recent? any Failed?) and
         Settings → Source (GitHub still connected, branch still `main`).
         Fastest unblock: Deployments → newest → ⋮ → **Redeploy**, which picks up
         current code AND current variables at once.
         Not urgent: the <link rel="canonical"> tag is already live and tells
         Google which version to prefer on its own.
- [ ] **Announce it.** This is the highest-value action left and it is not a
      coding task. MCPX solves a real, current problem (discovering safe MCP
      servers). One post linking mcpx.digital. The launch copy is already
      written for you — see `docs/` (PH maker comment + X thread from PR #88).
- [ ] **Confirm the 3 MCP packages actually publish.** README says they were
      made "publish-ready (self-contained)". Next action: do the publish, or
      write down the one blocker stopping it.
- [ ] **Go live on Solana (crypto), OR decide to stay Stripe-only.**
      Stripe is 100% live and paying you 15%. Crypto is code-complete with a
      LIVE USD→SOL price feed but pointed at devnet. To flip it, follow
      `docs/GOING-LIVE-CRYPTO.md` (env + a real treasury wallet — steps only
      you can do). Not urgent; Stripe already earns.

---

## ✅ Done (2026-09-07)

- Live Stripe key removed from local `.env` — it made local dev spend real
  money. The key is parked as a comment in `.env`; production is unaffected
  (Railway holds its own env vars and is verified healthy).
- Added a boot warning + 2 tests for "LIVE key outside production" so the trap
  can't come back silently. **Shipped as PR #91, merged to `main`, deployed to
  Railway, production verified healthy.**
- Deleted 24 stale branches. Two abandoned Stripe Accounts v2 experiments were
  archived first as tags `archive/stripe-accounts-v2` and
  `archive/branch-cleanup-consolidate` — recoverable, not lost.
- Tagged `v1.0.0` (package.json said 1.0.0 but no tag ever existed).
- Cleared a stale eslint-disable; lint now fully clean.
- Found and fixed a real SEO bug while prepping Search Console: apex and www
  both returned 200 with the full site and there was NO canonical tag. Added
  the tag + an opt-in `CANONICAL_HOST` 301 (PR #92, merged & deployed; `/api`
  exempt so Stripe webhooks are safe). Wrote `docs/GOOGLE-SEARCH-CONSOLE.md`
  (PR #93). Tests now 319.

---

## 🧠 Notes to future-you

- **Local dev is test-mode only.** Put an `sk_test_` key in `.env`. If you ever
  paste a live key there again, the server now warns you at boot.
- Production Stripe is healthy: live mode, webhook secret set, prices pinned,
  correct return URL. Verified at `/api/payments/stripe/config`.
- Deploys: Railway builds from `main`. A fix is not live until it lands there.
- This project is mature. Building more won't help as much as shipping the
  publish + one announcement.
