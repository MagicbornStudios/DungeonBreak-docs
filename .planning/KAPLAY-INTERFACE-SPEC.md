# KAPLAY Standalone Interface Specification

**Status:** Design spec (implementation in `packages/kaplay-demo`)  
**Location:** `.planning/KAPLAY-INTERFACE-SPEC.md`  
**Source:** Demo tooling plan; reuse `.planning/PRD-tooling-gameplay-analysis.md`, `13-08-PLAN.md`, `global.css` play-grid  
**Related:** [UI Component Registry](.planning/UI-COMPONENT-REGISTRY.md) | [GRD](.planning/GRD-escape-the-dungeon.md)

---

## Agent Play and Walkthroughs

The interface must support **agent play** (not necessarily MCP-specific): automated walkthroughs, AI-like behavior, and report generation.

| Requirement | Rationale |
|-------------|-----------|
| **Structured action surface** | Agents consume `buildActionGroups`, `list_actions`-style catalogs; same schema as MCP tools |
| **Report generation** | Playthrough logs, event streams, and analysis artifacts feed balancing and content pipelines |
| **Deterministic replay** | Same seed + action script → same snapshot; required for regression and baseline comparison |
| **Text/ASCII dominant** | Low media footprint; agents parse state from text/structured output; UI stays light |
| **Room-bound topology** | No physics, colliders, or mesh grid; rooms are discrete cells; future open-world is a distinct mode |

Walkthrough-style play (scripted or AI-driven) uses the same engine APIs as human play. Reports and entertaining systems are built from emitted events, not from rendering.

---

## Composable UI: shadcn vs KAPLAY

| Build | Stack | Composable UI |
|-------|-------|---------------|
| **Docs-site `/play`** | Next.js + React | shadcn (Card, Button, etc.) — already in use |
| **KAPLAY standalone** | Single HTML, Canvas/WebGL | No shadcn (not DOM). Build primitives from KAPLAY `rect()`, `text()`, `area()`. Compose as reusable scene layers. |

**Implication:** We design UI components as *layout + behavior specs*. React build implements with shadcn; KAPLAY build implements with rect/text/area. Shared contracts (data shape, actions) come from the engine.

---

## Screen-Based Model (Pokemon-Style)

Grid mode has **distinct screens** that swap based on context:

| Screen | Trigger | Purpose |
|--------|---------|---------|
| **Navigation** | Default; moving on map | Overworld; ASCII map, move with WASD/arrows |
| **Combat** | Enter room with hostile; choose Fight | Turn-based combat UI (Pokemon-style); Fight / Flee; encounter resolution |
| **Action menu** | Interact key in room | Choose: Train, Rest, Search, Talk, Inventory, Rune Forge, etc. |
| **Rune Forge** | In rune_forge room; choose rune forge action | Rest, Inventory, Evolve skill, (future: Purchase, Re-equip) |
| **Inventory** | From action menu or Rune Forge | List items; select to view/use/equip |
| **Dialogue** | Talk / choose_dialogue | Present options; select outcome |
| **Cutscene** | Trigger fires | Blocking prose; [Continue] |

*Always accessible (when not blocked):* Status strip, Save/Load via Esc.

## Implementation Snapshot (March 1, 2026)

- KAPLAY first-person now uses compact tabs (`Actions`, `Feed`, `Status`) with a shared panel shell.
- KAPLAY navigation now uses compact tabs (`Map`, `Feed`, `Context`) so map/feed/context reuse one panel region.
- Grid discovery is persisted to local storage and reveals adjacent rooms for a light fog-of-war effect.
- Feed rendering uses tone-aware styling to distinguish chapter/scene beats, dialogue, combat, and system lines.
- Shared chip/panel/tab primitives are now implemented in `packages/kaplay-demo/src/shared.ts` and reused across scenes.
- Semantic tone tokens are standardized (`neutral`, `good`, `warn`, `danger`, `accent`) and applied consistently to buttons/chips/feed.
- Action labels are now glyph-prefixed (for example `[ATK]`, `[RUN]`, `[EVO]`, `[INV]`) using shared context mapping for reuse.
- Dialogue progression state is now tracked in UI session state (`sequence`, recent steps, latest option) and rendered in the Dialogue screen.
- Fog-of-war reveal is now formula-driven (`radius = 1 + level/comprehension/awareness factors`, clamped) and shown in the context panel.
- Scene-local header/tab setup is refactored through shared scene layout scaffolding to reduce duplicated scene bootstrapping.
- Scene rendering now uses a declarative `SceneLayout` frame (`renderSceneLayout`) for consistent header/tab composition.
- Action rendering now goes through shared `ActionRenderer` helpers (`action-renderer.ts`) for labels, tones, and action lookups.
- Reusable panel components now include `renderInfoPanel`, `renderActionListPanel`, and `renderEventLogPanel`.
- Formula logic is centralized in `formula-registry.ts` and consumed by UI systems (fog metrics).
- UI session state is now managed by `ui-state-store.ts` with local persistence for dialogue progression and derived fog state.
- Intent routing is centralized in `intent-router.ts` so action-to-scene transitions are convention-driven instead of scattered conditionals.
- Widget composition is centralized with `widget-registry.ts`, backed by `panel-schema.ts` for a constrained, portable panel schema.
- Selector layer is added (`ui-selectors.ts`) so scenes consume stable view models instead of raw state internals.
- Action intent metadata is now engine-authored via `action-intents.json` and carried through presenter action items (`uiIntent`, `uiScreen`, `uiPriority`).
- Dialogue progression is now canonical engine state (`state.dialogueProgress`) and exposed via `engine.status()` for parity across clients.
- Unreal handoff artifact is published as `.planning/UNREAL-UI-CONTRACT-PACK.v1.json`.

### Constrained Panel Schema (Unreal Parity)

- `panel-schema.ts` is intentionally limited to three primitives: `info`, `event_log`, and `action_list`.
- This is a **schema bridge**, not a full UI DSL/runtime. Rule: do not add generic expression engines or nested dynamic layout logic.
- Goal: keep panel definitions portable to Unreal UMG/Slate equivalents while preserving readability and low complexity.

---

## Design Constraints

| Constraint | Rule |
|-----------|------|
| **No media** | No images, sprites, audio. Text and ASCII only. Components and primitives only. |
| **Text-first** | Text and ASCII glyphs are the primary content; some UI (buttons, overlays) can use rect/area for interaction. |
| **RTS-like** | Top-down, discrete cells; think room-based RTS rather than physics-based action game. |
| **Single file** | Self-contained HTML with inline JS/CSS. No external deps at runtime. |
| **Engine parity** | Same `@dungeonbreak/engine` state, actions, and turn flow as `/play` React build. |
| **One action per turn** | Player commits one action; dungeon responds; autosave. |
| **Persistence** | IndexedDB or localStorage; same contract as browser `/play`. |
| **Room boundaries** | No canvas mesh, AI pathfinding grid, or colliders. Rooms are bounded cells; future open-world mode is separate. |

---

## Mode Comparison

| Aspect | First-Person Mode | ASCII Grid Mode |
|--------|-------------------|-----------------|
| **POV** | Immersive narrative; "you are in the room" | Top-down; you see the map (Pokemon-style) |
| **Primary input** | Click/tap action buttons | WASD / arrows for move; Interact key for actions |
| **Room representation** | Prose description (engine `look`), piece by piece as you walk | ASCII glyphs; one cell per room |
| **Cognitive load** | Story-focused; slow, narrative pacing | Map-focused; fast navigation; UI-based |
| **Cutscene handling** | Full-screen or overlay prose; blocking | Overlay or side pane; same blocking |
| **Status visibility** | Collapsible or sidebar; room info panel available | Compact HUD; inventory, status, room info panels |
| **Overlap** | Same engine; room info panel mirrors grid's room details | Same engine; first-person narrative available via room info |

---

## First-Person Mode

### Intent

*"It really feels like its just us and the story."* Narrative mode. One room at a time. You are described the room piece by piece as you walk—slower than grid navigation. Prose dominates. Room details (feature, exits, entities) available via an **info panel** that mirrors grid mode's room data so both modes stay aligned.

### Layout Greybox

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Escape the Dungeon                                    [First-Person] [▾] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─ Room narrative (engine.look) ────────────────────────────────────┐  │
│  │                                                                    │  │
│  │  The stone corridors smell of rust and old dust. Your boots echo   │  │
│  │  on the flagstones. Exits lead north and east. A training dummy    │  │
│  │  stands in the corner. Mira watches from the doorway.              │  │
│  │                                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Room info panel (collapsible, same data as grid mode) ────────────┐  │
│  │  [▼ Room info]  start_12_0_0 · training  │  Exits: N E  │  Mira   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Actions (grouped, scrollable) ───────────────────────────────────┐  │
│  │  [Go North]  [Go East]  [Train]  [Rest]  [Talk to Mira]  [Look]    │  │
│  │  [Save]  [Load]                                                    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─ Feed / Turn log (scrollable, newest bottom) ─────────────────────┐  │
│  │  t12 Kael move@12_start_0_0: Moved north.                           │  │
│  │  t12 Room influence: +Survival 0.02                                 │  │
│  │  ...                                                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Depth 12 · start_12_0_0  │  HP 100  Energy 0.85  Level 12  │  [▼ Status]│
└─────────────────────────────────────────────────────────────────────────┘
```

### Region Specifications

| Region | Min height | Behavior | Placeholder |
|--------|------------|----------|-------------|
| **Room narrative** | 120px | `engine.look()`; wraps; mono or serif. Piece-by-piece feel as you move. No scroll if short. | `[Room description from engine.look]` |
| **Room info panel** | 32px collapsed | roomId, feature, exits, nearby entities. Collapsible. Same source as grid mode room label. | `[Room info - roomId · feature │ Exits │ Entities]` |
| **Actions** | 80px | Grouped (Movement, Room, Dialogue, Conflict, Special). One row per group; wrap. Disabled actions show dimmed + tooltip/reason. | `[Action buttons - same groups as React /play]` |
| **Feed** | 150px | Scroll to bottom. `toFeedMessages` per turn. Compact lines. | `[tN] Actor action@room: message` |
| **Footer status** | 36px | Inline: depth, roomId, HP, Energy, Level. Expandable "[▼ Status]" → full traits/features/nearby. | `Depth N · roomId  │  HP  Energy  Level  │  [▼]` |

### Expected User Behavior (First-Person)

1. **Read** room text; infer context (exits, features, entities).
2. **Optionally** expand room info panel for structured data (aligned with grid).
3. **Choose** one action per turn via button click.
4. **Scan** feed for outcome; optionally expand status.
5. **Cutscene:** Modal or overlay blocks actions until dismissed; prose only.
6. **Save/Load:** Utility actions always available; no confirmation unless load overwrites.

### Styling Constraints

- **Font:** Monospace for feed/status; serif or system for narrative (optional).
- **Colors:** Dark background (e.g. `#0f172a`), light text; accent for actions.
- **Spacing:** 8px–16px padding; 4px gap between buttons.
- **No animations** beyond optional fade for cutscenes.

---

## ASCII Grid Mode

### Intent

Pokemon-style top-down grid. Fast navigation. Movement is primary; actions appear only after pressing the **Interact key** (E or Space). More UI-based than first-person: varying panels for inventory, status, room info, action menu. Engine overlap with first-person where possible (same actions, same state).

### Map Granularity

**One cell = one room.** Engine model: 50 rooms per level, 5×10 grid. Each room is a single cell. No tile subdivision within rooms.

### Layout Greybox

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Escape the Dungeon                                                    [ASCII Grid] [▾]  │
├──────────────────────────────┬────────────────────────────────────────────────────────────┤
│                              │  ┌─ Room info ──────────────────────────────────────────┐ │
│  ┌─ ASCII Map ─────────────┐ │  │  L12_R042 · training  │  Exits: N S E W  │  Mira    │ │
│  │  #####  #####  #####     │ │  └──────────────────────────────────────────────────────┘ │
│  │  #.##   #.@.   #...     │ │                                                           │
│  │  #.T#   #.D#   #.E#     │ │  ┌─ Action menu (Interact key) ─────────────────────────┐ │
│  │  #####  #####  #####     │ │  │  [Train] [Rest] [Search] [Talk] [Inventory] ...      │ │
│  │                          │ │  │  E/Space: actions  │  WASD/arrows: move             │ │
│  │  # = undiscovered        │ │  └─────────────────────────────────────────────────────┘ │
│  │  . = floor  @ = you      │ │                                                           │
│  └──────────────────────────┘ │  ┌─ Feed (3–5 lines) ──────────────────────────────────┐ │
│                              │  │  t12 move north. +Survival 0.02                      │ │
│  ┌─ Inventory panel ───────┐ │  └──────────────────────────────────────────────────────┘ │
│  │  Worn Blade, Treasure    │ │                                                           │
│  │  [▼ Expand]             │ │  ┌─ Status (collapsible) ───────────────────────────────┐ │
│  └──────────────────────────┘ │  │  HP 100  E 0.85  Lv12  Traits...  [▼]                │ │
├──────────────────────────────┴──┴────────────────────────────────────────────────────────┘ │
│  Depth 12  HP 100  E 0.85  Lv12  │  [▼ Full status]                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### ASCII Glyph Convention

| Glyph | Meaning |
|-------|---------|
| `#` | **Undiscovered** (room not yet visited) |
| `.` | Floor (discovered, empty/passable) |
| `@` | Player (Kael) |
| `E` | Hostile entity |
| `D` | Dungeoneer |
| `^` | Level exit |
| `R` | Rune forge room |
| `T` | Treasure room |
| `*` | Training room |
| `~` | Rest room |
| ` ` | Empty / out of view |

*Undiscovered rooms render as `#` until the player enters them; then they show the appropriate feature glyph or `.`.*

### Discovery and Fog of War

**Visited set:** Track room IDs the player has entered. **Revealed set:** Visited plus rooms within `fogRadius` steps (Manhattan or Chebyshev distance on the grid).

**FOG_RADIUS is formulaic:** Derived from player attribute(s) and/or trait(s), not a fixed constant. Implementation should make the formula easy to swap. Candidate inputs:

- `insight` (attribute) — perception, scouting
- `Awareness` (feature) — situational awareness

Example stub: `fogRadius = 1 + floor(insight / 6)` (min 1, max TBD). Exact formula TBD; contract: `fogRadius(state) -> number`.

### Input

| Input | Action |
|-------|--------|
| **WASD** or **Arrow keys** | Move (one keypress = one turn) |
| **[x]** | Open action menu (train, rest, search, talk, fight, etc.); actions consume turns |
| **[e]** | Equipment panel (what is equipped; slot restrictions) — no turn |
| **[b]** | Bag (inventory; everything carried) — no turn |
| **[i]** | Info (current room + character status) — no turn |
| **[s]** | Skills (list + evolution tabs) — no turn |
| **Esc** | Close overlay / system menu (save, load, quit) |

### Region Specifications

| Region | Min size | Behavior | Placeholder |
|--------|----------|----------|-------------|
| **ASCII map** | 400×300px | One cell per room; 5×10 per level. Centered on player. Glyphs per convention. | `[ASCII map - 5×10, # . @ E D R T ...]` |
| **Room info** | 1–2 lines | roomId, feature, exits, nearby entities. Same data as first-person room info panel. | `roomId · feature │ Exits │ Entities` |
| **Action menu** | 80px | **Only visible after Interact key.** Grouped actions; inventory access. | `[Actions]  │  E/Space: actions, WASD: move` |
| **Inventory panel** | 48px collapsed | List item names; expand for details. Engine: `entity.inventory`. No explicit "equip" in engine—weapon auto-used in combat. | `[Inventory - items]  [▼]` |
| **Feed** | 60px | Last 3–5 lines; scroll optional. | `[Compact feed]` |
| **Status panel** | 48px collapsed | HP, Energy, Level, traits, features. Collapsible. | `HP E Lv  │  [▼]` |
| **Footer** | 24px | Depth, HP, Energy, Level. Expand for full status. | `Depth HP E Lv  │  [▼]` |

### Expected User Behavior (ASCII Grid)

1. **Move** with WASD or arrows; one keypress = one turn.
2. **Press Interact (E/Space)** to open action menu; then choose train, rest, talk, fight, search, inventory, etc.
3. **View inventory** via action menu or dedicated panel; engine supports viewing, no explicit equip (weapon auto-used in combat).
4. **Combat/dialogue:** Modal or overlay; no movement until resolved.
5. **Cutscene:** Same blocking overlay as first-person; map dimmed or hidden.
6. **Save/Load:** Via Esc menu or footer.

### Engine Support vs. Desired (Grid Mode)

| Feature | Engine support | Notes |
|---------|----------------|-------|
| Inventory display | ✅ `entity.inventory` | List items by name, tags (weapon, armor, loot) |
| Equip | ❌ No explicit action | Weapon auto-selected in combat from inventory |
| Room info | ✅ Room feature, exits, entities | Same as first-person room info |
| Actions | ✅ Full catalog | All actions available via Interact menu |
| Movement | ✅ move action | WASD/arrows map to move directions |

*Future: "equip" or "use item" could be added to engine if needed for grid UX.*

### Varying Components (Grid Mode)

Grid mode needs multiple display components that first-person can omit or collapse:

- **Map view** (primary)
- **Room info** (always visible or one click)
- **Action menu** (on Interact)
- **Inventory panel** (list + expand)
- **Status panel** (compact + expand)
- **Feed** (compact)

### Styling Constraints

- **Font:** Monospace only (e.g. `Consolas`, `JetBrains Mono`). Fixed width per glyph.
- **Cell size:** 12–14px; grid aligns to character boundaries.
- **Colors:** Dark bg; `#` undiscovered (dim); `.` floor (mid); `@` player (bright); entities distinct.
- **No sprites:** Pure text/ASCII.

---

## Mode Switching

| Element | Behavior |
|---------|----------|
| **Entry** | Mode selector at launch: "First-Person" or "ASCII Grid". Persist choice to localStorage. |
| **Runtime** | Header dropdown `[First-Person ▼]` / `[ASCII Grid ▼]`; switch reloads scene with same game state. |
| **State** | Switching preserves engine snapshot; only layout/input change. |
| **First-person mode** | Reuses components; no grid. Descriptive only: what was done, dialogue, narrative. Same game, gridless UI. |
| **Grid mode** | ASCII map, panels. Both modes follow Act 1 / Act 2 / Act 3 and chapter structure. |

## Opening Narrative and Chapter Flow

- **Game start:** Narrative from player's perspective: they find themselves at the bottom of the dungeon, not knowing why or how, trying to escape. Shown as opening cutscene or initial dialogue.
- **Chapter complete:** Cutscene when ascending depth (e.g. "Chapter Closed"). Per-chapter boss cutscenes are content-driven.

---

## Cutscene Handling (Both Modes)

| Constraint | Rule |
|------------|------|
| **Blocking** | No actions until cutscene dismissed. |
| **Content** | Title (bold) + prose (italic or plain). No images. |
| **Dismiss** | Single "[Continue]" or click/tap. |
| **Placeholder** | `*** Title ***` `[Cutscene prose...]` `[Continue]` |

---

## Placeholder Summary (For Greyboxing)

```
FIRST-PERSON:
- [Room narrative - engine.look, piece by piece]
- [Room info panel - roomId, feature, exits, entities; collapsible]
- [Action buttons - grouped]
- [Feed - scrollable log]
- [Footer - depth, hp, energy, level, status expand]

ASCII GRID:
- [ASCII map - # undiscovered, . floor, @ E D R T * ~ ^]
- [Room info - same as first-person]
- [Action menu - Interact key only]
- [Inventory panel - list items, expand]
- [Status panel - compact, expand]
- [Feed - 3-5 lines]
- [Footer - compact]
```

---

## Engine Overlap (Both Modes)

| Shared | Source |
|--------|--------|
| Room description | `engine.look()` |
| Room metadata | roomId, feature, exits, nearby entities from snapshot |
| Actions | `buildActionGroups(engine)`; same catalog |
| Turn flow | One action per turn; `engine.dispatch`; `toFeedMessages` |
| State | Traits, features, inventory, skills, cutscenes |
| Persistence | IndexedDB/localStorage; same contract |

First-person room info panel and grid room info use identical data. Narrative (engine.look) is first-person emphasis; grid can surface it in room info expand if desired.

---

## Differences from React /play

| React /play | KAPLAY Standalone |
|-------------|-------------------|
| 3-column (actions \| feed \| status) | Vertical stack or split (first-person); map + panels (grid) |
| Assistant UI feed | Plain text feed; same `toFeedMessages` |
| shadcn Card components | Rect/text only; no component library |
| Cutscene modal (Radix) | Custom overlay or scene |
| No mode switch | First-person vs ASCII grid |
| Actions always visible | First-person: buttons; Grid: Interact key only |
| Docs-site embedded | Single HTML; no Next.js |

---

## Future: Open-World Mode

Current design is **room-confinement**: discrete rooms, 5×10 per level, no free movement or physics. A future **open-world mode** will relax these constraints:

- Continuous space, mesh grid, or pathfinding
- Colliders and movement boundaries beyond room edges
- New game mode; not a drop-in replacement for room topology

Until then, all KAPLAY interfaces assume room-bound play. Open-world will be documented as a separate mode when scoped.

---

## Reference Layout (React /play grid)

Current CSS from `global.css`:
- `play-grid`: `minmax(250px,300px) | minmax(520px,1fr) | minmax(280px,360px)` at 72vh
- First-person: narrative replaces center; actions left; feed below or right.
- ASCII: map occupies center; side panel(s) for room info, inventory, status; action menu on Interact.

---

## Screen Specifications (Stubs)

*Full layouts in [UI Component Registry](.planning/UI-COMPONENT-REGISTRY.md).*

### Combat Screen (Pokemon-Style)

Encounter UI when player chooses Fight. Turn-based; player picks Fight or Flee each turn until resolution.

```
┌─────────────────────────────────────────────────────────────────┐
│  COMBAT                                    Depth 12 · L12_R042   │
├─────────────────────────────┬───────────────────────────────────┤
│  Enemy: Hostile_001         │  Kael  HP ████████░░ 100/100     │
│  HP ████░░░░░░ 40/80        │  Energy 0.85  Level 12            │
│  Level 10                   │                                   │
│  [Enemy sprite placeholder]  │  [Player placeholder]             │
├─────────────────────────────┴───────────────────────────────────┤
│  [Fight]  [Flee]  [Item]  [Skill]  (Item/Skill stubbed for future)│
├───────────────────────────────────────────────────────────────────┤
│  t45 Kael fights. Hostile_001 takes 12 damage.                    │
└───────────────────────────────────────────────────────────────────┘
```

**Engine hook:** `fight`, `flee` actions. Combat resolution is internal; UI displays outcome from `toFeedMessages`.

### Rune Forge Screen

When in `rune_forge` room and player selects "Rune Forge" from action menu.

```
┌─────────────────────────────────────────────────────────────────┐
│  RUNE FORGE                             L12_R031 · rune_forge   │
├─────────────────────────────┬───────────────────────────────────┤
│  [Rest]  [Inventory]        │  Evolve skill                     │
│  [Evolve skill]             │  ┌─────────────────────────────┐   │
│  (Purchase — future)        │  │ Appraisal → Deep Appraisal  │   │
│  (Re-equip — future)        │  │   Requires: Insight 7, ...   │   │
│                             │  │ [Evolve]                    │   │
│                             │  └─────────────────────────────┘   │
├─────────────────────────────┴───────────────────────────────────┤
│  HP 100  E 0.85  [▼ Status]                                       │
└───────────────────────────────────────────────────────────────────┘
```

**Engine hook:** `rest`, `evolve_skill`; `buildActionGroups` filters by room feature. Purchase/requip stubbed.

### Inventory Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  INVENTORY                                                       │
├───────────────────────────────────────────────────────────────────┤
│  Worn Blade (weapon)     Common    [Select] [Drop — future]       │
│  Treasure Cache (loot)    Rare      [Select]                       │
│  — empty slots —                                                  │
├───────────────────────────────────────────────────────────────────┤
│  [Back]                                                          │
└───────────────────────────────────────────────────────────────────┘
```

**Engine hook:** `entity.inventory`; item tags (weapon, armor, loot). Equip/Drop stubbed.

### Dialogue Screen

```
┌─────────────────────────────────────────────────────────────────┐
│  Mira: "The forge is safe. Rest while you can."                  │
├───────────────────────────────────────────────────────────────────┤
│  [Loot the treasure cache]                                       │
│  [Say: I wish something else was here]                           │
│  [Appraise the cache seals]                                      │
├───────────────────────────────────────────────────────────────────┤
│  [Back]                                                          │
└───────────────────────────────────────────────────────────────────┘
```

**Engine hook:** `choose_dialogue`; options from dialogue clusters by vector distance.
