# Planning Cockpit – Requirements (living doc)

**Purpose:** Single source of truth for what the planning cockpit does, what it can do, and what we want it to do. Flesh this out over time.

**Scope:** The in-app planning UI (RepoPlanner) consumed by the docs-site at e.g. `/dungeonbreak-content-app/planning`, plus the APIs and data it depends on. Does not cover the CLI contract or .planning XML schema in full—only how the cockpit uses them.

---

## 1. What it is

- **Planning cockpit**: A full-height card UI that gives a live view of the repo’s planning state (.planning), runs a subset of the planning CLI, shows reports and metrics, and provides an AI chat that can propose (and, after approval) apply edits **only under .planning/**.
- **Implementation:** `vendor/repo-planner` (submodule); host mounts `<PlanningCockpit />` and re-exports API routes. See `.planning/REPOPLANNER-SUBMODULE.md` and `vendor/repo-planner/INSTALL.md`.

---

## 2. Current features (what it can do right now)

### 2.1 Tabs and views

| Tab group | Sub-views | What it does |
|-----------|------------|--------------|
| **Overview** | Dashboard, Reports | Dashboard: metric cards (completion %, open questions, active agents, snapshot/bundle tokens), completion-over-time line chart, CLI-usage bar chart. Reports: latest markdown report from `.planning/reports/latest.md` (from `planning report generate`). |
| **Work** | Tasks, Phases, Questions | **Tasks:** Table of open tasks from state (id, phase, status, agent, goal). Click phase to filter by that phase; clear filter via chip. **Phases:** ProgressTracker + “By phase” list with “View tasks (n)” per phase. **Questions:** List of open questions; click phase to open Tasks filtered by that phase. |
| **State** | State, Agents | **State:** Snapshot summary (current-phase, current-plan, status, next-action, agents list). **Agents:** Cards per agent with tasks (agent id, name, phase, plan, status; task list with status + goal). |
| **Tools** | Terminal, Tests | **Terminal:** Input + Run to execute allowed planning CLI commands; output (stdout/stderr) in scroll area. **Tests:** Unit test report from `test-reports/unit/results.json` (Vitest JSON reporter)—suites, pass/fail, duration, failure messages. |
| **Chat** | (single view) | Planning assistant: ask about phases, tasks, agents, STATE, TASK-REGISTRY; request plans; after plan approval, receive and apply file edits under .planning only. |

### 2.2 Data and refresh

- **Polling:** State, metrics, and latest report are fetched on mount and every 8s.
- **Refresh button:** Manually re-fetches state, metrics, and report and updates “Scanned &lt;time&gt;”.
- **Data sources:**
  - **State/snapshot:** `GET /api/planning-state` → planning CLI `simulate loop --json` (bundle with snapshot, openTasks, openQuestions, context, agentsWithTasks).
  - **Metrics:** `GET /api/planning-metrics?tail=80` → `.planning/reports/metrics.jsonl` and `usage.jsonl`.
  - **Report:** `GET /api/planning-reports/latest` → `.planning/reports/latest.md`.
  - **Unit tests:** `GET /api/test-reports/unit` → `test-reports/unit/results.json` (project root or REPOPLANNER_PROJECT_ROOT).

### 2.3 Terminal (CLI)

- **Allowed commands (first token):** snapshot, new-agent-id, state, agents, tasks, questions, plans, kpis, metrics, metrics-history, simulate, review, report, context, workflow.
- **Restrictions:** No task-update, task-create, phase-update, agent-close, plan-create, migrate, iterate. `report` only with `generate`; `simulate` only `loop`; `context` only quick/sprint/tokens/full.
- **API:** `POST /api/planning-cli/run` with `{ command: string }`. Runs `node vendor/repo-planner/scripts/loop-cli.mjs …` (or host’s planning binary); returns stdout, stderr, exit code. Output appended to in-ui log (last 50 entries).

### 2.4 Chat and edits

- **Chat API:** Host implements `POST /api/ai/planning-chat` (docs-site). Request: `{ messages: [{ role, content }], context?: { currentPhase, currentPlan, status, openTasksCount, openQuestionsCount, activeAgents, planApproved? } }`.
- **Behavior:** Assistant is scoped to .planning only. May return: `reply`, optional `plan` (todos), optional `questions` (steps with options), optional `edits` (path, newContent, summary). Edits are only accepted after user approves a plan (`planApproved` in context).
- **Edit review UI:** When the model returns edits, Chat shows a split: thread + composer | Edit review (summary/code tabs, per-file diff, Apply all / Reject).
- **Apply API:** `POST /api/planning-edits/apply` with `{ edits: [{ path, newContent }] }`. Paths must be under .planning; server validates and writes files. Max 20 edits, 500k chars per newContent.

### 2.5 Theming and layout

- **Layout:** One card, one main tab strip (Overview, Work, State, Tools, Chat), sub-tabs where applicable, single content pane; Chat splits when there are pending edits. See `docs-site/components/planning/PLANNING-LAYOUTS.md`.
- **Status colors:** `planning-status.ts` → statusVariant / statusClassName (done, in-progress, failed, pending). CSS tokens: `--planning-status-done`, `--planning-status-progress`, `--planning-status-failed`, `--planning-diff-add`, `--planning-diff-remove`. Host defines these in global CSS.

### 2.6 Cleanliness and consistency

- **Visual consistency:** Use shared components (PanelSection, Card, Badge, Tabs, ScrollArea) and status helpers so tables, cards, and badges look uniform. Prefer compact density; avoid modals for primary content.
- **Empty and loading:** Every view has an explicit empty state (e.g. “No open tasks”, “Run report generate”) or loading indicator so the UI never looks broken or blank without explanation.
- **Single source for layout rules:** Layout and color rules live in PLANNING-LAYOUTS.md and vendor STYLING.md; new views should follow them so the cockpit stays coherent.

### 2.7 Phase ↔ task drill-down

- **Tasks:** Filterable by phase; phase column is clickable → sets filter and stays on Tasks tab. When filtered, a “Phase &lt;id&gt;” chip with clear (X) appears in the panel header.
- **Phases:** ProgressTracker at top; below it a “By phase” list: each phase has “View tasks (n)” that switches to Tasks tab filtered by that phase.
- **Questions:** Each question’s phase id is clickable → opens Tasks tab filtered by that phase.

### 2.8 Tooltips and copy

- **Tooltips:** Use native `title` (or a shared Tooltip when available) for metric cards, section help, and dense labels. PlanningMetricCard supports optional `tooltip` prop.
- **Help icons:** HelpCircle next to section titles (Open tasks, By phase, Open questions) with short `title` text. Keeps UI compact; details on hover.
- **Copy:** Prefer short labels; move explanations into tooltips or help icons.

### 2.9 Motion and transitions

- **Tab content:** Wrapped in `motion.div` (motion/react) with `key={contentKey}`; subtle fade-in (opacity, ~150ms) on tab change.
- **Existing:** ProgressTracker and plan components use `motion-safe:` CSS for transitions and animations.

### 2.10 Icons and colors by entity type

- **Phases:** LayoutGrid. **Tasks:** ListTodo. **Questions:** HelpCircle. **State/agents:** Activity, Users. **Tools:** Terminal, TestTube. **Chat:** MessageCircle. **Overview:** BarChart3, FileText.
- **Status colors:** Via planning-status (done, in-progress, failed, pending); use statusVariant and statusClassName for Badge/table cells. Keep one semantic color per status across the cockpit.

---

## 3. APIs (host-facing)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/planning-state` | GET | Planning bundle (snapshot, open tasks, questions, context, agents). |
| `/api/planning-metrics` | GET | Metrics + usage from .planning/reports (query: tail, usage). |
| `/api/planning-reports/latest` | GET | Latest report markdown. |
| `/api/planning-cli/run` | POST | Run allowed planning CLI command; body `{ command }`. |
| `/api/planning-edits/apply` | POST | Apply edits under .planning; body `{ edits: [{ path, newContent }] }`. |
| `/api/test-reports/unit` | GET | Vitest unit test report JSON. |
| `/api/ai/planning-chat` | POST | Planning assistant (host-specific; OpenAI or Codex, plan + edits flow). |

---

## 4. Out of scope (current)

- Editing files outside .planning.
- Running arbitrary CLI commands (only the allowed subset).
- Auth (handled by host; e.g. Codex cookie for planning-chat provider).
- Persisting user preferences (e.g. last tab) across sessions.

---

## 5. Future / to flesh out

- **UX polish:** Loading states, empty states, error recovery, keyboard shortcuts.
- **Accessibility:** Focus order, screen reader labels, contrast (see PLANNING-LAYOUTS + status colors).
- **Performance:** Throttling poll, virtualizing long task/question lists.
- **Features:** Filters on tasks by agent/status (phase filter done), search in report, export report, “Run report generate” button from Reports tab.
- **Requirements:** Formalize “must support” vs “should” and link to ROADMAP/DECISIONS when we add phases.

---

## 6. References

- **Layout/design:** `docs-site/components/planning/PLANNING-LAYOUTS.md`
- **Submodule:** `.planning/REPOPLANNER-SUBMODULE.md`, `vendor/repo-planner/INSTALL.md`
- **Loop/agents:** `AGENTS.md`, `STATE.xml`, `TASK-REGISTRY.xml`, `ROADMAP.xml`
