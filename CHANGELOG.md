# Changelog

All notable changes to MCPX are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). MCPX deploys
continuously from `main`, so "released" means "merged to `main` and live".

## [Unreleased]

### Added
- **GitHub Pages demo** — a static, seed-data build of the marketplace published
  via `.github/workflows/deploy-pages.yml`, with a build-time configurable base
  path (`PAGES_BASE`) and an SPA `404.html` fallback. Does not affect the
  Railway production build.
- **Comprehensive documentation** under `docs/` for every audience: users,
  publishers, API integrators, contributors, operators, and security — plus
  root `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and this
  changelog.

### Changed
- Router now respects `import.meta.env.BASE_URL` (`basename`) so the same build
  works at `/` (Railway) and `/Mcp/` (GitHub Pages).

## [2026-06-05]

### Fixed
- **iOS Safari blank screen** — hardened startup so every visitor gets a working
  page; the Descope provider only mounts when configured, and the build target
  is pinned for older Safari/Android browsers.
- **`CORS_ORIGINS` parsing** — tolerates pasted whitespace and angle brackets.

### Added
- **Accessibility sweep** across routed pages — screen-reader live regions
  (`role="status"`/`aria-live`), proper ARIA tabs on the tool detail page,
  `role="alert"` error states, and `aria-hidden` on decorative elements.
- **`CLAUDE.md`** project memory file.

### Security
- **Zero dependency vulnerabilities** — patched `react-router`/`react-router-dom`
  (RCE/XSS/open-redirect/DoS advisories), `ajv`, and `brace-expansion`; upgraded
  `@descope/react-sdk`; and overrode the transitive `js-cookie` to a patched
  release. `npm audit` reports 0.

## [2026-06-02]

### Added
- First-boot **auto-seed** in production (no volume/shell required).
- Browse pages wired to the live API with the **Trust Score** surfaced
  throughout.
</content>
