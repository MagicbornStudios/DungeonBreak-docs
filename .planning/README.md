# Planning Docs (XML-First)

All planning docs are XML. Markdown remains only for templates (see `templates/PHASE-DOC-TEMPLATE.md`).

## Primary Docs (XML)

- `ROADMAP.xml` — phases, dependencies, status, and links to plan/summary.
- `STATE.xml` — current phase/plan, agent registry, next action.
- `TASK-REGISTRY.xml` — task list with agent ownership and dependencies.
- `DECISIONS.xml` — decision log with references.
- `ERRORS-AND-ATTEMPTS.xml` — failure/attempt log.
- `REFERENCES.xml` — consolidated PRD/GRD/requirements and other direction docs.
- `loop.json` — loop run metadata (legacy until replaced by XML).

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

## Agent IDs

Generate a unique id and register it in `STATE.xml` before claiming tasks:

- `node scripts/loop-cli.mjs new-agent-id`

## CLI

- `node scripts/loop-cli.mjs migrate-planning` — consolidate root planning markdown into `REFERENCES.xml`.
- `node scripts/loop-cli.mjs migrate-roadmap` — regenerate `ROADMAP.xml` from `REFERENCES.xml` (ROADMAP.md content).
- `node scripts/loop-cli.mjs migrate-phases` — convert phase markdown into XML and remove the markdown.
- `node scripts/loop-cli.mjs migrate-all` — run all of the above.
- `node scripts/loop-cli.mjs snapshot` — show current phase, agents, and open tasks.
- `node scripts/loop-cli.mjs new-agent-id` — generate a unique agent id to register in `STATE.xml`.

## Planning CLI (no node command)

- `planning snapshot`
- `planning new-agent-id`
- `planning task-update <taskId> <status> [agentId]`
- `planning task-create <phaseId> <taskId> <agentId> [status] "<goal>" [keywords] [command]`
- `planning phase-update <phaseId> <status>`
- `planning agent-close <agentId>`
- `planning plan-create <phaseId> <phaseName> <planId> <phaseDir>`

If `planning` is not built yet: `pnpm --dir packages/planning-mcp run build`.

If `tsx` is missing:
- `pnpm --dir packages/planning-mcp install`
