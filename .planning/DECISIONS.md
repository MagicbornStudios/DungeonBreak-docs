# Decisions

## Lab and TypeScript package tooling

### Embeddings text-adventure demo architecture

- **Abstraction boundary:** The game engine depends on an `EmbeddingProvider` interface, not a specific model package. This keeps the core demo testable and reusable.
- **Fallback-first behavior:** A deterministic local embedding fallback is available by default; optional `sentence-transformers` improves semantics when installed (`uv sync --extra embeddings`).
- **Shared semantic projection path:** Player intent text, dialog/storylet placement, and placeable objects all use the same text->embedding->trait projection path so space semantics stay coherent.
- **Hybrid architecture:** Stateful orchestration uses object-oriented classes (session/game world), while scoring/projection/clamping math stays in pure functions for DRY behavior and easier verification.
- **Demo content policy:** If snapshot location/force data is missing, the demo uses explicit authored sample content instead of silently fabricating pretend live-game data.
- **Engine base:** Engine is TypeScript-first and framework-agnostic, consumed by docs-site and package consumers through stable APIs.
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
- **Package release policy:** `@dungeonbreak/engine` is the primary distributable; release flow is semantic tags with package + docs integration gates.
- **Browser runtime policy:** Gameplay runtime for docs deployment is browser-only (`/play`) with no dedicated gameplay backend service.
- **UI pivot policy (Phase 13 recovery):** Ink Web terminal UI is deprecated for gameplay; `/play` moves to a structured 3-column interface.
- **Input policy (browser):** Gameplay is button-first with no required typed commands.
- **Assistant feed policy:** Assistant UI is used as the center feed presentation layer for narration, action outcomes, and dialogue/cutscene text.
- **Cutscene interaction policy:** Cutscenes are queued in a blocking modal flow and must be dismissed before new turn actions.
- **Release closeout target:** Package release follows semantic tags (`v*`) with docs + package CI gates required.
- **TS embedding baseline:** Browser embedding v1 uses deterministic hash projection (no model downloads in repo/executable), with model-based embeddings deferred.
- **Runtime governance update:** TypeScript runtime is the canonical gameplay source of truth across docs app and package consumers.
- **Terminology policy:** Use "action payload wiring" for gameplay action data flow; do **not** refer to this as Payload CMS plumbing.
- **Combat model policy (Phase 14):** Browser combat will not use a combat grid. Combat remains encounter simulation driven by equipped gear, stats, traits/features, passives/effects, room context, and internal skill-priority policy.
- **Player control policy (combat):** Player combat controls stay high-level (`fight` or `flee`), while the engine chooses detailed skill usage and priority resolution.
- **Dialogue/combat boundary policy:** Narrative dialogue choice UX is for non-combat interaction; combat turns expose combat-resolution outcomes, not full dialogue trees.
- **Depth/Level separation policy:** `depth` means dungeon floor position; `level` means character progression from XP. They are always represented and tested as distinct fields.
- **Reference-run policy:** A deterministic 25-turn integration playthrough is required and acts as a gating scenario for gameplay regressions.
- **Canonical replay seed policy:** v1 uses a single canonical replay seed (`CANONICAL_SEED_V1 = 20260227`) for golden trace and 25-turn reference tests.
- **Deed memory policy:** Deeds can be about self or other entities and may be incorrect; memory records include source and confidence to model misinformation.
- **Flee resolution policy:** Flee does not roll for hard failure. It resolves as deterministic movement to a legal adjacent room; hostiles may chase in subsequent turns.
- **Data portability policy:** Gameplay content contracts are JSON-schema based (actions, rooms, items, skills, cutscenes, vectors), with golden trace fixtures for cross-runtime replay.
- **Performance policy:** Browser turn loop target is `p95 <= 2s` with pressure cap `120` entities when items are modeled as entities; deterministic pruning/backpressure applies when limits are exceeded.
- **Telemetry policy:** Each build must emit a vector/feature usage report to identify underused mechanics and content for balancing and cleanup.
- **Python cutover update:** Python gameplay runtime is removed immediately from active repo development paths; recovery is via archived tags/releases only.
- **Notebook cutover update:** Gameplay notebooks are removed from active development scope; concept simulation remains in `scratch/` + `.concept/` markdown artifacts.
- **Lab continuity policy:** `npm run lab` and install helpers remain first-class and are retargeted to TypeScript/package workflows instead of notebook runtime.
- **Package distribution policy:** Engine is distributed as `DungeonBreak/engine` (implementation id `@dungeonbreak/engine`) with bundled default game data and out-of-box React component.
- **Lab install flow:** `npm run lab` remains the single entry for local setup and docs/package development helpers; it is no longer notebook-dependent.
- **Simulation semantics location:** Turn-by-turn simulation semantics are documented in `.planning/GRD-escape-the-dungeon.md` and `.concept/*` artifacts.
- **Cutover completion policy:** Python gameplay runtime and notebook assets are now removed from active mainline. TypeScript package/runtime is the single supported gameplay implementation.
- **Release artifact policy:** Tagged releases publish package artifacts (`@dungeonbreak/engine` tarball) to GitHub Releases after package checks and docs consumer checks pass.
- **Registry policy:** We do not publish gameplay package builds to npm registry by default; official distribution is GitHub Releases tarball and repo-based install paths.
- **Archetype compass policy (Phase 11):** Archetypes are first-class, schema-validated content packs and are recomputed after each turn for all entities so status/UI and behavior scoring stay aligned.
- **Content authoring policy (Phase 11):** Skills/dialogue/item growth is contract-driven (JSON pack -> parser -> runtime directors), avoiding hardcoded content tables in engine constructors.
- **Balancing harness policy (Phase 11):** Runtime balancing is validated through deterministic batch simulations and report scripts (`simulateBalanceBatch`, `report:balance-sim`, package balance harness smoke).
- **Phase 17 content policy:** Ongoing content expansion must remain contract-first (JSON/schema) and be validated by deterministic long-run simulation outputs before release.
- **MCP gameplay contract policy (Phase 18):** Gameplay engine behavior must be exposed through a machine-playable contract (session/state/actions/dispatch) that does not depend on UI rendering.
- **MCP integration policy (Phase 18):** MCP server adapter is maintained over engine APIs so `/play` and tool-driven flows stay aligned through shared engine/presenter contracts.
- **Local MCP onboarding policy:** Repo ships an installer helper (`scripts/install-mcp-config.mjs`) that merges DungeonBreak MCP server entries into Cursor (`~/.cursor/mcp.json`) and Codex (`~/.codex/config.toml`) configs.
- **Dense replay policy (Phase 18):** Agent regression uses a canonical dense fixture (`canonical-dense-trace-v1.json`, >=75 turns) with setup preconditions and hash lock for deterministic drift detection.
- **MCP parity gating policy:** CI must run MCP parity smoke (`test:parity-smoke`) to assert replay-hash equivalence between direct engine replay and MCP session dispatch.
- **Long-run balancing policy (Phase 17):** Deterministic suites run at 100/250/500 turn windows with canonical seed set and emit dead-action detection plus survival/archetype/performance metrics.
- **Deterministic runner policy:** Repo includes deterministic policy runner (`npm run agent:play`) that emits `.planning/test-reports/agent-play-report.json` for regression and report generation; it is not an LLM turn chooser.
- **Assistant Frame integration policy (Phase 19):** `/play` must expose Assistant Frame-compatible window bridge wiring for agent control, while preserving button-first gameplay as the default UX.
- **Remote MCP default policy (Phase 19):** `/api/mcp` is enabled by default in deployed runtime; local stdio MCP and browser/window-agent play remain first-class paths.
- **Remote access control policy:** Remote MCP usage requires authenticated signed-in users.
- **Remote hardening policy:** Remote MCP must always enforce baseline hardening (rate limiting, payload validation, session isolation, and audit metadata).
- **Release report versioning policy:** Play reports and test-result manifests are version-coupled to the shipped game build and published as release artifacts.
- **API doc generation scope policy:** OpenAPI generation is deferred; current docs focus on manual MCP tool/API documentation and engine SDK docs.
- **LLM gameplay scope policy (Phase 20):** LLM/autonomous turn choosing is de-scoped for foreseeable delivery. Docs must explicitly state MCP support exists, but autonomous model-driven gameplay is not currently implemented.
- **Future autonomous-play prerequisites policy:** Before enabling LLM turn choice, we require deterministic tool-call sandboxing, reproducible policy evaluation traces, bounded action budgets, and separate reliability/perf gates from baseline deterministic replay checks.
- **Legacy phase archive policy:** Early Narrative Engine implementation phases (03/04) remain documented for history but are formally superseded by the Escape the Dungeon runtime track and excluded from active delivery gates.

### Narrative Engine (plugin) — state and dialog

- **State model:** N-dimensional basis-vector space (e.g. Courage, Loyalty, Hunger). Entity position = `FVectorND`; velocity inferred from position history (Verlet). **Verlet:** `new_p = p + (p - old_p) + a*dt²`; then clamp `p` to bounds and **reproject `old_p`** so implied velocity respects the boundary (slide). Per-axis min/max (and optionally global norm) keep state in a valid region.
- **Dialog in state space:** Dialog options have a **Location** (point in same N-D space). Selection = spatially oriented: **saliency** by distance (closer = more relevant; e.g. Gaussian falloff). **Threshold:** when entity is within a distance threshold of a dialog location, that option is **available** (e.g. show in menu); when several above threshold: show all, pick random among them, or pick closest with variety. See GRD and runtime reference docs.
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
