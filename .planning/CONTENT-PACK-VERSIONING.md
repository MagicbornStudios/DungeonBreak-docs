# Content Pack Versioning and Migration

**Status:** Design doc  
**Location:** `.planning/CONTENT-PACK-VERSIONING.md`  
**Related:** GRD, engine contracts, `packages/engine/src/escape-the-dungeon/contracts/`

---

## Purpose

Support DLC and content pack evolution without breaking existing saves or runs. New content can add traits, skills, item slots, etc. Old data must migrate cleanly to new schemas.

---

## Principles (AAA MMO-style)

1. **Schema versioning:** Every content pack has a `schemaVersion` (semver or ordinal).
2. **Migration over replacement:** Never drop old data; migrate to new format with defaults for new fields.
3. **Engine remains testable:** Core engine is stable; content packs are pluggable. Tests run against versioned fixtures.
4. **MCP/engine contract:** Engine powers everything; MCP server (`engine-mcp`) exposes tools. Game UIs (React, KAPLAY) are thin clients.

---

## Content Pack Structure

| Pack | Current | Schema |
|------|---------|--------|
| action-formulas | bundled | `action-formulas.schema.json` |
| action-catalog | bundled | `action-catalog.schema.json` |
| archetypes | bundled | — |
| cutscenes | bundled | — |
| dialogue-clusters | bundled | — |
| events | bundled | `events.schema.json` |
| items | bundled | — |
| quests | bundled | `quests.schema.json` |
| room-templates | bundled | — |
| skills | bundled | — |

**DLC extension:** A DLC content pack adds new files (e.g. `dlc-traits-v1.json`) and declares dependencies on base pack versions. Loader merges or extends base data.

---

## Migration Contract

When schema evolves (e.g. new trait, new skill branch):

1. **Bump schema version** in pack metadata.
2. **Provide migration function:** `migrate(v: OldShape, fromVersion: string) -> NewShape`.
3. **Defaults for new fields:** New traits/skills/slots get `0` or `[]` in migrated entities.
4. **Backward compat:** Old saves loadable; migration runs once at load time.

---

## Example: New Trait in DLC

Base: `TRAIT_NAMES = [Comprehension, Constraint, ...]`  
DLC adds `Fortitude`.

- **Migration:** For existing entity, set `traits.Fortitude = 0`.
- **Schema:** Trait vector schema extends key set.
- **Content pack:** DLC pack lists `extends: "base-v1"`, adds `traitDefinitions: [{ id: "Fortitude", ... }]`.

---

## Example: New Equipment Slot

Base: no slots. DLC adds `equipped: { weapon?: string, ring1?: string, ... }`.

- **Migration:** `equipped = {}` for old entities.
- **Schema:** Entity state gains optional `equipped` block.
- **Content pack:** DLC defines slot schema; engine validates at runtime.

---

## Implementation Roadmap

| Phase | Scope |
|-------|-------|
| 1 | Add `schemaVersion` to each pack; loader validates. |
| 2 | Migration registry: `registerMigration(packId, fromVersion, fn)`. |
| 3 | DLC loader: load base + DLC packs, apply migrations in order. |
| 4 | Save format version: snapshot includes `contentPackVersions` for reproducibility. |

---

## Testing

- **Replay fixtures:** Golden traces use specific pack versions; migration must not change determinism for same seed + actions.
- **Regression:** Old snapshots load and produce same hash after migration.
- **New content:** DLC adds tests for new traits/skills; engine tests remain stable.
