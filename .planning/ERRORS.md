# Errors and Attempts

## 2026-02-28 - Vercel prerender failed in `docs-og` route with missing response

- Context: Vercel build for commit `c8e770b` failed while prerendering `/docs-og/.../image.png` with `No response is returned from route handler`.
- Cause: `docs-site/app/(fumadocs)/docs-og/[...slug]/route.tsx` used `notFound()` inside a route handler branch, which does not reliably satisfy route-handler response expectations in Next 16 prerender paths.
- Mitigation applied:
  - Changed route handler to always return explicit `Response` objects for invalid/missing slug and missing page branches.
  - Added local reproduction command in `docs-site/package.json`:
    - `pnpm --dir docs-site run build:vercel-parity` (`CI=1`, `NEXT_PRIVATE_BUILD_WORKER=1`).

## 2026-02-28 - Vercel docs-site build failed to resolve `@dungeonbreak/engine`

- Context: Vercel production build failed at `next build --webpack` with repeated `Module not found: Can't resolve '@dungeonbreak/engine'` from `/play` and `/api/mcp` imports.
- Cause: local file dependency bootstrap only ran in `preinstall`; on clean deploy environments this can leave the installed package without hydrated `dist` when the app build begins.
- Mitigation applied:
  - Added a second bootstrap pass after install and before build in:
    - `docs-site/package.json`
      - `postinstall`: `node scripts/ensure-engine-dist.mjs && fumadocs-mdx`
      - `prebuild`: `node scripts/ensure-engine-dist.mjs`

## 2026-02-27 - Tag workflow failed on `v0.1.0`

- Context: `Terminal Game CI and Release` run for tag `v0.1.0` failed before build jobs started.
- Failing job: `Docs Browser Checks`.
- Failing step: `Setup Node` in both browser workflow and terminal workflow docs gate.
- Mitigation applied:
  - Removed pnpm cache wiring from `actions/setup-node` in:
    - `.github/workflows/docs-browser-game.yml`
    - `.github/workflows/terminal-game-release.yml`
  - Re-run publish flow after pushing workflow fix.

## 2026-02-27 - Tag workflow failed on docs build env assumptions

- Context: re-run of `v0.1.0` failed in `Docs Browser Checks` at `Build docs-site`.
- Cause: CI job did not provide required Payload/S3 environment variables used by docs-site config.
- Mitigation applied:
  - Added deterministic CI placeholder env vars to docs build jobs in:
    - `.github/workflows/docs-browser-game.yml`
    - `.github/workflows/terminal-game-release.yml`

## 2026-02-27 - Tag workflow failed only at release publish step

- Context: `Terminal Game CI and Release` run `#13` for `v0.1.0` passed tests and all 3 binary builds, then failed at `Publish GitHub Release`.
- Cause: release action step failure was not visible without authenticated logs; likely rerun/create-upload edge behavior.
- Mitigation applied:
  - Replaced `softprops/action-gh-release` with explicit `gh`-based create/upload logic in:
    - `.github/workflows/terminal-game-release.yml`
  - New flow is idempotent (`gh release view` then `gh release create` if missing; `gh release upload --clobber`).

## 2026-02-27 - Release publish failed due duplicate asset names across OS

- Context: run `#17` published `v0.1.0` but still failed the release job.
- Observed state: release existed with only one uploaded asset (`escape-the-dungeon.exe`), while linux/macos binaries shared the same filename (`escape-the-dungeon`).
- Cause: release upload step collided on duplicate asset names from different OS builds.
- Mitigation applied:
  - Normalized artifact filenames per matrix OS before upload:
    - `escape-the-dungeon-ubuntu-latest`
    - `escape-the-dungeon-macos-latest`
    - `escape-the-dungeon-windows-latest.exe`
  - Updated release artifact glob to `artifacts/**/escape-the-dungeon-*` in:
    - `.github/workflows/terminal-game-release.yml`
