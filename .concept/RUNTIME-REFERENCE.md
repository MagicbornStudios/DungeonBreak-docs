# Runtime Reference — Escape the Dungeon

Quick reference for traits, entities, state, and room vectors. Use when simulating. Code: `docs-site/lib/escape-the-dungeon/`.

---

## Traits (10 axes, −1 to 1)

| Trait | Anchor (deed projection) |
|-------|--------------------------|
| Comprehension | understanding patterns and hidden causes |
| Constraint | discipline restraint and strict control |
| Construction | building tools practical structures engineering |
| Direction | leadership and clear purpose |
| Empathy | care compassion attentive listening |
| Equilibrium | balance calm stable judgment |
| Freedom | independence exploration improvisation |
| Levity | humor hopeful lightness |
| Projection | future planning and ambition |
| Survival | resilience safety and endurance |

---

## Features

| Feature | Default | Notes |
|---------|---------|-------|
| Fame | 0 | Livestream gain; diminishing 1/(1+Fame/120) |
| Effort | 100 | Stamina; live_stream costs 10 |
| Awareness | 0 | Perception; raised by search, talk, skills |
| Guile | 0 | Stealth; steal +0.15 |
| Momentum | 0 | Pace; fight/train/stream raise it |

---

## Attributes

might, agility, insight, willpower — default 5; Kael starts Might 6, Willpower 6.

---

## Entity Kinds

| Kind | Notes |
|------|-------|
| player | Kael |
| dungeoneer | 4 per level; names from Mira, Dagan, Yori, Sable, Fen, Ibis, Noel, Rook, Cora, Jex, Vale, Ryn, Lio, Tamsin, Orin, Bram |
| boss | Depth N Warden per level; at exit |
| hostile | Crawler N; spawns from exit; cannot enter rune_forge |

---

## Entity State (runtime)

| Field | Type |
|-------|------|
| entityId | string |
| name | string |
| depth | number |
| roomId | string |
| traits | TraitVector |
| attributes | { might, agility, insight, willpower } |
| features | FeatureVector |
| faction | string |
| reputation | number |
| baseLevel | number |
| xp | number |
| health | number |
| energy | number |
| inventory | ItemInstance[] |
| skills | Record<string, SkillState> |
| deeds | DeedMemory[] |
| rumors | RumorMemory[] |
| companionTo | string \| null |

---

## Room Features & Base Vectors

| Feature | Base Vector |
|---------|-------------|
| training | Constraint 0.45, Direction 0.3 |
| dialogue | Empathy 0.4, Comprehension 0.2 |
| rest | Equilibrium 0.5, Levity 0.2 |
| rune_forge | Construction 0.45, Comprehension 0.25 |
| treasure | Projection 0.45, Survival 0.25 |
| combat | Survival 0.4, Direction 0.25 |
| stairs_up | Direction 0.35, Projection 0.15 |
| escape_gate | Freedom 0.55, Projection 0.35 |
| start | Comprehension 0.2 |
| corridor | (none) |

Room influence: scale base by 0.05; add to actor traits; clamp [−1, 1].

---

## Factions

freelancer (player default), laughing_face, dungeon_legion, party (companion), fallen.

---

## Code References

| Concern | File |
|---------|------|
| Types, traits, features | `core/types.ts` |
| Room vectors | `world/map.ts` baseVectorForFeature |
| Action effects | `engine/game.ts` performAction |
| Skills | `narrative/skills.ts` |
| Cutscenes | `narrative/cutscenes.ts` |
| Fame | `narrative/fame.ts` |
