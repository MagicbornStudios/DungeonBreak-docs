# @dungeonbreak/engine

Installable DungeonBreak engine package with:

- `GameEngine` (deterministic turn simulation)
- shared contracts/data packs
- replay helpers
- `DungeonBreakGame` React component (playable out of the box)

## Usage

```tsx
import { DungeonBreakGame } from "@dungeonbreak/engine";

export default function Page() {
  return <DungeonBreakGame seed={20260227} />;
}
```
