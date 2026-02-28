# Phase 11-01 Summary

## Delivered

- Added schema-backed content packs:
  - `archetypes.json`
  - `dialogue-clusters.json`
  - expanded `skills.json`
  - expanded `items.json`
- Added archetype runtime module and integrated turn-by-turn archetype refresh.
- Exposed archetype heading/compass through engine status and `/play` status panel.
- Switched default skill/dialogue director initialization to contract-driven packs.
- Added deterministic balancing harness APIs and scripts:
  - `simulateBalanceRun`
  - `simulateBalanceBatch`
  - package/docs reporting scripts
- Added/updated tests for Phase 11 content and harness behavior.

## Verification Evidence

- `pnpm --dir packages/engine run build`
- `pnpm --dir packages/engine run test:replay-smoke`
- `pnpm --dir packages/engine run test:balance-harness`
- `pnpm --dir docs-site run test:unit`
- `pnpm --dir docs-site run build`
- `pnpm --dir docs-site exec playwright test`

## Notes

- Package replay fixture hash advanced due Phase 11 runtime/content changes and was updated in package fixtures.
- Docs-site local-engine fixture remains independently hash-locked for local runtime tests.
