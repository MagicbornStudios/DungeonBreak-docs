# Planning schemas (legacy)

**Game pack schemas have moved.** The canonical location for JSON schemas that validate game data is:

**`packages/engine/src/escape-the-dungeon/contracts/schemas/`**

- `spawn-table-schema.json` → now `contracts/schemas/spawn-table.schema.json`
- `spell-evolution-schema.json` → now `contracts/schemas/spell-evolution.schema.json`

Data lives in `contracts/data/`; schemas live in `contracts/schemas/`. Add and update schemas there. This `.planning/schemas/` folder is kept only for historical reference; do not add new game pack schemas here.
