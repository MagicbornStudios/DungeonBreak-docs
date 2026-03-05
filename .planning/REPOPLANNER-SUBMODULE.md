# RepoPlanner as a submodule (vendor/)

Planning (CLI, cockpit UI, APIs, and .planning contract) lives in a separate repo and is used as a **git submodule** under **`vendor/`** so it can be reused in any Next.js app (e.g. this docs-site) and versioned independently.

## Remote

- **Repo**: https://github.com/MagicbornStudios/RepoPlanner

## Submodule path (host = this repo)

- **Path**: `vendor/repo-planner` (not repo root). Keeps third-party/vendor surface in one place and avoids cluttering root.

## Add and update the submodule

From repo root:

```bash
git submodule add https://github.com/MagicbornStudios/RepoPlanner.git vendor/repo-planner
git submodule update --init --recursive
```

To pull latest in the submodule:

```bash
cd vendor/repo-planner && git pull origin main && cd ../..
```

## Host integration: simple Next.js component

The host app (e.g. docs-site) should be able to use RepoPlanner with minimal wiring:

1. **Single entry**: Import one component (e.g. `PlanningCockpit` or `PlanningPage`) from the submodule and render it on a route.
2. **No host styles inside submodule**: RepoPlanner UI uses **theme tokens only** (`--planning-status-*`, `--planning-diff-*`). The host defines these in its own CSS (e.g. `app/(fumadocs)/global.css`) so the submodule stays style-agnostic.
3. **Routes/API**: Host keeps thin route files that either re-export the submodule’s page component or proxy API calls to the submodule’s handlers. Routing and API base paths stay in the host.

Example (host page):

```tsx
// docs-site/app/dungeonbreak-content-app/planning/page.tsx
"use client";
import { PlanningCockpit } from "@/vendor/repo-planner"; // or path alias

export default function PlanningPage() {
  return (
    <div className="flex flex-col gap-4">
      <PlanningCockpit />
    </div>
  );
}
```

Host CSS (define tokens so submodule matches host theme):

```css
:root {
  --planning-status-done: ...;
  --planning-status-in-progress: ...;
  --planning-diff-add: ...;
  --planning-diff-remove: ...;
}
```

## Codex and loop compatibility

- **CLI**: `pnpm planning` / `node scripts/loop-cli.mjs` run from **host repo root**. The CLI reads `.planning/` from host root (or a path set via env). The submodule can ship a copy of the CLI and templates; the host may keep `.planning/` in the host repo and pass `PLANNING_ROOT` or rely on `process.cwd()`.
- **MCP / Codex**: When the planning MCP server is used, it should resolve `.planning/` from the same root the host uses (e.g. host repo root). No change to agent workflow: snapshot, agent id, TASK-REGISTRY, REFERENCES as in AGENTS.md.
- **Contract**: Either `.planning/` stays in the host and RepoPlanner is “UI + optional CLI copy”, or the submodule owns the default contract and the host points to it. Current recommendation: keep `.planning/` in the host so STATE, ROADMAP, TASK-REGISTRY remain the source of truth; RepoPlanner provides UI + API + CLI that read from that path.

## What lives in RepoPlanner (submodule)

- **CLI**: `scripts/loop-cli.mjs` (and tests) so other repos can use the same CLI.
- **.planning contract**: Templates and schema as default; host can override by keeping its own `.planning/`.
- **UI**: React components (cockpit, status, chat panel, edit-review, etc.), exportable as a single `PlanningCockpit` (or similar) for the host to import.
- **API**: Planning API routes (state, edits, reports, CLI run, metrics, planning-chat) can live in the submodule; host mounts them under `/api/planning-*` and `/api/ai/planning-chat` or forwards to the submodule.

## Install and setup

**See [vendor/repo-planner/INSTALL.md](../vendor/repo-planner/INSTALL.md)** for a step-by-step guide: add submodule, path alias, CSS tokens, **install-routes** (install API routes from the package so the host doesn’t own planning logic), and planning page. **Package owns API surface**; run `node vendor/repo-planner/scripts/install-routes.mjs` to write re-export routes into the host app.

## Status

- **Current**: Phase 54. Submodule at `vendor/repo-planner` with CLI, templates, and planning UI; host imports `PlanningCockpit` from `@/vendor/repo-planner` and provides theme tokens. API routes use submodule CLI.
