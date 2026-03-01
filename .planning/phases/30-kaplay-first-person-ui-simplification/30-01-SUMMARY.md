# Phase 30-01 Summary: Kaplay First-Person UI Simplification

## Done

1. **Quick View → Utility** — Renamed the system-action group in `packages/engine` and `docs-site/lib` presenters
2. **Removed Feed and Status tabs** — First-person scene now shows only Actions; no tab bar
3. **Simplified first-person layout** — Single flow: header → look panel → room info → actions → compact event log → footer
4. **Default to grid** — `main.ts` now calls `k.go("gridNavigation")` on boot
5. **Mode switching** — [2] from first-person → grid; [1] from grid → first-person (unchanged)

## Files Changed

- `packages/engine/src/escape-the-dungeon/ui/presenter.ts`
- `docs-site/lib/escape-the-dungeon/ui/presenter.ts`
- `packages/kaplay-demo/src/main.ts`
- `packages/kaplay-demo/src/first-person.ts`

## Verification

- `pnpm --dir packages/engine run typecheck` ✓
- `pnpm --dir packages/kaplay-demo run typecheck` ✓
- `pnpm --dir packages/kaplay-demo run build` ✓
- `pnpm --dir docs-site run typecheck` ✓
