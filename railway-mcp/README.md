# @mcpx/railway

A [Model Context Protocol](https://modelcontextprotocol.io) server for [Railway](https://railway.com).
Give your agent safe, scoped access to your Railway projects: list services, inspect
deployments and logs, read variable names, and (opt-in) trigger deploys or roll back.

**Read-only by default.** Infrastructure-mutating tools are hidden unless you explicitly
enable them. Secret variable **values are never returned** — only names.

## Install

```bash
# via the MCPX CLI (recommended — checks trust before installing)
npx mcpx install railway

# or directly
npx -y @mcpx/railway
```

Set a scoped [Railway API token](https://docs.railway.com/reference/public-api):

```bash
export RAILWAY_API_TOKEN=...          # required
export MCPX_RAILWAY_ALLOW_WRITE=1     # optional — enables deploy/restart/set_variable/rollback
```

### Claude Desktop / Cursor / VS Code

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@mcpx/railway"],
      "env": { "RAILWAY_API_TOKEN": "..." }
    }
  }
}
```

## Tools

| Tool | Mode | Description |
|------|------|-------------|
| `list_projects` | read | Projects the token can access |
| `list_services` | read | Services in a project |
| `list_deployments` | read | Recent deployments for a service/environment |
| `get_deployment_logs` | read | Build/deploy logs for a deployment |
| `get_variables` | read | Variable **names** only (values redacted) |
| `trigger_deploy` | **write** | Redeploy a service |
| `restart_service` | **write** | Restart the latest deployment |
| `set_variable` | **write** | Create/update a variable (value never echoed) |
| `rollback_deployment` | **write** | Roll back to a previous deployment |

Write tools appear in `tools/list` **only** when `MCPX_RAILWAY_ALLOW_WRITE=1`, and are
re-checked server-side on every call (defense in depth).

## Security model

- **Least privilege:** read-only unless write mode is explicitly enabled.
- **No secret exfiltration:** `get_variables` and `set_variable` never return values.
- **Scoped credentials:** uses a single `RAILWAY_API_TOKEN` you control; scope it to the
  project(s) you want the agent to touch.
- **Honest capability declaration:** published on MCPX with the sensitive tags
  `infra`, `deploy`, `credentials` so MCPX's capability warnings flag it correctly.

## Publishing on MCPX

Suggested listing metadata (`install_command` makes the install verifiable):

```json
{
  "name": "Railway",
  "category_id": "infra",
  "repo_url": "https://github.com/<you>/mcpx-railway",
  "install_command": "npx -y @mcpx/railway",
  "tags": ["infra", "deploy", "credentials", "railway"]
}
```

Then verify repo ownership (Dashboard → Your Tools → **Verify**) to unlock full
source-provenance points in the Trust Score.

> The GraphQL operations in `index.js` follow Railway's public API; validate field
> names against the current schema before publishing.

## License

MIT
