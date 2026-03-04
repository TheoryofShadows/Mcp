# MCPX — The App Store for AI Agents

A marketplace for discovering, installing, and monetizing MCP (Model Context Protocol) tools. Built with React + Vite frontend and Express + SQLite backend.

## Architecture

```
├── src/                  # React frontend (Vite)
│   ├── pages/            # Home, Marketplace, ToolDetail, Dashboard, Submit, Login
│   ├── components/       # ToolCard, CategoryCard, Navbar, PriceTag, etc.
│   ├── api/client.js     # API client — all frontend↔backend communication
│   ├── context/          # Auth context (JWT-based)
│   └── data/seed.js      # Static seed data (fallback when API unavailable)
├── server/               # Express API
│   ├── app.js            # Express app setup (CORS, helmet, routes)
│   ├── db.js             # SQLite database (better-sqlite3)
│   ├── seed.js           # Database seeder
│   ├── routes/           # API routes: servers, categories, stats, tiers, auth
│   └── middleware/        # JWT auth middleware
├── tests/                # Vitest API tests
└── dist/                 # Production build output
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env — set a real JWT_SECRET

# Seed the database
npm run seed

# Start development (frontend + backend)
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:3001/api

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for signing JWT tokens. Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `PORT` | No | API server port (default: 3001) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: localhost) |
| `DB_PATH` | No | SQLite database file path (default: mcpx.db) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express API only |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |
| `npm test` | Run test suite |
| `npm run lint` | Lint with ESLint |
| `npm run seed` | Seed the database |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/servers` | List tools (search, filter, sort, paginate) |
| GET | `/api/servers/:slug` | Tool detail + reviews |
| POST | `/api/servers` | Create tool (auth required) |
| POST | `/api/servers/:slug/reviews` | Add review (auth required) |
| POST | `/api/servers/:slug/install` | Record install |
| GET | `/api/categories` | List categories with counts |
| GET | `/api/stats` | Platform statistics |
| GET | `/api/tiers` | Pricing tiers |
| POST | `/api/tiers/subscribe` | Subscribe to tier (auth required) |
| POST | `/api/auth/register` | Register account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user (auth required) |
| GET | `/api/health` | Health check |

## Docker

```bash
docker compose up -d
```

## Testing

```bash
npm test           # Run once
npm run test:watch # Watch mode
```

## License

MIT
