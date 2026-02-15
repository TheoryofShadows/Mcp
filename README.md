# MCPX

**The marketplace for AI agent tools.**

Discover, publish, and monetize MCP (Model Context Protocol) servers. MCPX connects AI tool builders with developers who need them.

---

## Features

- **Marketplace** — browse, search, filter, and install MCP servers
- **Publishing** — create and list your own MCP servers with pricing
- **Reviews & Ratings** — community-driven server quality signals
- **Subscriptions** — tiered pricing (Starter / Pro / Enterprise)
- **Auth** — register, login, JWT access + refresh token rotation
- **Detail Pages** — per-server pages with install tracking, reviews, tags
- **Responsive** — mobile-first design, works on all screen sizes
- **Accessible** — skip-to-content, ARIA labels, reduced-motion support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router 7, Vite 7 |
| Backend | Express 5, SQLite (better-sqlite3) |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Security | Helmet (CSP, HSTS, etc.), express-rate-limit, CORS |
| Logging | Morgan |
| Testing | Vitest, Supertest |
| CI/CD | GitHub Actions (Node 20 + 22) |
| Container | Docker (multi-stage build) |
| Design | Custom CSS design system, dark theme |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/TheoryofShadows/Mcp.git
cd Mcp

# Install dependencies
npm install

# (Optional) Copy and configure environment variables
cp .env.example .env

# Start development (frontend + backend)
npm run dev
```

The database auto-seeds on first run. Visit **http://localhost:5173**.

**Demo account:** `dev@mcpx.dev` / `demo1234`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend (Vite) + backend (Express) concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express API server only |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server (serves built frontend + API) |
| `npm test` | Run test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run seed` | Reset and re-seed the database |

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port |
| `JWT_SECRET` | dev fallback | Secret for signing access tokens (15-min expiry). **Set in production.** |
| `REFRESH_SECRET` | derived from JWT_SECRET | Secret for signing refresh tokens (30-day expiry). **Set in production.** |
| `CORS_ORIGINS` | `localhost:5173,localhost:3001` | Comma-separated allowed origins |
| `NODE_ENV` | `development` | Environment (`development` / `production` / `test`) |

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account (returns access + refresh tokens) |
| `POST` | `/api/auth/login` | No | Sign in (returns access + refresh tokens) |
| `POST` | `/api/auth/refresh` | No | Exchange refresh token for new access + refresh tokens |
| `GET` | `/api/auth/me` | Yes | Get current user profile |

### Servers

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/servers` | No | List servers (search, filter, sort, paginate) |
| `GET` | `/api/servers/:slug` | No | Server detail with reviews |
| `POST` | `/api/servers` | Yes | Publish a new server |
| `POST` | `/api/servers/:slug/reviews` | Yes | Submit a review (1-5 stars) |
| `POST` | `/api/servers/:slug/install` | No | Record an install |

### Other

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/categories` | No | List categories with server counts |
| `GET` | `/api/stats` | No | Platform statistics |
| `GET` | `/api/tiers` | No | Subscription tiers, projections, tech stack |
| `POST` | `/api/tiers/subscribe` | Yes | Subscribe to a tier |
| `GET` | `/api/health` | No | Health check |

### Query Parameters for `GET /api/servers`

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search name and description |
| `category` | string | Filter by category ID |
| `verified` | boolean | Filter verified servers only |
| `trending` | boolean | Filter trending servers only |
| `price_type` | `free` / `paid` | Filter by pricing |
| `sort` | `installs` / `rating` / `newest` | Sort order (default: installs) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 24, max: 100) |

## Security

- **Helmet** — CSP, X-Content-Type-Options, X-Frame-Options, HSTS
- **Rate limiting** — 100 req/min global, 10 req/15min on auth endpoints
- **CORS** — origin whitelist (rejects unauthorized origins)
- **JWT** — short-lived access tokens (15min) + long-lived refresh tokens (30d)
- **bcrypt** — password hashing with 10 salt rounds (async)
- **Prepared statements** — all SQL uses parameterized queries (no injection)
- **Input validation** — length limits, type checks, format validation on all endpoints
- **Error handling** — global error middleware catches parse errors, returns safe messages

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

## Docker

```bash
# Build
docker build -t mcpx .

# Run
docker run -p 3001:3001 \
  -e JWT_SECRET=your-secret-here \
  -e REFRESH_SECRET=your-refresh-secret \
  mcpx
```

The container includes a health check at `/api/health`.

## Project Structure

```
mcpx/
├── .github/workflows/ci.yml   # CI pipeline (lint, test, build)
├── server/                     # Express backend
│   ├── index.js                # App entry, middleware, routes
│   ├── db.js                   # SQLite schema + connection
│   ├── seed.js                 # Database seeder (12 users, 12 servers)
│   ├── middleware/auth.js      # JWT auth, refresh tokens
│   ├── routes/
│   │   ├── auth.js             # Register, login, refresh, me
│   │   ├── servers.js          # CRUD, reviews, installs
│   │   ├── categories.js       # Category listing
│   │   ├── stats.js            # Platform statistics
│   │   └── tiers.js            # Subscription tiers
│   └── __tests__/api.test.js   # 58 API tests
├── src/                        # React frontend
│   ├── api/client.js           # API client with auto-refresh
│   ├── components/
│   │   ├── sections/           # Page sections (Navbar, Hero, Marketplace, etc.)
│   │   ├── ui/                 # Reusable UI (Badge, GlowOrb)
│   │   ├── AuthModal.jsx       # Login/register modal
│   │   └── ErrorBoundary.jsx   # Error boundary
│   ├── context/AuthContext.jsx  # Auth state management
│   ├── hooks/                  # useAuth, useServers, useCategories, etc.
│   ├── pages/ServerDetail.jsx  # Server detail page
│   └── styles/globals.css      # Design tokens + responsive styles
├── Dockerfile                  # Multi-stage production build
├── .env.example                # Environment variable template
├── index.html                  # HTML entry point
├── vite.config.js              # Vite config with API proxy
├── eslint.config.js            # ESLint config
└── package.json
```

## Testing

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch
```

**58 tests** covering:
- Auth: register, login, refresh, /me, validation, edge cases
- Servers: CRUD, search, filters, pagination, sort, reviews, installs
- Tiers: listing, subscription, validation
- Security: helmet headers, error handling, auth enforcement
- Edge cases: duplicate users, self-review prevention, malformed JSON

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
