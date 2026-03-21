# File and ID naming convention

Use this to quickly tell what a file or id represents.

## Contract ownership

- The canonical published pack surface is `../index.ts` via `CONTENT_PACK_REGISTRY`.
- `../source/content-source.json` is the source of truth for source-derived packs.
- Files in this folder can be direct-authored packs, generated runtime packs, or auxiliary/reference assets.

## Data file naming

Pattern: `<type>_<name>.json`

| Prefix | Meaning | Examples |
| --- | --- | --- |
| `lookup_` | Shared id tables | `lookup_runes.json`, `lookup_effects.json`, `lookup_occupations.json` |
| `content_` | Authored content packs | `content_spells.json`, `content_items.json`, `content_dungeons.json` |
| `config_` | Runtime or balance config | `config_game_stats.json`, `config_spell_progression.json`, `config_spell_forge_costs.json` |

## Current room-structure note

- `content_room_templates.json` is the live runtime room-template pack.
- `content_dungeons.json` is the live runtime dungeon-layout pack.
- `content_rooms.json` remains a room-catalog/reference asset, but it is not currently the canonical room-runtime pack.

## ID naming

| Prefix | Meaning | Examples |
| --- | --- | --- |
| `stat_combat_` | Authored combat-stat ids | `stat_combat_might`, `stat_combat_max_hp` |
| `trait_` | Authored narrative-stat ids | `trait_Comprehension`, `trait_Fame` |
| `item_` | Item ids | `item_excalibur`, `item_warded_armor` |
| `effect_` | Effect ids | `effect_burn`, `effect_paralyze` |

Runtime entity maps use plain stat keys such as `might`, `maxHp`, `currentMana`, `Slashing`, and `Fame`. The authored pack ids stay in content; the engine maps them to runtime keys.

## Rule of thumb

- If gameplay code needs a pack as a first-class contract, add or update its export in `../index.ts`.
- Do not treat a raw directory scan of `contracts/data` as the canonical runtime/editor pack list.
