# The GitHub Pages Demo

MCPX publishes a **browsable demo** to GitHub Pages at:

**[https://theoryofshadows.github.io/Mcp/](https://theoryofshadows.github.io/Mcp/)**

This page explains what the demo is, how it's built, and the one setting you
have to flip to turn it on.

---

## What the demo is (and isn't)

GitHub Pages serves **static files only** — it cannot run the Express API or the
SQLite database (those live on Railway). The MCPX frontend is built to handle
exactly this: when the API isn't reachable, it **degrades gracefully to bundled
seed data**. So the demo:

- ✅ Shows the real UI — homepage, marketplace, search/filter/sort, tool detail
  pages, trust badges — on a realistic sample catalog.
- ✅ Is perfect for a quick look, screenshots, and sharing a link.
- ❌ Has no live accounts, real publishing, reviews, or payments — those need
  the backend. The demo links out to **[www.mcpx.digital](https://www.mcpx.digital)**
  for the real thing.

---

## How it's published

The workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)
runs on every push to `main`:

1. **Build** the SPA with `PAGES_BASE=/Mcp/` so every asset resolves under the
   project-page sub-path (`/Mcp/...`) instead of the site root.
2. **Add a SPA fallback** — copies `dist/index.html` to `dist/404.html` so deep
   links like `/Mcp/marketplace` (which GitHub would otherwise 404) load the app
   and let client-side routing take over. A `.nojekyll` file is added so GitHub
   serves the Vite output verbatim.
3. **Deploy** the artifact to the `github-pages` environment.

### Why this doesn't affect the Railway production build

The base path is **build-time configurable** in `vite.config.js`:

```js
base: process.env.PAGES_BASE || '/'
```

- **Railway** builds with no `PAGES_BASE` → base `/` → assets at the site root,
  exactly as before.
- **Pages** builds with `PAGES_BASE=/Mcp/` → assets under `/Mcp/`.

The router follows automatically because `main.jsx` sets
`<BrowserRouter basename={import.meta.env.BASE_URL}>`, which is `/` on Railway
and `/Mcp/` on Pages. **One codebase, two correct deployments.**

---

## One-time setup (repo admin)

The workflow can't publish until Pages is enabled with the GitHub Actions
source:

> **Settings → Pages → Build and deployment → Source → "GitHub Actions"**

After that, the next push to `main` (or a manual *Actions → Deploy demo to
GitHub Pages → Run workflow*) publishes the site. The live URL appears in the
workflow's `deploy` job summary.

---

## Optional: point the demo at live data

By default the demo uses seed data. If you'd rather it read the **live API**,
build it with `VITE_API_BASE_URL=https://www.mcpx.digital` — but then add the
Pages origin (`https://theoryofshadows.github.io`) to the API's `CORS_ORIGINS`
on Railway, or the browser will block the cross-origin calls. The seed-data
default avoids that coupling and keeps the demo fully self-contained.
</content>
