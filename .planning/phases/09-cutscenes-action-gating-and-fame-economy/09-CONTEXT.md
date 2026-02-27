# Phase 09: Cutscenes, action gating, skills, and fame economy - Context

**Gathered:** 2026-02-27T00:00:00.000Z  
**Status:** Ready for planning

## Why this phase exists

The simulation layer now supports world objects and vector-space dialogue.  
Next, we need a **presentation + filtering layer** so the player sees meaningful options and narrative moments at the right time.

## Desired Outcomes

1. Cutscene popups for high-signal events:
   - specific item found
   - quest stage reached
   - stat/trait milestone reached
2. Action/dialogue filtering by prerequisites:
   - room/location constraints
   - inventory constraints
   - trait/attribute thresholds
   - skill requirements
   - entity-to-entity context
3. Skills modeled in narrative space:
   - each skill has a vector profile
   - unlock/use depends on vector + prerequisites
4. Livestream system:
   - `Fame` as feature
   - `live_stream` action
   - Effort cost fixed at **10 per turn**
5. Deterministic ending with highly emergent routes to get there.

## Current System Snapshot

1. We already have:
   - 12 levels, 50 rooms per level, one start and one exit
   - room/item vectors influencing entities
   - dialogue option clusters with distance gating
2. We are missing:
   - cutscene model and trigger pipeline
   - unified prerequisite checker and reasons
   - skill vector model
   - livestream/fame/effort loop

## Key Design Constraints

1. Keep modules split by domain and easy to extend.
2. Keep documentation easy enough for a teenager to follow.
3. Keep gameplay deterministic at high-level objective (escape), while allowing local emergence.
4. One action remains one turn.

## Example behaviors we need to support

1. **Steal option** only appears if:
   - target has stealable item
   - player perception or related attribute is high enough
   - room/entity context allows attempt
2. **Treasure-state dialogue swap**:
   - chest present -> loot option in range
   - chest absent -> alternate "wish something else was here" option appears
3. **Milestone cutscene**:
   - crossing combat stat threshold triggers short authored scene + log entry
4. **Livestream loop**:
   - player streams one turn, spends 10 effort, gains fame according to context.

## Non-goals for this phase

1. Full cinematic rendering/media playback.
2. Full authored narrative corpus.
3. Multiplayer spectator systems.
