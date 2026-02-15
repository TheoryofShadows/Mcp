# Changelog

All notable changes to MCPX are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-15

### Added

- **Marketplace** — browse, search, filter, sort, and paginate MCP servers
- **Publishing** — create and list MCP servers with name, description, category, pricing, tags
- **Server detail pages** — per-server view with reviews, install button, tags, stats
- **Reviews & ratings** — authenticated users can rate servers 1-5 stars with comments
- **Install tracking** — per-server install counts with rate limiting
- **Auth system** — register, login, JWT access tokens (15-min) + refresh tokens (30-day)
- **Refresh token rotation** — `POST /api/auth/refresh` for seamless session renewal
- **Frontend auto-refresh** — API client automatically retries on 401 with token refresh
- **Subscription tiers** — Starter (free), Pro ($29/mo), Enterprise ($499/mo)
- **Category filtering** — 7 categories with server counts
- **Platform statistics** — aggregate stats (installs, publishers, ratings)
- **Revenue projections** — projected revenue model and tech stack breakdown

### Security

- **Helmet** — CSP, X-Frame-Options, X-Content-Type-Options, HSTS
- **Rate limiting** — global 100 req/min + auth-specific 10 req/15min
- **CORS** — origin whitelist with proper rejection of unauthorized origins
- **JWT** — short-lived access tokens with long-lived refresh tokens
- **bcrypt** — async password hashing with 10 salt rounds
- **Prepared statements** — all SQL parameterized (no injection)
- **Input validation** — length, type, and format checks on all endpoints
- **Error handling** — global middleware catches JSON parse errors, returns safe messages
- **JWT secret warning** — logs warning when using insecure default secret

### DevOps

- **Testing** — 58 tests (Vitest + Supertest) covering all API endpoints and edge cases
- **CI/CD** — GitHub Actions pipeline (lint, test, build) on Node 20 + 22
- **Docker** — multi-stage Dockerfile with health check
- **Logging** — Morgan request logging (disabled in test mode)
- **ESLint** — configured for React + Node.js

### Design

- Custom CSS design system with dark theme
- Responsive layout (mobile-first with 768px and 480px breakpoints)
- Accessibility: skip-to-content, ARIA labels, reduced-motion, focus-visible
- Print styles
- Custom scrollbar styling
