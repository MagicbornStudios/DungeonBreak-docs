# Phase 18-02 Summary

## Delivered

1. Replay harness setup support:
- Added `ReplayFixtureSetup` support in `packages/engine/src/escape-the-dungeon/replay/harness.ts`.
- Added `applyReplayFixtureSetup(...)` export for shared setup semantics.

2. Dense deterministic fixture:
- Added `packages/engine/test-fixtures/canonical-dense-trace-v1.json`.
- Fixture uses canonical seed, setup preconditions, and 75 actions.
- Expected snapshot hash is locked.

3. Determinism + coverage smoke:
- Updated `packages/engine/scripts/replay-smoke.mjs` to validate:
  - baseline + dense fixtures
  - rerun determinism
  - dense coverage constraints (action-type coverage, cutscene and warning presence)

4. MCP parity smoke:
- Added `packages/engine-mcp/scripts/parity-smoke.ts`.
- Validates presenter vs MCP action-type parity and dense fixture hash parity through MCP dispatch.
- Added `test:parity-smoke` script to `packages/engine-mcp/package.json`.

5. CI wiring:
- Updated `.github/workflows/docs-browser-game.yml` to run MCP parity smoke.
- Updated `.github/workflows/engine-package-release.yml` to install/typecheck engine-mcp and run MCP parity smoke.

6. Consumer test coverage:
- Added `docs-site/tests/fixtures/canonical-dense-trace-v1.json`.
- Expanded `docs-site/tests/unit/package-consumer.test.ts` with dense fixture replay assertions.

## Validation Run

- `pnpm --dir packages/engine run typecheck`
- `pnpm --dir packages/engine run build`
- `pnpm --dir packages/engine run test:replay-smoke`
- `pnpm --dir packages/engine-mcp run typecheck`
- `pnpm --dir packages/engine-mcp run test:parity-smoke`
- `pnpm --dir docs-site run test:unit`

All passed locally.

## Outcome

Phase 18 closure criteria are satisfied:

- REQ-77: dense >=75-turn deterministic suite: complete
- REQ-78: deterministic regression on repeated runs: complete
- REQ-80: `/play` vs MCP behavior parity checks: complete
