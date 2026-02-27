# Guidance for AI agents

**Audience:** AI agents (and humans) working on this repo.

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
5. For gameplay changes that affect binary behavior, update `.planning` phase docs and release notes in the same loop.
