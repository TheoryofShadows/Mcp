# Publishing & Monetization Guide

For developers who want to **list an MCP server on MCPX**, optionally **charge
for it**, and **get paid**. This covers the whole lifecycle: account → submit →
trust → pricing → payouts.

---

## 1. Create a publisher account

Sign up at **[www.mcpx.digital/login](https://www.mcpx.digital/login)**.

Account rules (enforced at registration):

- **Username** — 2–30 characters, letters/numbers/underscores only.
- **Email** — must be a valid address.
- **Password** — at least 10 characters.

Every new account starts on the free **Starter** tier (see [Plans](#5-publisher-plans-tiers)).

---

## 2. Submit a tool

Go to **[/submit](https://www.mcpx.digital/submit)** (or Dashboard → *Submit
Tool*) and fill in the form. The fields map directly to what the marketplace
displays and validates:

| Field | Required | Rules |
|-------|----------|-------|
| **Name** | ✅ | 2–60 characters. A URL `slug` is generated from it automatically. |
| **Category** | ✅ | One of: `dev`, `data`, `ai`, `business`, `creative`, `infra`. |
| **Description** | ✅ | 10–500 characters — the one-liner shown on cards. |
| **Long description** | — | Up to 5,000 characters — full detail / README-style body. |
| **Repository URL** | — | Strongly recommended; it's the biggest single Trust Score factor. |
| **Tags** | — | Up to 10. Tags like `filesystem`, `shell`, `database` flag sensitive capabilities. |
| **Price** | — | `free` (default) or `paid` with a monthly amount. |

> **Names must be unique.** If a similar name already produces the same slug,
> you'll get a "similar name already exists" error — pick a more distinctive
> name.

Once submitted, your tool is `active` and immediately discoverable.

---

## 3. Earn a higher Trust Score

MCPX ranks and badges servers by a **computed [Trust Score](TRUST.md)**, not by
who paid. You can actively improve yours:

| Do this | Why it helps |
|---------|-------------|
| **Link a public repo** (GitHub/GitLab/Bitbucket) | Source provenance is worth up to **25 points** — the single largest factor. |
| **Declare an OSI license** (MIT, Apache-2.0, …) | License clarity is worth up to **15 points**. |
| **Accumulate real installs & reviews** | Adoption (15) and satisfaction (15) reward genuine traction. |
| **Get publisher-verified** | Verified identity is worth **20 points** and removes the sensitive-capability penalty. |
| **Be honest about capabilities** | Unreviewed sensitive tags cost points — but verification clears the penalty. |

A brand-new, sourced, MIT-licensed tool typically lands in **Community**; with
verification and adoption it climbs to **Verified** and **Official**.

### Getting verified

Verification is a manual review by MCPX (it sets the `verified` flag and can
mark a tool `trending`). It confirms you control the listed source and that the
tool does what it claims. Reach out via the repository's
[issues](https://github.com/TheoryofShadows/Mcp/issues) to request review.

---

## 4. Pricing & payouts (Stripe Connect)

MCPX uses **Stripe Connect destination charges** so buyers pay through MCPX and
funds are routed to you automatically.

```
Buyer pays $X  ─▶  Stripe Checkout  ─▶  85% to publisher (you)
                                     └─ 15% platform fee to MCPX
```

### One-time setup: onboard for payouts

1. Go to **Dashboard → Connect Stripe for Payouts**.
2. You'll be sent to Stripe's onboarding (KYC + bank details) for an **Express
   connected account**.
3. When Stripe confirms (`details_submitted`), your account is marked ready and
   paid purchases of your tools start flowing to you.

Until onboarding is complete, a paid tool's checkout returns *"Publisher has not
completed Stripe onboarding"* — buyers can't be charged until you're set up.

### The numbers

- **Platform fee:** 15% per sale. **You keep 85%.**
- **Price** is set per tool, in whole dollars per month, stored internally in
  cents.
- Payouts and dispute handling run through Stripe; the platform covers Stripe
  processing fees and payment disputes on connected accounts.

> Crypto: a **Solana Pay** flow is stubbed for the future
> (`/api/payments/solana/request` currently returns *"coming soon"*).

---

## 5. Publisher plans (tiers)

Separate from per-tool sales, MCPX offers publisher plans:

| Plan | Price | Highlights |
|------|-------|-----------|
| **Starter** | Free | 5 MCP servers, community support, basic analytics |
| **Pro Publisher** | $29/mo | Unlimited servers, priority listing & discovery, revenue analytics, webhooks |
| **Enterprise** | $499/mo | Team roles, private marketplace, SLA, dedicated support, SSO/SAML |

Upgrades go through Stripe Checkout (subscription mode). The free tier never
expires; paid tiers are managed by Stripe and reflected on your account
automatically via webhooks.

---

## 6. Manage your tools

The **[Dashboard](https://www.mcpx.digital/dashboard)** shows your published
tools, total installs, ratings, monthly revenue, available balance (after the
15% fee), and next payout date. From there you can submit more tools and open
your Stripe payout dashboard.

---

## 7. Programmatic publishing

Everything above is also available via the API — useful for CI or bulk
management:

```bash
# 1. Authenticate
TOKEN=$(curl -s https://www.mcpx.digital/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}' | jq -r .token)

# 2. Publish
curl -s https://www.mcpx.digital/api/servers \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My Cool MCP",
    "category_id": "dev",
    "description": "Does something genuinely useful for agents.",
    "repo_url": "https://github.com/you/my-cool-mcp",
    "price_type": "free",
    "tags": ["dev", "automation"]
  }'
```

See the full [API Reference](API.md) for every field and endpoint.
</content>
