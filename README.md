# DungeonBreak docs + browser game

TypeScript-first repo for:

- docs site (`docs-site`, Next.js + Fumadocs + Payload)
- browser-playable Escape the Dungeon at `/play`
- installable engine package: `@dungeonbreak/engine` (`packages/engine`)

## Local setup

1. Install root deps:
```bash
npm install
```

2. Copy env:
```bash
cp docs-site/.env.example docs-site/.env
```

3. Run lab (single entry):
```bash
npm run lab
```

This installs/builds the engine package, installs docs-site dependencies, generates docs metadata, and starts docs-site at `http://localhost:3000`.

## Play

- Open `http://localhost:3000/play`
- Left: actions
- Middle: feed (narration/events/dialogue/cutscenes)
- Right: status (traits/features/quests/nearby entities)

## Package

Engine package path: `packages/engine`

Build:
```bash
pnpm --dir packages/engine run build
```

Install in consumers (GitHub Releases tarball):
```bash
pnpm add https://github.com/MagicbornStudios/DungeonBreak-docs/releases/download/v0.1.0/dungeonbreak-engine-0.1.0.tgz
```

Install from local repo checkout:
```bash
pnpm add ../DungeonBreak-docs/packages/engine
```

Minimal usage:
```tsx
import { DungeonBreakGame } from "@dungeonbreak/engine";

export default function Page() {
  return <DungeonBreakGame seed={20260227} />;
}
```

## Tests

Docs + game:
```bash
pnpm --dir docs-site run typecheck
pnpm --dir docs-site run test:unit
pnpm --dir docs-site run test:e2e
```

Engine deterministic replay checks:
```bash
pnpm --dir packages/engine run test:replay-smoke
```

MCP parity checks:
```bash
pnpm --dir packages/engine-mcp run typecheck
pnpm --dir packages/engine-mcp run test:parity-smoke
```

Vector usage report:
```bash
pnpm --dir docs-site run report:vector-usage
```

## MCP server (coding-agent playable)

Run the game MCP server:

```bash
pnpm --dir packages/engine-mcp install --no-frozen-lockfile
npm run mcp:game
```

Install local MCP config for Cursor + Codex:

```bash
npm run mcp:install
```

Preview config changes without writing:

```bash
npm run mcp:install:dry-run
```

Manual configs and tool list live in:
- `packages/engine-mcp/README.md`

Run a deterministic agent-play session (no UI) and emit report:

```bash
npm run agent:play
```

Output:
- `.planning/test-reports/agent-play-report.json`

Remote MCP endpoint (deployed docs runtime, signed-in users):

- URL: `/api/mcp`
- Transport: Streamable HTTP
- Auth: Payload-authenticated session (signed-in user required)
- OAuth protected resource metadata: `/api/.well-known/oauth-protected-resource`

Window-agent / Assistant Frame support:

- `/play` registers Assistant Frame tools (`game_status`, `list_actions`, `dispatch_action`, `dismiss_cutscene`)
- Browser gameplay remains button-first when no frame host is present

Build/release report artifacts:

- CI uploads versioned play report: `play-report-<build>.json`
- CI uploads machine-readable test manifest: `test-manifest-<build>.json`
- Tagged GitHub releases include package tarball plus these JSON artifacts

## CI / release

- Browser checks: `.github/workflows/docs-browser-game.yml`
- Engine package checks + release asset tarball on tags: `.github/workflows/engine-package-release.yml`

## Vercel deploy

1. Import repo in Vercel.
2. Set Root Directory to `docs-site`.
3. Add env vars from `docs-site/.env.example`.
4. Deploy.
