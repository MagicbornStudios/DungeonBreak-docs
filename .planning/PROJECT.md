# Project

## What This Is

**DungeonBreak** – linear world, branching narrative RPG. This planning workspace (forge-loop) tracks delivery in traceable phases and plans. We use it to flesh out planning docs, break down work, and run discuss → plan → execute → verify cycles.

## Game and narrative scope (folded from prior PRDs)

- **Vision:** Emergent, system-driven RPG: narrative branches from player choices within a linear world; tactical RTS-lite combat; rich dialog and alignment. **Pillars:** Linear world, branching narrative (A-to-B fixed, path of human will varies); stop the Dungeon Breaks; TTRPG feel (walk and talk, companions); character-driven emergence (time-spend simulation).
- **Core loops:** Interaction (dialog choices, effort ⚡, alignment; Friendly/Hostile toggle); combat (RTS-lite, auto-attack); time-spend economy (characters progress with game time).
- **Narrative Engine (plugin):** Owns **narrative state** (N-D position in basis-vector space, e.g. Courage, Loyalty, Hunger). **Game state** = actors, world (Quaterra). Entity position = thematic state; dialog options live at **locations** in that space; selection by **saliency** (distance) and optional **threshold** (available if within radius). Verlet integration; constraints (clamp, reproject old_p). Alignment (faction + individual + history); canon and subjective knowledge (designed; implementation TBD). Integration: DialogComponent, HostilityComponent, Yarn Spinner.
- **Qualities:** Position in basis-vector space, needs (as basis vectors), relationships/alignment → Narrative Engine. Physical location (world XYZ) → Quaterra. Combat stats, inventory → Combat/Economy.

## Core Value

Ship tested, traceable slices. Each phase has a goal, requirements, and plans; execution produces summaries and verification so we know what was done and what’s next.

## Requirements

### Validated

None yet.

### Active

- [ ] Align PROJECT, ROADMAP, REQUIREMENTS with DungeonBreak and Narrative Engine scope
- [ ] Complete Phase 01: Planning docs baseline (context, plans, task breakdown)
- [ ] Define Phase 02+ (e.g. Narrative Engine first slice: Verlet + constraints)
- [x] Deliver Phase 07: Escape the Dungeon (adventurelib base + modular dungeon crawler demo)
- [x] Deliver Phase 08: vector-space simulation depth (50-room levels, room vectors, dialogue ranges, CLI)
- [ ] Deliver Phase 09: cutscene presentation + prerequisite gating + skill vectors + livestream fame economy

### Out of Scope (for now)

- Full GSD parity in v1
- Implementing Narrative Engine code before planning baseline is stable

## Key References

Former standalone `game-PRD.md`, `narrative-engine-PRD.md`, and `narrative-engine-developer-guide.md` have been removed; their content is folded into PROJECT (Game and narrative scope), DECISIONS (Narrative Engine subsection), and implementation-roadmap.

- **Design decisions and rationale:** `.planning/DECISIONS.md`
- **Phases and goals:** `.planning/ROADMAP.md`
- **Requirements traceability:** `.planning/REQUIREMENTS.md`
- **Implementation phases (Ralph Wiggum loop):** `.planning/implementation-roadmap.md`
- **Embeddings text-adventure PRD:** `.planning/PRD-text-adventure-embeddings-demo.md`
- **Simple engine guide (teen-readable):** `.planning/escape-the-dungeon-teen-guide.md`
- **GDC/references for agents:** `.planning/REFERENCES.md`
- **Simulation notebooks:** `notebooks/` — single entry: `npm run lab`. **dungeonbreak-narrative.ipynb** teaches axis semantics (Courage, Loyalty, Hunger), dialogue by meaning, how Kaiza reaches options (training, dialog, forces), and time simulation. **dungeonbreak-text-adventure.ipynb** is a playable text-adventure using the same narrative model (state cube, events, effort, quest regions). **verlet-constraints.ipynb** is math-only reference. The narrative engine is in **`src/dungeonbreak_narrative/`** (shared by notebooks and game).
- **Images:** `docs/image-catalog.md` (images in docs/)
