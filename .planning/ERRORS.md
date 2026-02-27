# Errors and Attempts

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
