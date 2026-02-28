# Phase 18 Context: Agent-Playable Playthrough and MCP Interface

## Outcome

Enable coding agents to play Escape the Dungeon through a stable machine interface and validate a dense deterministic playthrough with broad interaction coverage.

## Constraints

- Engine behavior must stay aligned between browser `/play` and agent automation paths.
- Deterministic runs must remain reproducible from seed + action script.
- No backend gameplay logic divergence from canonical engine package.

## Non-goals

- Free-form natural language parser as primary interface.
- Replacing browser UX with agent-only flows.

## DoD Signals

- MCP adapter exposes create/state/actions/dispatch tools.
- >= 75-turn deterministic scripted playthrough suite passes.
- Agent regression tests show stable outputs across repeated runs.
- Docs define exact tool schemas and error semantics.
