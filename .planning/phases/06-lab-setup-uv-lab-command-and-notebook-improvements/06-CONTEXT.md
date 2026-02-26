# Phase 06: Lab setup (uv, lab command) and notebook improvements - Context

**Gathered:** 2026-02-24T04:38:01.866Z
**Status:** Ready for planning

## Phase Boundary

Single entry `npm run lab`: uv installed if missing, then Python env + deps, then Jupyter Lab (all notebooks in one place). Rename from notebooks to lab. Notebooks: simulate Kaiza (stats, state), dialogue and vectors, threshold-based options; GDC/reference links in .planning for agents. Fast, clone-and-run setup.

## Implementation Decisions

- Desired outcome: Desired outcome: Single entry npm run lab; uv installed if missing then env and deps then Jupyter Lab. Rename to lab/lab:install. Notebooks: Kaiza simulation (state/stats), dialogue vectors, threshold-based options, labels. REFERENCES.md for agents (GDC/videos). Clone-and-run. Constraints: No pnpm. uv must be installable by script. Non-goals: Single-notebook run commands.
- Constraints: none specified.
- Non-goals: none specified.

## Implementation Discretion

- Specific implementation details not explicitly constrained above.

## Deferred Ideas

- Capture new capabilities in ROADMAP instead of expanding phase scope.
