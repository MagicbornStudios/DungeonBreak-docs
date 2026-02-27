# PRD: Escape the Dungeon (Adventurelib-Based Dungeon Crawler Demo)

## Document Status

- Owner: DungeonBreak docs/lab team
- Date: 2026-02-26
- Status: Working v5 (phase 09 implementation integrated)
- Location rule: PRD lives in `.planning` (not `docs/`)

## Product Name

**Escape the Dungeon**

## Product Vision

A modular, extendable Python text-adventure dungeon crawler, playable in Jupyter, where:

- We start at the lowest dungeon level as **Kael**.
- The player is unaware there are **12 total levels** to escape.
- Each level is navigated as a room graph.
- NPC entities simulate in the background (Sims-like), performing the same action classes as the player.
- Narrative state uses traits/features (vector slice), chapter logs, and act progression.

## Core Premise

Kael awakens in the deep dungeon and must climb to the surface through 12 levels. Every action by Kael and NPCs contributes to chapter pages; four completed chapters form one act.

## Scope

### In Scope (Current Demo Slice)

- Vendored **adventurelib** as base text-adventure engine.
- Domain-based modular architecture:
  - `world` (levels, rooms, navigation)
  - `entities` (player/NPC state, traits, attributes, inventory)
  - `player` (action intent types)
  - `combat` (spar/encounter system)
  - `narrative` (dialogue, chapter pages, act logic, embeddings projection)
  - `engine` (orchestration, shell integration, notebook bootstrap)
- 12-level dungeon world generation with **50 rooms per level**.
- Room features (training, dialogue, rest, treasure, combat, stairs, escape gate).
- Quest tracking.
- Chapter/act/page logging for player and each NPC.
- Embeddings-backed trait projection with deterministic fallback provider.
- Dialogue-space ranges and cluster-based option availability.
- CLI play loop entry for terminal gameplay.
- Cutscene/event presentation planning for major milestones.
- Action filtering/gating planning based on prerequisites.
- Fame + livestream planning with effort cost economy.

### Out of Scope (This Slice)

- Full Unreal gameplay parity.
- Networked multiplayer.
- Full content-authoring pipeline and advanced UI/FX.

## Definitive Concepts in Code

1. **World Topology**
- Dungeon depth from level 12 (start) to level 1 (escape gate level).
- Each level contains exactly 50 rooms.
- Each level has one start room and one exit room.

2. **Action Economy**
- Core actions: move, train, talk, rest, search, speak-intent, fight.
- NPCs run background actions after player turns.

3. **Traits/Attributes/Items**
- Traits are vector-like feature state (from canonical trait names).
- Attributes are RPG scalar stats (might, agility, insight, willpower).
- Items are discoverable per room and move into inventory.
- Rooms and items both carry vectors that can influence entity vectors.

4. **Narrative Structure**
- Each dungeon level maps to one chapter.
- 4 chapters = 1 act.
- Chapter logs contain:
  - global chapter page
  - per-entity page (Kael + each NPC)
- Both player and NPC actions write to pages.

5. **Embeddings Projection**
- Free-text intent is projected to trait deltas using an embedding provider.
- Fallback provider must work offline/no-model-install.
- DeeDs use canonical text -> embedding -> anchor projection with per-feature caps and global turn budget.

6. **Dialogue Space**
- Dialogue options are anchored to vectors.
- Options belong to clusters with radius ranges.
- Room state conditions (for example item present/absent) can enable/disable options.

7. **Cutscene and Event Presentation**
- High-signal events can trigger authored scene text blocks ("cutscenes").
- Cutscenes can be triggered by specific items, quest transitions, stat milestones, or major world events.
- Cutscene events are written to chapter pages so story history is auditable.

8. **Action Availability Filtering**
- Every action and dialogue option can declare prerequisites.
- Prerequisites may depend on room state, inventory, attributes, traits, skills, entity state, or other entities.
- UI/shell must only present currently available actions/options.

9. **Skills as Vector-Bound Build Layer**
- Skills exist in narrative space and carry vector profiles.
- Skill unlock/use depends on vector distance + prerequisites.
- Item + room + entity combinations can create emergent build paths.

10. **Livestream Economy**
- `Fame` is a feature/trait in the vector set.
- Action: `live_stream`.
- Action cost: spend `Effort` 10 per turn.
- Livestream outcomes can influence Fame, dialogue options, and quest opportunities.
- Fame gain is deterministic from context formula components (room interest, novelty, risk, momentum/skill bonus, diminishing returns).

## Architecture Requirements

### Required Domain Split

- No monolithic text-adventure file.
- Game logic must be separated by domain packages.
- Notebook should call engine APIs, not contain business logic.

### Engine Base Requirement

- `adventurelib` is vendored from:
  - `https://github.com/lordmauve/adventurelib`
- We do not contribute upstream for this project slice.
- Our engine layer extends vendored behavior locally.

### Engineering Practices

- OOP for stateful orchestration (`EscapeDungeonGame`, session/shell objects).
- Functional/pure utility style where practical (projection/math transforms).
- DRY + SOLID for interfaces and extension points.

## Gameplay System Requirements

1. GR-01: Start game at depth 12 as `Kael`.
2. GR-02: Dungeon has 12 levels; player-facing UI does not reveal full count by default.
3. GR-03: Every level has 50 rooms, exactly one start room, and exactly one exit room.
4. GR-04: Specific room capabilities exist (train, talk, rest, search/combat, travel).
5. GR-05: NPCs simulate in background and can move/train/talk/rest/speak.
6. GR-06: Items, traits, attributes, quests all exist in runtime model.
7. GR-07: Chapter page logs persist per chapter for all entities.
8. GR-08: 4 completed chapters mark act completion.
9. GR-09: Embeddings intent path updates trait vector slice.
10. GR-10: Room vectors + present item vectors influence entities each turn.
11. GR-11: Dialogue options are range-gated by vector distance and room/item conditions.
12. GR-12: High-signal events can trigger cutscene pop-ups with authored text.
13. GR-13: Action and dialogue visibility are filtered by prerequisite checks.
14. GR-14: Skills are represented in narrative space and can unlock emergent action builds.
15. GR-15: Livestream action exists and consumes 10 effort per turn while modifying Fame and related systems.

## Demo UX Requirements (Notebook)

1. UX-01: One-call startup from notebook.
2. UX-02: Interactive controls for movement + core actions.
3. UX-03: Live status panel (depth, chapter, act, stats, quests).
4. UX-04: Event stream includes NPC background actions.
5. UX-05: Chapter page snippets viewable in notebook.
6. UX-06: Dialogue option ids can be listed and chosen in notebook.
7. UX-07: Quest/cutscene events are presented distinctly from normal logs.
8. UX-08: Unavailable actions are hidden or shown with clear prerequisite reasons.

## CLI Requirements

1. CLI-01: Provide a direct terminal entry (`escape-the-dungeon`).
2. CLI-02: CLI supports look/status/movement/core actions/options/choose/pages.
3. CLI-03: CLI supports `stream` action and clearly reports effort/fame effects.

## Definition of Done

The current slice is done when:

1. **Engine and Architecture**
- Vendored `adventurelib` clone exists in repo.
- Modular package split exists by required domains.
- Monolithic text-adventure logic is replaced by domain modules.

2. **Gameplay**
- Kael can traverse levels and rooms.
- NPC background simulation executes each turn.
- Items/traits/attributes/quests are active and mutable.
- Chapter/act/page logic is operational for player + NPCs.
- Every level has 50 rooms with one start and one exit.
- Room and item vectors influence entities.
- Dialogue options can appear/disappear when room state changes.

3. **Embeddings**
- Free text action updates trait state through embedding projection.
- Optional `sentence-transformers` path + deterministic fallback both supported.

4. **Notebook**
- `escape-the-dungeon.ipynb` launches and runs interactive gameplay.
- Notebook displays status and event logs.
- Notebook can list and choose dialogue options by id.

5. **CLI**
- `escape-the-dungeon` command starts interactive play using vendored adventurelib flow.

6. **Planning Traceability**
- ROADMAP, REQUIREMENTS, TASK-REGISTRY, STATE align to this PRD and phase.

7. **Presentation and Filtering**
- Cutscenes can be triggered and logged.
- Action visibility/prerequisite filtering is in place.
- Livestream fame/effort loop is playable.
- Unit tests (pytest + html report) validate core mechanics and integration points.

## Open Design Decisions

1. Cutscene authoring format (template strings vs small DSL vs data JSON).
2. Precondition language for action gating (code predicates vs declarative rule schema).
3. Fame economy tuning (reward curves, diminishing returns, penalties).
4. Default NPC population and spawn distribution per level.
