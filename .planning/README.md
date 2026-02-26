# Forge Loop – Planning Workspace

This folder is the **artifact-first planning workspace** for DungeonBreak. The loop is: **discuss → plan → execute → verify**. Each phase has a goal and plans; we capture context, then implement, then verify.

## How the loop works

1. **Discuss** (`forge-loop discuss-phase <N>`)
   - You (or the agent) state the **desired outcome**, **constraints**, and **non-goals** for the phase.
   - Forge writes:
     - `.planning/phases/<N>-<slug>/<N>-CONTEXT.md` – phase boundary and your decisions
     - `.planning/prompts/<N>-discuss-prompt.md` – prompt for the next step
   - **Next:** run plan-phase.

2. **Plan** (`forge-loop plan-phase <N>`)
   - Creates or updates **plan files** in `.planning/phases/<N>-<slug>/`:
     - `<N>-01-PLAN.md`, `<N>-02-PLAN.md`, … with frontmatter (wave, depends_on, must_haves, tasks).
   - Wave ordering: plan 02 can depend on plan 01; execute in order.
   - **Next:** execute-phase.

3. **Execute** (`forge-loop execute-phase <N>`)
   - An agent (or you) works through the tasks in the plan files and updates code/docs.
   - Produces `<N>-<plan>-SUMMARY.md` per plan with outcomes and decisions.

4. **Verify** (`forge-loop verify-work <N> --strict`)
   - Checks that must-haves (truths, artifacts, key_links) are satisfied.
   - Use `--non-interactive` for CI; interactive mode asks UAT-style questions.

5. **Progress** (`forge-loop progress`)
   - Suggests the next command (e.g. “run discuss-phase 1”) based on current state.

## Key files

| File | Purpose |
|------|--------|
| `PROJECT.md` | What the project is, core value, active/out-of-scope requirements |
| `ROADMAP.md` | Phases with goals and requirements; progress table |
| `REQUIREMENTS.md` | REQ-01, REQ-02, … and traceability to phases |
| `STATE.md` | Current phase/plan, status, next action |
| `TASK-REGISTRY.md` | High-level task list per phase |
| `DECISIONS.md` | Recorded decisions |
| `ERRORS.md` | Failed attempts and errors |
| `config.json` | Loop config (e.g. prompt-pack vs agent runner, git auto-commit) |
| `phases/<N>-<slug>/` | Context, plans, research, summaries for phase N |
| `prompts/` | Generated discuss/plan prompts |

## Commands (from repo root)

```bash
npm run forge-loop:progress
npm run forge-loop:discuss-phase -- 1
npm run forge-loop:plan-phase -- 1
npm run forge-loop:execute-phase -- 1
npm run forge-loop:verify-work -- 1 --strict
npm run forge-loop:doctor
```

## Teaching note

- **Discuss** is where you lock scope: “what we want,” “what we won’t do.” That keeps plans from creeping.
- **Plan** turns that into concrete tasks and must-haves so execute and verify have clear criteria.
- **Execute** is where code and docs change; **verify** is the gate before marking a phase complete.
