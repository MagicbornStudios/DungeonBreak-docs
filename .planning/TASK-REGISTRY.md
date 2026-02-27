# Task Registry

High-level tasks are tracked here; per-phase task detail lives in `.planning/phases/<phase>/` (PLAN and SUMMARY files).

## Phase 01 – Planning docs baseline

| Id | Task | Status |
|----|------|--------|
| 01-1 | Align PROJECT, ROADMAP, REQUIREMENTS with DungeonBreak / Narrative Engine | Done (docs updated) |
| 01-2 | Run discuss-phase 1: capture desired outcome, constraints, non-goals | Pending |
| 01-3 | Run plan-phase 1: create/refine Phase 01 plan(s) | Pending |
| 01-4 | Execute Phase 01 plan(s) and write summary | Pending |
| 01-5 | Run verify-work 1 | Pending |

## Phase 02 – Planning docs cleanup and simulations

| Id | Task | Status |
|----|------|--------|
| 02-1 | PRD and developer guide in .planning; docs/ pointers only | Done |
| 02-2 | discuss-phase 2, plan-phase 2 | Done |
| 02-3 | Notebooks: state-space-saliency, verlet-constraints | Done |
| 02-4 | verify-work 2 | Pending |

## Phase 03 – Narrative Engine first slice (Verlet + constraints)

| Id | Task | Status |
|----|------|--------|
| 03-1 | Implement Verlet integration in Narrative Engine | Pending |
| 03-2 | Add per-axis min/max constraints and old_p reprojection | Pending |
| 03-3 | Unit tests for constrained Verlet | Pending |

## Phase 04 – Dialog selection and integration

| Id | Task | Status |
|----|------|--------|
| 04-1 | Dialog selection by entity position + dialog Location (saliency) | Pending |
| 04-2 | Integration point for DialogComponent / Yarn Spinner | Pending |

## Phase 05 – Docs fold and notebook tooling

| Id | Task | Status |
|----|------|--------|
| 05-1 | Game PRD, design decisions, implementation roadmap folded into .planning | Done |
| 05-2 | Remove narrative-engine PRD/guide, PRD, design-decisions, implementation-roadmap from docs/ | Done |
| 05-3 | Notebook venv + JupyterLab scripts (notebooks:install, notebooks) | Done |
| 05-4 | verify-work 5 | Done |

## Phase 06 – Lab setup and notebook improvements

| Id | Task | Status |
|----|------|--------|
| 06-1 | Add Phase 06, REQ-08, TASK-REGISTRY | Done |
| 06-2 | uv-based lab: install uv if missing, lab/lab:install scripts | Done |
| 06-3 | .planning/REFERENCES.md with GDC/video links for agents | Done |
| 06-4 | Notebooks: Kaiza, stats, dialogue vectors, threshold, labels | Done |
| 06-5 | discuss-phase 6, plan-phase 6, execute, verify-work 6 | Done |

## Phase 07 â€“ Escape the Dungeon

| Id | Task | Status |
|----|------|--------|
| 07-1 | Update PRD for Escape the Dungeon (12 levels, chapters/acts/pages, Kael start) | Done |
| 07-2 | Vendor adventurelib and use it as base text-adventure engine | Done |
| 07-3 | Refactor monolithic text adventure into domain modules (world/entities/player/combat/narrative/engine) | Done |
| 07-4 | Implement Kael + NPC simulation loop (movement, training, talk, rest, search, speak) | Done |
| 07-5 | Implement chapter/act/page logging and quest progression | Done |
| 07-6 | Ship notebook demo for Escape the Dungeon and run smoke tests | Done |

## Phase 08 â€“ Vector-space simulation depth

| Id | Task | Status |
|----|------|--------|
| 08-1 | Start new planning phase for vector-space simulation clarity and extensibility | Done |
| 08-2 | Define explicit world/story objects (`Dungeon`, `Level`, `Room`, `Act`, `Chapter`, `Page`) and relation model | Done |
| 08-3 | Upgrade levels to 50 rooms each with one start and one exit | Done |
| 08-4 | Add room vectors + item vectors and apply room influence every turn | Done |
| 08-5 | Implement dialogue clusters/ranges with room-state conditions and option selection APIs | Done |
| 08-6 | Add CLI entry point for Escape the Dungeon command gameplay | Done |
| 08-7 | Update notebook/docs/planning artifacts and smoke-validate flow | Done |
| 08-8 | Add teen-readable architecture guide for classes, vectors, and turn simulation | Done |

## Phase 09 â€“ Cutscenes, action gating, skills, and fame economy

| Id | Task | Status |
|----|------|--------|
| 09-1 | Capture discuss context for cutscene presentation and filtered action UX | Done |
| 09-2 | Define prerequisite model for actions/dialogue/skills with explainable filters | Done |
| 09-3 | Design and implement cutscene trigger pipeline (item, quest, milestone events) | Done |
| 09-4 | Design skill-vector model and emergent unlock/use rules | Done |
| 09-5 | Implement livestream action with Fame and Effort cost 10 per turn | Done |
| 09-6 | Expose gated options + cutscenes + livestream state in notebook and CLI | Done |
| 09-7 | Add tests/docs and complete phase verification | Done |

## Docs-site / Admin stability

| Id | Task | Status |
|----|------|--------|
| DS-1 | Fix RangeError at String.repeat when opening admin (guard depth in llms routes) | Done |
| DS-2 | Track any remaining docs-site/admin runtime errors (e.g. email adapter warning) | Pending |
