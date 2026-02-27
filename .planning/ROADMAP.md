# Roadmap: DungeonBreak

## Overview

Phases for planning-docs baseline and Narrative Engine delivery. Each phase has a goal, requirements, and plans; we run discuss → plan → execute → verify per phase.

## Phases

### Phase 01 : Planning docs baseline

**Goal:** PROJECT, ROADMAP, and REQUIREMENTS are aligned with DungeonBreak and Narrative Engine; Phase 01 has a clear context (desired outcome, constraints, non-goals) and at least one plan with concrete tasks; TASK-REGISTRY or phase plans reflect the task breakdown.

**Requirements:** [REQ-01, REQ-02, REQ-03]

**Plans:** Run `forge-loop discuss-phase 1` then `forge-loop plan-phase 1` to generate.

Tasks (breakdown for Phase 01):
- Capture Phase 01 context (discuss-phase): desired outcome, constraints, non-goals
- Ensure ROADMAP Phase 01 details and REQUIREMENTS traceability are correct
- Create or refine Phase 01 plan(s) with must-haves and task blocks
- Document any decisions in DECISIONS.md

---

### Phase 02 : Planning docs cleanup and narrative state-space simulations

**Goal:** PRD and key decisions live in .planning; general docs/ are not extended. Simulation notebooks in `notebooks/` visualize the 3D narrative state space, saliency, dialog triggering, and Verlet+constraints so we can understand and communicate how the system will behave—no game code.

**Requirements:** [REQ-06]

**Depends on:** Phase 01 complete.

**Plans:** Run `forge-loop discuss-phase 2` then `forge-loop plan-phase 2`.

---

### Phase 03 : Narrative Engine first slice (Verlet + constraints)

**Goal:** Verlet integration and constraint application (per-axis min/max, reproject old_p) are implemented and unit-tested so narrative state stays within bounds. See `.planning/DECISIONS.md` (Narrative Engine) and `.planning/implementation-roadmap.md`.

**Requirements:** [REQ-04]

**Depends on:** Phase 02 complete.

**Plans:** TBD (run `forge-loop plan-phase 3` when ready).

---

### Phase 04 : Narrative Engine – dialog selection and integration

**Goal:** Dialog/storylet selection uses entity position and dialog Location (saliency); integration point for DialogComponent and/or Yarn Spinner is defined and implemented to a first testable slice.

**Requirements:** [REQ-05]

**Depends on:** Phase 03.

**Plans:** TBD.

---

### Phase 05 : Docs fold into planning and notebook tooling

**Goal:** docs/ contains only image-catalog (and images). Game PRD, design decisions, and implementation roadmap folded into .planning. Notebook tooling: venv + check/install + JupyterLab from root; no single-notebook run commands. Notebooks are documentation (entities/vectors/dialogue in same space; threshold and options for follow-up).

**Requirements:** [REQ-07]

**Depends on:** Phase 02 complete.

**Plans:** Run `forge-loop discuss-phase 5` then `forge-loop plan-phase 5`.

---

### Phase 06 : Lab setup (uv, lab command) and notebook improvements

**Goal:** Single entry `npm run lab`; one main notebook (**dungeonbreak-narrative.ipynb**) that teaches axis semantics (Courage, Loyalty, Hunger), dialogue locations by *meaning*, how Kaiza reaches options (training, dialog, forces), saliency/threshold, Verlet, and time simulation—DRY, explicit naming, no arbitrary vectors. Doc images embedded; GDC/reference links in .planning. Fast, clone-and-run setup.

**Requirements:** [REQ-08]

**Depends on:** Phase 05 complete.

**Plans:** Run `forge-loop discuss-phase 6` then `forge-loop plan-phase 6`.

---

### Phase 07 : Escape the Dungeon (adventurelib base + modular architecture)

**Goal:** Define and implement **Escape the Dungeon** as a modular Python/Jupyter dungeon crawler starting at depth 12 as Kael, with level/chapter/act progression, NPC background simulation, quest + item systems, and embeddings-driven trait updates.

**Requirements:** [REQ-09, REQ-10, REQ-11, REQ-12]

**Depends on:** Phase 06 complete.

**Plans:** Run `forge-loop discuss-phase 7` then `forge-loop plan-phase 7`.

---

### Phase 08 : Vector-space rooms, dialogue ranges, and simulation clarity

**Goal:** Deepen Escape the Dungeon simulation with explicit `Dungeon/Level/Room` objects (50 rooms per level), room+item vectors that influence entities per turn, and dialogue clusters/options gated by vector distance and room state.

**Requirements:** [REQ-13, REQ-14, REQ-15, REQ-16, REQ-17]

**Depends on:** Phase 07 complete.

**Plans:** Run `forge-loop discuss-phase 8` then `forge-loop plan-phase 8`.

---

### Phase 09 : Cutscenes, action gating, skills, and livestream fame economy

**Goal:** Add a clear presentation and decision layer on top of the simulation: cutscene popups for major events, prerequisite-based action/dialogue filtering, skill vectors for emergent builds, and livestream gameplay with `Fame` gain and `Effort` spend (10 effort per turn).

**Requirements:** [REQ-18, REQ-19, REQ-20, REQ-21, REQ-22]

**Depends on:** Phase 08 complete.

**Plans:** `09-01` implemented; run `forge-loop verify-work 9 --strict` for final phase verification.

---

### Phase 10 : Entity parity, factions, and emergent pressure systems

**Goal:** Move from prototype AI behavior to full emergent simulation parity: same legal action model for player/NPCs, dense room composition (treasure/rune forge), spawn pressure, faction/reputation lethality gates, companion recruitment, rumor spread, and level curves.

**Requirements:** [REQ-23, REQ-24, REQ-25, REQ-26, REQ-27, REQ-28, REQ-29, REQ-30, REQ-31, REQ-32]

**Depends on:** Phase 09 complete.

**Plans:** `10-01` implemented; run `forge-loop verify-work 10 --strict` for final phase verification.

---

### Phase 11 : Content scale, archetype compass, and balancing

**Goal:** Expand authored content and balancing around emergent systems: large skill trees/evolution options, archetype headings/class textures, broader action/dialogue/item packs, and stability/performance tuning for long simulations.

**Requirements:** [REQ-23, REQ-27, REQ-30, REQ-31, REQ-32] (content and balancing completion slice)

**Depends on:** Phase 10 complete.

**Plans:** Run `forge-loop discuss-phase 11` then `forge-loop plan-phase 11`.

---

### Phase 12 : Terminal binary packaging and release automation

**Goal:** Publish Escape the Dungeon as downloadable terminal game binaries with a repeatable CI pipeline for tests, build artifacts, and tag-triggered releases.

**Requirements:** [REQ-33, REQ-34, REQ-35]

**Depends on:** Phase 10 stable simulation baseline.

**Plans:** `12-01` implemented; run `forge-loop verify-work 12 --strict` for final phase verification.

---

### Phase 13 : Browser TS/Ink Web game (`/play`)

**Goal:** Ship a browser-playable TypeScript runtime in docs-site at `/play` using Ink Web terminal UX, with Python kept as behavior baseline until parity closes.

**Requirements:** [REQ-36, REQ-37, REQ-38, REQ-39, REQ-40, REQ-41, REQ-42]

**Depends on:** Phase 10+ systems stable; docs-site build/deploy stable.

**Plans:** `13-01` planning/contracts, then looped implementation slices (`13-02..13-06`) with parity matrix and dual-pipeline gating.

---

### Phase 14 : Browser parity closure and content scaling

**Goal:** Close remaining Python-to-browser parity deltas, expand authored content packs (skills/dialogue/items/events), and tune long-run emergent balance.

**Requirements:** [REQ-37, REQ-38, REQ-40]

**Depends on:** Phase 13 engine/runtime in production.

**Plans:** TBD.

---

### Phase 15 : Publish hardening for browser + terminal

**Goal:** Harden release operations for both distribution targets with stricter CI quality bars, release notes automation, and smoke replay packs for regressions.

**Requirements:** [REQ-41, REQ-42]

**Depends on:** Phase 13 complete, Phase 14 parity closure in progress.

**Plans:** TBD.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 01. Planning docs baseline | 2 / 2 | Complete | - |
| 02. Planning docs cleanup and simulations | 2 / 2 | Complete | - |
| 03. Narrative Engine first slice | 0 / TBD | Blocked by 02 | - |
| 04. Dialog selection and integration | 0 / TBD | Blocked by 03 | - |
| 05. Docs fold and notebook tooling | 2 / 2 | Complete | - |
| 06. Lab setup and notebook improvements | 2 / 2 | Ready for verify | - |
| 07. Escape the Dungeon | 1 / 1 | Ready for verify | - |
| 08. Vector-space simulation depth | 1 / 1 | Ready for verify | - |
| 09. Cutscenes and gating layer | 1 / 1 | Ready for verify | - |
| 10. Entity parity and faction pressure | 1 / 1 | Ready for verify | - |
| 11. Content scale and balancing | 0 / TBD | Blocked by 10 | - |
| 12. Terminal packaging and release | 1 / 1 | Ready for verify | - |
| 13. Browser TS/Ink Web game | 1 / 6 | In progress | - |
| 14. Browser parity closure and content scaling | 0 / TBD | Blocked by 13 | - |
| 15. Publish hardening (browser + terminal) | 0 / TBD | Blocked by 13 | - |
