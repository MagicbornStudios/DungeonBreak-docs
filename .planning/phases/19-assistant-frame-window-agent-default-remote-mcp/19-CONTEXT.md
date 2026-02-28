# Phase 19 Context: Assistant Frame Window-Agent Support + Default Remote MCP

## Outcome

Support in-window agent control of `/play` through Assistant Frame-compatible wiring while keeping remote MCP (`/api/mcp`) available by default for signed-in users.

## Constraints

- `/play` must remain fully playable with normal button interactions.
- Remote MCP is enabled by default in deployed runtime.
- Auth/hardening controls must enforce signed-in access for remote MCP without breaking local/browser-only gameplay paths.
- No OpenAPI generation work in this phase.

## Non-goals

- Removing local/browser-only agent play paths.
- Replacing existing stdio MCP or DOM/button play paths.

## DoD Signals

- Assistant Frame bridge path exists and is documented.
- Tests cover frame-dispatch or frame-host fallback behavior.
- Remote MCP signed-in access and hardening baseline are documented.
- Version-coupled play reports and test pass/fail manifests are defined for release artifacts.
