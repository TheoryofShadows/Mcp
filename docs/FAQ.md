# Frequently Asked Questions

### What is MCPX?
A marketplace for **Model Context Protocol (MCP) servers** — the tools that let
AI agents (Claude, Cursor, VS Code) do real things: query databases, call APIs,
drive browsers, manage cloud infra, and more. MCPX is where you discover,
install, publish, and monetize them. See the [Users Guide](USERS.md).

### What is MCP?
[Model Context Protocol](https://modelcontextprotocol.io) is an open standard
for connecting AI assistants to external tools and data. An "MCP server" is a
single such tool.

### Do I need an account?
No — browsing and copying install commands is open to all. An account is only
needed to **review**, **publish**, or **buy** paid tools.

### How do I install a tool?
Open its detail page and copy the ready-made command for your client (Claude
Desktop, Cursor, or VS Code). Step-by-step in the [Users Guide](USERS.md#3-install-a-tool).

### What do the badges (Official / Verified / Community / Caution) mean?
They summarize a server's **computed Trust Score**. Full breakdown in
[Trust & Security](TRUST.md). Short version: higher = more real trust signals
(source, license, adoption, reviews, maturity), and "Caution" means new,
unsourced, or sensitive-and-unreviewed.

### Is it safe to install these tools?
MCP servers can be powerful (some access files, shells, or credentials). MCPX
surfaces a **Capabilities & Risk** panel and a Trust Score to help you judge,
but you're still installing software — prefer higher-trust, sourced servers for
anything sensitive, and review the permissions it asks for.

### How does monetization work? What's the fee?
Publishers can charge for tools and get paid via **Stripe Connect**. The
platform fee is **15%**; publishers keep **85%**. Details in
[Publishing](PUBLISHING.md#4-pricing--payouts-stripe-connect).

### How do I get my tool verified?
Verification is a manual MCPX review confirming you control the source and the
tool does what it claims. Request it via the repo's
[issues](https://github.com/TheoryofShadows/Mcp/issues). It boosts your Trust
Score and clears the sensitive-capability penalty.

### Can I use the API directly?
Yes. Everything the site does is a REST call under `/api`. See the
[API Reference](API.md). The `/api/servers/:slug/trust` endpoint is designed for
agents to check trust *before* using a tool.

### Is there a free demo I can poke at?
Yes — the [GitHub Pages demo](https://theoryofshadows.github.io/Mcp/) runs the
real UI on bundled sample data. For live listings, accounts, and purchases use
[www.mcpx.digital](https://www.mcpx.digital). See [GITHUB_PAGES.md](GITHUB_PAGES.md).

### Can I self-host MCPX?
Absolutely — it's MIT-licensed. The simplest setup is one Railway service. See
[Deployment](DEPLOYMENT.md).

### What's the tech stack?
React 19 + Vite 7 frontend, Express 5 + SQLite backend, optional Stripe /
Supabase / Descope. See [Architecture](ARCHITECTURE.md).

### Where's my data stored?
SQLite, on the server. In production, mount a volume and set
`DB_PATH=/data/mcpx.db` or it's wiped on redeploy. A Supabase/Postgres schema is
also provided.

### How do I report a bug or a security issue?
Bugs: open a [GitHub issue](https://github.com/TheoryofShadows/Mcp/issues).
Security vulnerabilities: **don't** use public issues — follow
[SECURITY.md](../SECURITY.md).

### How do I contribute?
See [CONTRIBUTING.md](../CONTRIBUTING.md). TL;DR: fork, branch, keep
`lint` + `test` + `build` green, open a PR.
</content>
