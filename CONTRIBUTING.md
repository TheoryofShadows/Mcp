# Contributing to MCPX

Thanks for your interest in improving MCPX! This guide gets you from clone to PR.

For how the app is built, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
first — it'll save you time.

---

## Quick start

```bash
git clone https://github.com/TheoryofShadows/Mcp.git
cd Mcp
npm install
cp .env.example .env       # set JWT_SECRET if you'll exercise auth
npm run seed               # sample catalog into SQLite
npm run dev                # Vite (5173) + Express (3001)
```

Open **http://localhost:5173**. Demo login: `dev@mcpx.dev` / `demo1234`.

Requirements: **Node ≥ 20** (see `.node-version`).

---

## Before you open a PR

All three gates must be green — CI and reviewers will expect it:

```bash
npm run lint     # ESLint (flat config)
npm test         # Vitest + supertest
npm run build    # production build must succeed
```

If you touched API behavior, add or update a test in `tests/`. If you touched
the build/runtime in a way that affects deployment, update the relevant doc in
`docs/`.

---

## Branch & commit conventions

- **Branch** off `main` with a descriptive name, e.g. `fix/marketplace-empty-state`
  or `feat/server-versioning`.
- **Don't push to `main` directly** and don't open PRs to `main` without the
  maintainer's go-ahead for large changes — open an issue first to discuss
  anything substantial.
- **Commits** should be focused with a clear subject line (imperative mood:
  "Add…", "Fix…"). Explain the *why* in the body when it isn't obvious.

> **Deploy note:** the production site (www.mcpx.digital) deploys from `main` via
> Railway. A change is only live once it's merged to `main`. Keep that in mind
> when scoping a PR — bundle related work so a single merge ships a coherent
> unit.

---

## Code style

- Match the surrounding code — naming, comment density, and idioms. This
  codebase favors small, readable functions and comments that explain *why*, not
  *what*.
- Keep the **Trust Score engine** (`server/lib/trustScore.js`) pure and
  deterministic — no I/O, inject `now`. That's what keeps it testable.
- Preserve the frontend **resilience** choices (seed fallback, pinned build
  target, reduced-motion, ARIA roles) — see the "Frontend resilience" section in
  the architecture doc before removing any of them.
- Money is in **cents** throughout the server. Keep it that way.

---

## Good first contributions

- Improve docs (typos, clarity, missing examples — yes, these count).
- Add tests around existing routes.
- Accessibility refinements in the React pages.
- New seed servers in `server/seed.js` / `src/data/seed.js`.
- Items from the Roadmap in the [README](README.md).

---

## Reporting bugs & requesting features

- **Bugs / features:** open a [GitHub issue](https://github.com/TheoryofShadows/Mcp/issues)
  with steps to reproduce (for bugs) or a clear use case (for features).
- **Security vulnerabilities:** do **not** open a public issue — follow
  [SECURITY.md](SECURITY.md).

By contributing, you agree your work is licensed under the project's
[MIT License](LICENSE), and to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).
</content>
