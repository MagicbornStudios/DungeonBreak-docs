# Phase 20-02 Summary

## Status

Completed. Phase 20 is closed.

## Delivered

1. `agent-play` split artifacts now support stream-ledger output:
- `DUNGEONBREAK_AGENT_SPLIT_STORAGE_FORMAT=json` (default, existing behavior),
- `DUNGEONBREAK_AGENT_SPLIT_STORAGE_FORMAT=jsonl` (new JSONL row-stream mode).
2. External ledger descriptor now includes storage metadata:
- `run.eventLedger.storageFormat = "json-v1" | "jsonl-v1"`.
3. Report viewer now supports JSONL external ledgers with async streaming iterators:
- `iterateExternalEventsStreaming(...)`
- `iterateEventsAsync(...)`
- `iterateTurnEventsAsync(...)`
4. External hydration remains backward compatible:
- `hydrateExternalLedger(...)` supports both legacy JSON payload and JSONL payload.
5. Smoke checks now validate both standard and JSONL external storage paths.

## Verification

- `pnpm --dir packages/engine-mcp run typecheck`
- `pnpm --dir packages/engine-mcp run report:viewer:smoke`
- `pnpm --dir packages/engine-mcp run report:viewer:smoke` with
  `DUNGEONBREAK_AGENT_REPORT_PATH=<jsonl-smoke-report-path>`

## Notes

- `agent:play` runtime execution is currently blocked by an existing engine-side runtime error in local dependency state (`actionPoliciesSchema` reference), but 20-6 viewer/report-schema functionality was validated through typecheck and JSONL smoke fixtures.
