# PRD: Tooling for Gameplay Analysis & Reporting

## Document Status

- Owner: DungeonBreak docs/lab team
- Date: 2026-02-27
- Status: Draft
- Location: `.planning/PRD-tooling-gameplay-analysis.md`

## Purpose

Tooling to analyze Escape the Dungeon playthroughs: compute replayability, excitement, and emergent scores; display reports on the docs site; surface content pack changes. Scientific, formulaic approach to understand how the game plays.

---

## Metric Definitions

### Replayability

**Definition:** How many distinct playthrough paths exist given current content.

**Formula / Approach:**
- Over N runs: `unique_action_sequences / total_possible`
- Action diversity index per run: Shannon entropy of action-type usage; higher = more varied
- Count distinct (action, roomFeature) pairs visited
- Flag: if agent can only `move` for entire run → replayability = 0; emit warning

### Excitement

**Definition:** Per-turn "interesting event" density.

**Formula / Approach:**
- Per-turn score: count of high-signal events (cutscene, skill_unlock, combat, dialogue, treasure, fame_milestone)
- Rolling window average (e.g. 5 turns)
- Excitement curve: plot score vs turn index
- Sufficient threshold: if actionCoverage.missing includes all non-move actions for whole run → insufficient excitement

### Emergent

**Definition:** Unpredictable but coherent outcomes from system rules. Novel (first-seen) event combinations; entity-state trajectories that diverge from scripted paths.

**Formula / Approach:**
- Novel event combinations: first-seen (actionType, depth, roomFeature, entityKind) tuples
- Entity trajectory divergence: trait/feature delta from baseline run
- "Surprise" score: entropy of event-type distribution vs expected

---

## Tooling Scope

### Playthrough Analyzer

- **Input:** `agent-play-report.json` (schema `agent-play-report/v2`)
- **Output:** Analysis report JSON with `replayability`, `excitement`, `emergent` sections
- **Implementation:** `packages/engine-mcp/src/playthrough-analyzer.ts`
- **CLI:** `pnpm --dir packages/engine-mcp run analyze` or similar

### Report Viewer

- **Route:** `/reports` or `/play/reports`
- **Sections:** Playthrough summary, Excitement curve, Action coverage, Emergent highlights, Content pack changelog
- **Data:** Load latest `agent-play-report.json` + analysis; fallback to placeholder if missing

### Content Pack Diff

- **Input:** `contracts/data/*.json` at two version tags
- **Output:** Per-file diff (added/removed/changed keys)
- **Display:** `/content` route; version selector

### CI Integration

- Run agent-play on merge (or scheduled)
- Publish report artifacts to `.planning/test-reports/`
- Optional: block if excitement/replayability below configurable thresholds

---

## UX for Reports

- **Audience:** Stakeholders, colleagues, users
- **Layout:** Summary cards → Excitement curve (chart) → Action coverage table → Emergent highlights list → Content changelog
- **Links:** Download standalone HTML, GitHub releases
- **No auth:** Public; reports are static from CI or local runs

---

## Sufficient Excitement Threshold

**Rule:** If agent can only `move` and no other action ever becomes available, we need new systems.

**Implementation:** In playthrough analyzer, flag runs where `actionCoverage.missing` includes all non-move actions for the whole run. Emit warning; optionally fail CI.
