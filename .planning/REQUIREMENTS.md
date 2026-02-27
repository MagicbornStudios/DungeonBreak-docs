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
