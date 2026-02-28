# DungeonBreak Engine MCP Server

Machine-playable MCP adapter for `@dungeonbreak/engine`.

## What it exposes

Tools:

- `create_session`
- `list_sessions`
- `delete_session`
- `get_status`
- `get_snapshot`
- `restore_snapshot`
- `list_actions`
- `dispatch_action`
- `get_log_page`

Each call returns JSON text with `ok: true|false` and machine-readable payloads.

## Local run

```bash
pnpm --dir packages/engine-mcp install --no-frozen-lockfile
pnpm --dir packages/engine-mcp run dev
```

The server runs as stdio MCP transport for MCP-capable clients.

## Remote MCP in docs runtime

The docs site exposes a remote MCP route at:

- `/api/mcp` (streamable HTTP transport)

Requirements:

- authenticated signed-in user session on the docs-site runtime
- per-user session isolation and request rate limiting are enforced

Related metadata endpoint:

- `/api/.well-known/oauth-protected-resource`

## Parity smoke

```bash
pnpm --dir packages/engine-mcp run test:parity-smoke
```

This verifies MCP session dispatch matches direct engine replay hashes for the dense 75-turn canonical fixture.

## Agent play runner

```bash
pnpm --dir packages/engine-mcp run agent:play
```

Optional env vars:
- `DUNGEONBREAK_AGENT_SEED` (default canonical seed)
- `DUNGEONBREAK_AGENT_TURNS` (default `120`)

Report output:
- `.planning/test-reports/agent-play-report.json`

## Cursor config example

```json
{
  "mcpServers": {
    "dungeonbreak-engine": {
      "command": "pnpm",
      "args": [
        "--dir",
        "<REPO_PATH>/packages/engine-mcp",
        "run",
        "dev"
      ]
    }
  }
}
```

## Codex config example

```toml
[mcp_servers.dungeonbreak_engine]
command = "pnpm"
args = ["--dir", "<REPO_PATH>/packages/engine-mcp", "run", "dev"]
```
