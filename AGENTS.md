# Guidance for AI agents

## Scope

This repo is TypeScript-first:

- Browser game in `docs-site` (`/play`)
- Engine package in `packages/engine` (`@dungeonbreak/engine`)
- KAPLAY standalone in `packages/kaplay-demo` (first-person + grid; agent play, walkthroughs, reports)
- Planning + simulation artifacts in `.planning`, `.concept`, and `scratch`

Python gameplay runtime and notebooks are removed from active development scope.
Engine distribution policy is GitHub Releases tarball + repo install paths; npm registry publishing is not the default release path.

## Single entry point

`npm run lab`

Runs install/build helpers for package + docs, regenerates docs metadata, and starts docs-site at `http://localhost:3000`.

## Development priorities

1. Keep `/play` playable with button-first interactions.
2. Keep package API stable (`GameEngine`, `DungeonBreakGame`, contracts, replay helpers).
3. Keep deterministic behavior with canonical seed and replay fixtures.
4. Keep planning loop docs in sync when behavior/contracts change.
5. Keep machine-playable engine contracts stable for upcoming MCP agent gameplay flows.
6. Keep MCP server tools aligned with engine action/state contracts.
7. Keep `/api/mcp` (signed-in remote MCP) and Assistant Frame bridge contracts aligned with `/play`.
8. Keep versioned play/test report artifacts generated in CI and release flows.
9. When adding or changing UI screens, update `.planning/UI-COMPONENT-REGISTRY.md` and `.planning/KAPLAY-INTERFACE-SPEC.md`.
10. **Canonical identifiers:** Use `PLAYER_ACTION_TYPES`, `ROOM_FEATURES`, `ROOM_FEATURE_RUNE_FORGE` (or types `PlayerActionType`/`RoomFeature`) from `@dungeonbreak/engine`; no magic strings for actionType/roomFeature in kaplay-demo, engine-mcp, or docs-site.

## UI components and KAPLAY

- **Registry:** `.planning/UI-COMPONENT-REGISTRY.md` — all UI components with layout stubs and engine hooks.
- **Interface spec:** `.planning/KAPLAY-INTERFACE-SPEC.md` — first-person vs ASCII grid; screen-based model (Navigation, Combat, Rune Forge, Inventory, Dialogue).
- **Panel architecture:** `.planning/PANEL-ARCHITECTURE.md` — fixed layout, ASCII-first, no random popups.
- **Content pack versioning:** `.planning/CONTENT-PACK-VERSIONING.md` — DLC, schema migration, compatibility.
- **React build** (`/play`): ASCII aesthetic; monospace feed; no Assistant Frame UI. **KAPLAY standalone**: rect/text primitives; no shadcn. MCP control via engine-mcp server only.

## Required checks before merge

```bash
pnpm --dir docs-site run typecheck
pnpm --dir docs-site run test:unit
pnpm --dir docs-site run test:e2e
pnpm --dir docs-site run report:vector-usage
pnpm --dir packages/engine run typecheck
pnpm --dir packages/engine run build
pnpm --dir packages/engine run test:replay-smoke
pnpm --dir packages/engine run test:long-run-suite
pnpm --dir packages/engine-mcp run typecheck
pnpm --dir packages/engine-mcp run test:parity-smoke
```

## Deploy

For Vercel:

1. Root Directory: `docs-site`
2. Use env vars from `docs-site/.env.example`
3. Deploy

## Workflow shortcuts

- **Loop references:** `rg -n "LOOPS" .planning` or `rg -n "phase" .planning/` to find current/recent loop documentation.
- **Quick checks:** `rg -n "content-pack" docs-site/app -S` shows UI routes; `rg -n "space-explorer" docs-site/components/reports` surfaces UX details.
- **Vector docs:** `rg -n "SPACE_VECTOR" packages/engine/src` and `rg -n "space-vectors" docs-site/public` keep your feature/model references visible.
- **Command snippets:** Use `pnpm --dir docs-site run content:ingest` before opening the app; `pnpm --dir docs-site run typecheck && pnpm --dir docs-site run test:unit` after UI updates.
- **Planning lookup:** Look at `.planning/UI-COMPONENT-REGISTRY.md`, `.planning/CONTENT-PACK-VERSIONING.md`, `.planning/KAPLAY-INTERFACE-SPEC.md`, `.planning/ROADMAP.md` for identities, commands, and doc structure each loop.

## ASCII Brand

- **Logo component:** `AsciiLogo` lives at `docs-site/components/ui/ascii-logo.tsx`. Import it where you need clean, monospace ASCII art in the UI shell.
- **Style reuse:** Drop animated gradients in `app/(fumadocs)/global.css` and render the `AsciiLogo` inside `components/app-content/dashboard-shell.tsx` as the new icon next to the App label.
- **Quick find:** `rg -n "AsciiLogo" -n docs-site/components -S` and `rg -n "ASCII" AGENTS.md docs-site` keep the branding instructions simple to locate.
