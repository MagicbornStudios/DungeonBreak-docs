# Phase 17 Context: Content Production and Long-Run Balancing Loops

## Outcome

Scale authored gameplay content while preserving deterministic behavior and runtime performance budgets.

## Constraints

- Content growth is contract-first (JSON/schema) and reusable across runtimes.
- Canonical seed + replay determinism cannot regress.
- `/play` must stay responsive and stable under expanded simulation load.

## Non-goals

- New rendering engine migration.
- Backend gameplay service introduction.

## DoD Signals

- Expanded content packs are schema-validated and loaded by engine builders.
- 100/250/500-turn deterministic simulation suites pass.
- Balance reports expose action usage, archetype spread, and dead-content findings.
- Performance pressure constraints remain within policy targets.
