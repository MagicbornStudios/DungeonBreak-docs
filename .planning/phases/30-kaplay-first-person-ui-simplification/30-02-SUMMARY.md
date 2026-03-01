# Phase 30-02 Summary: Unclosed Tags Fix + Layout Reuse

## Done

1. **Fixed WASD keyboard hint** — Wrapped `[WASD] Move | [E] Actions | ...` in `escapeKaplayStyledText()` in `grid.ts` line 346
2. **Escaped addHeader title** — Header titles now escaped for consistency
3. **Documented escape convention** — Comment in `escape-kaplay-tags.ts`: any string with `[` or `]` passed to `k.text()` must use `escapeKaplayStyledText()`
4. **Layout reuse note** — KAPLAY-INTERFACE-SPEC now describes shared shell (header/left/right/center); center swaps map vs narrative; player `@` and entity glyphs documented

## Files Changed

- `packages/kaplay-demo/src/grid.ts`
- `packages/kaplay-demo/src/shared.ts`
- `packages/kaplay-demo/src/escape-kaplay-tags.ts`
- `.planning/KAPLAY-INTERFACE-SPEC.md`

## Verification

- `pnpm --dir packages/kaplay-demo run build` ✓
