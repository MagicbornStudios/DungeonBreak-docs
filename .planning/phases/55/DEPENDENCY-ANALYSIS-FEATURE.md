# Node Module Dependency Analysis (Phase 55)

**Constraint:** All planning, tasks, and workflow use the loop: XML documents (.planning) and planning CLI. No ad-hoc planning markdown or one-off docs. This file is supporting context only; direction lives in ROADMAP.xml, DECISIONS.xml, and (for replacement repos) REQUIREMENTS.xml.

---

## Terminology

| Term | Meaning |
|------|--------|
| **Greenfield** | Fresh codebases. Here: reverse-engineering from node_modules to extract feature requirements before we have our own implementation. |
| **Brownfield** | Existing codebases. Here: analyze how much of a dependency is used, assess replaceability, plan lightweight rebuild. |

---

## Locked decisions (from user)

1. **Project discovery** – No saved project list. Cockpit discovers projects during **existing repo scans** (folders with .planning); we use that to switch context.
2. **Where dependency requirements live** – In the **replacement repo** (the new repo we create for the dependency). That repo always has the requirements, even when it later becomes brownfield. All artifacts use **our XML documents** (REQUIREMENTS.xml shape, ROADMAP, TASK-REGISTRY, DECISIONS, etc.) and **planning CLI**—no one-off planning docs.
3. **Usage analysis scope** – **Static and dynamic require**; what is actually pulled in and used by **products**. Exclude test-only usage from “what we use” for replaceability (test-only usage is odd; we can still report it separately if useful).
4. **First slice** – No specific dependency yet. Focus on **the analysis pipeline** first; user picks a dep once analysis is ready.
5. **Replacement repo loop** – Each replacement repo has its **own .planning** and full set of XML docs. First phase there is **requirements gathering** (reverse-engineered or brownfield usage → REQUIREMENTS.xml). It uses the same loop and CLI.
6. **Greenfield output format** – **REQUIREMENTS.xml structure** in the new repo’s .planning. Reuse our XML and workflow. We need an **AGENTS.md template** for bootstrapping new repos (in .planning/templates or with the loop); may already exist—confirm and add if missing.

---

## Goals

1. **Usage analysis** – What is used from a dependency (static + dynamic require; product usage only for replaceability).
2. **Replaceability** – Can we build a lightweight version? Requirements live in replacement repo’s REQUIREMENTS.xml; revisit via loop.
3. **Greenfield** – Reverse-engineer from node_modules → requirements-gathering phase in replacement repo → REQUIREMENTS.xml-shaped output → build subset.
4. **Brownfield** – Same workflow on existing repos; requirements and roadmap in that repo’s .planning.
5. **Project switching** – Discovery via existing scans; cockpit can center on any discovered .planning root.

---

## Workflow (target)

- **Greenfield:** Inspect dependency → extract requirements → create replacement repo with .planning → first phase = requirements gathering → output populates REQUIREMENTS.xml (our structure) → implement from tasks in TASK-REGISTRY.
- **Brownfield:** Run dependency usage analysis on repo → used surface → update/create replacement repo’s REQUIREMENTS.xml and ROADMAP via loop.
- All planning and tasks: **XML + planning CLI only.**

---

## Artifacts (all via loop/XML)

- **Per-dependency requirements** – In **replacement repo** `.planning/REQUIREMENTS.xml` (same structure as our REQUIREMENTS.xml).
- **Usage report** – Output of analysis (CLI or API); can feed into REQUIREMENTS.xml and phase PLAN.
- **Rebuild roadmap** – In replacement repo ROADMAP.xml and TASK-REGISTRY.xml.

---

## Dependency analysis UI (not built yet)

There is **no dependency analysis UI** in the cockpit today—no tab, no reports, no coloring. When we add it, it must be **user-friendly with rich UI and coloring**: e.g. usage table with semantic colors (green/amber/red for replaceability or usage %), clear hierarchy (package → used exports → call sites), status badges (greenfield/brownfield, replaceable/keep), and consistent tokens (planning-status, card/muted). Task 55-03.

## Refactor before 55-03

When building the Dependencies tab, prefer: **PlanningMetricCard** molecule (extracted from Dashboard + Tests), **PanelSection**, and **status helpers**. Avoid one-off card markup.

**Done:** Cockpit now uses **5 main tabs** (Overview, Work, State, Tools, Chat) with sub-views; see DECISIONS COCKPIT-GROUPED-TABS-THEMING and PLANNING-LAYOUTS. Continue to revisit and refactor layouts as we add features (e.g. Dependencies tab under Tools).

## Open / to define

- **AGENTS.md template** – Done. `templates/AGENTS-TEMPLATE.md` for bootstrapping replacement repos (task 55-02).
- **Analysis pipeline** – CLI/API that does static + dynamic require scan; product-only usage; machine-readable output (task 55-01).
- **Dependencies tab** – Rich cockpit tab for analysis results (task 55-03); depends on 55-01 API shape.

---

## References

- ROADMAP.xml phase 55
- DECISIONS.xml GREENFIELD-BROWNFIELD-DEPENDENCY-ANALYSIS, PLANNING-ARTIFACTS-XML-ONLY
- AGENTS.md (loop, snapshot, task claim)
- .planning/REQUIREMENTS.xml (structure to reuse in replacement repos)
- .planning/templates/ (PLAN, SUMMARY, ROADMAP, TASK-REGISTRY, DECISIONS, etc.)
