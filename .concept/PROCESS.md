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
  RUNTIME-REFERENCE.md      # Quick ref: traits, entities, room vectors
  SIMULATION-AGENT-GUIDE.md # How agents run simulation in chat
  DISCOVERY-LOG.md          # Curated discovery artifacts, migrated from scratch
  CONTENT-BACKLOG.md        # Prize content, cutscenes, dialogue to add
  PROCESS.md                # This doc
```

## Iteration Loop

1. **Simulate** — Agent plays as game interface. Use GRD + RUNTIME-REFERENCE + game-state.md. Try new actions, paths, edge cases. Log discoveries.
2. **Discover** — Note gaps, prize content, under-specs. Human curates: validate against engine before migrating.
3. **Emit north star** — Validated discoveries → CONTENT-BACKLOG. Behavior changes → GRD. GRD drives code.
4. **Sync back** — When code ships, update GRD to match. Golden run if critical paths changed.

## When to Sync

| Trigger | Action |
|---------|--------|
| Before simulation | Agent reads GRD, RUNTIME-REFERENCE, game-state.md |
| After engine changes | Human updates GRD (effects, cutscenes, skills). Optionally run golden run. |
| After discovery curation | Migrate to DISCOVERY-LOG; add to CONTENT-BACKLOG; update GRD if behavior agreed |
| Weekly / per phase | Full sync: GRD vs engine; fix mismatches; update feature checklist |

## Drift Control

| Rule | Purpose |
|------|---------|
| Simulation can propose; GRD decides | Avoid ad-hoc behavior |
| Code changes update GRD | GRD reflects shipped behavior |
| Discoveries curated before migration | Reduce noise; validate against engine |
| North star = GRD + CONTENT-BACKLOG | Single source for "what the game should be" |

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

**Validation:** Before migrating to DISCOVERY-LOG, check against engine code — was this real behavior or hallucination?

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
