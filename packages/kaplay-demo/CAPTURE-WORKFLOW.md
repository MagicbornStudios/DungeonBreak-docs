# KAPLAY Capture Workflow

Use this when you want a quick visual regression set for the standalone KAPLAY UI.

1. Start the standalone server:
   `pnpm --dir packages/kaplay-demo run dev:standalone`
2. In another terminal, capture the key scenes:
   `pnpm --dir packages/kaplay-demo run capture:ui`
3. Review output in:
   `packages/kaplay-demo/test-reports/kaplay-ui-captures`

Artifacts:
- `01-navigation.png`
- `02-bag.png`
- `03-journal.png`
- `04-spellbook.png`
- `05-stats.png`
- `06-equipped.png`
- `manifest.json`

Primary regression artifact:
- `manifest.json` captures scene order, overlay targets, visible debug-button labels, and recent debug events for each captured scene.

Best-effort visual artifact:
- the PNG files are useful when headless Chromium successfully renders the KAPLAY canvas
- some environments may still produce flat captures for WebGL/canvas output, so the manifest is the reliable baseline gate

Current scope:
- captures the primary non-combat release path
- relies on the in-canvas debug button registry already used by `smoke:ui`
- is meant for quick regression comparison, not pixel-perfect golden image enforcement

Known follow-ups:
- add combat and rune-forge captures once those scene states are made directly scriptable from the standalone boot flow
- add a docs-site release checklist that links the latest capture set with UI polish notes
