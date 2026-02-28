# Phase 20 Context: Report Schema Streaming + LLM Scope De-commit

## Outcome

Keep play-report fidelity and timeline introspection while reducing artifact size and memory pressure by moving external ledgers to stream-friendly formats.

## Constraints

- MCP support remains available (local stdio + signed-in remote).
- Deterministic runner remains the only shipped automated turn chooser.
- LLM/autonomous turn chooser is de-scoped for foreseeable delivery.
- Existing report artifacts and viewer contracts must remain backward compatible (`inline-v1`, `packed-v1`, `external-v1`).

## Non-goals

- Implementing model-driven turn selection.
- Reworking gameplay rules or combat policy.
- Requiring external infra beyond existing repo/docs runtime.

## DoD Signals

- Planning docs clearly state: MCP exists, autonomous LLM play does not.
- Planning docs include explicit prerequisites that would be required before enabling model-driven play.
- External ledgers can be emitted as JSONL stream rows.
- Viewer can iterate JSONL external ledgers without full JSON hydration.
