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

Install in consumers:
```bash
npm i @dungeonbreak/engine
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

Vector usage report:
```bash
pnpm --dir docs-site run report:vector-usage
```

## CI / release

- Browser checks: `.github/workflows/docs-browser-game.yml`
- Engine package checks + release asset tarball on tags: `.github/workflows/engine-package-release.yml`

## Vercel deploy

1. Import repo in Vercel.
2. Set Root Directory to `docs-site`.
3. Add env vars from `docs-site/.env.example`.
4. Deploy.
