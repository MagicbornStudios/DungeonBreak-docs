# Narrative state-space simulations (game-aligned)

Jupyter notebooks that analyze and demo the Narrative Engine state space using
the in-game thematic basis vectors.

Single entry point:

```bash
npm run lab
```

Optional alignment utilities:

```bash
npm run narrative:sync-traits
npm run narrative:validate-alignment
```

The notebooks consume:

- `src/dungeonbreak_narrative/data/game_traits_manifest.json`
- `src/dungeonbreak_narrative/data/narrative_snapshot.json`

If snapshot force/location data is partial, notebooks warn and skip dependent
scenarios instead of fabricating values.

Optional prospective dependency:

```bash
uv sync --extra embeddings
```

Escape the Dungeon CLI entry:

```bash
escape-the-dungeon
# or:
python -m dungeonbreak_narrative.escape_the_dungeon.cli
```

## Notebooks

| Notebook | Description |
|----------|-------------|
| **dungeonbreak-narrative.ipynb** | Main tutorial. Boots from manifest + snapshot, runs alignment checks, simulates event flow, and visualizes game-trait trajectory slices. |
| **dungeonbreak-narrative-space-builder.ipynb** | Builder tool for composing vectors from named game traits and probing entity/dialog distances without introducing substitute axes. |
| **dungeonbreak-narrative-prospective.ipynb** | Prospective analysis notebook for advanced experiments that remain trait-name aligned with game assets. |
| **dungeonbreak-text-adventure.ipynb** | Playable text-adventure notebook using the same manifest/snapshot-driven trait model and warn-only data guards. |
| **dungeonbreak-text-adventure-embeddings.ipynb** | Compatibility notebook that now runs the modular Escape the Dungeon engine with embeddings-enabled intent actions. |
| **escape-the-dungeon.ipynb** | Primary dungeon-crawler demo for **Escape the Dungeon** (12 levels, 50 rooms/level, chapter/act pages, NPC background simulation, dialogue option ranges) built on vendored adventurelib. |
| **verlet-constraints.ipynb** | Math reference for Verlet integration and constraints. |
