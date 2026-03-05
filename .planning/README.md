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
- **Simulate** (agent loop): `planning simulate loop [--json]` — full bundle: snapshot + context paths + summary + open tasks + open questions (what an agent/Codex would receive). `planning simulate context [--sprint-index K] [--json]` — context window only. With profile `agent`, simulate defaults to JSON. Use the JSON bundle as input to Codex or LangGraph-style agent loops. Bundle format: `planning-agent-context/1.0` (versioned; no single industry standard).
- **Report** (markdown): `planning report generate` — generate a markdown report from the agent-loop bundle using the EJS template `.planning/templates/agent-loop-report.md.ejs`; writes to `.planning/reports/latest.md` and a timestamped copy. Each run appends one line to `.planning/reports/metrics.jsonl` for system health over time. `planning report view [--port 3847]` — generate report, start a minimal HTTP server, and open a thin markdown viewer in your browser (standalone; no build). While the server is running, `GET /metrics?tail=50` returns the last 50 metrics as JSON for dashboards.
- **Metrics (track &amp; analyze):** `planning metrics [--json]` — current system health (tasks done/total, completion %, open questions, active agents, phases, errors/attempts, review counts). `planning metrics-history [--n 30] [--json]` — last N entries from `metrics.jsonl`. Snapshot and bundle token estimates are computed on `planning report generate` and stored in each metrics line. **Usage:** Each run of `planning snapshot`, `planning new-agent-id`, or `planning simulate loop` appends to `.planning/reports/usage.jsonl` so you can see how often agents use the loop. **Dashboard:** In the docs site, open **Planning → Planning dashboard** (or `/planning/dashboard`) for Recharts-based charts (completion over time, open questions, loop usage by command).
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

### Tests

- `pnpm planning:test` — runs CLI tests (node:test) for planning commands.

### Iterate (greenfield overnight loop)

Iterative agent loop until `<promise>COMPLETE</promise>` (or custom) appears in output. Progress persisted via git each iteration; ideal for **greenfield** (fresh repos, TDD, overnight builds). See DECISIONS.xml RALPH-WIGGUM-LOOP-GREENFIELD.

- `planning iterate --run "<agent-cmd>" [--task RALPH_TASK.md] [--promise "<promise>COMPLETE</promise>"] [--max 20]` — run agent repeatedly; task file content is piped to stdin; stdout is checked for the promise. Use `--cwd <repo>` for a fresh worktree.
- **Task file:** Include clear steps, self-correction, and exact completion criteria, e.g. "When tests pass, output `<promise>COMPLETE</promise>`."
- **When to use:** Verifiable tasks (tests/linters), new repos, refactors. Avoid subjective design or production deploys.

### Product Owner (MCP) — agent orchestration

The **planning MCP server** (`dungeonbreak-planning`) is the Product Owner surface for agents. When it is running and configured in Cursor/Codex, agents should **prefer MCP tools** over calling the CLI via shell so all agents share one source of truth and coordinate better.

- **Run:** `pnpm mcp:planning` (stdio server). Install into Cursor/Codex: `pnpm mcp:install` (writes `~/.cursor/mcp.json` and `~/.codex/config.toml`).
- **MCP tools:** snapshot, new_agent_id, task_update, task_create, phase_update, agent_close, plan_create, **open_questions** (with file refs), **get_agent_bundle** (same as `planning simulate loop --json`).
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
