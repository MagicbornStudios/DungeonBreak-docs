# @dungeonbreak/engine

Installable DungeonBreak engine package with:

- `GameEngine` (deterministic turn simulation)
- shared contracts/data packs
- replay helpers
- `DungeonBreakGame` React component via `@dungeonbreak/engine/react`

## Usage

```tsx
import { DungeonBreakGame } from "@dungeonbreak/engine/react";

export default function Page() {
  return <DungeonBreakGame seed={20260227} />;
}
```
