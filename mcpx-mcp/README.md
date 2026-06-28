# @mcpx/mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for the **MCPX
marketplace itself**. Give an agent the ability to discover, vet, and install
*other* MCP servers without leaving the conversation.

## Tools

| Tool | Description |
|------|-------------|
| `search_servers` | Search the marketplace by keyword |
| `discover_servers` | Recent servers + trust tier (agent feed) |
| `get_server` | Full details incl. verified install command + capabilities |
| `inspect_trust` | Itemized Trust Score before using a server |
| `scan_repo` | Live source security scan of a public repo |
| `install_server` | Install a server into a local client config — **refuses low-trust / unverified servers unless `force=true`** |

`install_server` reuses the exact trust gate and non-clobbering config merge as the
`npx mcpx install` CLI, so an agent can't quietly install a `caution`-tier,
high-risk, or unverified-artifact server.

## Use

```json
{
  "mcpServers": {
    "mcpx": { "command": "npx", "args": ["-y", "@mcpx/mcp"] }
  }
}
```

Env: `MCPX_API` (default `https://www.mcpx.digital`), `MCPX_TOKEN` (optional — counts
installs to your account).

> **Packaging note:** for in-repo development this server imports the CLI's shared
> gate from `../cli/lib.js`. Before publishing standalone, either depend on the
> published `mcpx` package or vendor those helpers (the same single-source pattern
> used by `scripts/sync-shared.js`).

## License

MIT
