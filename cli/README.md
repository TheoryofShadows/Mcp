# mcpx

The command-line installer for the [MCPX](https://www.mcpx.digital) marketplace.
Discover, inspect trust, and install MCP servers — with a built-in trust gate.

```bash
npx mcpx install <slug>     # install into Claude / Cursor / VS Code
npx mcpx search <query>     # search the marketplace
npx mcpx trust <slug>       # itemized Trust Score
npx mcpx scan <repo-url>    # live source security scan
npx mcpx list               # recent servers (agent feed)
```

## Install behavior

`mcpx install`:

1. Fetches the server and shows its trust tier + risk + capabilities.
2. **Refuses** to install a `caution`-tier, high-risk, unverified-repo, or
   guessed-package server unless you pass `--force`.
3. Detects the target client (`--client claude|cursor|vscode` to force) and
   **merges** into your existing config without clobbering other servers.
4. Records the install (counted toward adoption only when `MCPX_TOKEN` is set).

## Env

| Var | Default | Purpose |
|-----|---------|---------|
| `MCPX_API` | `https://www.mcpx.digital` | API base URL |
| `MCPX_TOKEN` | — | Bearer token so installs count to your account |

## License

MIT
