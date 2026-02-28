# Phase 16 Context - GitHub Release Hardening

## Desired Outcome

Package distribution is explicit and enforceable as GitHub Releases tarball-first (no npm registry publish dependency), with deterministic quality gates before release.

## Constraints

1. Keep `npm run lab` as the local single-entry workflow.
2. Keep docs-site `/play` stable while tightening release validation.
3. Preserve current package implementation id (`@dungeonbreak/engine`) for imports and compatibility.
4. Avoid adding external release services when GitHub-native automation can satisfy requirements.

## Non-Goals

1. Introducing npm registry publish as a required path.
2. Reworking gameplay systems unrelated to release/distribution hardening.
3. Replacing existing docs-site runtime architecture.
