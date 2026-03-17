# Game pack schemas

**This folder is the canonical location for JSON schemas that validate game data.** Data lives in `../data/`; each pack’s `$schema` points to `https://dungeonbreak.dev/schemas/<pack>.schema.json`. Tooling and IDEs can resolve these to the files in this directory.

Aligned with **gameplay design** (`.planning/GAMEPLAY-DESIGN.xml`). We keep building content and schemas here.

---

## Data ↔ schema mapping

Data files use naming convention `lookup_*`, `content_*`, `config_*` (see `../data/NAMING-CONVENTION.md`). Each file’s `$schema` points to the pack schema by logical name (e.g. `rarities.schema.json`).

| Data file (`../data/`) | Schema (this folder) | Pack type |
|------------------------|----------------------|-----------|
| `lookup_rarities.json` | `rarities.schema.json` | Lookup |
| `lookup_entity_types.json` | `entity-types.schema.json` | Lookup |
| `lookup_occupations.json` | `occupations.schema.json` | Lookup |
| `lookup_party_roles.json` | `party-roles.schema.json` | Lookup |
| `lookup_spell_categories.json` | `spell-categories.schema.json` | Lookup |
| `lookup_runes.json` | `runes.schema.json` | Lookup |
| `lookup_effects.json` | `effects.schema.json` | Lookup |
| `lookup_combat_stats.json` | `combat-stats.schema.json` | Lookup |
| `lookup_narrative_traits.json` | `narrative-traits.schema.json` | Lookup |
| `lookup_equipment_slots.json` | `equipment-slots.schema.json` | Lookup |
| `content_spell_evolution.json` | `spell-evolution.schema.json` | Content |
| `content_spawn_table.json` | `spawn-table.schema.json` | Content |
| `content_mounts.json` | `mounts.schema.json` | Content |
| `content_items.json` | `items.schema.json` | Content |
| `content_titles.json` | `titles.schema.json` | Content |
| `content_spells.json` | `spells.schema.json` | Content |
| `content_world_map.json` | `world-map.schema.json` | Content |
| `content_dungeons.json` | `dungeons.schema.json` | Content |
| `content_rooms.json` | `rooms.schema.json` | Content |
| `content_room_templates.json` | `room-templates.schema.json` | Content |
| `content_guides.json` | `guides.schema.json` | Content |
| `content_quests.json` | `quests.schema.json` | Content |
| `content_archetypes.json` | `archetypes.schema.json` | Content |
| `content_skills.json` | `skills.schema.json` | Content |
| `content_cutscenes.json` | `cutscenes.schema.json` | Content |
| `content_events.json` | `events.schema.json` | Content |
| `content_dialogue.json` | `dialogue.schema.json` | Content |
| `config_presenter_strings.json` | `presenter-strings.schema.json` | Config |
| `config_spell_progression.json` | `spell-progression.schema.json` | Config |
| `config_rune_affinity.json` | `rune-affinity.schema.json` | Config |
| `config_spell_forge_costs.json` | `spell-forge-costs.schema.json` | Config |
| `config_action_catalog.json` | `action-catalog.schema.json` | Config |
| `config_action_formulas.json` | `action-formulas.schema.json` | Config |
| `config_action_policies.json` | `action-policies.schema.json` | Config |
| `config_action_intents.json` | `action-intents.schema.json` | Config |
| `config_game_stats.json` | `game-stats.schema.json` | Config |
| `config_content_schema.json` | `content-packs.schema.json` | — |
| `config_space_vectors.json` | `space-vectors.schema.json` | Config |

**Naming:** `<pack>.schema.json` so data can set `"$schema": "https://dungeonbreak.dev/schemas/<pack>.schema.json"`.

---

## Where schemas live

- **This folder (`contracts/schemas/`):** All game data pack schemas. Add new schemas here as you add or lock new packs.
- **`.planning/schemas/`:** No longer the home for game pack schemas. `spawn-table-schema.json` and `spell-evolution-schema.json` were moved here and renamed to `spawn-table.schema.json` and `spell-evolution.schema.json`. Planning docs can still reference schema *decisions*; the actual schema files for the game live in `contracts/schemas/`.
- **Bundles:** `content-source.schema.json`, `content-packs.schema.json`, `content-pack-bundle.schema.json` in this folder define the merged/bundle shape consumed by the engine.

---

## Definitions

**Definitions** are named, reusable types in JSON Schema. The root of `content-source.schema.json` is `"$ref": "#/definitions/ContentSource"`; that and every nested type (ItemPack, ItemPackItem, Room, RoomItem, etc.) live under `definitions`. So each shape is defined once and referenced with `$ref` instead of inlining.

**Shared primitives:** **content-common.schema.json** defines Vector, VectorDelta, VisualReference, Vec3, and Transform. Pack schemas (content-source, content-pack-bundle) define pack shapes locally and use these primitives. See **[SCHEMA-AUTHORING.md](SCHEMA-AUTHORING.md)** for the authoring standard (game-owned pack shapes, editor schema-agnostic, lookup ids).

---

## Adding a new pack

1. Add `../data/<type>_<name>.json` (lookup_*, content_*, or config_*) with `"$schema": "https://dungeonbreak.dev/schemas/<pack>.schema.json"`.
2. Add `./<pack>.schema.json` in this folder with `$id` matching that URL.
3. Update this README’s mapping table.
4. Reference the new pack’s ids from other packs via `*Id` (lookup) or as needed (content).
