# PRD: Escape the Dungeon (Adventurelib-Based Dungeon Crawler Demo)

## Document Status

- Owner: DungeonBreak docs/lab team
- Date: 2026-02-27
- Status: Working v7 (phase 13 browser runtime scope integrated)
- Location rule: PRD lives in `.planning` (not `docs/`)

## Product Name

**Escape the Dungeon**

## Product Vision

A modular, extendable dungeon crawler runtime with:

- **TypeScript browser target** mounted at docs route `/play` (primary demo runtime).
- **Python implementation retained as baseline** for parity verification and CLI/binary release.

The gameplay model is:

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
- Browser runtime in `docs-site` using TypeScript, shadcn layout primitives, and Assistant UI feed components.
- Playable docs route at `/play` with button-first action selection, blocking cutscene queue, autosave, and slot persistence.
- Browser parity matrix tracking Python baseline features.
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
- Next-slice planning for full entity parity, faction conflict, skill evolution, and high-density room/content population.
- Dual publish gates: docs/browser workflow + terminal workflow must both pass before release tagging.

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

11. **Shared Action Parity**
- Non-player entities use the same action catalog as the player.
- An entity may execute any action only when prerequisites pass.
- NPC behavior policy scores those same legal actions each turn.

12. **Skill Evolution and Exclusive Branching**
- Skills can evolve into higher-tier skills at player/NPC choice if prerequisites pass.
- Skill evolution requires visiting a `rune_forge` room.
- `appraisal` vs `xray` is a mutually exclusive run-level branch.

13. **World Population and Room Distribution**
- Each level keeps 50 rooms and now reserves:
  - 20 treasure rooms
  - 5 rune forge rooms (safe haven type)
  - 1 exit room with a level boss guardian
  - 4 non-player dungeoneers present at level start

14. **Hostile Pressure Loop**
- Each turn, a hostile enemy spawns from the current level's exit room.
- Spawned hostiles path toward other entities and prefer combat actions.
- Hostiles cannot enter rune forge rooms.

15. **Faction, Reputation, and Lethality Escalation**
- Faction model includes `Laughing Face` (murder-guild alignment).
- Murder-capable actions require both:
  - trait thresholds
  - faction/reputation thresholds
- Escalation path supports "attack -> lethal attack -> murder" style progression.

16. **Companion System**
- Max companions at once: `1`.
- Dungeoneers can be recruited by alignment in traits/info/faction/attributes/archetype space.

17. **Deterministic vs Emergent Boundaries**
- Deterministic rails:
  - dungeon topology, win condition, key authored event chain, explicit prerequisite evaluation
- Probabilistic/emergent layer:
  - NPC action selection among legal actions, rumor spread, encounter timing, local social outcomes

18. **Terminal Distribution**
- The game is packaged as downloadable terminal binaries for GitHub releases.
- Build/release automation is handled by CI workflows and semantic version tags.

## Architecture Requirements

### Required Domain Split

- No monolithic text-adventure file.
- Game logic must be separated by domain packages.
- Notebook and browser UI should call engine APIs, not contain business logic.

### Runtime Target Policy

- Browser TS runtime is the primary playable demo surface (`/play`).
- Python remains behavior baseline and terminal distribution target until parity closes.
- No gameplay backend service is introduced for browser play.

### Browser UX Policy

- `/play` uses a 3-column layout:
  - left: grouped clickable action lists
  - center: Assistant UI feed for narration, action outcomes, dialogue, and cutscenes
  - right: player status, vectors, quests, and nearby entity context
- Command typing is optional/future only; core gameplay must be fully playable via buttons.
- Cutscenes are presented as a blocking queue modal before next-turn actions.

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
16. GR-16: Every level has exactly 20 treasure rooms, 5 rune forge rooms, and one exit-room boss.
17. GR-17: Exactly 4 dungeoneers spawn per floor at initialization.
18. GR-18: One hostile enemy spawns from the exit room every turn and seeks other entities.
19. GR-19: Hostile enemies cannot enter rune forge rooms.
20. GR-20: NPCs and player share the same action catalog and prerequisite rules.
21. GR-21: Skills support evolution trees at rune forge rooms.
22. GR-22: `appraisal` and `xray` are run-exclusive branches.
23. GR-23: Companion system exists with max active companions = 1.
24. GR-24: Reputation/faction checks and trait checks gate lethal/murder actions.
25. GR-25: `Laughing Face` faction exists and can influence murder-oriented behavior.
26. GR-26: Rumors of deeds (including livestreamed deeds) can spread entity-to-entity.
27. GR-27: Per-entity pages capture interaction logs (room, action/dialogue, counterparts).
28. GR-28: Entity/player level curves exist and affect combat/action outcomes.
29. GR-29: Deterministic global events and probabilistic emergent triggers both exist with explicit boundaries.

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
- CI packaging can produce platform binaries (`windows`, `macos`, `linux`) for release downloads.

6. **Browser `/play`**
- Docs site route `/play` is playable with a 3-column button-first UX (actions/feed/status).
- Assistant UI feed clearly displays narration, action outcomes, dialogue, and cutscenes.
- Blocking cutscene modal queue is enforced before additional actions.
- Homepage links to `/play`.
- Browser autosave + named slots work.
- Browser unit + e2e smoke tests pass in CI.

7. **Planning Traceability**
- ROADMAP, REQUIREMENTS, TASK-REGISTRY, STATE align to this PRD and phase.

8. **Presentation and Filtering**
- Cutscenes can be triggered and logged.
- Action visibility/prerequisite filtering is in place.
- Livestream fame/effort loop is playable.
- Unit tests (pytest + html report) validate core mechanics and integration points.

## Open Design Decisions

1. Cutscene authoring format (template strings vs small DSL vs data JSON).
2. Precondition language for action gating (code predicates vs declarative rule schema).
3. Fame economy tuning (reward curves, diminishing returns, penalties).
4. Default NPC population and spawn distribution per level.
5. Level curve tuning (player, dungeoneers, hostiles, bosses) and scaling constants.
6. Rumor confidence decay model and propagation radius.
7. Companion loyalty decay/growth model and betrayal conditions.
