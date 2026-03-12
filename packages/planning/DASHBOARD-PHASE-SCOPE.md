# Planning dashboard – phase scope (fill, don’t prune)

Dashboard at `/` is wired to **live planning data** (bundle, metrics, open tasks, agents). This doc defines what we’re adding next so the UI stays full-featured, not pruned.

## Done in this pass

- Root page uses **PlanningDashboardContent**: live data from `/api/planning-state` and `/api/planning-metrics`.
- **KPIs**: Completion %, Active agents, Open questions, Snapshot/bundle tokens (from metrics when available).
- **Charts**: Completion over time from `metrics.jsonl`.
- **Tasks**: Open tasks list and table (from bundle).
- **Agents**: Agents list from snapshot.
- **Tabs**: Overview, Tasks, Agents, Reports; sidebar nav and `?tab=` sync.
- **Status coloring**: done (green), in-progress (amber), failed (red) for tasks/agents.
- **Reports**: Placeholder copy; hook to `/api/planning-reports/latest` and report generation when needed.

## To define and implement

- **KPIs to add when we have data**
  - Repo count (e.g. from workspace or config).
  - Planning-folder count (number of discovered `.planning` roots).
  - Phases complete / total (from metrics or bundle).
- **Planning folder switching**
  - Scan for `.planning` (or configured roots), list them, let user pick active root.
  - All APIs and CLI runs use the selected root (REPOPLANNER_PROJECT_ROOT / planning dir).
- **Code diff**
  - Surface diffs from planning-edits or report output (e.g. “pending edits”, last applied patch).
- **Assistant UI**
  - In-dashboard chat/assistant that can use planning context (bundle, open tasks) and optionally call planning-edits/apply or planning-cli/run.
- **Codex CLI**
  - Run Codex CLI from the UI (e.g. input + “Run” calling an API that shells to Codex).
- **OpenAI login**
  - Auth with OpenAI so Assistant/Codex can use authenticated sessions.
- **Actions from the UI**
  - Buttons/actions that call existing APIs:
    - **Apply edits**: POST `/api/planning-edits/apply` with `{ edits: [{ path, newContent }] }`.
    - **Run CLI**: POST `/api/planning-cli/run` with `{ command }`.
  - Use for “Apply this edit”, “Run snapshot”, “Run report generate”, etc.
- **Coloring and tokens**
  - Align with docs-site planning-status (--planning-status-done/progress/failed) and context token display; ensure task/agent/phase status is consistent across dashboard and reports.

## References

- `packages/planning/planning-ui/planning-dashboard-content.tsx` – main dashboard content.
- `packages/planning/app/api/` – planning-state, planning-metrics, planning-cli/run, planning-edits/apply, planning-reports/latest.
- `docs-site/components/planning/planning-cockpit.tsx` – reference for bundle shape and metrics.
- `docs-site/components/planning/planning-status.ts` – statusVariant / statusClassName.
- AGENTS.md – loop and planning CLI/MCP.
