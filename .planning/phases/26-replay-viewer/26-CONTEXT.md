# Phase 26 Context: Replay Viewer — Game + Timeline with Seek

## Outcome

/play/reports shows a walkthrough-style viewer: game state rendered above, timeline of turns below. Click a turn to seek; game view updates to that point. Read-only (no dispatch).

## Constraints

- Use existing report schema (actionTrace, seed, turnTimeline).
- Replay by dispatching actions 0..N-1 to get snapshot at turn N.
- Turn = sim turn (every actionTrace entry); future: distinguish UI-only events.

## Non-goals

- Kaplay integration for replay (use React/DungeonBreakGame layout).
- Real-time playback animation.

## DoD Signals

- Reports page has game panel + timeline when report loads.
- Click timeline row → game view seeks to that turn.
- Feed and status reflect state at selected turn.
