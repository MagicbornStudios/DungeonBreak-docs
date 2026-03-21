# Game data root

This folder holds the JSON files the engine imports or materializes for runtime use.

Important distinction:

- The canonical published contract surface is `../index.ts` via generated `CONTENT_PACK_REGISTRY`.
- Some files here are authored directly.
- Some files here are generated from `../source/content-source.json`.
- `generated/` and `extracted/` are reference outputs, not gameplay source.

## Current workflow

1. Author direct lookup/config/content files here when they are standalone packs.
2. Author source-derived packs in `../source/content-source.json`.
3. Run the content generation scripts to materialize source-derived runtime JSON back into this folder.
4. Consume packs through `../index.ts`, not by ad hoc directory scanning.

## File types

| Prefix | Meaning | Examples |
| --- | --- | --- |
| `lookup_` | Lookup tables referenced by id | `lookup_runes.json`, `lookup_effects.json`, `lookup_equipment_slots.json` |
| `content_` | Authored content rows and content packs | `content_spells.json`, `content_items.json`, `content_dungeons.json` |
| `config_` | Balance/runtime/presentation config | `config_game_stats.json`, `config_spell_progression.json`, `config_spell_forge_costs.json` |

## Canonical notes

- Source-derived runtime packs currently include action catalog/intents/policies/contracts, room templates, dungeon layouts, items, skills, archetypes, dialogue, cutscenes, quests, and events.
- Direct runtime packs currently include combat stats, skill stats, narrative stats, effects, equipment slots, occupations, party roles, game stats, guides, rarities, rune affinity, runes, spell categories, spell evolutions, spell forge costs, spells, spawn table, titles, mounts, and world map.
- Presenter/feed text now lives inside `content_dialogue.json` as `presenterStrings`; it is not a separate config pack anymore.
- `config_space_vectors.json` is still generated for internal semantic/runtime consumers, but it is not a canonical editor-facing pack in the registry.
- `content_rooms.json` is still useful as a room-catalog/reference asset, but the live runtime and bundle path currently treat `content_room_templates.json` plus `content_dungeons.json` as the canonical room-structure packs.

## Conventions

- Use lookup ids everywhere instead of duplicating labels in content rows.
- Runtime entity stats use plain keys on the entity model; lookup ids stay in authored content.
- If a pack should be first-class for runtime or the content editor, add/update the contract source or direct data file and then regenerate the registry artifacts; do not hand-edit registry rows in `../index.ts`.

See also:

- `../schemas/README.md`
- `NAMING-CONVENTION.md`
- `STAT-AND-BEHAVIOUR-TAXONOMY.md`
