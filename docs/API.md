# API Reference

The MCPX REST API. All endpoints are served under `/api` on the same origin as
the app.

- **Base URL (production):** `https://www.mcpx.digital/api`
- **Base URL (local dev):** `http://localhost:3001/api` (or `http://localhost:5173/api` via the Vite proxy)
- **Content type:** `application/json` for all request and response bodies.

---

## Authentication

MCPX uses **JWT bearer tokens** for user actions. Obtain a token from
`/auth/register` or `/auth/login`, then send it on protected requests:

```
Authorization: Bearer <token>
```

Tokens are signed with the server's `JWT_SECRET`. Admin endpoints use a separate
**Descope** session (see [Admin](#admin)).

### Rate limits

| Scope | Limit |
|-------|-------|
| Auth endpoints (`/auth/*`) | 20 requests per 15 minutes per IP → `429` with `Retry-After` |
| Install (`/servers/:slug/install`) | 1 per IP per server per minute → `429` |

### Error shape

Errors return a non-2xx status and a JSON body:

```json
{ "error": "Human-readable message" }
```

Common statuses: `400` validation, `401` bad/missing credentials, `402` payment
required, `404` not found, `409` conflict (duplicate), `429` rate limited, `500`
server error, `501` feature not configured.

---

## Endpoint summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/health` | — | Liveness check |
| `POST` | `/auth/register` | — | Create an account |
| `POST` | `/auth/login` | — | Sign in, receive a JWT |
| `GET` | `/auth/me` | JWT | Current user + totals |
| `GET` | `/servers` | — | List / search / filter / sort |
| `GET` | `/servers/:slug` | — | Server detail + reviews |
| `GET` | `/servers/:slug/trust` | — | Machine-readable trust report |
| `POST` | `/servers` | JWT | Publish a server |
| `POST` | `/servers/:slug/reviews` | JWT | Add a review |
| `POST` | `/servers/:slug/install` | — | Record an install |
| `GET` | `/categories` | — | Categories with counts |
| `GET` | `/stats` | — | Platform-wide statistics |
| `GET` | `/tiers` | — | Pricing tiers + projections |
| `POST` | `/tiers/subscribe` | JWT | Subscribe to a tier |
| `POST` | `/payments/stripe/checkout` | JWT | Checkout for a paid plan |
| `POST` | `/payments/stripe/tool-checkout` | JWT | Checkout for a paid tool |
| `GET` | `/payments/stripe/connect` | JWT | Start/resume payout onboarding |
| `POST` | `/payments/stripe/webhook` | Stripe sig | Stripe event sink |
| `GET` | `/admin/servers` | Descope admin | All servers |
| `PATCH` | `/admin/servers/:id` | Descope admin | Update flags |
| `DELETE` | `/admin/servers/:id` | Descope admin | Remove a server |
| `GET` | `/admin/users` | Descope admin | All users |

---

## Health

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-06-05T21:02:00.000Z" }
```

Returns JSON (not HTML) — a useful way to confirm the API, not just the SPA, is
actually serving.

---

## Auth

### `POST /auth/register`

Body:

| Field | Required | Rules |
|-------|----------|-------|
| `email` | ✅ | Valid email format |
| `username` | ✅ | 2–30 chars, `[a-zA-Z0-9_]` only |
| `password` | ✅ | ≥ 10 chars |
| `display_name` | — | Defaults to `username`; truncated to 50 chars |

`201` →

```json
{ "token": "<jwt>", "user": { "id": "…", "email": "…", "username": "…", "display_name": "…", "tier": "starter", "created_at": "…" } }
```

Errors: `400` invalid fields, `409` email/username taken, `429` rate limited.

### `POST /auth/login`

Body: `{ "email", "password" }`. `200` returns `{ token, user }` (same shape as
register). `401` on invalid credentials.

### `GET /auth/me` 🔒

Returns the current user plus aggregate counts:

```json
{
  "id": "…", "email": "…", "username": "…", "display_name": "…",
  "tier": "starter", "created_at": "…",
  "server_count": 3, "total_installs": 89400
}
```

---

## Servers

### `GET /servers`

Query parameters (all optional):

| Param | Type | Notes |
|-------|------|-------|
| `category` | string | Category id, or `all` (no filter) |
| `search` | string | Matches name, description, or tags |
| `verified` | `true` | Only verified servers |
| `trending` | `true` | Only trending servers |
| `price_type` | `free` \| `paid` | Filter by pricing |
| `author` | string | Filter by publisher username |
| `sort` | enum | `installs` (default), `rating`, `newest`, `name`, `revenue` |
| `page` | int | Default `1` |
| `limit` | int | Default `20`, max `100` |

`200` →

```json
{
  "servers": [ { /* server object */ } ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "pages": 3 }
}
```

**Server object** (also returned by detail/create):

```json
{
  "id": "uuid",
  "name": "GitHub MCP",
  "slug": "github-mcp",
  "author": "octocat",
  "author_display_name": "The Octocat",
  "category": "dev",
  "category_label": "Developer",
  "description": "…",
  "long_description": "…",
  "installs": 89400,
  "rating": 4.8,
  "rating_count": 120,
  "price": "free",
  "price_type": "free",
  "price_amount": 0,
  "verified": true,
  "trending": false,
  "gradient": "linear-gradient(…)",
  "weeklyGrowth": "+12%",
  "revenue": null,
  "repo_url": "https://github.com/…",
  "license": "MIT",
  "tags": ["dev", "git"],
  "status": "active",
  "created_at": "…",
  "updated_at": "…",
  "trust": { /* see /servers/:slug/trust */ }
}
```

### `GET /servers/:slug`

Returns one server object plus a `reviews` array:

```json
{ "...server fields...": "…", "reviews": [ { "id", "rating", "comment", "username", "display_name", "created_at" } ] }
```

`404` if no server has that slug.

### `GET /servers/:slug/trust`

The **agent-native** endpoint — query a server's trust *before* installing or
calling it. Returns the full computed report:

```json
{
  "slug": "github-mcp",
  "name": "GitHub MCP",
  "score": 92,
  "tier": "official",
  "confidence": "high",
  "factors": [
    { "key": "provenance",   "label": "Source provenance",  "points": 25, "max": 25, "reason": "Public source repository on a known host" },
    { "key": "license",      "label": "License clarity",     "points": 15, "max": 15, "reason": "Recognized OSI license (MIT)" },
    { "key": "publisher",    "label": "Publisher identity",  "points": 20, "max": 20, "reason": "Publisher identity reviewed by MCPX" },
    { "key": "adoption",     "label": "Adoption",            "points": 15, "max": 15, "reason": "89,400 installs" },
    { "key": "satisfaction", "label": "User satisfaction",   "points": 14, "max": 15, "reason": "4.8★ across 120 reviews" },
    { "key": "maturity",     "label": "Maturity",            "points":  9, "max": 10, "reason": "300 days on the marketplace" }
  ],
  "penalties": []
}
```

See [Trust & Security](TRUST.md) for the scoring model.

### `POST /servers` 🔒

Publish a server. Body:

| Field | Required | Rules |
|-------|----------|-------|
| `name` | ✅ | 2–60 chars; slug auto-generated; must be unique |
| `category_id` | ✅ | A valid category (not `all`) |
| `description` | ✅ | 10–500 chars |
| `long_description` | — | ≤ 5,000 chars |
| `price_type` | — | `free` (default) or `paid` |
| `price_amount` | — | Integer cents (for paid) |
| `repo_url` | — | Public source URL |
| `tags` | — | Array, ≤ 10 items |

`201` → the created server object. Errors: `400` validation/invalid category,
`409` duplicate slug.

### `POST /servers/:slug/reviews` 🔒

Body: `{ "rating": 1–5 (integer), "comment"?: string ≤ 2000 }`.

Rules: you can't review your own server (`400`), and only once per server
(`409`). On success (`201`) the server's average `rating` and `rating_count` are
recalculated.

### `POST /servers/:slug/install`

Records an install and increments the counter. Auth is optional (a logged-in
user is attributed if present). Rate limited to **1 per IP per server per
minute** (`429` otherwise). `200` → `{ "success": true }`.

---

## Categories

### `GET /categories`

```json
[
  { "id": "all", "label": "All Tools", "icon": "◎", "count": 42 },
  { "id": "dev", "label": "Developer", "icon": "⌘", "count": 18 }
]
```

`count` reflects active servers; `all` carries the total.

---

## Stats

### `GET /stats`

Platform-wide aggregates used by the homepage:

```json
{
  "server_count": 42,
  "total_installs": 512000,
  "publisher_count": 30,
  "total_monthly_revenue": 240000,
  "verified_count": 12,
  "trending_count": 5,
  "avg_rating": 4.6,
  "review_count": 380,
  "hero_stats": [ { "label": "Monthly Installs", "value": "512.0K+", "color": "…" } ]
}
```

(Revenue values are in cents.)

---

## Discover (agent feed)

### `GET /api/discover`

A stable, agent-readable feed of recently published servers with their computed
trust — built for agents and external tools to poll programmatically.

Query params: `limit` (default 50, max 100), `since` (ISO timestamp, for
incremental polls). Cached for 5 minutes.

```json
{
  "feed": "mcpx-discover",
  "generated_at": "2026-06-07T00:00:00.000Z",
  "count": 50,
  "servers": [
    {
      "name": "GitHub MCP Server",
      "slug": "github-mcp-server",
      "url": "https://www.mcpx.digital/tool/github-mcp-server",
      "trust_url": "https://www.mcpx.digital/api/servers/github-mcp-server/trust",
      "repo_url": "https://github.com/github/github-mcp-server",
      "category": "dev",
      "price_type": "free",
      "installs": 142000,
      "rating": 4.9,
      "verified": true,
      "tags": ["github", "git"],
      "trust": { "score": 95, "tier": "official", "confidence": "high" },
      "created_at": "…", "updated_at": "…"
    }
  ]
}
```

---

## Tiers

### `GET /tiers`

Returns `{ tiers, revenue_projections, tech_stack }` describing the Starter
(free), Pro Publisher ($29/mo), and Enterprise ($499/mo) plans.

### `POST /tiers/subscribe` 🔒

Body: `{ "tier": "starter" | "pro" | "enterprise" }`.

- **Free tier** → activates immediately, `201` with the subscription record.
- **Paid tier** → `200` with `{ requires_payment: true, checkout_endpoint:
  "/api/payments/stripe/checkout", tier }`; the client then starts Stripe
  Checkout.

---

## Payments (Stripe)

> All Stripe endpoints return `501` if `STRIPE_SECRET_KEY` is not configured.

### `POST /payments/stripe/checkout` 🔒

Body `{ "tier": "pro" | "enterprise" }` → `{ "checkout_url": "https://checkout.stripe.com/…" }`.
Redirect the user there to subscribe to a publisher plan.

### `POST /payments/stripe/tool-checkout` 🔒

Body `{ "server_slug": "…" }`. Creates a **destination charge** for a paid tool
— 15% application fee to the platform, the rest to the publisher's connected
account. `402` if the publisher hasn't finished onboarding; `400` if the tool is
free. → `{ "checkout_url": "…" }`.

### `GET /payments/stripe/connect` 🔒

Starts or resumes **publisher payout onboarding** (Stripe Express). Returns
`{ onboarding_url }` for new/incomplete accounts, or `{ dashboard_url,
onboarding_done: true }` once onboarded.

### `POST /payments/stripe/webhook`

Stripe → MCPX event sink (subscription lifecycle, tool purchases, connected
account updates). Verified with `STRIPE_WEBHOOK_SECRET`; expects the raw body
with a valid `stripe-signature` header. Not called directly by clients.

---

## Admin

Admin endpoints require a valid **Descope** session whose token carries the
configured admin permission (`DESCOPE_ADMIN_PERMISSION`). They return `401` /
`403` otherwise.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/admin/servers` | List **all** servers (including pending/inactive) |
| `PATCH` | `/admin/servers/:id` | Set `verified`, `trending`, and/or `status` (`active`/`inactive`/`pending`) |
| `DELETE` | `/admin/servers/:id` | Remove a server |
| `GET` | `/admin/users` | List all users with server counts |

---

## Quick examples

```bash
# Browse the top developer tools
curl 'https://www.mcpx.digital/api/servers?category=dev&sort=installs&limit=5'

# Check a server's trust before using it
curl 'https://www.mcpx.digital/api/servers/github-mcp/trust'

# Authenticated publish
curl https://www.mcpx.digital/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"My MCP","category_id":"dev","description":"A genuinely useful agent tool."}'
```
</content>
