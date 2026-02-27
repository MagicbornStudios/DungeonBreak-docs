# Phase 12: Terminal packaging and release automation - Context

**Gathered:** 2026-02-27T00:00:00.000Z  
**Status:** Initialized

## Why this phase exists

Escape the Dungeon is now a playable terminal game and needs a repeatable distribution channel for players outside local development environments.

## Desired outcomes

1. Local command builds terminal binary from CLI entrypoint.
2. CI runs tests first, then builds binaries for Windows/macOS/Linux.
3. Semantic tags (`v*`) produce GitHub Releases with attached binaries.
4. Publishing instructions are documented for contributors and agents.

## Constraints

1. Keep build source aligned to `dungeonbreak_narrative.escape_the_dungeon.cli:main`.
2. Preserve existing lab/docs workflows.
3. Ensure release automation is traceable in `.planning` docs.

## Non-goals

1. Installer package generation (MSI/DMG) in this slice.
2. Auto-updater or launcher distribution platform support.
