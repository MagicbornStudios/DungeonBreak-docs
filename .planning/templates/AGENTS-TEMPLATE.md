# Agent Loop Guide

XML-first planning. Use `.planning/templates/` for PLAN, SUMMARY, ROADMAP, TASK-REGISTRY, DECISIONS. Cite PRD/GRD in `references`.

**Quick start:** Run `planning snapshot` (or `pnpm planning snapshot` / `node scripts/loop-cli.mjs snapshot`) → register agent id in STATE.xml → claim task in TASK-REGISTRY.xml → read REQUIREMENTS.xml for phase. **When the planning MCP server is available,** prefer its tools (snapshot, open_questions, get_agent_bundle, task_update, etc.). **Workflow:** Update ROADMAP, phase PLAN/SUMMARY; sync TASK-REGISTRY, DECISIONS, STATE; add `requriements-suggestions` for gaps; record errors in ERRORS-AND-ATTEMPTS.xml. **Identity:** Unique `agent-YYYYMMDD-xxxx` in STATE; `planning new-agent-id`. **Loop:** Include snapshot in updates when asked; close tasks and set inactive when done; compact refs; don't block on open questions—capture in `requriements-suggestions`.

**Planning artifacts:** All planning, tasks, and requirements use .planning XML and the planning CLI only (DECISIONS PLANNING-ARTIFACTS-XML-ONLY). No ad-hoc planning markdown.

---

# Coding Standards & Styling

Add this repo's coding standards, lint commands, and conventions below (or reference a shared doc). Keep the loop section above unchanged so agents always see the same workflow.
