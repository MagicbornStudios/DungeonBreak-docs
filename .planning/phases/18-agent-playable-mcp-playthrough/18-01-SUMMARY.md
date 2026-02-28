# Phase 18-01 Summary

## Delivered

- Added machine-playable MCP server package: `packages/engine-mcp`.
- Exposed gameplay tools:
  - `create_session`
  - `list_sessions`
  - `delete_session`
  - `get_status`
  - `get_snapshot`
  - `restore_snapshot`
  - `list_actions`
  - `dispatch_action`
  - `get_log_page`
- Implemented in-memory deterministic session store over canonical `GameEngine` API.
- Added local MCP config installer: `scripts/install-mcp-config.mjs`.
- Added root scripts for MCP workflows and updated docs.

## Validation

- `pnpm --dir packages/engine-mcp run typecheck`
- `pnpm --dir packages/engine-mcp run build`
- `node scripts/install-mcp-config.mjs --target all --dry-run`
- `node scripts/install-mcp-config.mjs --target all`

## Follow-up (Phase 18-02)

- Completed in `18-02-SUMMARY.md`:
  - >= 75-turn dense deterministic fixture and hash lock
  - repeated-run determinism regression checks
  - `/play` presenter and MCP action parity smoke checks
