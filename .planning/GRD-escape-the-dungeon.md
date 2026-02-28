# GRD: Escape the Dungeon - Game Requirements Document

## Document Status

- Owner: DungeonBreak docs/lab team
- Date: 2026-02-28
- Status: Living document (gameplay discovery loop)
- Location: `.planning/GRD-escape-the-dungeon.md`
- Relationship: Complements PRD (architecture, scope) with concrete gameplay behavior.
- Simulation north star: `scratch/game-state.md`, `.concept/PROCESS.md`, `.concept/SIMULATION-AGENT-GUIDE.md`
- Code reference: `docs-site/lib/escape-the-dungeon/`

## Purpose

The GRD defines how the game plays: concrete turn flow, formulas, prerequisites, and state changes.

- PRD defines what we are building and why.
- GRD defines how the runtime behaves.

---

## Gameplay Discovery Loop

```
Scope -> Simulate (scratch/game-state.md) -> Check -> Refine (discovery artifacts) -> Emit -> Sync back -> repeat
```

1. Scope: define a simulation goal (example: trigger skill evolution and one cutscene chain).
2. Simulate: play in chat or browser and log updates in `scratch/game-state.md`.
3. Check: confirm expected behavior, identify gaps.
4. Refine: capture discoveries in `.concept/DISCOVERY-LOG.md` and backlog in `.concept/CONTENT-BACKLOG.md`.
5. Emit: update this GRD when behavior contracts change.
6. Sync back: once code ships, ensure GRD reflects implementation.

---

## Core Identifiers

| Term | Meaning |
|------|---------|
| Depth | Dungeon floor position, from 12 (start) to 1 (surface) |
| Level | Character progression from XP, `level = base_level + floor(xp / 30)` |
| Chapter | One depth corresponds to one chapter |
| Act | Four completed chapters |
| Turn | One player action plus simulation pipeline |

Depth and level are separate everywhere (state, UI, logs, tests).

---

## Turn Loop (Concrete Order)

For each player action:

1. Parse input to action.
2. Prerequisite check (room, stats, skills, target, state).
3. Execute action effects.
4. Apply room vector influence (`room_base * 0.05`, clamp traits to `[-1, 1]`).
5. Write deed and project deltas (per-feature cap `0.22`, global cap `0.35`).
6. Evaluate skill unlock/evolution availability.
7. Resolve cutscene triggers.
8. Resolve deterministic global events.
9. Spawn one hostile from exit room (cannot enter `rune_forge`).
10. NPC tick: each NPC chooses one legal action.
11. Persist autosave snapshot.

---

## Action Effects

| Action | Energy | Effort | Attributes | Trait Delta | Feature Delta | Other |
|--------|--------|--------|------------|-------------|---------------|------|
| move | - | - | - | - | - | Room change; chapter progress if depth changes |
| train | -0.15 | - | might +1, willpower +1, xp +5 | Constraint +0.07, Direction +0.05 | Momentum +0.10 | Requires training room |
| rest | +0.20 corridor / +0.30 rest room | - | - | Equilibrium +0.04, Levity +0.02 | - | - |
| talk (target) | - | - | - | Empathy +0.05, Comprehension +0.03 | Awareness +0.05 | Needs nearby entity |
| talk (no target) | - | - | - | Empathy -0.01 | - | No effect action result |
| search (found) | - | - | - | Item vector delta | - | Loot to inventory; tag-based cutscene checks |
| search (empty) | - | - | - | Comprehension +0.01 | - | Empty search result |
| speak | - | - | - | intent projection | intent projection | `say <text>` creates deed |
| fight | - | - | xp +4 | Survival +0.03, Direction +0.03 | Momentum +0.10 | Requires enemy encounter |
| flee | - | - | - | Survival +0.01 | - | Deterministic move to selected legal adjacent room; no hard fail roll |
| choose_dialogue | - | - | - | Option-specific | - | Applies selected dialogue outcome |
| live_stream | - | -10 | - | Projection +0.03 | Fame +gain, Momentum +0.20 | Deterministic fame formula |
| steal | - | - | - | Constraint +0.01, Survival +0.02 | Guile +0.15 | Needs Shadow Hand and valid target |
| recruit | - | - | - | Empathy +0.04 | Awareness +0.10 | Max one companion |
| murder | - | - | xp +10, reputation -2 | Survival +0.06, Constraint -0.04 | Momentum +0.20 | Trait plus faction/reputation gate |
| evolve_skill | - | - | - | Skill-defined | Skill-defined | Requires rune forge + parent + prereqs |

---

## Action Prerequisites

| Action | Prerequisite |
|--------|--------------|
| move | Exit exists for chosen direction |
| train | Room feature `training` |
| talk | Nearby entity |
| fight | Nearby enemy |
| flee | Active encounter and legal destination exit |
| choose_dialogue | Option id valid and currently available |
| live_stream | Effort >= 10 |
| steal | Shadow Hand unlocked and target has loot |
| recruit | Target recruitable and companion slot empty |
| murder | Survival >= 0.2 and (`laughing_face` or reputation <= -6) |
| evolve_skill | Room feature `rune_forge`, parent unlocked, prereqs pass |

---

## Deed Memory Model (Including Misinformation)

Deeds are stored as information vectors and can reference self or other entities.

`DeedMemory` contract:

- `deed_id`: stable id
- `actor_entity_id`: who did the action
- `subject_entity_id`: who the deed is about (self or other)
- `canonical_text`: normalized deed text
- `embedding`: deterministic vector projection
- `belief_state`: `verified | rumor | misinformed`
- `source_entity_id`: who supplied the information
- `confidence`: float in `[0, 1]`
- `timestamp_turn`

Rules:

1. Entities can hold incorrect deeds about others (`belief_state = misinformed`).
2. Dialogue can spread correct or incorrect deeds.
3. Action scoring may consume deed beliefs regardless of correctness.
4. Verified observations can overwrite misinformed beliefs when confidence is higher.

---

## Combat Encounter Model (No Grid)

Combat is encounter simulation, not a positional grid.

Inputs to resolution:

- Equipped gear and weapon tier
- Entity attributes and derived level
- Traits/features (including momentum and survival)
- Active effects/passives
- Room context modifiers
- Opponent profile and faction relationship
- Internal skill-priority policy

Player controls in combat are high-level only:

- `fight`
- `flee`

`flee` contract:

1. No hard-fail roll.
2. Player chooses direction.
3. If direction is legal, player moves immediately.
4. Enemy does not get a same-turn free counteraction.
5. Enemy can pursue in later turns under normal movement logic.

Dialogue choices are non-combat flow and do not replace encounter resolution.

---

## Room Vectors (Base, before 0.05 scale)

| Feature | Base Vector |
|---------|-------------|
| training | Constraint 0.45, Direction 0.30 |
| dialogue | Empathy 0.40, Comprehension 0.20 |
| rest | Equilibrium 0.50, Levity 0.20 |
| rune_forge | Construction 0.45, Comprehension 0.25 |
| treasure | Projection 0.45, Survival 0.25 |
| combat | Survival 0.40, Direction 0.25 |
| stairs_up | Direction 0.35, Projection 0.15 |
| escape_gate | Freedom 0.55, Projection 0.35 |
| start | Comprehension 0.20 |
| corridor | (empty) |

---

## Fame Formula

- Base: `1.0 * (effort_spent / 10)`
- Room interest: `0.6*Projection + 0.4*Levity + 0.25*Direction + 0.2*Survival`
- Novelty multiplier: `0.75` if repeat stream, else `1.0`
- Risk multiplier: combat `1.0`, treasure `0.6`, other `0.35`
- Momentum bonus: `Momentum * 0.04`
- Skill bonus: `+0.15` if Battle Broadcast unlocked
- Diminishing factor: `1 / (1 + Fame / 120)`

---

## Cutscene Triggers

| Cutscene | Trigger | Once |
|----------|---------|------|
| A Locked Cache | First search with `treasure` tag | Yes |
| Steel Memory | First train after Might >= 8 | Yes |
| Signal in the Dark | First `live_stream` with Fame >= 1 | Yes |
| Hands Like Smoke | Shadow Hand unlock | Yes |
| Chapter Closed | On chapter complete (ascend depth) | No |
| Surface Air | On escape gate at depth 1 | Yes |

---

## Global Events

| Event | Trigger | Effect |
|-------|---------|--------|
| depth_pressure_turn_40 | `turn_index >= 40` | `global_enemy_level_bonus +2` |
| fame_watchers_20 | `Fame >= 20` | Projection +0.08, Momentum +0.25 |

---

## Skills (Unlock and Evolution)

| Skill | Branch | Unlock Radius | Prereqs | Evolution |
|-------|--------|---------------|---------|-----------|
| Appraisal | perception_branch | 2.2 | Insight >= 5 | Deep Appraisal at rune forge |
| X-Ray Instinct | perception_branch | 2.4 | Comprehension <= 0 | Trap Vision at rune forge |
| Keen Eye | - | 1.8 | Insight >= 6, Comprehension >= 0.05 | - |
| Shadow Hand | - | 1.9 | Keen Eye, Agility >= 6, Awareness >= 0.2 | - |
| Battle Broadcast | - | 2.0 | Might >= 7, Fame >= 5 | - |

Perception branch is exclusive: Appraisal and X-Ray cannot both be unlocked in one run.

---

## Traits and Features

Traits (range `[-1, 1]`):

- Comprehension
- Constraint
- Construction
- Direction
- Empathy
- Equilibrium
- Freedom
- Levity
- Projection
- Survival

Features:

- Fame (default 0)
- Effort (default 100)
- Awareness (default 0)
- Guile (default 0)
- Momentum (default 0)

---

## Archetype Compass Contract

- Archetypes are loaded from shared JSON contracts and scored against entity trait vectors each turn.
- Status surfaces expose:
  - `archetype_heading` (top score label)
  - ranked archetype score list for explainability.
- Archetype heading changes are logged in event metadata for balancing analysis.

---

## World Topology

- 12 levels (depth 12 to 1)
- 50 rooms per level (5x10)
- Per level: 1 start, 1 exit, 20 treasure, 5 rune forge
- 4 dungeoneers per level
- One hostile spawn from exit each turn
- Hostiles cannot enter rune forge rooms

---

## Treasure Room Items

Treasure rooms include:

- Treasure Cache (`tags: treasure, loot`, vector delta: Projection +0.4, Survival +0.2)
- Weapon item (rarity weighted by depth)

---

## Reference Playthrough Contract (25 Turns)

A deterministic 25-turn integration run is required in automated tests.

Canonical replay seed for v1:

- `CANONICAL_SEED_V1 = 20260227`

Coverage map by turn window:

1. Turns 1-4: movement boundaries, look, room vector influence.
2. Turns 5-8: search, item state changes, cutscene trigger.
3. Turns 9-11: talk and rumor spread between entities.
4. Turns 12-14: deed projection and misinformation propagation.
5. Turns 15-17: combat encounter with `fight` then `flee`.
6. Turns 18-20: skill unlock/evolution gate checks (including rune forge).
7. Turns 21-23: livestream fame/effort effects and deed broadcasting.
8. Turns 24-25: page/chapter logging assertions and snapshot determinism checks.

Required assertions:

- Action availability and blocked reasons are stable.
- Depth and level remain separate and correct.
- Deed beliefs include at least one `misinformed` record.
- Cutscene queue behavior is visible in feed output.
- Same seed and same action script produce same final snapshot hash.

---

## Agent-Playable Interface Contract (Phase 18)

Machine interface is defined over engine APIs so coding agents can play without browser UI.

Required operations:

1. `create_session(seed?) -> session_id`
2. `get_snapshot(session_id) -> snapshot`
3. `list_actions(session_id, entity_id?) -> legal_actions[]`
4. `dispatch_action(session_id, action) -> turn_result`
5. `get_log_page(session_id, chapter, entity_id?) -> page_entries[]`
6. `restore_snapshot(session_id, snapshot) -> ok`

Implementation: `packages/engine-mcp` exposes these operations as MCP tools over stdio.

Contract rules:

- Action payloads use the same schemas as browser runtime actions.
- Repeated runs with same seed + same action script must return deterministic snapshots and event ordering.
- Errors must be explicit (`invalid_action`, `blocked_action`, `invalid_payload`, `session_not_found`) with readable reasons.

---

## Extended Playthrough Contract (Phase 18)

Beyond the 25-turn baseline, Phase 18 includes a deterministic >= 75-turn scripted run that includes:

- branching dialogue choices
- multiple combat and flee chains
- skill unlock and at least one evolution
- rumor propagation with misinformation correction
- faction/reputation gate transitions
- companion recruitment attempt
- chapter/act/page progression checks

The 25-turn fixture remains baseline; the 75-turn suite is agent-regression coverage via `canonical-dense-trace-v1.json`.

Phase 17 long-run suite contract:

- deterministic windows: 100, 250, 500 turns
- emitted metrics: action usage, archetype distribution, survival/escape rates, dead action types, turn-time stats
- report paths:
  - `packages/engine/test-reports/long-run-balance-report.json`
  - `docs-site/test-reports/balance-sim-report.json`

---

## Performance and Pressure Contract

Targets:

- Browser turn loop `p95 <= 2s` under pressure cap `120` entities when items are modeled as entities.
- No visible UI stall longer than 2s for a single action.

Pressure controls:

- Deterministic pruning/backpressure policy when entity cap is exceeded.
- If items are plain room/inventory data (not entity objects), the cap is applied to active simulated entities only.
- Pruning decisions are logged to chapter/system pages for auditability.
- Balance harness batches (`simulateBalanceBatch`) are used to track aggregate action usage, archetype distribution, fame, and escape rates across canonical seeds.

---

## Shared Contracts and Replay Artifacts

Cross-language reusable assets live as JSON contracts:

- Action definitions and prerequisites
- Formula constants and delta caps
- Vector anchors and room templates
- Skills, items, cutscenes, global events

Deterministic replay assets:

- Golden trace fixtures (seed + scripted actions + expected snapshots)
- Reference playthrough snapshots
- Vector/feature usage report generated in CI

---

## Simulation Coverage Checklist

Tick when simulated in a run:

- [ ] Actions: move, train, rest, search, talk, speak, fight, flee, live_stream, steal, recruit, murder, evolve_skill, choose_dialogue
- [ ] Rooms: corridor, start, exit, training, rest, treasure, rune_forge, combat
- [ ] Cutscenes: A Locked Cache, Steel Memory, Signal in the Dark, Hands Like Smoke, Chapter Closed, Surface Air
- [ ] Skills: Appraisal/X-Ray, Keen Eye, Shadow Hand, Battle Broadcast, evolutions
- [ ] Events: depth_pressure_turn_40, fame_watchers_20
- [ ] Deed misinformation appears and later reconciliation is possible
- [ ] 25-turn reference run (`CANONICAL_SEED_V1`) passes deterministic snapshot checks

---

## Simulation Artifacts

| Artifact | Purpose |
|----------|---------|
| `scratch/game-state.md` | Current simulation state and log |
| `.concept/PROCESS.md` | Discovery loop process and drift control |
| `.concept/RUNTIME-REFERENCE.md` | Runtime quick reference |
| `.concept/SIMULATION-AGENT-GUIDE.md` | Agent execution protocol |
| `.concept/DISCOVERY-LOG.md` | Curated discoveries |
| `.concept/CONTENT-BACKLOG.md` | Planned content additions |

---

## GRD Update Process

1. Add findings to `scratch/game-state.md`.
2. Curate validated findings to `.concept/DISCOVERY-LOG.md`.
3. Update GRD when behavior contracts change.
4. Update PRD when architecture or scope changes.
5. Keep GRD and implementation synchronized each loop.
