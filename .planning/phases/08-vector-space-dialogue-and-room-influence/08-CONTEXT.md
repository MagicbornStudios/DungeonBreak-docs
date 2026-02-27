# Phase 08: Vector-space dialogue and room influence - Context

**Gathered:** 2026-02-26T00:00:00.000Z  
**Status:** Ready for planning/execution

## What We Have Right Now

1. A modular Escape the Dungeon codebase split into `world`, `entities`, `player`, `combat`, `narrative`, and `engine`.
2. A working 12-level dungeon crawler loop with Kael + background NPC simulation.
3. Embeddings projection for free-text intent into trait changes.
4. Chapter/page logging and quest progression.

## What Needs to Improve

1. **Concrete world object model clarity:** we need explicit `Dungeon`, `Level`, and `Room` objects that are easy to inspect and extend.
2. **Level scale:** each level must be 50 rooms (not 16).
3. **Room semantics:** rooms need their own vectors and item-driven vector changes.
4. **Dialogue-space behavior:** dialogue options must be vector-gated by distance and room state.
5. **Discoverability:** option listing/selection should be visible in API, notebook, and CLI.
6. **Story model clarity:** acts/chapters/pages should be explicit objects, not just loose dictionaries.

## Current Trait Vector Axes

The canonical axes in use are:

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

These are the "feature slice" used for entity vectors, room vectors, item vector deltas, and dialogue anchors.

## New Rules to Implement in This Phase

1. Every level has 50 rooms with exactly one start room and one exit room.
2. Rooms carry `base_vector`; present items add vector deltas to room influence.
3. Every turn applies room vector influence to the acting entity.
4. Dialogue options are attached to:
   - a vector anchor
   - a radius range
   - a cluster center/range
   - optional room/item state conditions
5. If room state changes (example: treasure taken), available options can change automatically.

## Example Behavior We Must Support

If a treasure room chest is looted by one entity:

1. The chest item is no longer present.
2. Loot option disappears (`requires_item_tag_present` no longer true).
3. Alternate option can appear (`requires_item_tag_absent` true), such as:
   - "I wish something else was here."

## Non-Goals for This Phase

1. Full narrative content volume.
2. Advanced AI planning for NPCs.
3. Production UI polish.

## Definition of Done (Phase 08)

1. Code has explicit `Dungeon`, `Level`, `Room`, `Act`, `Chapter`, and `Page` classes.
2. 12 levels x 50 rooms generation is active.
3. Room+item vector influence is active each turn.
4. Dialogue options are range/condition-gated and selectable by id.
5. CLI command flow includes options and dialogue selection.
6. Planning docs are updated and traceable.
