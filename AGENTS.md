# Agent Loop Guide

This repo is XML-first for planning. Every phase uses XML templates and must cite PRD/GRD (or other direction docs) in the `references` block.

Templates (in `.planning/templates/`):
- `.planning/templates/PLAN-TEMPLATE.xml` - plan structure and required fields.
- `.planning/templates/SUMMARY-TEMPLATE.xml` - summary structure and verification fields.
- `.planning/templates/ROADMAP-TEMPLATE.xml` - roadmap entry structure.
- `.planning/templates/DECISIONS-TEMPLATE.xml` - decision log structure.
- `.planning/templates/TASK-REGISTRY-TEMPLATE.xml` - task record structure.
- `.planning/templates/LOOP-DOC-TEMPLATE.xml` - master loop spec for planning docs.
- `.planning/templates/ERRORS-AND-ATTEMPTS-TEMPLATE.xml` - error/attempt record structure.
- `.planning/templates/PHASE-DOC-TEMPLATE.md` - human-readable guidance.
- `.planning/templates/doc-template-atoms.xml`
- `.planning/templates/doc-template-molecules.xml`
- `.planning/templates/doc-template-organisms.xml`

Quick start (what every agent does first):
1. `planning snapshot` (or `node scripts/loop-cli.mjs snapshot`) to see current phase, agents, and open tasks.
2. Generate and register a unique agent id in `STATE.xml`.
3. Claim or create a task in `TASK-REGISTRY.xml` before changing code.
4. Read `REFERENCES.xml` for PRD/GRD direction for your phase.

Workflow (per phase):
1. Update `ROADMAP.xml` with phase status and references.
2. Create/refresh `.planning/phases/<phase>/PLAN.xml` from `.planning/templates/PLAN-TEMPLATE.xml`.
3. Execute work and write `.planning/phases/<phase>/SUMMARY.xml`.
4. Sync `TASK-REGISTRY.xml`, `DECISIONS.xml`, and `STATE.xml`.
5. Record errors in `ERRORS-AND-ATTEMPTS.xml` if they occur.

Agent workflow note:
- Agents may update XML directly or via the planning CLI/MCP server. Pick whichever is fastest, but always keep XML authoritative.

Agent identity and concurrency:
- Every agent must claim a unique `agent-YYYYMMDD-xxxx` id in `STATE.xml` under `agent-registry`.
- Generate ids with `node scripts/loop-cli.mjs new-agent-id` (or `planning new-agent-id`).
- Agents must set active phase/plan and respect dependencies in `TASK-REGISTRY.xml`.
- If PRD/GRD gaps are found, record them in `DECISIONS.xml` and add a task in `TASK-REGISTRY.xml`.

Loop expectations:
- Always include snapshot output in updates when asked “use the loop.”
- Close tasks when done and set your agent to inactive if you stop working.
- Keep references compact and searchable; prefer keywords + commands over long narratives.
