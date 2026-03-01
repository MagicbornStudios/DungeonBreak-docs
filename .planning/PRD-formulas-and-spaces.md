# PRD: Formulas, Spaces, and Documentation

## Document Status

- Owner: DungeonBreak docs/lab team
- Date: 2026-02-28
- Status: Draft
- Location: `.planning/PRD-formulas-and-spaces.md`

## Purpose

Surface all game calculations, analysis metrics, and vector spaces in docs. Explain reasoning, expansion strategies, and integrate with reporting.

---

## Goals

1. **Formulas visible** — Every major calculation documented: action effects, combat damage, trait/feature deltas, room influence, deed projection, archetype ranking, skill unlock distance, dialogue option distance, analysis metrics.
2. **Reasoning** — Why we chose these formulas; questions we ask; how they expand spaces; gradient-descent analogy for navigating solution spaces.
3. **Spaces framework** — Mathematical definition of space size, content density, clusters. Skill space, dialogue space, archetype space, deed space. How traits/attributes/features drive position; how new content expands spaces.
4. **Reporting integration** — Input entity stats (player at turn N) → show position in all spaces. Run calculations against content packs. Visual clusters where applicable.
5. **Docs location** — MDX/MD in docs site; TypeDoc for package API as complement.

---

## Spaces

| Space | Dimension | Input | Content | Position formula |
|-------|-----------|-------|---------|------------------|
| **Trait** | TRAIT_NAMES (12) | entity.traits | Actions, rooms, items apply deltas | Raw vector; clamp [-1,1] |
| **Feature** | FEATURE_NAMES (5) | entity.features | Fame, Effort, Awareness, Guile, Momentum | Cumulative sum |
| **Skill** | TRAIT_NAMES | entity.traits | skills.json vectorProfile | distanceBetween(traits, profile) ≤ unlockRadius |
| **Dialogue** | TRAIT_NAMES | traits + room base | dialogue clusters + options | distanceBetween(context, anchor) ≤ radius |
| **Archetype** | traits + features + skills | entity | archetypes.json | cosine(traits, profile)*0.65 + cosine(features)*0.25 + skillScore |
| **Deed** | traits + features | deed text | Anchor projection | projectVector(embed(deed)); perFeatureCap 0.22, global 0.35 |

**Space size** (formal): \( |S| = \) count of distinct content points (skills, dialogue options, archetypes). **Content density**: points per unit volume (approximate via bounding box or cluster count).

---

## Formulas Inventory (Source of Truth)

- `action-formulas.json` — Trait/feature deltas per action
- `packages/engine/.../combat/system.ts` — baseDamage = 6 + might*0.6 + agility*0.35 + levelEdge*1.1 + weaponPower*2 + variance
- `core/types.ts` — distanceBetween (Euclidean), clamp, vectorMagnitude
- `narrative/archetypes.ts` — cosine, archetype score weights
- `narrative/skills.ts` — distanceBetween for unlock
- `narrative/dialogue.ts` — distanceBetween for option availability
- `narrative/deeds.ts` — AnchorProjector, deedProjection budget
- `engine/game.ts` — roomInfluenceScale 0.05, effectiveRoomVector
- `playthrough-analyzer.ts` — Shannon entropy, excitement scores, novel combinations

---

## Reporting Integration (Future)

- Entity input: snapshot at turn N from playthrough report
- Output: Position in each space (distance to nearest skill, archetype ranking, dialogue clusters in range)
- Clusters: Group content by vector; show player’s nearest cluster per space
- Run calculations: Batch over content packs; emit per-space metrics

---

## Tasks (Phase 27)

- 27-1: Formulas reference doc (all calculations, symbols, sources)
- 27-2: Spaces framework doc (definitions, expansion, gradient analogy)
- 27-3: Analysis metrics doc (replayability, excitement, emergent)
- 27-4: Embed in /docs and link from /play/reports
- 27-5: (Future) Entity-input → space-position calculator on reports page
