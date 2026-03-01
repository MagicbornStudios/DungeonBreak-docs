# KAPLAY UI Architecture Conventions

## Core Conventions

- `theme-tokens.ts`: single source for palette, tones, feed colors, and action glyph tokens.
- `scene-layout.ts`: scene frame composition (header + tabs).
- `intent-router.ts`: action/hotkey intent to scene transitions.
- `action-renderer.ts`: action label/tone/type helpers.
- `panel-components.ts`: concrete reusable panel rendering primitives.
- `panel-schema.ts`: constrained schema bridge (`info`, `event_log`, `action_list`) for portability.
- `widget-registry.ts`: named widget composition over panel schema/primitives.
- `ui-state-store.ts`: persistent UI session state.
- `ui-selectors.ts`: stable view-model selectors for scene rendering.
- `formula-registry.ts`: centralized formulas for derived UI mechanics.

## Boundaries

- Scenes (`first-person.ts`, `grid.ts`) orchestrate only:
  - input hooks
  - screen-local layout order
  - calls to widgets/panels/selectors/router
- Scenes should avoid:
  - hardcoded style values
  - duplicated action routing logic
  - direct formula logic
  - ad-hoc state derivations from raw data where selectors exist

## Anti-Overengineering Rules

- Keep `panel-schema.ts` intentionally small and explicit.
- No generic expression/evaluation engine in schema.
- Add new schema kinds only when reused in at least two screens.
- Prefer adding a selector/widget before adding scene-local branching.
