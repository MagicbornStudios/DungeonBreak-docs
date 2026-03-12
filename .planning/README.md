# Planning Docs (XML-First)

All planning docs are XML. Markdown remains only for templates (see `templates/PHASE-DOC-TEMPLATE.md`).

## Primary Docs (XML)

- `ROADMAP.xml` — phases, dependencies, status, and links to plan/summary.
- `STATE.xml` — current phase/plan, agent registry, next action.
- `TASK-REGISTRY.xml` — task list with agent ownership and dependencies.
- `DECISIONS.xml` — decision log with references.
- `ERRORS-AND-ATTEMPTS.xml` — failure/attempt log.
- `REQUIREMENTS.xml` — consolidated PRD/GRD/requirements and other direction docs.
- `planning-config.toml` — planning loop config (sprint size, etc.). Configs use TOML.

## Templates

Templates live in `templates/` and must be used for each phase:

- `templates/PLAN-TEMPLATE.xml`
- `templates/SUMMARY-TEMPLATE.xml`
- `templates/ROADMAP-TEMPLATE.xml`
- `templates/DECISIONS-TEMPLATE.xml`
- `templates/TASK-REGISTRY-TEMPLATE.xml`
- `templates/LOOP-DOC-TEMPLATE.xml`
- `templates/ERRORS-AND-ATTEMPTS-TEMPLATE.xml`
- `templates/PHASE-DOC-TEMPLATE.md`
- `templates/doc-template-atoms.xml`
- `templates/doc-template-molecules.xml`
- `templates/doc-template-organisms.xml`
- `templates/AGENTS-TEMPLATE.md` — copy to repo root as `AGENTS.md` when bootstrapping a new repo (e.g. replacement repo with its own .planning).

Every phase PLAN/SUMMARY should include a `requriements-suggestions` block (intentional spelling for template compatibility) to capture suggested updates for `REQUIREMENTS.xml` discovered during execution.

## Agent IDs

Generate a unique id and register it in `STATE.xml` before claiming tasks:

- `node scripts/loop-cli.mjs new-agent-id`

## CLI

Run with `pnpm planning <command>` or `node scripts/loop-cli.mjs <command>`. Use `--help` on any command. Add `--json` where supported for machine-readable output.

**Use the CLI from anywhere:** From this repo run `pnpm link -g` (or `npm link`). Then the `planning` command is available globally. Run it from any directory that contains a `.planning` folder (e.g. this repo root, or another repo that uses the same planning layout).

### Context (quick workflows — no need to know agent IDs)

Use these to get relevant context without reading files or remembering agent ids:

- `planning quick` or `planning status` — **Macro:** one-shot snapshot + who is working on what (agents + open tasks + phase progress).
- `planning context quick [--json]` — same as above.
- `planning context sprint [--sprint-index <k>] [--json]` — context window for current (or given) sprint: paths + summary for agents/LLM.
- `planning context full [--json]` — full context: state + all tasks count + roadmap phase list (compact).
- `planning context tokens [--sprint-index <k>] [--phase <id>] [--prd] [--json]` — **Token report:** sprint phases/tasks and phase-dir token estimates; PRD = REQUIREMENTS.xml per-doc and total token estimate. Use to decide when to split requirements (see DECISIONS.xml PRD-REQUIREMENTS-STRATEGY).

### Query (parse STATE / TASK-REGISTRY / ROADMAP)

- `planning snapshot` — current phase, agents, open tasks, phase progress (human).
- `planning agents [--json]` — list agents in this repo (from STATE.xml).
- `planning tasks list [--phase <id>] [--agent <id>] [--status <s>] [--json]` — list tasks; filter by phase/agent/status.
- `planning state [--json]` — current phase, plan, status, next-action, agents.
- `planning questions [--phase <id>] [--all] [--json]` — list open questions from phase PLANs (answers feed DECISIONS/REQUIREMENTS). Use `--all` to include closed.
- `planning plans [--phase <id>] [--unran] [--ran] [--json]` — list plans (PLAN.xml) and whether they were executed (have SUMMARY.xml). `--unran` = not yet run; `--ran` = executed only.
- **Profiles** (swap to see CLI from agent’s perspective): `planning profile list`, `planning profile use <name>`, `planning profile show`. Profiles (human, agent) live in `planning-config.toml`; agent profile sets JSON-friendly defaults for simulate.
- **Bundle** (canonical agent context): `planning bundle [--json]` — the canonical way to get current agent context: snapshot + context paths + open tasks + open questions. Use this (or MCP `get_agent_bundle`) at the **start of each agent run or session** so the agent does not rely on stale conversation history (avoids context rot). Same payload as `planning simulate loop`; prefer `bundle` in docs and automation.
- **Simulate** (legacy): `planning simulate loop [--json]` — same as `planning bundle`; kept for backward compatibility. `planning simulate context [--sprint-index K] [--json]` — context window only. With profile `agent`, defaults to JSON. Bundle format: `planning-agent-context/1.0` (versioned; no single industry standard).
- **Report** (markdown): `planning report generate` — generate a markdown report from the agent-loop bundle using the EJS template `.planning/templates/agent-loop-report.md.ejs`; writes to `.planning/reports/latest.md` and a timestamped copy. Each run appends one line to `.planning/reports/metrics.jsonl` for system health over time. `planning report view [--port 3847]` — generate report, start a minimal HTTP server, and open a thin markdown viewer in your browser (standalone; no build). While the server is running, `GET /metrics?tail=50` returns the last 50 metrics as JSON for dashboards.
- **Metrics (track &amp; analyze):** `planning metrics [--json]` — current system health (tasks done/total, completion %, open questions, active agents, phases, errors/attempts, review counts). `planning metrics-history [--n 30] [--json]` — last N entries from `metrics.jsonl`. Snapshot and bundle token estimates are computed on `planning report generate` and stored in each metrics line. **Usage:** Each run of `planning snapshot`, `planning new-agent-id`, `planning bundle`, or `planning simulate loop` appends to `.planning/reports/usage.jsonl` so you can see how often agents use the loop. **Dashboard:** In the docs site, open **Planning → Planning dashboard** (or `/planning/dashboard`) for Recharts-based charts (completion over time, open questions, loop usage by command).
- `planning sprint show [--sprint-index <k>] [--json]` — show sprint boundaries (sprint = N phases, configurable).
- `planning sprint set-size <n>` — set phases per sprint (default 5); stored in `.planning/planning-config.toml`.
- `planning sprint context [--sprint-index <k>] [--json]` — context window: paths + summary for a sprint (for agents/LLM).
- `planning artifact read <path> [--json]` — read artifact (relative to repo or `.planning`); `--json` parses XML to JSON.
- `planning artifact list [--dir <path>]` — list artifacts (default dir: `.planning`).

### Mutations

- `planning new-agent-id` — generate unique agent id.
- `planning task-update <taskId> <status> [agentId]`
- `planning task-create <phaseId> <taskId> <agentId> [status] --goal "..." [--keywords ""] [--command "..."]`
- `planning phase-update <phaseId> <status>`
- `planning agent-close <agentId>`
- `planning plan-create <phaseId> <phaseName> <planId> <phaseDir>`

### Migrate

- `planning migrate-planning` — consolidate root planning markdown into `REQUIREMENTS.xml`.
- `planning migrate-roadmap` — regenerate `ROADMAP.xml` from `REQUIREMENTS.xml`.
- `planning migrate-phases` — convert phase markdown into XML.
- `planning migrate-all` — run all migrations.

### Setup and onboarding

- **Greenfield:** New repo, git, bootstrap `.planning` (same XML/CLI structure). Setup checklist: git installed, repo created, .planning in place, planning CLI available. To be supported from UI (onboarding + checklists) and CLI (init or checklist commands).
- **Brownfield:** Existing repo with `.planning`. Setup checklist: git installed, planning CLI available. Same UI onboarding and CLI init/checklist as we add them.
- **Setup checklist (CLI):** `planning setup checklist` — verify git on PATH, `.planning` exists, `STATE.xml` and `TASK-REGISTRY.xml` present. Use for brownfield or before bootstrapping greenfield. `--json` for machine-readable pass/fail per check.
- See DECISIONS.xml SETUP-AND-ONBOARDING and PLANNING-COCKPIT-REQUIREMENTS.md (future: onboarding, checklists).

### Planning package (standalone UI) and install from GitHub

- **Standalone cockpit:** From this repo root, `pnpm planning:standalone` starts the planning UI on port 3101. Requires `.planning` at repo root (or set `REPOPLANNER_PROJECT_ROOT` to the directory that contains `.planning`).
- **Install from GitHub (no npm):** Download a release tarball or clone the repo from GitHub. Run `pnpm install` at repo root, then use `pnpm planning` (CLI) or `pnpm planning:standalone` (cockpit). We do not publish to npm; distribution is via GitHub releases only. See `packages/planning/README.md` for the standalone package.

### Tests

- `pnpm planning:test` — runs CLI tests (node:test) for planning commands.

### Context and overnight runs (avoiding context rot)

The planning **bundle** is the canonical context for the agent. Obtain it via `planning bundle --json` or MCP `get_agent_bundle`. At the **start of each agent run or session**, get the bundle and supply it to the agent; do not rely on long conversation history for phase/task state. For overnight runs, each iteration (or each "wake") should fetch a fresh bundle so the agent sees current open tasks and STATE. See DECISIONS.xml BUNDLE-REINJECTION-CONTEXT-ROT.

### Definition of done (overnight and per phase)

**Overnight runs:** Done when there are **no open tasks in scope** (phase or whole repo). See DECISIONS.xml OVERNIGHT-DEFINITION-OF-DONE. No time limit, max-iter, or stop file are part of the formal DoD; the CLI may offer optional safety caps.

**Per phase:** Every phase has a definition of done in its PLAN (see `<definition-of-done>` in the phase PLAN template). Standard: no open tasks in this phase. See DECISIONS.xml PHASE-DEFINITION-OF-DONE.

### Greenfield (own repo, git)

Greenfield work uses **its own repository**, not the brownfield repo. Create a new repo, use git and best practices. The greenfield repo gets its own `.planning` and full planning loop. Doable from UI and CLI. Users install git themselves; we provide setup checklists. See DECISIONS.xml GREENFIELD-OWN-REPO and SETUP-AND-ONBOARDING.

- **Setup checklist (greenfield):** Git installed and configured; new repo created; `.planning` bootstrapped (or copied from template); planning CLI available (e.g. from this repo via `pnpm link` or run from repo root). UI onboarding will guide the same steps.
- `planning iterate --run "<agent-cmd>" [--task RALPH_TASK.md] [--promise "<promise>COMPLETE</promise>"] [--max 20]` — run in greenfield repo (`--cwd <path>`); task file piped to stdin. DoD for the run is no open tasks in scope. Progress persisted via git each iteration.

### Brownfield (existing repo)

**Setup checklist (brownfield):** Git installed and configured; repo has `.planning`; planning CLI available. UI onboarding will guide the same steps.

### Iterate-tasks (brownfield overnight loop)

Run agent task-by-task from TASK-REGISTRY until **no open tasks in scope**. See DECISIONS.xml BROWNFIELD-OVERNIGHT-LOOP and OVERNIGHT-DEFINITION-OF-DONE.

- `planning iterate-tasks --run "<agent-cmd>" [--phase <id>] [--max N] [--commit msg] [--stop-file .planning/stop-overnight]` — each iteration: get fresh bundle, pick first open task (optionally in `--phase`), send JSON `{ bundle, currentTask }` to agent stdin, then git commit. **Done when no open tasks in scope.** Optional `--max` and `--stop-file` are safety caps only. Next day: run the same command to continue.

### Product Owner (MCP) — agent orchestration

The **planning MCP server** (`dungeonbreak-planning`) is the Product Owner surface for agents. When it is running and configured in Cursor/Codex, agents should **prefer MCP tools** over calling the CLI via shell so all agents share one source of truth and coordinate better.

- **Run:** `pnpm mcp:planning` (stdio server). Install into Cursor/Codex: `pnpm mcp:install` (writes `~/.cursor/mcp.json` and `~/.codex/config.toml`).
- **MCP tools:** snapshot, new_agent_id, task_update, task_create, phase_update, agent_close, plan_create, **open_questions** (with file refs), **get_agent_bundle** (same as `planning bundle --json`).
- **CLI** (`pnpm planning` / `node scripts/loop-cli.mjs`) remains the full human-facing CLI; the MCP server delegates to it for questions and the agent bundle so behaviour stays in sync.

### Product Owner agent and questions-per-phase

- **Product Owner agent** (DECISIONS.xml PRODUCT-OWNER-AGENT): Human stand-in for planning; all agents (including Codex CLI/app server) can talk to it via MCP or Codex SDK. Implemented as part of Phase 50 (Assistant UI + Codex app server).
- **Questions per phase** (DECISIONS.xml QUESTIONS-PER-PHASE): Each phase keeps open questions; answers feed DECISIONS.xml and REQUIREMENTS.xml. Phase PLAN template includes a `<questions>` section. Aligns with Phase 50 and the Product Owner.
- **Requirements suggestions per phase:** Open questions should not block execution. Continue with best judgment, then log any requirement gaps in `requriements-suggestions` and propose concrete `REQUIREMENTS.xml` text updates.

### Phase 52 secrets workflow

- Set a 32-byte key in env (`ENV_BUNDLE_KEY`): `hex:<64-hex-chars>` or `base64:<...>`.
- Seal docs-site and plugin env files:
  - `pnpm env:bundle:seal -- --entry docs-site=docs-site/.env --entry unreal-plugin=plugins/DB_Unreal_DLC_Plugin/.env --out .secrets/env.bundle.sealed.json`
- Unseal one entry to a target path:
  - `pnpm env:bundle:unseal -- --in .secrets/env.bundle.sealed.json --entry docs-site --out docs-site/.env`
