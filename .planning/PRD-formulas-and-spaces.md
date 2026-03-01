# PRD: Formulas, Spaces, and Documentation

## Document Status

- Owner: DungeonBreak docs/lab team
- Date: 2026-02-28
- Status: Draft
- Location: `.planning/PRD-formulas-and-spaces.md`

## Purpose

Surface all game calculations, analysis metrics, and vector/space models in docs. Explain reasoning, expansion strategies, and integrate with reporting.

---

## Goals

1. **Formulas visible** - Every major calculation documented: action effects, combat damage, grouped-vector deltas, room influence, deed projection, archetype ranking, skill unlock distance, dialogue option distance, analysis metrics.
2. **Reasoning** - Why formulas were chosen, what question each formula answers, and how space expansion changes reachable content.
3. **Spaces framework** - Mathematical definitions for space size, content density, and clusters across skill/dialogue/archetype/deed evaluations.
4. **Terminology consistency** - Feature = labeled scalar, vector = grouped feature array, fundamental spaces compose into compounding spaces.
5. **Reporting integration** - Input entity stats (player at turn `N`) -> show position in all relevant spaces and run content-pack evaluations.
6. **Docs location** - MDX/MD in docs site, with TypeDoc for package API as complement.

---

## Spaces and Terminology

| Space | Schema | Input | Content | Position / Rule |
|-------|--------|-------|---------|-----------------|
| **Trait Fundamental** | `TRAIT_NAMES` (12) | `entity.traits` | Actions, rooms, items apply deltas | Raw vector, clamp `[-1, 1]` |
| **Feature Fundamental** | `FEATURE_NAMES` (5) | `entity.features` | Fame, Effort, Awareness, Guile, Momentum | Cumulative updates |
| **Skill Evaluation** | Trait schema | `entity.traits` | `skills.json` (`vectorProfile`) | `distanceBetween(traits, profile) <= unlockRadius` |
| **Dialogue Evaluation** | Trait schema + context | `traits + room base` | dialogue clusters + options | `distanceBetween(context, anchor) <= radius` |
| **Archetype Evaluation** | traits + features + skills | entity state | `archetypes.json` | `0.65*cos(traits)+0.25*cos(features)+skillScore` |
| **Deed Projection** | traits + features | deed text | projected vector influence | `projectVector(embed(deed))`, per-feature/global caps |

**Space size** (formal): `|S| =` count of distinct content points (skills, dialogue options, archetypes).  
**Content density:** points per unit volume (approximate with bounding boxes or cluster analysis).

---

## Formulas Inventory (Source of Truth)

- `action-formulas.json` - trait/feature deltas per action
- `packages/engine/.../combat/system.ts` - combat damage formula
- `core/types.ts` - Euclidean distance, clamp, vector magnitude
- `narrative/archetypes.ts` - cosine scoring weights
- `narrative/skills.ts` - distance-based skill unlock
- `narrative/dialogue.ts` - distance-based option availability
- `narrative/deeds.ts` - AnchorProjector and deed projection budget
- `engine/game.ts` - room influence scale and effective room vector
- `playthrough-analyzer.ts` - entropy, excitement, novel combinations

---

## Reporting Integration (Future)

- Entity input: snapshot at turn `N` from playthrough report
- Output: position in each evaluation space (nearest skill distance, archetype ranking, dialogue clusters in range)
- Clusters: group content by vector and show nearest cluster per space
- Batch mode: run calculations over content packs and emit per-space metrics

---

## Tasks (Phase 27)

- 27-1: Formulas reference doc (all calculations, symbols, sources)
- 27-2: Spaces framework doc (definitions, expansion, navigation)
- 27-3: Analysis metrics doc (replayability, excitement, emergent)
- 27-4: Embed in `/docs` and link from `/play/reports`
- 27-5: (Future) Entity-input -> space-position calculator on reports page
