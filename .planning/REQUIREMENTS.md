# Requirements: DungeonBreak

## v1 Requirements

### Planning baseline

- [ ] **REQ-01**: PROJECT.md reflects DungeonBreak and Narrative Engine scope and core value
- [ ] **REQ-02**: ROADMAP.md defines Phase 01 (planning docs baseline) and Phase 02+ with goals and requirements
- [ ] **REQ-03**: Phase 01 has captured context (desired outcome, constraints, non-goals) and at least one plan with tasks and must-haves

### Planning docs and simulations

- [ ] **REQ-06**: PRD and decisions in .planning; docs/ not extended. Notebooks in `notebooks/` visualize 3D state space, saliency, triggering, and Verlet+constraints (Phase 02)

### Narrative Engine (implementation)

- [ ] **REQ-04**: Verlet integration + constraints (per-axis min/max, reproject old_p) implemented and unit-tested (Phase 03)
- [ ] **REQ-05**: Dialog selection by saliency and integration point for DialogComponent/Yarn defined and first slice implemented (Phase 04)

### Docs and tooling

- [x] **REQ-07**: docs/ only image-catalog (+ images). Game PRD, design decisions, implementation roadmap in .planning. Notebook venv + JupyterLab from root (Phase 05)

- [ ] **REQ-08**: `npm run lab` = single entry; uv installed if missing, then env + deps, then Jupyter Lab. Rename to lab/lab:install. Notebooks: Kaiza simulation (stats, state), dialogue vectors, threshold-based options; .planning refs for agents (GDC/videos). Clone-and-run setup (Phase 06)

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

- [x] **REQ-36**: Browser game route exists at `docs-site/app/(fumadocs)/play/page.tsx` and is playable with terminal-style command UX
- [x] **REQ-37**: Browser runtime uses TypeScript engine with documented parity matrix against Python baseline
- [x] **REQ-38**: Browser persistence supports autosave + named slots (IndexedDB adapter + memory fallback)
- [x] **REQ-39**: Homepage links prominently to `/play` without replacing docs-first landing purpose
- [x] **REQ-40**: Browser test coverage includes world topology, action gating, branching/exclusivity, hostile pressure, pages/logs, and snapshot restore
- [x] **REQ-41**: CI includes a docs/browser workflow (typecheck/build/unit/e2e smoke)
- [x] **REQ-42**: Release gating requires terminal pipeline success and browser docs workflow success before publish

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-01 | Phase 01 | Done |
| REQ-02 | Phase 01 | Done |
| REQ-03 | Phase 01 | Done |
| REQ-06 | Phase 02 | Done |
| REQ-04 | Phase 03 | Pending |
| REQ-05 | Phase 04 | Pending |
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
| REQ-37 | Phase 13 | In progress (parity matrix tracking active) |
| REQ-38 | Phase 13 | Done |
| REQ-39 | Phase 13 | Done |
| REQ-40 | Phase 13 | Done |
| REQ-41 | Phase 13 | Done |
| REQ-42 | Phase 13 | Done |
