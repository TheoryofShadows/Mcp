# MCPX - The Marketplace for AI Agent Tools

A full-stack marketplace for discovering, publishing, and monetizing MCP (Model Context Protocol) servers.

## Tech Stack

- **Frontend:** React 19, React Router, Vite
- **Backend:** Express 5, SQLite (better-sqlite3), JWT auth
- **Design:** Custom CSS design system with dark theme

## Quick Start

```bash
# Install dependencies
npm install

# Start development (frontend + backend)
npm run dev
```

The app auto-seeds the database on first run. Visit `http://localhost:5173` to use the app.

**Demo account:** `dev@mcpx.dev` / `demo1234`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend (Vite) + backend (Express) concurrently |
| `npm run dev:client` | Start Vite dev server only |
| `npm run dev:server` | Start Express API only |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server (serves built frontend) |
| `npm run seed` | Reset and re-seed the database |
| `npm run lint` | Run ESLint |

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API server port |
| `JWT_SECRET` | dev fallback | Secret for signing JWT tokens. **Set in production.** |
| `CORS_ORIGINS` | `localhost` | Comma-separated allowed origins |

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Sign in |
| `GET` | `/api/auth/me` | Yes | Get current user |
| `GET` | `/api/servers` | No | List servers (search, filter, paginate) |
| `POST` | `/api/servers` | Yes | Publish a new server |
| `GET` | `/api/servers/:slug` | No | Server detail + reviews |
| `POST` | `/api/servers/:slug/reviews` | Yes | Submit a review |
| `POST` | `/api/servers/:slug/install` | No | Record an install |
| `GET` | `/api/categories` | No | List categories |
| `GET` | `/api/stats` | No | Platform statistics |
| `GET` | `/api/tiers` | No | Subscription tiers |
| `POST` | `/api/tiers/subscribe` | Yes | Subscribe to a tier |
| `GET` | `/api/health` | No | Health check |

## Project Structure

```
├── src/                    # React frontend
│   ├── api/client.js       # API client
│   ├── components/         # UI components
│   ├── context/            # Auth context
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Route pages
│   └── styles/globals.css  # Design tokens
├── server/                 # Express backend
│   ├── index.js            # App entry point
│   ├── db.js               # SQLite schema
│   ├── seed.js             # Database seeder
│   ├── middleware/auth.js   # JWT middleware
│   └── routes/             # API route handlers
├── index.html              # HTML entry
├── vite.config.js          # Vite config
└── package.json
```
