# Phase 17-02 Summary

## Status

Completed. Phase 17 content expansion and long-run balancing closure are complete.

## Delivered

1. Added schema-driven contract packs for authored quest and event growth:
- `packages/engine/src/escape-the-dungeon/contracts/data/quests.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/events.json`
- corresponding JSON schemas and runtime validation/exports.
2. Wired engine quest/event progression to data contracts instead of hardcoded growth tables.
3. Re-validated long-run deterministic suites and report generation paths.
4. Closed REQ-71 and REQ-74 with traceability updates.

## Verification

- `pnpm --dir packages/engine run test:long-run-suite`
- `pnpm --dir docs-site run report:balance-sim`
- `pnpm --dir docs-site run report:vector-usage`
