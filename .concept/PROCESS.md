# Game Concept Simulation Process

Content discovery through play—formalized like `.planning` for software, but for creative game content.

## Purpose

Content (prose, cutscenes, dialogue) is non-reusable per edition; software features are reusable. Planning for content needs a different cadence: discovery through simulation, not just task breakdown. `.concept` = content discovery, feel, prize moments—driven by play, not by reqs.

## Structure

```
scratch/                    # Ephemeral simulation runs
  game-state.md             # Canonical session state (human+AI edit)
  simulation-*.md           # Archived runs

.concept/                   # Game development process (creative)
  DISCOVERY-LOG.md          # Curated discovery artifacts, migrated from scratch
  CONTENT-BACKLOG.md        # Prize content, cutscenes, dialogue to add
  PROCESS.md                # This doc
```

## Ralph Wiggum Loop (Content)

1. **Scope:** Define a simulation goal (e.g., "reach Shadow Hand" or "trigger all cutscenes in one run").
2. **Simulate:** Play through in AI chat; log in `scratch/game-state.md`.
3. **Check:** Did we hit the goal? What felt missing or broken?
4. **Refine:** Add discovery artifacts; update CONTENT-BACKLOG.
5. **Emit:** When satisfied, mark simulation scope done; migrate discoveries.
6. **Cap iterations:** Avoid infinite refinement (e.g., 2–3 simulation passes per scope).

## Discovery Artifacts

Items surfaced during simulation: *missing content*, *under-specified behavior*, or *prize moments*.

**Categories:**
- **Missing content:** Dialogue cluster with no options, empty room descriptions, no cutscene for a milestone.
- **Under-specified:** Edge cases, faction reactions, "what happens if…"
- **Prize content:** High-impact moments worth designing (e.g., rune_forge evolution ritual).
- **Balance/feel:** "Fame feels slow" or "Shadow Hand unlock comes too late."

**Format:**
```markdown
- [ ] **DISCOVERY-NNN** — [Date] Description.
```

## Concept vs Planning

| `.planning` | `.concept` |
|-------------|------------|
| Feature delivery | Content discovery |
| Traceability, phases | Feel, prize moments |
| Requirements-driven | Play-driven |
