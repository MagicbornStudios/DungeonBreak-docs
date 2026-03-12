# Planning standalone

Minimal Next.js app that runs the planning cockpit and planning API routes. Use it from a repo that has a `.planning` directory (brownfield or greenfield).

## From this repo (monorepo)

- **CLI:** From repo root: `pnpm planning` (or `node vendor/repo-planner/scripts/loop-cli.mjs`).
- **Standalone UI:** From repo root: `pnpm planning:standalone`. Opens the cockpit at http://localhost:3101. The app uses `REPOPLANNER_PROJECT_ROOT=../..` so it reads `.planning` from the monorepo root.

## Install from GitHub (no npm)

We do **not** publish this package to npm. To use the planning CLI and cockpit:

1. **Get the repo:** Clone or download a [GitHub release](https://github.com/your-org/DungeonBreak-docs/releases) (source tarball or zip).
2. **Install:** At the repo root run `pnpm install` (or `npm install`).
3. **CLI:** Run `pnpm planning <command>` from the repo root. For a repo that has its own `.planning` elsewhere, run the CLI from that directory or set `REPOPLANNER_PROJECT_ROOT` to the path that contains `.planning`.
4. **Standalone cockpit:** Run `pnpm planning:standalone` from the repo root. To point at another repo’s `.planning`, set `REPOPLANNER_PROJECT_ROOT` to that directory before starting (e.g. `REPOPLANNER_PROJECT_ROOT=/path/to/your-repo pnpm --dir packages/planning run dev`).

The planning package depends on `vendor/repo-planner` (included in the repo). The release tarball should include the full repo layout so both the CLI and the standalone app work after install.
