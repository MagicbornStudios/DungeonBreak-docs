# PRD: Escape the Dungeon (Adventurelib-Based Dungeon Crawler Demo)

## Document Status

- Owner: DungeonBreak docs/lab team
- Date: 2026-02-28
- Status: Working v12 (Phase 11 content scale + Phases 14-16 closure complete)
- Location rule: PRD lives in `.planning` (not `docs/`)
- **Related:** [GRD-escape-the-dungeon.md](GRD-escape-the-dungeon.md) defines concrete gameplay behavior and the gameplay discovery loop. Simulation in `scratch/game-state.md`; agent guide in `.concept/SIMULATION-AGENT-GUIDE.md`.

## Product Name

**Escape the Dungeon**

## Product Vision

A modular, extendable dungeon crawler runtime with:

- **TypeScript browser target** mounted at docs route `/play` (primary and canonical demo runtime).
- **TypeScript package target** distributed as `DungeonBreak/engine` via GitHub Releases tarball (and repo install paths) with bundled data and installable React component.

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

- Browser runtime in `docs-site` using TypeScript, shadcn layout primitives, and Assistant UI feed components.
- Playable docs route at `/play` with button-first action selection, blocking cutscene queue, autosave, and slot persistence.
- Browser parity matrix tracking TypeScript engine/package behavior across app and consumer examples.
- Domain-based modular architecture:
  - `world` (levels, rooms, navigation)
  - `entities` (player/NPC state, traits, attributes, inventory)
  - `player` (action intent types)
  - `combat` (encounter simulation system, no combat grid)
  - `narrative` (dialogue, chapter pages, act logic, embeddings projection)
  - `engine` (orchestration, package API surface, app integration)
- 12-level dungeon world generation with **50 rooms per level**.
- Room features (training, dialogue, rest, treasure, combat, stairs, escape gate).
- Quest tracking.
- Chapter/act/page logging for player and each NPC.
- Embeddings-backed trait projection with deterministic fallback provider.
- Dialogue-space ranges and cluster-based option availability.
- Cutscene/event presentation planning for major milestones.
- Action filtering/gating planning based on prerequisites.
- Fame + livestream planning with effort cost economy.
- Next-slice planning for full entity parity, faction conflict, skill evolution, and high-density room/content population.
- Package + docs/browser publish gates: package build/tests and docs/browser workflow must both pass before release tagging.
- 25-turn deterministic reference playthrough coverage as a release gate.
- Shared JSON content contracts for cross-language portability (TS now, C++ plugin path next).
- Automated vector/feature usage report to flag low-value or unused dimensions/content.
- Installable package distribution with bundled game data and working React component consumer example.
- Data-driven archetype, dialogue-cluster, skill, and item packs with deterministic balancing harness/report tooling.
- Machine-playable baseline interface for coding agents through MCP adapter over canonical engine APIs (`packages/engine-mcp`), with expanded agent playthrough suites as next slice.

### Out of Scope (This Slice)

- Full Unreal gameplay parity.
- Networked multiplayer.
- Full content-authoring pipeline and advanced UI/FX.
- Python gameplay runtime and notebook gameplay surfaces.

## Definitive Concepts in Code

1. **World Topology**
- Dungeon depth from level 12 (start) to level 1 (escape gate level).
- Each level contains exactly 50 rooms.
- Each level has one start room and one exit room.

2. **Action Economy**
- Core actions: move, train, talk, rest, search, speak-intent, fight, flee.
- NPCs run background actions after player turns.

3. **Combat Simulation (No Grid)**
- Combat is resolved as encounter simulation, not a positional combat grid.
- Resolution factors include equipment, entity stats, traits/features, passives/effects, room context, and skill policy.
- Player combat controls remain high-level (`fight` / `flee`), while detailed skill choice is engine-driven.

4. **Traits/Attributes/Items**
- Traits are vector-like feature state (from canonical trait names).
- Attributes are RPG scalar stats (might, agility, insight, willpower).
- Items are discoverable per room and move into inventory.
- Rooms and items both carry vectors that can influence entity vectors.

5. **Narrative Structure**
- Each dungeon level maps to one chapter.
- 4 chapters = 1 act.
- Chapter logs contain:
  - global chapter page
  - per-entity page (Kael + each NPC)
- Both player and NPC actions write to pages.

6. **Embeddings Projection**
- Free-text intent is projected to trait deltas using an embedding provider.
- Fallback provider must work offline/no-model-install.
- DeeDs use canonical text -> embedding -> anchor projection with per-feature caps and global turn budget.

7. **Dialogue Space**
- Dialogue options are anchored to vectors.
- Options belong to clusters with radius ranges.
- Room state conditions (for example item present/absent) can enable/disable options.

8. **Cutscene and Event Presentation**
- High-signal events can trigger authored scene text blocks ("cutscenes").
- Cutscenes can be triggered by specific items, quest transitions, stat milestones, or major world events.
- Cutscene events are written to chapter pages so story history is auditable.

9. **Action Availability Filtering**
- Every action and dialogue option can declare prerequisites.
- Prerequisites may depend on room state, inventory, attributes, traits, skills, entity state, or other entities.
- UI/shell must only present currently available actions/options.

10. **Skills as Vector-Bound Build Layer**
- Skills exist in narrative space and carry vector profiles.
- Skill unlock/use depends on vector distance + prerequisites.
- Item + room + entity combinations can create emergent build paths.

11. **Livestream Economy**
- `Fame` is a feature/trait in the vector set.
- Action: `live_stream`.
- Action cost: spend `Effort` 10 per turn.
- Livestream outcomes can influence Fame, dialogue options, and quest opportunities.
- Fame gain is deterministic from context formula components (room interest, novelty, risk, momentum/skill bonus, diminishing returns).

12. **Shared Action Parity**
- Non-player entities use the same action catalog as the player.
- An entity may execute any action only when prerequisites pass.
- NPC behavior policy scores those same legal actions each turn.

13. **Skill Evolution and Exclusive Branching**
- Skills can evolve into higher-tier skills at player/NPC choice if prerequisites pass.
- Skill evolution requires visiting a `rune_forge` room.
- `appraisal` vs `xray` is a mutually exclusive run-level branch.

14. **World Population and Room Distribution**
- Each level keeps 50 rooms and now reserves:
  - 20 treasure rooms
  - 5 rune forge rooms (safe haven type)
  - 1 exit room with a level boss guardian
  - 4 non-player dungeoneers present at level start

15. **Hostile Pressure Loop**
- Each turn, a hostile enemy spawns from the current level's exit room.
- Spawned hostiles path toward other entities and prefer combat actions.
- Hostiles cannot enter rune forge rooms.

16. **Faction, Reputation, and Lethality Escalation**
- Faction model includes `Laughing Face` (murder-guild alignment).
- Murder-capable actions require both:
  - trait thresholds
  - faction/reputation thresholds
- Escalation path supports "attack -> lethal attack -> murder" style progression.

17. **Companion System**
- Max companions at once: `1`.
- Dungeoneers can be recruited by alignment in traits/info/faction/attributes/archetype space.

18. **Deterministic vs Emergent Boundaries**
- Deterministic rails:
  - dungeon topology, win condition, key authored event chain, explicit prerequisite evaluation
- Probabilistic/emergent layer:
  - NPC action selection among legal actions, rumor spread, encounter timing, local social outcomes

19. **Package Distribution**
- The engine is distributed as installable package `DungeonBreak/engine` (implementation id `@dungeonbreak/engine`) via GitHub Releases tarball and repository install paths.
- Package ships with bundled default game data and React component(s) that render playable experience out of the box.
- Build/release automation is handled by CI workflows and semantic version tags.

20. **Deed Memory and Misinformation**
- Deeds are attached to entities and can describe self or other entities.
- Deed memories include belief quality (`verified`, `rumor`, `misinformed`), source, and confidence.
- Dialogue and action scoring may use incorrect deed beliefs, intentionally modeling social misinformation.

21. **Concrete Reference Playthrough**
- A deterministic 25-turn reference run must exist and be testable.
- v1 uses one canonical replay seed: `CANONICAL_SEED_V1 = 20260227`.
- That run exercises all core systems together (movement, vectors, deeds, skills, cutscenes, combat/flee, rumors, pages).
- This scenario is treated as a parity and regression gate.

22. **Flee Contract**
- `flee` has no hard failure roll.
- It resolves as deterministic movement to a legal adjacent room.
- Pursuers can still chase on later turns under normal movement rules.

23. **Reusable Cross-Language Data Contracts**
- Actions, vectors, skills, items, room templates, cutscenes, and formula constants are authored in schema-validated JSON.
- Engine code in each language consumes these contracts instead of duplicating content logic.
- Golden trace fixtures verify deterministic replay across runtimes.

24. **Performance and Pressure Boundaries**
- Browser gameplay target is responsive turn resolution (`p95 <= 2s`) with pressure cap `120` when items are modeled as entities.
- When pressure exceeds budget, deterministic pruning/backpressure rules are applied and logged.

25. **Archetype Compass and Balancing Harness**
- Archetype headings/classes are computed from schema-backed archetype vectors every turn and surfaced in status/UI.
- Balance simulation batch APIs and report scripts are required to evaluate content pacing and emergent class distribution.

## Architecture Requirements

### Required Domain Split

- No monolithic text-adventure file.
- Game logic must be separated by domain packages.
- Browser app and package consumers should call engine APIs, not contain business logic.

### Runtime Target Policy

- Browser TS runtime is the primary playable demo surface (`/play`).
- TypeScript runtime is the canonical behavior source.
- Python gameplay runtime is removed from active development scope.
- No gameplay backend service is introduced for browser play.

### Browser UX Policy

- `/play` uses a 3-column layout:
  - left: grouped clickable action lists
  - center: Assistant UI feed for narration, action outcomes, dialogue, and cutscenes
  - right: player status, vectors, quests, and nearby entity context
- Command typing is optional/future only; core gameplay must be fully playable via buttons.
- Cutscenes are presented as a blocking queue modal before next-turn actions.
- Combat UI is no-grid and exposes high-level controls (`fight` and `flee`) while encounter details stream to the feed.

### Engine Base Requirement

- Engine is framework-agnostic TypeScript core consumed by docs app and package consumers.
- Package exports stable interfaces and React component(s) for out-of-box integration.

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
30. GR-30: Combat uses encounter simulation (equipment/stats/traits/effects/room context/skill policy) and does not require a combat grid.
31. GR-31: During combat, player controls are high-level (`fight` or `flee`) and do not require per-skill micromanagement.
32. GR-32: Dialogue choice UX is non-combat; combat turns surface combat outcomes and flee results.
33. GR-33: Combat simulation is deterministic for fixed seed/snapshot and testable in docs runtime and package consumer runtime.
34. GR-34: `depth` (dungeon floor) and `level` (character progression) are represented as distinct fields in all APIs, logs, and tests.
35. GR-35: A deterministic 25-turn integration playthrough exists and must exercise all core systems in one scenario.
36. GR-36: Deeds support self-target and other-target references plus misinformation states (`verified`, `rumor`, `misinformed`) with source and confidence.
37. GR-37: `flee` resolves as deterministic room movement with no hard fail roll; chase behavior is handled by normal subsequent turns.
38. GR-38: Action outcome formulas and constants are stored in schema-validated data contracts, not hidden in ad hoc UI logic.
39. GR-39: Shared JSON schemas and data packs exist for cross-language reuse (TS runtime now, C++ plugin ingestion later).
40. GR-40: Golden trace replay fixtures verify deterministic behavior for TS docs runtime and package consumer runtime.
41. GR-41: Build/test pipeline emits a vector/feature usage report highlighting low-usage and unused features/content.
42. GR-42: Browser turn processing meets performance target (`p95 <= 2s`) under configured entity pressure, with deterministic pruning policy.
43. GR-43: Golden replay and 25-turn integration tests use one canonical v1 seed (`CANONICAL_SEED_V1 = 20260227`).
44. GR-44: Pressure profile cap is 120 when items are represented as entities; otherwise cap applies to active simulated entities only.
45. GR-45: Python gameplay runtime and gameplay notebooks are removed from active repo paths immediately; archived releases/tags are the recovery mechanism.
46. GR-46: `DungeonBreak/engine` is published as downloadable GitHub Releases tarball package (implementation id `@dungeonbreak/engine`) with bundled default game data.
47. GR-47: Package exports out-of-box React component(s) and typed engine APIs that run without external services.
48. GR-48: `npm run lab` and install helpers remain operational after cutover and target TypeScript/package workflows.

## Package Consumer UX Requirements

1. UX-01: One-command local setup (`npm run lab`) remains available after cutover.
2. UX-02: Package consumer can render playable game component with minimal wiring.
3. UX-03: Consumer UI receives status/feed/actions without custom backend.
4. UX-04: Bundled default data enables immediate play without data migrations.
5. UX-05: Cutscene/dialogue/action output is visible in consumer example.
6. UX-06: Consumer example documents override/extension points for custom data.

## Package API Requirements

1. API-01: Export stable engine creation and action dispatch APIs.
2. API-02: Export React component(s) that wrap engine lifecycle and persistence defaults.
3. API-03: Export default content pack and schemas for validation/custom extension.

## Definition of Done

The current slice is done when:

1. **Engine and Architecture**
- Modular package split exists by required domains.
- Monolithic gameplay logic is replaced by domain modules.

2. **Gameplay**
- Kael can traverse levels and rooms.
- NPC background simulation executes each turn.
- Items/traits/attributes/quests are active and mutable.
- Chapter/act/page logic is operational for player + NPCs.
- Every level has 50 rooms with one start and one exit.
- `depth` and `level` remain distinct in engine state, logs, and UI.
- Room and item vectors influence entities.
- Dialogue options can appear/disappear when room state changes.
- Combat encounter simulation works without a combat grid and respects equipment/stats/effects/room context.
- Combat control surface is high-level (`fight` / `flee`) with deterministic resolution for a fixed seed/snapshot.
- `flee` always resolves as legal movement; chase can still happen in later turns.
- Deed memory supports self/other targets and misinformation states with source/confidence.

3. **Embeddings**
- Free text action updates trait state through embedding projection.
- Deterministic hash projection baseline is always available in browser runtime.

4. **Browser `/play`**
- Docs site route `/play` is playable with a 3-column button-first UX (actions/feed/status).
- Assistant UI feed clearly displays narration, action outcomes, dialogue, and cutscenes.
- Blocking cutscene modal queue is enforced before additional actions.
- Homepage links to `/play`.
- Browser autosave + named slots work.
- Browser unit + e2e smoke tests pass in CI.
- Browser turn processing meets `p95 <= 2s` in configured pressure scenario (cap 120 when items are entities).

5. **Package Distribution**
- Package `DungeonBreak/engine` (implementation id `@dungeonbreak/engine`) builds and installs cleanly from GitHub Releases tarball.
- Package includes bundled default game data and playable React component exports.
- Repository includes a complete working consumer example using published package APIs.
- CI validates package build/install/smoke integration from consumer perspective.

6. **Planning Traceability**
- ROADMAP, REQUIREMENTS, TASK-REGISTRY, STATE align to this PRD and phase.

7. **Presentation and Filtering**
- Cutscenes can be triggered and logged.
- Action visibility/prerequisite filtering is in place.
- Livestream fame/effort loop is playable.
- Unit tests and e2e tests validate core mechanics and integration points.

8. **Contracts and Reuse**
- JSON schemas/data packs define shared gameplay content contracts.
- Golden trace replay fixtures exist for deterministic parity checks.
- Automated vector/feature usage report is generated and reviewable in CI artifacts.
- Python gameplay runtime and notebooks are removed from active repo development paths.

9. **Reference Playthrough**
- A deterministic 25-turn integration playthrough test exists and passes.
- The reference run uses canonical seed `CANONICAL_SEED_V1 = 20260227`.
- The playthrough covers movement, vectors, deeds, dialogue, combat/flee, skill unlock/evolution, cutscenes, rumors, and page logging.

## Open Design Decisions

1. Cutscene authoring format (template strings vs small DSL vs data JSON).
2. Precondition language for action gating (code predicates vs declarative rule schema).
3. Fame economy tuning (reward curves, diminishing returns, penalties).
4. Default NPC population and spawn distribution per level.
5. Level curve tuning (player, dungeoneers, hostiles, bosses) and scaling constants.
6. Rumor confidence decay model and propagation radius.
7. Companion loyalty decay/growth model and betrayal conditions.
8. Combat encounter weighting model (how equipment/stats/traits/effects/room context combine into action resolution).
9. Max-entity pressure budget before deterministic pruning triggers.
10. Package naming/publishing policy detail (`DungeonBreak/engine` branding vs implementation id constraints and GitHub Releases distribution).
