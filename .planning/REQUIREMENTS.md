# Requirements: DungeonBreak

## v1 Requirements

### Planning baseline

- [x] **REQ-01**: PROJECT.md reflects DungeonBreak and Narrative Engine scope and core value
- [x] **REQ-02**: ROADMAP.md defines Phase 01 (planning docs baseline) and Phase 02+ with goals and requirements
- [x] **REQ-03**: Phase 01 has captured context (desired outcome, constraints, non-goals) and at least one plan with tasks and must-haves

### Planning docs and simulations

- [x] **REQ-06**: PRD and decisions in .planning; docs/ not extended. Notebooks in `notebooks/` visualize 3D state space, saliency, triggering, and Verlet+constraints (Phase 02)

### Narrative Engine (implementation)

- [x] **REQ-04**: Narrative Engine Verlet-first implementation track is archived/superseded after Escape the Dungeon runtime pivot (Phase 03 legacy closure)
- [x] **REQ-05**: Narrative Engine dialog-saliency first-slice implementation track is archived/superseded after Escape the Dungeon runtime pivot (Phase 04 legacy closure)

### Docs and tooling

- [x] **REQ-07**: docs/ only image-catalog (+ images). Game PRD, design decisions, implementation roadmap in .planning. Notebook venv + JupyterLab from root (Phase 05)

- [x] **REQ-08**: `npm run lab` remains the single entry for local setup/install helpers after TypeScript cutover; no notebook dependency is required (Phase 15 target update)

### Escape the Dungeon demo

- [x] **REQ-09**: PRD in `.planning` defines canonical concepts, architecture, and definition of done for **Escape the Dungeon** (12-level dungeon crawler demo) (Phase 07)
- [x] **REQ-10**: Reusable Python game modules are split by domain (world/entities/player/combat/narrative/engine) and use vendored adventurelib as base engine (Phase 07)
- [x] **REQ-11**: Notebook demo supports Kael gameplay loop with level/chapter/act progression, NPC background simulation, quests, and chapter page logs (Phase 07)
- [x] **REQ-12**: Free-text intent projection (embeddings + deterministic fallback) updates trait vector slice in gameplay flow (Phase 07)

### Escape the Dungeon simulation depth (Phase 08)

- [x] **REQ-13**: Concrete world objects (`Dungeon`, `Level`, `Room`) model 12 levels with 50 rooms per level; each level has exactly one start room and one exit room
- [x] **REQ-14**: Room vectors + room item vectors are represented explicitly and influence entity trait vectors each turn
- [x] **REQ-15**: Dialogue options are attached to vector anchors/clusters with distance ranges and room/item conditions; options can be listed and chosen through engine APIs
- [x] **REQ-16**: CLI entry point exists for Escape the Dungeon and uses vendored adventurelib command flow
- [x] **REQ-17**: Planning documentation includes a plain-language (teen-readable) guide for classes, vectors, and simulation flow

### Escape the Dungeon presentation and gating layer (Phase 09)

- [x] **REQ-18**: Cutscene/event system triggers authored scene popups for item/quest/stat milestones and logs them to chapter pages
- [x] **REQ-19**: Action and dialogue availability are filtered by explicit prerequisites and can explain why options are unavailable
- [x] **REQ-20**: Skills are represented in narrative space with vector profiles and prerequisite-based unlock/use rules
- [x] **REQ-21**: Livestream action exists with Fame effects and Effort cost fixed at 10 per turn
- [x] **REQ-22**: Notebook and CLI both expose filtered options, cutscene presentation, and livestream gameplay state

### Escape the Dungeon emergent parity and faction pressure (Phase 10)

- [x] **REQ-23**: Player and non-player entities use the same action catalog and prerequisite checks for turn execution
- [x] **REQ-24**: Level composition supports 20 treasure rooms and 5 rune forge rooms per level while preserving 50-room total
- [x] **REQ-25**: Exit room boss exists on every level and 4 dungeoneers are present per floor at initialization
- [x] **REQ-26**: A hostile enemy spawns from level exit every turn, seeks entities, and cannot enter rune forge rooms
- [x] **REQ-27**: Skills support evolution at rune forge rooms and enforce run-exclusive branch `appraisal` vs `xray`
- [x] **REQ-28**: Companion system exists with max active companions = 1, recruitable from dungeoneers by alignment checks
- [x] **REQ-29**: Faction/reputation + trait checks gate lethal and murder actions; `Laughing Face` faction is represented
- [x] **REQ-30**: Livestream/deed rumor propagation between entities exists and influences dialogue/action availability
- [x] **REQ-31**: Entity/player level curves are modeled and influence combat and decision systems
- [x] **REQ-32**: Deterministic global events and probabilistic emergent triggers are both implemented with explicit boundary docs and tests

### Terminal release packaging and version pipeline (Phase 12)

- [x] **REQ-33**: CI workflow runs Python test suite for pull requests and pushes before release artifact generation
- [x] **REQ-34**: Cross-platform terminal binaries (Windows/macOS/Linux) are built from the CLI entrypoint and uploaded as artifacts
- [x] **REQ-35**: Tag-based GitHub release pipeline (`v*`) publishes terminal game binaries with versioned assets

### Browser runtime and parity gating (Phase 13)

- [x] **REQ-36**: Browser game route exists at `docs-site/app/(fumadocs)/play/page.tsx` and is playable with a 3-column button-first UX (no required command typing)
- [x] **REQ-37**: Browser runtime uses TypeScript engine with documented parity matrix against Python baseline
- [x] **REQ-38**: Browser persistence supports autosave + named slots (IndexedDB adapter + memory fallback)
- [x] **REQ-39**: Homepage links prominently to `/play` without replacing docs-first landing purpose
- [x] **REQ-40**: Browser test coverage includes world topology, action gating, branching/exclusivity, hostile pressure, pages/logs, and snapshot restore
- [x] **REQ-41**: CI includes a docs/browser workflow (typecheck/build/unit/e2e smoke)
- [x] **REQ-42**: Release gating requires engine package pipeline success and browser docs workflow success before publish
- [x] **REQ-43**: `/play` presents three columns: action lists (left), Assistant UI feed (center), and character/status panels (right)
- [x] **REQ-44**: Cutscenes and critical dialogue moments are surfaced in a blocking modal queue before further actions
- [x] **REQ-45**: Playwright validates clickable gameplay loop output and state updates without command-bridge typing
- [x] **REQ-46**: Tagged release flow publishes downloadable `@dungeonbreak/engine` package tarball artifacts to GitHub Releases (no npm registry publish required)

### Browser combat simulation parity (Phase 14)

- [x] **REQ-47**: Combat uses encounter simulation factors (equipment, stats, traits, room context, effects, skill policy) and does **not** introduce a combat grid
- [x] **REQ-48**: Player combat input surface is high-level only (`fight`, `flee`); users do not micromanage per-skill priority queues
- [x] **REQ-49**: Dialogue choice simulation remains a non-combat interaction flow; combat interactions are limited to combat-resolution decisions and outcomes
- [x] **REQ-50**: Browser test coverage adds deterministic combat/flee scenarios and long-run turn-performance assertions for entity pressure
- [x] **REQ-51**: A deterministic 25-turn reference playthrough exists in tests and exercises all core systems (movement, room vectors, deeds, dialogue, combat/flee, skills, cutscenes, pages, rumors)
- [x] **REQ-52**: Deed memory supports uncertain/incorrect beliefs (`misinformed`) about self and other entities, with source tracking and confidence
- [x] **REQ-53**: Flee has no fail roll; it resolves as deterministic movement to an adjacent legal room, and chase can still occur on later turns
- [x] **REQ-54**: Action-to-outcome mapping is explicit and machine-readable (data contract), including formula constants and delta caps
- [x] **REQ-55**: Shared content contracts are JSON schema driven (actions, items, skills, traits, cutscenes, room templates) for TS now and C++/other runtimes later
- [x] **REQ-56**: Golden trace replay fixtures exist for deterministic cross-runtime parity checks and use a single canonical seed for v1 (`CANONICAL_SEED_V1`)
- [x] **REQ-57**: Automated vector/feature usage reporting exists and flags low-usage or unused dimensions/content
- [x] **REQ-58**: Browser turn processing meets performance target (`p95 <= 2s`) under pressure cap `120` entities (when items are modeled as entities) with deterministic pruning/backpressure policy
- [x] **REQ-59**: TypeScript runtime is the canonical gameplay source of truth; Python runtime is removed from active gameplay development

### TypeScript cutover and package distribution (Phase 15)

- [x] **REQ-60**: Python gameplay runtime and dead gameplay code are removed from active mainline paths, with archive/tag retained for historical recovery
- [x] **REQ-61**: Python gameplay runtime is removed from active repo paths immediately, with archival access preserved via tags/releases only
- [x] **REQ-62**: Notebook artifacts are removed from active development scope; concept simulation docs remain text-first under `scratch/` and `.concept/`
- [x] **REQ-63**: Package `DungeonBreak/engine` is installable without npm publish via GitHub release tarball and repository-based install flows
- [x] **REQ-64**: Package includes a production-ready React component that renders a playable game out of the box
- [x] **REQ-65**: Package bundles default game content/data (rooms, items, skills, cutscenes, vectors) so consumers can run without external data setup
- [x] **REQ-66**: Repository includes a complete working example app consuming the package APIs/components (docs-site `/play` + package-consumer tests)
- [x] **REQ-67**: CI and docs validate package build, install, and runtime smoke integration from consumer perspective

### Content scale and balancing closure (Phase 11)

- [x] **REQ-68**: Archetype compass data is schema-validated and available to runtime consumers with deterministic heading classification per turn
- [x] **REQ-69**: Skills/dialogue/items are expanded through data-driven contract packs and consumed by engine builders without hardcoded content tables
- [x] **REQ-70**: Balancing simulation harness exists with deterministic batch metrics and report generation scripts for engine/package/docs workflows

### Content production and long-run balancing loops (Phase 17)

- [x] **REQ-71**: Content packs (skills/dialogue/items/events/quests) expand through schema-validated JSON contracts with no hardcoded authoring growth
- [x] **REQ-72**: Long-run deterministic simulations (100/250/500 turns) are executed in CI-facing suites with stable summary metrics
- [x] **REQ-73**: Balance report artifacts include action usage, archetype distribution, survival/escape rates, and dead-content detection
- [x] **REQ-74**: Performance and pressure budgets remain enforced (`p95 <= 2s`, cap 120 with deterministic pruning) under expanded content load

### MCP gameplay interface and deterministic replay harness (Phase 18)

- [x] **REQ-75**: Engine exposes a machine-playable turn API contract for controlled tool orchestration (create session, inspect state, list legal actions, dispatch action)
- [x] **REQ-76**: MCP server adapter is available to expose gameplay tools/resources without browser UI dependency
- [x] **REQ-77**: A dense deterministic playthrough suite (>= 75 turns) validates broad interactions (combat/flee, dialogue, rumors, skills/evolution, faction gates, companions, cutscenes, chapter/act/page logs)
- [x] **REQ-78**: Regression tests assert deterministic outputs from identical seed + action scripts across repeated runs
- [x] **REQ-79**: MCP docs define tool schemas, action payloads, response formats, and failure semantics for deterministic runner flows
- [x] **REQ-80**: `/play` UX and MCP interface remain behaviorally aligned through shared presenter/engine contracts

### Assistant Frame window-agent integration and default remote MCP (Phase 19)

- [x] **REQ-81**: `/play` exposes Assistant Frame-compatible bridge wiring so host/window agents can operate gameplay without typed command input
- [x] **REQ-82**: Browser gameplay remains fully usable without `/api/mcp` and degrades cleanly to button/DOM-driven operation for agents that do not consume frame bridges
- [x] **REQ-83**: Remote MCP delivery at `/api/mcp` is enabled by default in deployed docs runtime
- [x] **REQ-84**: Remote MCP access requires authenticated signed-in users; unauthenticated requests are rejected
- [x] **REQ-85**: Remote MCP hardening baseline is always enforced (rate limiting, session isolation, payload validation, audit log metadata)
- [x] **REQ-86**: Docs include clear integration guides for local stdio MCP, Assistant Frame/window-agent mode, and signed-in remote MCP mode
- [x] **REQ-87**: Play reports are versioned with the exact game build/release version and published as release artifacts
- [x] **REQ-88**: Each published build includes a machine-readable pass/fail test manifest (unit/integration/e2e/parity/perf) as a release artifact

### Report schema streaming and LLM scope policy (Phase 20)

- [x] **REQ-89**: Split report artifacts support JSONL event-row streams so viewers can iterate timeline data without hydrating full external ledger JSON into memory
- [x] **REQ-90**: LLM turn-chooser/autonomous gameplay remains out of scope for foreseeable delivery; docs must clearly state MCP support exists but autonomous model-driven play is not currently implemented, plus list required future changes

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-01 | Phase 01 | Done |
| REQ-02 | Phase 01 | Done |
| REQ-03 | Phase 01 | Done |
| REQ-06 | Phase 02 | Done |
| REQ-04 | Phase 03 | Superseded (archived) |
| REQ-05 | Phase 04 | Superseded (archived) |
| REQ-07 | Phase 05 | Done |
| REQ-08 | Phase 06 | Done |
| REQ-09 | Phase 07 | Done |
| REQ-10 | Phase 07 | Done |
| REQ-11 | Phase 07 | Done |
| REQ-12 | Phase 07 | Done |
| REQ-13 | Phase 08 | Done |
| REQ-14 | Phase 08 | Done |
| REQ-15 | Phase 08 | Done |
| REQ-16 | Phase 08 | Done |
| REQ-17 | Phase 08 | Done |
| REQ-18 | Phase 09 | Done |
| REQ-19 | Phase 09 | Done |
| REQ-20 | Phase 09 | Done |
| REQ-21 | Phase 09 | Done |
| REQ-22 | Phase 09 | Done |
| REQ-23 | Phase 10 | Done |
| REQ-24 | Phase 10 | Done |
| REQ-25 | Phase 10 | Done |
| REQ-26 | Phase 10 | Done |
| REQ-27 | Phase 10 | Done |
| REQ-28 | Phase 10 | Done |
| REQ-29 | Phase 10 | Done |
| REQ-30 | Phase 10 | Done |
| REQ-31 | Phase 10 | Done |
| REQ-32 | Phase 10 | Done |
| REQ-33 | Phase 12 | Done |
| REQ-34 | Phase 12 | Done |
| REQ-35 | Phase 12 | Done |
| REQ-36 | Phase 13 | Done |
| REQ-37 | Phase 13 | Done |
| REQ-38 | Phase 13 | Done |
| REQ-39 | Phase 13 | Done |
| REQ-40 | Phase 13 | Done |
| REQ-41 | Phase 13 | Done |
| REQ-42 | Phase 13 | Done |
| REQ-43 | Phase 13 | Done |
| REQ-44 | Phase 13 | Done |
| REQ-45 | Phase 13 | Done |
| REQ-46 | Phase 13 | Done |
| REQ-47 | Phase 14 | Done |
| REQ-48 | Phase 14 | Done |
| REQ-49 | Phase 14 | Done |
| REQ-50 | Phase 14 | Done |
| REQ-51 | Phase 14 | Done |
| REQ-52 | Phase 14 | Done |
| REQ-53 | Phase 14 | Done |
| REQ-54 | Phase 14 | Done |
| REQ-55 | Phase 14 | Done |
| REQ-56 | Phase 14 | Done |
| REQ-57 | Phase 14 | Done |
| REQ-58 | Phase 14 | Done |
| REQ-59 | Phase 14 | Done |
| REQ-60 | Phase 15 | Done |
| REQ-61 | Phase 15 | Done |
| REQ-62 | Phase 15 | Done |
| REQ-63 | Phase 15 | Done |
| REQ-64 | Phase 15 | Done |
| REQ-65 | Phase 15 | Done |
| REQ-66 | Phase 15 | Done |
| REQ-67 | Phase 15 | Done |
| REQ-68 | Phase 11 | Done |
| REQ-69 | Phase 11 | Done |
| REQ-70 | Phase 11 | Done |
| REQ-71 | Phase 17 | Done |
| REQ-72 | Phase 17 | Done |
| REQ-73 | Phase 17 | Done |
| REQ-74 | Phase 17 | Done |
| REQ-75 | Phase 18 | Done |
| REQ-76 | Phase 18 | Done |
| REQ-77 | Phase 18 | Done |
| REQ-78 | Phase 18 | Done |
| REQ-79 | Phase 18 | Done |
| REQ-80 | Phase 18 | Done |
| REQ-81 | Phase 19 | Done |
| REQ-82 | Phase 19 | Done |
| REQ-83 | Phase 19 | Done |
| REQ-84 | Phase 19 | Done |
| REQ-85 | Phase 19 | Done |
| REQ-86 | Phase 19 | Done |
| REQ-87 | Phase 19 | Done |
| REQ-88 | Phase 19 | Done |
| REQ-89 | Phase 20 | Done |
| REQ-90 | Phase 20 | Done |
