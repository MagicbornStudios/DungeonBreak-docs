# Content Creator Context Menu Refactor Notes (Phase 51)

## Goal
- Keep object-tree context menus scalable and non-duplicative.
- Move from prompt-heavy UX to submenu-driven actions.
- Ensure model/stat/canonical actions stay consistent while we iterate.

## Current changes
- Consolidated model stat actions into a reusable submenu renderer:
  - `Attach Stat Set` (checkbox list)
  - `Detach Stat Set` (checkbox list)
- Removed duplicate `Attach Stat Set` entry from model node menus.
- Namespace model folders and model nodes now use the same stat submenu source.

## Open follow-ups
- Move all context menu sections into dedicated components/files:
  - `ModelNodeContextMenu`
  - `StatsNodeContextMenu`
  - `CanonicalNodeContextMenu`
- Replace prompt-based destructive strategy chooser with a modal:
  - delete impacted canonical assets
  - replace/remap to stat set
  - cancel
- Add deterministic menu ordering and separators by action group:
  - create
  - attach/detach
  - destructive

## Guardrails
- No duplicate entries for equivalent actions.
- `Delete` label standardized for destructive actions.
- Parent model actions should always include stat attach/detach.

