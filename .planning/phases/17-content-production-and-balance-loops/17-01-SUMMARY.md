# Phase 17-01 Summary

## Delivered

1. Long-run deterministic simulation APIs:
- Added `simulateLongRunSuite(...)` in engine simulation harness.
- Added 100/250/500-turn window support with deterministic seed sets.

2. Balance artifact expansion:
- Aggregate metrics now include survival rate, turn-time metrics, and dead-action detection.
- Added engine script `test:long-run-suite` outputting `packages/engine/test-reports/long-run-balance-report.json`.
- Updated docs-site balance report script to emit long-run suite output.

3. CI integration:
- Engine workflow now runs long-run suite in package checks.
- Docs workflow now emits/uploads balance simulation report artifact.

4. Agent play bootstrap:
- Added deterministic MCP agent runner (`npm run agent:play`) with repeated-run determinism check.
- Runner writes `.planning/test-reports/agent-play-report.json`.

## Verification

- `pnpm --dir packages/engine run typecheck`
- `pnpm --dir packages/engine run build`
- `pnpm --dir packages/engine run test:replay-smoke`
- `pnpm --dir packages/engine run test:long-run-suite`
- `pnpm --dir packages/engine-mcp run typecheck`
- `pnpm --dir packages/engine-mcp run test:parity-smoke`
- `pnpm --dir packages/engine-mcp run agent:play`
- `pnpm --dir docs-site run typecheck`
- `pnpm --dir docs-site run test:unit`

All passed locally.

## Remaining (Phase 17-02+)

- Expand schema-driven authored content packs (quests/events/dialogue/items/skills).
- Tune pressure/perf with expanded content and close REQ-74.
