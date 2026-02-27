# Phase 10: Entity parity, factions, and emergent pressure - Context

**Gathered:** 2026-02-27T00:00:00.000Z  
**Status:** Ready for planning/execution

## Why this phase exists

Phase 09 established gating/cutscenes/skills/fame foundations.
Phase 10 extends this into a denser emergent simulation where NPCs share player capabilities, world pressure increases every turn, and social/faction systems shape lethal behavior.

## Required decisions captured from discussion

1. `appraisal` vs `xray` is exclusive for a run.
2. Skill evolution is allowed and happens at `rune_forge` rooms.
3. Each level composition target:
   - 50 total rooms
   - 20 treasure rooms
   - 5 rune forge rooms
   - 1 exit room with level boss
4. Each level starts with 4 dungeoneers.
5. Every turn: one hostile enemy spawns from exit and seeks other entities.
6. Hostiles cannot enter rune forge rooms (safe haven).
7. Max active companions is 1.
8. Murder gating requires trait thresholds + faction/reputation checks.
9. `Laughing Face` faction is part of the simulation.
10. We support both deterministic global events and probabilistic emergent triggers.

## Desired outcomes

1. NPC and player action parity:
   - same legal action catalog
   - same prerequisite system
   - NPC policy chooses among legal options
2. Emergent build depth:
   - evolving skills
   - run-exclusive branch (`appraisal`/`xray`)
   - class/archetype heading signals
3. World pressure and pacing:
   - turn-by-turn hostile spawn pressure
   - boss guardians and safe-haven zones
4. Social simulation depth:
   - rumor spread from deeds and livestreams
   - companion recruitment/alignment checks
   - faction/reputation responses to behavior
5. Full traceability:
   - per-entity pages log interactions with room/action/dialogue context

## Deterministic vs emergent boundary (must remain explicit)

Deterministic systems:
1. Level topology counts/rules (room composition targets).
2. Boss placement and rune forge exclusion rules.
3. Prerequisite evaluation logic.
4. Global authored event chain definitions and effects.

Probabilistic/emergent systems:
1. NPC action selection among legal candidates.
2. Rumor propagation encounters and belief drift.
3. Spawn encounter outcomes and local conflict cascades.
4. Companion/social outcomes when multiple legal choices exist.

## Non-goals for this phase

1. Full authored corpus for every skill/action/dialogue/item.
2. Final tuning of all progression curves.
3. Multiplayer or network synchronization.
