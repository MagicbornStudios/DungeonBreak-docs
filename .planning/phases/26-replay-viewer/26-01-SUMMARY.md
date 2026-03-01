# Phase 26-01 Summary: Replay Viewer

## Done

1. **ReplayViewer component** — `docs-site/components/game/replay-viewer.tsx`. Accepts report (seed, run.actionTrace). Replays to currentTurn via `replayToTurn()`, returns snapshot, messages, status, engine. Renders ActionPanel (disabled), FeedPanel, StatusPanel, ReplayTimeline.
2. **Replay-to-turn logic** — `replayToTurn(seed, actionTrace, upToTurn)` creates GameEngine, dispatches actions 0..upToTurn-1, collects feed messages, returns snapshot + status.
3. **ReplayTimeline** — Scrollable list: [0] Initial + one row per turn with actionType. Click → onSeek(turn). Current turn highlighted.
4. **Reports page** — When report has seed and run.actionTrace, renders ReplayViewer above metrics sections.

## Files

- `docs-site/components/game/replay-viewer.tsx` — new
- `docs-site/app/(fumadocs)/play/reports/page.tsx` — ReplayViewer integration
- `.planning/TASK-REGISTRY.md` — Phase 26
- `.planning/phases/26-replay-viewer/` — CONTEXT, PLAN, SUMMARY
