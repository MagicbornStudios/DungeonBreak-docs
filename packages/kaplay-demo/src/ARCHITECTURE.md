# KAPLAY UI Architecture Conventions

## Core Conventions

- `theme-tokens.ts`: single source for palette, tones, feed colors, and action glyph tokens.
- `ui/atoms.ts`: smallest reusable rendering pieces (surface, text, divider, button surface, keycaps).
- `ui/molecules.ts`: composed text rows/headers/hints/key legends.
- `ui/organisms.ts`: scene-level reusable sections (command panel, room brief, three-column shell).
- `scene-layout.ts`: scene frame composition (header + tabs).
- `intent-router.ts`: action/hotkey intent to scene transitions.
- `action-renderer.ts`: action label/tone/type helpers.
- `panel-components.ts`: concrete reusable panel rendering primitives.
- `panel-schema.ts`: constrained schema bridge (`info`, `event_log`, `action_list`) for portability.
- `panel-formulas.ts`: lightweight numeric/tone formulas for panel sizing and context severity.
- `scene-blocks.ts`: reusable scene-local block builders that emit constrained `PanelSchema`.
- `widget-registry.ts`: named widget composition over panel schema/primitives.
- `ui-state-store.ts`: persistent UI session state.
- `ui-selectors.ts`: stable view-model selectors for scene rendering.
- `@dungeonbreak/engine` `formulaRegistry`: centralized formulas for derived UI mechanics.

## Boundaries

- Scenes (`first-person.ts`, `grid.ts`) orchestrate only:
  - input hooks
  - screen-local layout order
  - calls to atoms/molecules/organisms/widgets/selectors/router
- `grid.ts` uses shared frame helpers (`renderGridFrame`, `renderGridFooter`) to keep scene composition consistent.
- Scenes should avoid:
  - hardcoded style values
  - hand-built repeated panel structures that already exist as organisms
  - duplicated action routing logic
  - direct formula logic
  - ad-hoc state derivations from raw data where selectors exist
  - hand-assembling repeated info lines when a reusable scene block exists

## Game UI Boundary

- Escape the Dungeon gameplay UI lives entirely inside KAPLAY.
- React/docs-site is not a second gameplay UI layer.
- `docs-site` may host or embed the built KAPLAY output, but that host surface is transport only, not the source of in-game HUD/menu/dialogue/combat UI.
- The current iframe usage is a temporary delivery shell for the docs route; gameplay UX fixes belong in KAPLAY scenes, shared organisms, routing, and scene flow.
- Standalone iteration should target the served `packages/kaplay-demo/dist` build first, then mirror into `docs-site/public/game` as needed.

## Anti-Overengineering Rules

- Keep `panel-schema.ts` intentionally small and explicit.
- No generic expression/evaluation engine in schema.
- Add new schema kinds only when reused in at least two screens.
- Prefer adding a selector/widget before adding scene-local branching.
