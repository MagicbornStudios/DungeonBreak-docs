# Game pack schemas

This folder holds the JSON Schemas for the game contract files in `../data/`.

Important distinction:

- The published runtime/editor contract surface is `../index.ts` via generated `CONTENT_PACK_REGISTRY`.
- Some JSON files in `../data/` are authored directly.
- Some JSON files in `../data/` are materialized from `../source/content-source.json`.
- A small number of files are still auxiliary/reference assets and are not first-class runtime packs.

## Data to schema mapping

| Data file (`../data/`) | Schema (`./`) | Type |
| --- | --- | --- |
| `lookup_rarities.json` | `rarities.schema.json` | Lookup |
| `lookup_entity_types.json` | `entity-types.schema.json` | Lookup |
| `lookup_occupations.json` | `occupations.schema.json` | Lookup |
| `lookup_party_roles.json` | `party-roles.schema.json` | Lookup |
| `lookup_spell_categories.json` | `spell-categories.schema.json` | Lookup |
| `lookup_runes.json` | `runes.schema.json` | Lookup |
| `lookup_effects.json` | `effects.schema.json` | Lookup |
| `lookup_combat_stats.json` | `combat-stats.schema.json` | Lookup |
| `lookup_skill_stats.json` | `skill-stats.schema.json` | Lookup |
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
| `content_dialogue.json` | `dialogue.schema.json` | Content, including `presenterStrings` |
| `config_spell_progression.json` | `spell-progression.schema.json` | Config |
| `config_spell_forge_costs.json` | `spell-forge-costs.schema.json` | Config |
| `config_rune_affinity.json` | `rune-affinity.schema.json` | Config |
| `config_action_catalog.json` | `action-catalog.schema.json` | Config |
| `config_action_formulas.json` | `action-formulas.schema.json` | Config |
| `config_action_policies.json` | `action-policies.schema.json` | Config |
| `config_action_intents.json` | `action-intents.schema.json` | Config |
| `config_game_stats.json` | `game-stats.schema.json` | Config |
| `config_content_schema.json` | `content-packs.schema.json` | Generated config |
| `config_space_vectors.json` | `space-vectors.schema.json` | Generated internal semantic config |

## Bundle and merged-document schemas

- `content-source.schema.json`
- `content-packs.schema.json`
- `content-pack-bundle.schema.json`
- `content-common.schema.json`

These define the merged source and bundle shapes used by the engine and content pipeline.

## Current canonical note

`content_rooms.json` still has a real schema and remains useful as a room-catalog/reference asset, but the live runtime and bundle path currently use `roomTemplates` plus `dungeonLayouts` as the canonical room-structure packs.

## Adding or changing a pack

1. Add or update the data file under `../data/`.
2. Add or update the matching schema here.
3. If the pack should be first-class at runtime or in the editor, update the contract source/data and regenerate the registry artifacts; do not hand-maintain `CONTENT_PACK_REGISTRY` rows in `../index.ts`.
4. If the pack is derived from `content-source.json`, also update the source document and any generation scripts that materialize it into `../data/`.
