# MCPX Launch Kit

Ready-to-paste posts for the soft launch. Tone: honest premium — Trust Score, **85% Stripe payouts**, one-click install. No fake user counts.

**Live:** https://www.mcpx.digital  
**GitHub:** https://github.com/TheoryofShadows/Mcp  
**One-liner:** MCPX is the marketplace for MCP servers — computed Trust Scores, one-click install for Claude/Cursor/VS Code, and publishers keep 85% via Stripe Connect.

---

## Product Hunt

**Title:** MCPX — Marketplace for MCP servers (Trust Score + 85% payouts)

**Tagline:** Discover, install, and monetize Model Context Protocol tools for Claude, Cursor, and VS Code

**Description:**

MCP (Model Context Protocol) is how agents talk to real tools — GitHub, Postgres, browsers, Stripe, and more. Discovery is still a mess: flat directories, no trust signal, and almost no way for builders to get paid.

MCPX fixes three gaps:

1. **Trust Score (0–100)** — computed from provenance, license, adoption, reviews, maturity, and capability risk. Not a badge someone toggled.
2. **One-click install** — copy-ready configs for Claude Desktop, Cursor, and VS Code.
3. **Publisher payouts** — list free or paid. Connect Stripe once. You keep **85%**; platform takes 15%.

Soft-launch ready today: browse the catalog, copy an install command for free, or publish and connect Stripe.

Try it: https://www.mcpx.digital  
Publish: https://www.mcpx.digital/submit  
Source: https://github.com/TheoryofShadows/Mcp

**First comment (maker):**

Hey Product Hunt 👋

I’m the maker of MCPX. I built this because I kept installing MCP servers from random lists with no idea which ones were safe — and friends building great MCP tools had no clean path to charge for them.

What’s live today:

- Marketplace with computed Trust Scores (API included: `/api/servers/:slug/trust`)
- One-click install commands for Claude / Cursor / VS Code
- Stripe Connect for publishers (keep 85%)
- Solana Pay labeled **Live (devnet)** — not mainnet yet, on purpose

I’d love feedback from:

- People using Claude/Cursor who want safer installs
- MCP authors who want to list (free) or sell (paid)

Happy to answer anything in the comments. Link: https://www.mcpx.digital

---

## Hacker News — Show HN

**Title:** Show HN: MCPX – marketplace for MCP servers with Trust Scores and 85% Stripe payouts

**Body:**

MCPX (https://www.mcpx.digital) is a marketplace for Model Context Protocol servers — the tools that give Claude, Cursor, and VS Code real-world capabilities.

Why another directory?

Most lists are flat. There’s no machine-readable trust signal, install is copy-paste folklore, and builders usually can’t monetize without standing up their own checkout.

What we ship:

- Computed Trust Score (0–100) from verifiable signals, exposed at `/api/servers/:slug/trust`
- One-click install configs for Claude Desktop, Cursor, VS Code
- Stripe Connect: publishers keep 85% of paid sales
- Open catalog API + agent discover feed at `/api/discover`

Soft launch — honest about what’s ready (Stripe Connect ~85% live path; Solana Pay is labeled Live/devnet, not mainnet).

Source: https://github.com/TheoryofShadows/Mcp  
Feedback welcome, especially from people who’ve been burned by shady MCP installs.

---

## X / Twitter thread (5–7 tweets)

1/ MCP servers are how Claude, Cursor, and VS Code get real tools. Discovery is still broken: flat lists, no trust, and builders can’t get paid.

We built MCPX → https://www.mcpx.digital

2/ Every listing gets a **computed Trust Score (0–100)** — provenance, license, adoption, reviews, maturity, capability risk. Not a vanity badge.

Agents can query it: `/api/servers/:slug/trust`

3/ Install in one click. Copy the exact config for Claude Desktop, Cursor, or VS Code. Free tools don’t require an account.

Marketplace: https://www.mcpx.digital/marketplace

4/ Publishers: list free or set a price. Connect Stripe once. You keep **85%**. Platform fee is 15%.

Publish: https://www.mcpx.digital/submit

5/ Soft launch today. Stripe Connect payouts are the primary rail. Solana Pay is available and labeled **Live (devnet)** — we won’t pretend it’s mainnet.

6/ Open source. API + docs in the repo. If you maintain an MCP server, listing takes minutes.

GitHub: https://github.com/TheoryofShadows/Mcp

7/ If this is useful: try an install, star the repo, or publish a tool. Feedback > vanity metrics.

Try it → https://www.mcpx.digital

---

## Reddit (tasteful — not spammy)

### r/LocalLLaMA

**Title:** MCPX — marketplace for MCP servers with computed Trust Scores + one-click install (and 85% Stripe payouts for authors)

**Body:**

Sharing a project I’ve been building for people who actually wire tools into agents/IDEs.

**MCPX** (https://www.mcpx.digital) indexes MCP servers with:

- a **computed Trust Score** (not a manual “verified” toggle)
- one-click install snippets for Claude / Cursor / VS Code
- optional monetization for publishers (keep 85% via Stripe Connect)

I’m not claiming huge user numbers — soft launch. If you’ve been burned by sketchy MCP installs or you’re publishing servers and want a payout path, I’d love critique.

Repo: https://github.com/TheoryofShadows/Mcp

Happy to answer architecture / trust-scoring questions.

### r/ClaudeAI

**Title:** Built a marketplace to find/install MCP tools for Claude with Trust Scores (and publishers keep 85%)

**Body:**

If you use Claude with MCP, discovery is still mostly GitHub folklore.

I built **MCPX**: https://www.mcpx.digital

- Browse tools with a computed Trust Score
- Copy install config for Claude Desktop (also Cursor / VS Code)
- Authors can publish free or paid (Stripe Connect, 85% to publisher)

Soft launch — feedback welcome. Source: https://github.com/TheoryofShadows/Mcp

### Cursor community / forum

**Short blurb:**

MCPX is a marketplace for MCP servers aimed at Cursor (and Claude/VS Code): Trust Scores, one-click install commands, and Stripe Connect so tool authors keep 85%. Soft launch at https://www.mcpx.digital — open source at https://github.com/TheoryofShadows/Mcp. Looking for Cursor users to try a free install and tell us what’s missing.

---

## MCP Discord / Anthropic community blurb

Hey folks — sharing **MCPX** (https://www.mcpx.digital), a soft-launched marketplace for MCP servers:

- Computed **Trust Score** per listing (+ machine-readable `/api/servers/:slug/trust`)
- One-click install for Claude / Cursor / VS Code
- Publishers keep **85%** via Stripe Connect

Open source: https://github.com/TheoryofShadows/Mcp  
Not here to spam — happy to take feedback on trust signals and publish UX. Solana Pay is labeled Live/devnet only.

---

## Directories to submit (checklist)

Verify each destination’s current submit process before posting. Prefer linking the live site + GitHub; don’t invent metrics.

| Directory | URL | Action | Status |
|-----------|-----|--------|--------|
| Official MCP Registry | https://github.com/modelcontextprotocol/registry · https://registry.modelcontextprotocol.io | Publish via `mcp-publisher` when ready | [ ] search & submit |
| punkpeye/awesome-mcp-servers | https://github.com/punkpeye/awesome-mcp-servers | Open PR adding MCPX (marketplace/client category if present) | [ ] |
| mcp.so | https://mcp.so/ | Submit via their GitHub issue / Submit flow | [ ] |
| PulseMCP | https://www.pulsemcp.com/ | Use site submit/contact if available | [ ] search & submit |
| Smithery | https://smithery.ai/ | Search current publish/CLI docs, then submit | [ ] search & submit |
| Glama MCP | https://glama.ai/mcp | Often indexes from GitHub — ensure repo topics/README are clear; submit if form exists | [ ] search & submit |
| modelcontextprotocol/servers | https://github.com/modelcontextprotocol/servers | Only if they accept third-party marketplace listings — otherwise skip | [ ] search & submit |
| Product Hunt | https://www.producthunt.com/ | Use PH section above | [ ] |
| Show HN | https://news.ycombinator.com/ | Use HN section above | [ ] |

If a link above 404s or the process changed, mark **search & submit** and find the current form — don’t invent a URL.

Optional helper (community tool, not affiliated): [jordanlyall/mcp-submit](https://github.com/jordanlyall/mcp-submit) automates some directory submissions — review before use.

---

## Founder actions (day-of)

1. Post Show HN + one tasteful Reddit thread (not both Reddit subs in the same hour).
2. Submit to punkpeye/awesome-mcp-servers + mcp.so.
3. DM / reply to 5 MCP authors whose tools you already list — invite them to claim/publish and connect Stripe.
