# Simulation Agent Guide

How to run Escape the Dungeon as an AI narrator + engine in chat. The simulation is the north star; the agent stays in line with the game as it develops and tries new things.

## Before Each Response

1. Read `scratch/game-state.md` for current state.
2. Read `.concept/RUNTIME-REFERENCE.md` for traits, entities, room vectors.
3. Read `.planning/GRD-escape-the-dungeon.md` for action effects and cutscene triggers.
4. If starting fresh, use template from game-state or last archived `simulation-*.md`.

---

## Turn Procedure

One player message ≈ one turn. Parse intent, execute, update file.

1. **Parse:** "go north" → move north; "train" / "I'll train" → train; "rest" → rest; "search" → search; "stream" → live_stream; "say X" → speak intent X; etc.
2. **Check:** Action available? (room feature, prereqs, target). If not, explain why and offer alternatives.
3. **Execute:** Apply effects from GRD Action Effects table (see code refs in GRD).
4. **Room influence:** Add room base vector (from RUNTIME-REFERENCE) scaled by 0.05 to traits; clamp [−1, 1].
5. **Deed:** Log deed; project into traits/features (conceptual; engine uses embeddings; per-feature cap 0.22, global 0.35).
6. **Skill unlock:** If within radius + prereqs, unlock. Check GRD Skills table.
7. **Cutscene:** If trigger matches, emit cutscene text.
8. **Hostile/NPC:** Optionally note "Hostile spawns; NPCs act" (abbreviated in chat).
9. **Update** `scratch/game-state.md`: increment Turn, refresh Game State block if 5+ turns since last refresh, append log entry.

---

## Log Formatting

- *Italic* = narrator, ambient prose, cutscene text
- `**EVENT:**` = system notifications (chapter, global event)
- `> ` = room/action prompts
- `---` = turn boundaries
- Compression: `[+Awareness]`, `[Cutscene: A Locked Cache]`, `[Appraisal prox 2.1]`

---

## Game State Block

Refresh every 5–10 turns or on cutscene/skill unlock. Include:

- **Depth** (dungeon floor) and **Level** (character, from XP)
- Attributes, features, traits
- Unlocked skills; proximity to next skill (distance)
- Recent deeds / evolution readiness

---

## Simulation Coverage Checklist

Tick when hit during a run. Use to ensure you simulate the features we're building:

**Actions:** move, train, rest, search, talk, speak, fight, live_stream, steal, recruit, murder, evolve_skill, choose_dialogue  
**Room types:** corridor, start, exit, training, rest, treasure, rune_forge, combat  
**Cutscenes:** A Locked Cache, Steel Memory, Signal in the Dark, Hands Like Smoke, Chapter Closed, Surface Air  
**Skills:** Appraisal/X-Ray, Keen Eye, Shadow Hand, Battle Broadcast; evolutions  
**Global events:** depth_pressure_turn_40, fame_watchers_20  

---

## Discovery Artifacts

When something feels missing, under-specified, or like prize content:

```markdown
- [ ] **DISCOVERY-NNN** — [Date] Description.
```

Append to `## Discovery Artifacts` in `scratch/game-state.md`. Curate before migrating to `.concept/DISCOVERY-LOG.md` — validate against engine.

---

## Session Handoff

If context is lost: paste last Game State block + last 3–5 log entries as preamble. Agent continues from there.

---

## MCP / Tool-Driven Agent Mode (Implemented)

Implemented mode for coding agents (`packages/engine-mcp`):

1. `create_session(seed?, session_id?)` to start deterministic run.
2. `list_sessions()` and `delete_session(session_id)` for lifecycle control.
3. `get_status(session_id)` / `get_snapshot(session_id)` for state inspection.
4. `list_actions(session_id, entity_id?)` to read legal action catalog.
5. `dispatch_action(session_id, action_type, payload?)` to execute exactly one turn.
6. `get_log_page(session_id, chapter?, entity_id?)` for chapter/entity logs.
7. `restore_snapshot(session_id, snapshot)` to rewind/replay from known state.

Quick bootstrap command from repo root:

```bash
npm run agent:play
```

This runs a deterministic agent session and writes `.planning/test-reports/agent-play-report.json`.

Automation rules:

- Agent must never invent unavailable actions; always choose from `list_actions`.
- Agent should explain blocked actions using returned reasons.
- Agent-play runs must pin seed and action script for reproducibility.
- Canonical dense regression fixture: `packages/engine/test-fixtures/canonical-dense-trace-v1.json`.
