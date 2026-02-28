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
- `DUNGEONBREAK_AGENT_REPORT_DETAIL` (`compact` default, `full` for expanded inline events)
- `DUNGEONBREAK_AGENT_INCLUDE_CHAPTER_PAGES` (`false` default)
- `DUNGEONBREAK_AGENT_WRITE_GZIP` (`true` default)
- `DUNGEONBREAK_AGENT_PRETTY_JSON` (`false` default)

Report output:
- `.planning/test-reports/agent-play-report.json`
- `.planning/test-reports/agent-play-report.json.gz` (default)

Compact report notes:
- `run.eventLedgerFormat = "packed-v1"` stores events as lookup tables + numeric row references.
- `run.eventLedgerFormat = "inline-v1"` is used when `DUNGEONBREAK_AGENT_REPORT_DETAIL=full`.

Report viewer adapter + smoke check:
- Adapter module: `src/report-viewer.ts`
- Smoke check: `pnpm --dir packages/engine-mcp run report:viewer:smoke`
- Optional input path: `DUNGEONBREAK_AGENT_REPORT_PATH=<path/to/report.json>`

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
