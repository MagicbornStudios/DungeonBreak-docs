# Guidance for AI agents

**Audience:** AI agents (and humans) working on this repo.

## Single entry point

**`npm run lab`** = full setup: installs deps, regenerates API docs, starts the docs site (http://localhost:3000) and Jupyter Lab (notebooks only). No Unreal. Clone, `npm install`, copy `docs-site/.env.example` to `docs-site/.env`, then `npm run lab`.

## Deploy

For Vercel: set Root Directory to `docs-site`, add env vars from `docs-site/.env.example`. See [README.md](README.md).
