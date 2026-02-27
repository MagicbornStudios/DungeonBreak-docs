# Guidance for AI agents

**Audience:** AI agents (and humans) working on this repo.

## Escape the Dungeon — Text Adventure Concept

This repo is the concept + demo for **Escape the Dungeon** — a vector-driven text adventure (like AI Dungeon but with artifacts and an official CLI/web build).

- **Concept mode:** Play in AI chat. Log to `scratch/game-state.md`. Discover missing content, under-specs, prize moments. See `.concept/PROCESS.md` for the game concept simulation process.
- **Official demo:** CLI (`escape-the-dungeon`) and web play at `/play` — canonical game state, mechanics, cutscenes, skills, deeds.

When helping with game design, content, or simulation: read `scratch/game-state.md`, understand traits/vectors in `docs-site/lib/escape-the-dungeon/`, and log discovery artifacts. Content evolves through simulation; the CLI and web UI reflect what we build.

## Single entry point

**`npm run lab`** = full setup: installs deps, regenerates API docs, starts the docs site (http://localhost:3000) and Jupyter Lab (notebooks only). No Unreal. Clone, `npm install`, copy `docs-site/.env.example` to `docs-site/.env`, then `npm run lab`.

## Deploy

For Vercel: set Root Directory to `docs-site`, add env vars from `docs-site/.env.example`. See [README.md](README.md).

## Terminal Game Publishing (Phase 12+)

When terminal publishing is active:

1. Keep CLI entrypoint stable at `dungeonbreak_narrative.escape_the_dungeon.cli:main`.
2. Before release-tagging, run:
   - `npm run test:py`
   - `npm run build:terminal:bin`
3. GitHub Actions workflow `.github/workflows/terminal-game-release.yml` is the source of truth for CI binary artifacts.
4. Use semantic tags (`vX.Y.Z`) to trigger GitHub Release publishing.
   - Example first stable tag: `v0.1.0`.
5. For gameplay changes that affect binary behavior, update `.planning` phase docs and release notes in the same loop.

## Browser Game Publishing (Phase 13+)

When browser publishing is active:

1. `/play` is the browser gameplay route (`docs-site/app/(fumadocs)/play/page.tsx`).
   - UX contract: 3-column layout (left actions, middle Assistant UI feed, right status).
   - Input contract: button-first gameplay; no required typed commands.
2. Keep browser gameplay runtime frontend-only (no dedicated gameplay backend service).
3. Before merge/release, run:
   - `pnpm --dir docs-site run typecheck`
   - `pnpm --dir docs-site run test:unit`
   - `pnpm --dir docs-site run test:e2e`
4. Browser CI source of truth: `.github/workflows/docs-browser-game.yml`.
5. Terminal release CI must remain gated by browser checks in `.github/workflows/terminal-game-release.yml`.
6. Update parity tracking in `.planning/parity/browser-parity-matrix.md` whenever gameplay behavior changes.
