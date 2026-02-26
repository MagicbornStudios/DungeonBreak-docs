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

## Docs-site / Admin stability

| Id | Task | Status |
|----|------|--------|
| DS-1 | Fix RangeError at String.repeat when opening admin (guard depth in llms routes) | Done |
| DS-2 | Track any remaining docs-site/admin runtime errors (e.g. email adapter warning) | Pending |
