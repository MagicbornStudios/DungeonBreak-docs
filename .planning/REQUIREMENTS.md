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
