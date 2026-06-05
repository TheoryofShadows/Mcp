# Users Guide — Discover & Install MCP Tools

This guide is for anyone who wants to **find MCP servers and add them to their
AI agent** (Claude Desktop, Cursor, or VS Code). No account is required to
browse or install.

> New to MCP? [Model Context Protocol](https://modelcontextprotocol.io) is the
> open standard that lets AI assistants talk to external tools — databases,
> APIs, browsers, file systems, and more. An "MCP server" is one such tool.

---

## 1. Browse the marketplace

Open **[www.mcpx.digital/marketplace](https://www.mcpx.digital/marketplace)**.

You can:

- **Search** by name, description, tag, or author.
- **Filter by category** — Developer, Data & APIs, AI & ML, Business, Creative,
  Infrastructure.
- **Filter by price** — All / Free / Paid.
- **Sort** — Most Popular, Newest, Top Rated, Trending.

Every result card shows the server's name, a one-line description, install
count, star rating, and its **trust badge**.

---

## 2. Read the trust signals

MCPX shows a **[Trust Score](TRUST.md)** on every server — a transparent 0–100
rating computed from real signals, with a full breakdown you can expand. The
badge summarizes it:

| Badge | Meaning |
|-------|---------|
| 🟣 **Official** | Verified publisher **and** a high score (≥ 80) — first-party / audited |
| 🟢 **Verified** | Strong score (≥ 70) — well-established, good provenance |
| 🔵 **Community** | Decent score (≥ 40) — community-published, fewer signals |
| 🟡 **Caution** | Low score (< 40) — new, unsourced, or touches sensitive capabilities unreviewed |

On a server's detail page you'll also see a **Capabilities & Risk** panel that
flags sensitive access (file system, shell/exec, credentials, payments,
database, email, admin). Treat anything that can run code or read secrets the
way you'd treat installing any software: prefer sourced, reviewed, higher-trust
servers, and read what permissions it asks for.

See [Trust & Security](TRUST.md) for exactly how the score is calculated.

---

## 3. Install a tool

Open any server's detail page. The **Install** section gives you ready-to-paste
commands for each client.

### Claude Desktop / Claude Code

```bash
# Example: the official GitHub MCP server
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```

Many servers need a secret (an API token, a connection string). Pass it through
the environment, e.g.:

```bash
claude mcp add github \
  --env GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token \
  -- npx -y @modelcontextprotocol/server-github
```

Restart Claude after adding, and the tool's capabilities appear to the agent.

### Cursor

**Cursor → Settings → MCP → Add**, then paste the JSON shown on the server page:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token>" }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp"]
    }
  }
}
```

> The exact package name and any required env vars are shown on each server's
> page — always copy from there rather than from this example.

---

## 4. Leave a review (optional)

If you [create a free account](https://www.mcpx.digital/login) you can rate a
server 1–5 stars and leave a comment. A few ground rules enforced by the app:

- You can't review your own server.
- One review per server per account.
- Reviews feed the server's rating, which in turn feeds its Trust Score.

Honest reviews are the single most useful thing you can contribute back — they
help the next person and keep the trust signals meaningful.

---

## 5. Paid tools

Some tools are paid (shown with a price like `$5/mo`). Purchasing goes through
**Stripe Checkout**; payment is secure and the publisher receives 85% (MCPX
keeps a 15% platform fee). Free tools are, of course, free to install.

---

## Frequently asked

- **Do I need an account to install?** No — browsing and copying install
  commands is open to everyone. An account is only needed to review, publish, or
  buy.
- **Is the demo site the same as the real app?** The
  [GitHub Pages demo](https://theoryofshadows.github.io/Mcp/) shows the same UI
  on sample data and is great for a look around; use
  [www.mcpx.digital](https://www.mcpx.digital) for live listings, accounts, and
  purchases.
- **More questions?** See the [FAQ](FAQ.md).
</content>
