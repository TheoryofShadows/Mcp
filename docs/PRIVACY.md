# Privacy Policy

**Effective 2026-09-12** · MCPX, operated by TheoryofShadows
Contact: https://github.com/TheoryofShadows/Mcp/issues

This describes what MCPX actually stores. It was written by reading the
database schema, not from a template.

## What we collect

**Account data** — email, username, optional display name and avatar URL, and a
bcrypt hash of your password. We never store your password itself.

**Marketplace activity** — listings you publish, tools you install, reviews you
write, and reports you file.

**Sales records** — for each purchase: the server, the buyer, the gross amount,
our fee, the payment method, and a Stripe payment reference. Needed to grant
access, pay publishers, and handle refunds.

**Audit events** — security-relevant actions (logins, publishes, deletions,
flags) with the acting account and a timestamp.

**Page views** — path, referring site's hostname, and date. **No IP address, no
cookie, no device fingerprint, no user agent.** We cannot tell one visitor from
another in this data, and we cannot link it back to your account.

## What we do not collect

- Card numbers or payment credentials — **Stripe handles these; we never see them**
- Your IP address in analytics
- Tracking cookies or third-party advertising pixels
- Your Railway, GitHub, or other API tokens — those stay on your machine
- Wallet private keys — Solana payments are signed in your own wallet

## Third parties that receive data

| Service | What it gets | Why |
|---|---|---|
| **Stripe** | Email, purchase amounts, payout details | Payment processing and publisher payouts |
| **Railway** | Everything stored, as our host | Hosting |
| **Sentry** | Error reports, which may include a user id | Diagnosing crashes |
| **Descope** | Admin login identity | Admin authentication (optional; unset in production) |
| **Supabase** | Auth identity | Optional auth backend (unset in production) |

We do not sell your data. We do not share it for advertising.

## Cookies

MCPX uses **no tracking cookies**. Your login is a token held in your browser's
local storage, sent only to our own API, and removed when you sign out.

## How long we keep things

- **Account data** — until you delete your account
- **Sales records** — kept after account deletion where tax and accounting law requires it
- **Audit events** — 90 days
- **Webhook idempotency records** — 90 days, then pruned automatically
- **Page views** — indefinitely, but they contain nothing personal

## Your rights

You can **access** your data (dashboard and `GET /api/auth/me`), **correct** it,
**delete** your account and its listings from the dashboard, and **export** it
by asking us.

Under GDPR you may also object to processing or lodge a complaint with your
supervisory authority. Under CCPA you may request disclosure and deletion; we do
not sell personal information, so there is nothing to opt out of.

To exercise anything here that the dashboard does not cover, open an issue at
the contact link above.

## Security

Passwords are bcrypt-hashed. Password-reset tokens are stored only as SHA-256
hashes, are single-use, and expire in 30 minutes. Sessions are signed JWTs that
can be revoked. Payment card data never touches our servers.

No system is perfectly secure. If you find a vulnerability, report it privately:
https://github.com/TheoryofShadows/Mcp/security/advisories/new

## Children

MCPX is not intended for anyone under 13, and we do not knowingly collect their
data.

## Changes

Material changes will be noted here with a new effective date.
