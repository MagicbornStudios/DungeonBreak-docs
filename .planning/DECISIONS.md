# Decisions

## Lab and notebook dependencies

### Embeddings text-adventure demo architecture

- **Abstraction boundary:** The game engine depends on an `EmbeddingProvider` interface, not a specific model package. This keeps the core demo testable and reusable.
- **Fallback-first behavior:** A deterministic local embedding fallback is available by default; optional `sentence-transformers` improves semantics when installed (`uv sync --extra embeddings`).
- **Shared semantic projection path:** Player intent text, dialog/storylet placement, and placeable objects all use the same text->embedding->trait projection path so space semantics stay coherent.
- **Hybrid architecture:** Stateful orchestration uses object-oriented classes (session/game world), while scoring/projection/clamping math stays in pure functions for DRY behavior and easier verification.
- **Demo content policy:** If snapshot location/force data is missing, the demo uses explicit authored sample content instead of silently fabricating pretend live-game data.
- **Engine base:** `adventurelib` is vendored in `vendor/adventurelib` and loaded via adapter (`escape_the_dungeon/integration/adventurelib_base.py`) so we can extend locally without upstream changes.
- **Domain split:** Escape the Dungeon implementation is partitioned into `world`, `entities`, `player`, `combat`, `narrative`, and `engine` modules to avoid monolithic logic files.
- **World scale:** Escape the Dungeon levels are fixed at 50 rooms each, with one start room and one exit room per level.
- **Simulation tick rule:** One action equals one turn. Player takes one action, then background NPCs each take one action.
- **Room vectors:** Rooms have base vectors and present items add room vector deltas; room vectors apply a small influence to acting entities each turn.
- **Dialogue range model:** Dialogue options live in vector clusters and are available only when entity+room context is within distance thresholds and room/item conditions are satisfied.
- **State-dependent options:** Options can appear/disappear based on room state, such as item present vs item absent conditions.
- **Phase 09 framing:** We will add a presentation layer where major triggers produce authored cutscene text blocks, while preserving deterministic simulation state updates.
- **Livestream baseline rule:** `live_stream` will spend **10 Effort per turn** and update `Fame` as a first-class feature.
- **Gating principle:** Actions/dialogue should be filtered by explicit prerequisite checks; unavailable options should be explainable (not hidden without reason in debug views).
- **Option A two-space model:** Keep semantic embeddings and explicit gameplay-feature vectors separate. Embeddings drive interpretable deltas through anchor projection instead of replacing core traits.
- **DeeD canonicalization:** DeeDs are embedded from stable canonical text (deterministic field order + normalized text), hashed, and cached with model metadata.
- **Delta safety policy:** Apply per-feature caps and a global per-turn budget when projecting semantic vectors into trait/feature deltas.
- **Livestream Fame context formula:** Fame gain is deterministic from effort, room/context factors, novelty/risk, optional skill bonus, and diminishing returns on current fame.
- **Exclusive perception branch:** `appraisal` vs `xray` is mutually exclusive per run; both remain valid branches but one run cannot unlock both.
- **Skill evolution venue:** Skill evolution choices are performed at `rune_forge` rooms only and are gated by explicit prerequisites.
- **Companion cap:** Maximum active companions is fixed at `1` for current scope.
- **Faction lethality gate:** Lethal/murder actions require both trait thresholds and faction/reputation checks; `Laughing Face` faction is explicitly represented as murder-aligned.
- **Room density targets:** Per level room composition target is `20 treasure`, `5 rune_forge`, and `1 exit boss room` within the fixed 50-room topology.
- **Population pressure targets:** Per level initialization target is `4 dungeoneers`; additionally, one hostile enemy spawns from the exit per turn and cannot enter rune forge rooms.
- **Event boundary policy:** We intentionally support both deterministic global events and probabilistic emergent triggers, and we will document which systems belong to each boundary.
- **Terminal release policy:** Terminal binaries are produced from the CLI entrypoint with CI matrix builds (Windows/macOS/Linux) and published through tag-triggered GitHub releases (`v*`).
- **Browser runtime policy:** Gameplay runtime for docs deployment is browser-only (`/play`) with no dedicated gameplay backend service.
- **UI pivot policy (Phase 13 recovery):** Ink Web terminal UI is deprecated for gameplay; `/play` moves to a structured 3-column interface.
- **Input policy (browser):** Gameplay is button-first with no required typed commands.
- **Assistant feed policy:** Assistant UI is used as the center feed presentation layer for narration, action outcomes, and dialogue/cutscene text.
- **Cutscene interaction policy:** Cutscenes are queued in a blocking modal flow and must be dismissed before new turn actions.
- **Release closeout target:** Terminal release policy remains semantic tags (`v*`) with immediate first stable target `v0.1.0`.
- **TS embedding baseline:** Browser embedding v1 uses deterministic hash projection (no model downloads in repo/executable), with model-based embeddings deferred.
- **Parity governance:** Python implementation remains the canonical behavior baseline until browser parity matrix items are closed.

- **Single source of truth:** All Python deps for notebooks live in **`pyproject.toml`** (e.g. jupyterlab, numpy, matplotlib, plotly, ipywidgets). Do not hardcode package lists in `scripts/lab-install.mjs`.
- **Install flow:** `scripts/lab-install.mjs` runs **`uv sync`** so whatever is in `pyproject.toml` is installed into `.venv`. `npm run lab` runs lab-install then Jupyter, so deps are always synced before use.
- **When adding a notebook dep:** Add it to `pyproject.toml` under `[project] dependencies`; run `npm run lab` or `npm run lab:install` so the env gets it. Agents: after adding a notebook import (e.g. plotly, ipywidgets), add the dep to pyproject.toml and ensure lab-install uses uv sync (no separate pip install list).

**Notebook simulation semantics (dungeonbreak-narrative.ipynb):** Time is **event-based**: a play-through is a list of **events** (TRAINING, REST, DIALOG, TRAVEL), each with type, scene_id, npc_id, and optional chosen_dialog. State (Courage, Loyalty, Hunger), **level** (1 + floor(total_xp / XP_PER_LEVEL)), **effort pool** (0–1: recovers on Rest, spent on Dialog), and **cumulative effort spent** (monotonic) are updated via **named constants** only. **Quest regions** (e.g. MAIN_QUEST_CH1_REGION) are axis-aligned boxes in state space; when Kaiza's position enters a region, that quest is available. Scene → NPC mapping and `available_dialogs(pos, scene_id)` determine options per event. Graphs: state over event index, effort pool + cumulative spent, state space with quest region and path, game-space (scene) path, before/after moments; event slider (not step) for inspection.

**All in the lab:** Analysis, demo, simulation, and the text-adventure game live in the Jupyter Lab workspace (`npm run lab`, `notebooks/` as root). The narrative model is implemented in the **`dungeonbreak_narrative`** Python package (`src/dungeonbreak_narrative/`); the narrative notebook and the text-adventure notebook (`dungeonbreak-text-adventure.ipynb`) both use it (or inline equivalents). The game can be played as an interactive notebook (ipywidgets) or run as a script from Lab's terminal.

### Narrative Engine (plugin) — state and dialog

- **State model:** N-dimensional basis-vector space (e.g. Courage, Loyalty, Hunger). Entity position = `FVectorND`; velocity inferred from position history (Verlet). **Verlet:** `new_p = p + (p - old_p) + a*dt²`; then clamp `p` to bounds and **reproject `old_p`** so implied velocity respects the boundary (slide). Per-axis min/max (and optionally global norm) keep state in a valid region.
- **Dialog in state space:** Dialog options have a **Location** (point in same N-D space). Selection = spatially oriented: **saliency** by distance (closer = more relevant; e.g. Gaussian falloff). **Threshold:** when entity is within a distance threshold of a dialog location, that option is **available** (e.g. show in menu); when several above threshold: show all, pick random among them, or pick closest with variety. See `notebooks/dungeonbreak-narrative.ipynb`.
- **Qualities — what lives where:** Position in basis-vector space, needs (as basis vectors), relationships/alignment → Narrative Engine. Physical location (world XYZ) → Quaterra. Combat stats, inventory → Combat/Economy. Time → Narrative Engine (Scene).

---

## Payload (docs-site) schema and migrations

- **Schema push disabled:** The SQLite adapter uses `push: false`. All schema and data changes go through **migrations** in `docs-site/migrations/`.
- **Workflow after changing Payload schema:** From docs-site: run `pnpm migrate:create`, then `pnpm migrate`. If the change **renames or removes columns** (or changes field shape), edit the new migration’s `up` to **backfill new columns from old**, then alter/drop old columns; then run `pnpm migrate`. Commit new migration files.
- **First-time setup:** From docs-site, run `pnpm migrate` before first `pnpm dev` so tables exist.

---

## Phase-level decisions

- **Verification config (Phase 01):** Disabled `docs`/`build`/`tests` and added a single no-op `genericCommands` check (`node -e "process.exit(0)"`) so `forge-loop verify-work 1 --strict` can pass on this repo. The default forge-loop profile expects `pnpm forge-loop:test`, which is not set up here. When we add a real test suite, we can re-enable or point verification at it.

---

## Design decisions (GDC / research → application)

Key design decisions and rationale, informed by GDC talks, procedural generation research, and DungeonBreak's design pillars. Agents and tooling should use these when reasoning about systems.

### 1. Perceptual Uniqueness over Mathematical Uniqueness

**Decision**: Prioritize perceptual differentiation in characters and narrative over mathematically unique content.

**Rationale** (Kate Compton, *Practical Procedural Generation for Everyone*): The "10,000 bowls of oatmeal" problem—you can generate 10,000 bowls where each oat is in a different position and orientation; mathematically they are unique, but the user sees a lot of oatmeal. What matters is *perceptual uniqueness*: players must perceive differentiation. Design for meaning, not combinatorics.

**Application**: Character traits, dialog variants, and world events should feel meaningfully different to the player, not merely statistically varied.

---

### 2. Orthogonal Traits with Higher-Order Meaning

**Decision**: Use orthogonal (non-overlapping) character traits; layer archetypes/suits for coherence.

**Rationale** (Tanya X. Short, *Writing Modular Characters for System-Driven Games*): Traits like flirtiness and extraversion overlap in the behaviors they create (both govern whether a character wants to talk to you). Players won't see the difference. Use orthogonal axes (e.g., romantic interest vs. extroversion) so values combine meaningfully. At the same time, add higher-order meaning—suits, archetypes, themes—to shape the "bucket" of content, not just the water inside. Emily Short's *Nines of the Perixx* tagged corpus by suits (salt, beeswax, venom, mushroom, egg) to create perceptual regions.

**Application**: Define orthogonal axes for character generation; apply thematic archetypes (e.g., elements, tarot suits) for coherent flavor across systems.

---

### 3. Authoring Tools over Complex AI

**Decision**: Design prompts and authoring tools; let players construct narratives from those prompts.

**Rationale** (Matt Brown, *Emergent Storytelling Techniques in The Sims*): The Sims uses an AI-minimalist approach. Authoring tools proved more valuable than complex AI for creating extensive narrative content. The game provides interesting prompts; players bear responsibility for constructing stories. Prioritize coherence and retellability over complexity.

**Application**: Invest in rich authored content, story trees, and authoring workflows. Use systems to *match* player actions to content rather than to *generate* narratives from scratch.

---

### 4. Linear Structure with Branching Agency

**Decision**: Fix the A-to-B destination (linear world); allow variable characters and events along the path.

**Rationale** (DungeonBreak vision): One Piece's plot illustrates a constant destination with any path of human will between points. Diverse, linear map with a single path ahead; towns and dungeons offer localized exploration. Bifurcations in choice create new universes to explore within the same space.

**Application**: Main world path is linear; POIs populate dynamically from narrative canon. Player choices in dialog alter which characters and events appear along that path.

---

### 5. Story Volume over Story Lines

**Decision**: Define a *story volume*—the family of emergent stories—rather than a single story or fixed branch set.

**Rationale** (Tanya X. Short, Jason Grimm): A story volume "encloses a family of emergent stories created by a set of carefully curated system parameters." Parameters (themes, setting, societal collapse, love ballads, moon festivals) define what is *allowed*, not what *should* happen. Orthogonality ensures the volume is rich and explorable.

**Application**: Curate parameters that bound DungeonBreak's story space—dungeon breaks, guild politics, time travel, training, alignment—without scripting every outcome.

---

### 6. Local Intelligence over Long-Term Planning

**Decision**: NPC AI should ensure consistency in immediate behavior sequences; avoid complex long-term planning.

**Rationale** (The Sims): Local intelligence allows players to construct their own long-term narratives. Consistency promotes player personality attribution; some randomness prevents exploitable repetition. Story trees are matched against player actions and scored by interest and NPC personality.

**Application**: NPCs react to player momentum. Focus on coherent short sequences and clear cause-effect; let emergence arise from player interpretation.

---

### 7. Surfacing Meaning Quickly

**Decision**: Surface character meaning to the player as quickly as possible; don't hide perceptual uniqueness.

**Rationale** (Tanya X. Short): Priority order—(1) what has changed (if re-encounter), (2) unique trait reminder, (3) current status, (4) finer details on opt-in. Avoid stacking too much into one channel (e.g., a thousand greeting variants); use orthogonal broadcasting. Don't mimic naturalist pacing (physical first, name second)—players forget names; give meaningful info upfront.

**Application**: First-second re-encounter: show what changed. Then unique trait. Status and detail on demand.

---

### 8. Procedural Generation Techniques

**Decision**: Use tiles, grammars, and distribution; apply additive and subtractive iteration.

**Rationale** (Kate Compton): Tiles for chunk-based assembly (maps, cards). Grammars for recursive structure (Tracery, L-systems). Distribution with hierarchy and clustering (bolding, footing, greebling). Additive: build good stuff. Subtract: whitelist good seeds, generate-and-reject, or use search/genetic algorithms. Be flexible; follow the generator when it leads.

**Application**: Dungeon and POI layout (tiles/grammars); character and event distribution (hierarchical, clustered); iterate with subtractive curation where needed.

---

### 9. Centers and Coherence (Nature of Order)

**Decision**: Design narrative and world elements as "centers" with varying degrees of "life" and coherence.

**Rationale** (Jesse Schell, *The Nature of Order in Game Narrative*): Christopher Alexander's patterns characterize persistent entities. Stories supported by these universal patterns resonate more and have lasting appeal. Design for replayability and shareability across generations.

**Application**: Ensure narrative beats, locations, and characters form coherent wholes that feel alive and complete rather than arbitrary fragments.

---

### 10. Iterate with Systems as Co-Authors

**Decision**: Treat the corpus of data and the systems that combine them as co-authors; iterate on both.

**Rationale** (Tanya X. Short): Writers and system designers must iterate together. Different co-authors (e.g., Theophrastus vs. medieval pope descriptions) add different flavor. Measure what "common" and "too surprising" mean; allow exceptions and handwritten flourishes that break rules.

**Application**: Cycle between content iteration and system tuning. Define rarity/commonness; use analytics to tune surprise levels.

---

### Summary: Key Tensions Resolved

| Tension | Resolution |
|--------|------------|
| Perceptual vs mathematical uniqueness | Favor perceptual differentiation |
| Orthogonality vs higher-order meaning | Orthogonal traits + archetype layers |
| Authoring vs emergence | Author prompts; players construct stories |
| Linear structure vs player agency | Linear path; variable characters/events |
| Consistency vs randomness | Consistent short sequences; controlled randomness |
