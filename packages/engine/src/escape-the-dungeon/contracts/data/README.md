# Game data root

**This folder is the single place the game looks for data.** Build and bundle from here. Do not rely on `generated/` or `extracted/` for runtime content—those are **reference only** (do not update them for the game).

- **Schemas** for these packs live in **`../schemas/`** (e.g. `rarities.schema.json`, `spell-evolution.schema.json`). Each data file’s `$schema` points to `https://dungeonbreak.dev/schemas/<pack>.schema.json`; the actual schema files are in `contracts/schemas/`. See that folder’s README for the data ↔ schema map.
- For content added against the gameplay design checklist, see **README-content-generated.md**.

---

## Nomenclature (at a glance)

| Type | What it is | How to refer | Files |
|------|------------|--------------|--------|
| **Lookup** | Small tables of ids; one source of truth. Others reference by `*Id`. | Use `rarityId`, `archetypeId`, `effectId`, etc. Never duplicate the list. | `lookup_rarities.json`, `lookup_entity_types.json`, `lookup_occupations.json`, … |
| **Stat / trait** | Numeric or semantic axes (dialogue, room vectors, formulas). Keys are trait names. | Reference by **trait name** (e.g. `Comprehension`, `Survival`) in vectors and formulas. | `config_space_vectors.json` (trait axes), `content_room_templates.json` (feature → baseVector) |
| **Content** | Rows that reference lookups (and optionally stats). | Each row has `*Id` fields pointing at lookup packs. | `content_titles.json`, `content_spells.json`, `content_archetypes.json`, `content_items.json`, … |
| **Config** | System/balance/UI config; no id references or loose refs. | Load by key. | `config_presenter_strings.json`, `config_spell_progression.json`, `config_action_catalog.json`, … |

- **Lookup** = define once, reference everywhere via `*Id`.
- **Stat/trait** = axis name (string) used in vectors and formulas; defined in `space-vectors` and used in `room-templates` and content-source room baseVectors.
- **Content** = always references lookups; never inline enum values.
- **Nomenclature (prefixes):** `stat_combat_*` (combat-stats), `trait_narrative_*` (narrative-traits), `item_*` (items), `equip_slot_id` (items → equipment-slots). See STATS-INHERITANCE.md.

---

## Reuse and reference chain

| Pack | Referenced by (who uses its ids) |
|------|-----------------------------------|
| **rarities** | titles, items, spells, quests (`rarityId`) |
| **entity-types** | spawn-table, NPC defs, player (`entityTypeId`) |
| **occupations** | NPC defs (`occupationId`) |
| **party-roles** | NPC/player flavor (`partyRoleId`) |
| **spell-categories** | spells (`categoryId`) |
| **runes** | spells (`runeCombo`), spell-evolution (`runeCombo`) |
| **effects** | spells, spell-evolution (`effectIds`) |
| **combat-stats** | items, archetypes (combat_stat_modifiers: keys stat_combat_*) |
| **narrative-traits** | items, archetypes (narrative_trait_modifiers: keys trait_* = thematic basis vectors) |
| **equipment-slots** | items (`equip_slot_id`) |
| **archetypes** | titles (`archetypeId`), NPC optional |
| **spells** | titles (unlockCondition.spellId), spell-evolution (resultSpellId) |
| **mounts** | single mount, player starts with it; global action whistle to call/dismiss; state: mountSummoned |
| **room-templates** | dungeons/rooms (feature → template); uses **trait names** from space-vectors |
| **space-vectors** | room-templates (baseVector keys), content-source room baseVectors; defines **trait axes** |

Single source of truth: add a new rarity in `rarities.json` and reference it as `rarityId` everywhere; do not add a new rarity string anywhere else.

---

## File list by type

- **Lookup:** `lookup_rarities.json`, `lookup_entity_types.json`, `lookup_occupations.json`, … (see NAMING-CONVENTION.md)
- **Stat/trait:** `config_space_vectors.json` (trait axes), `content_room_templates.json` (room feature → trait vector)
- **Content:** `content_titles.json`, `content_spells.json`, `content_archetypes.json`, `content_items.json`, `content_dungeons.json`, … , `content_rooms.json`
- **Config:** `config_presenter_strings.json`, `config_game_stats.json`, `config_spell_progression.json`, … , `config_content_schema.json`
- **Doc:** `STATS-INHERITANCE.md` — what inherits what (entity base + archetype/title/items modifiers); nomenclature (stat_combat_*, trait_*).
- **Doc:** `NAMING-CONVENTION.md` — file names (lookup_*, content_*, config_*) and id prefixes so we can read at a glance.

---

## Schema and content reuse

- **Schema:** Lookup packs use a consistent shape: array of `{ "<idField>": string, ... }` (e.g. `rarityId`, `effectId`). Content packs reference them by that id field. Shared schema fragments (e.g. `RarityId`, `EffectIds`) in a single schema and reuse via `$ref` to keep one definition.
- **Content:** Reuse = reference by id. No duplicate lists (e.g. use `rarityId: "common"` and one lookup_rarities.json). Stats/traits reuse = same trait name string across config_space_vectors, content_room_templates, and any formula/dialogue config.
