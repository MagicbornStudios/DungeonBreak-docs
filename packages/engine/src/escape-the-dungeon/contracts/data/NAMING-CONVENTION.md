# File and ID naming convention

Use this so we can quickly read a file or id and know what it is.

**Stat and behaviour definitions** (combat stats, narrative/progression stats, rune affinity, currency, room features) are in **STAT-AND-BEHAVIOUR-TAXONOMY.md** in this directory. That doc is the single source of truth; reference it for what each stat category means and how it maps to engine and content.

---

## Schema ownership

**Schemas are defined in the bundle/content pack** (`content-source.schema.json`, `content-pack-bundle.schema.json`). Pack shapes (RoomTemplates, ItemPack, etc.) live there. **Game assets** (data JSON files in `contracts/data/`) are authored against those schemas and reference them via `$schema`: `https://dungeonbreak.dev/schemas/<pack>.schema.json`. Standalone pack schemas in `contracts/schemas/` (e.g. `room-templates.schema.json`, `rarities.schema.json`) mirror or extend those definitions so individual files can be validated. One game = one content-source; data files fill the packs and follow the naming below.

---

## Data files (`contracts/data/`)

**Pattern:** `<type>_<name>.json` with **snake_case** after the prefix.

| Prefix / pattern | Meaning | Examples |
|------------------|---------|----------|
| **lookup_** | Small id tables; one source of truth. Others reference by id. | lookup_rarities.json, lookup_combat_stats.json, lookup_narrative_traits.json, lookup_equipment_slots.json, lookup_runes.json, lookup_effects.json |
| **content_** | Rows that reference lookups (spells, items, dungeons, rooms, etc.). | content_spells.json, content_items.json, content_titles.json, content_spawn_table.json, content_mounts.json, content_rooms.json, content_room_templates.json |
| **config_** | System/balance/UI config; no id references for game content. | config_spell_progression.json, config_rune_affinity.json, config_spell_forge_costs.json, config_presenter_strings.json |

**Room-templates vs rooms:** Both exist. **room-templates** = feature → baseVector (minimal template for dungeon gen); pack key `roomTemplates`, file `content_room_templates.json`. **rooms** = full room types (roomId, name, feature, description, baseVector); file `content_rooms.json`. Templates feed generators; rooms are content for a specific game/world.

---

## Schema files (`contracts/schemas/`)

**Pattern:** `<pack>.schema.json`. Data files use `$schema`: `https://dungeonbreak.dev/schemas/<pack>.schema.json` (pack = logical name, e.g. `rarities`, `room-templates`). Schema file name can match pack (rarities.schema.json) so URLs stay stable.

**Data file → schema:** Data file name uses convention (lookup_*, content_*, config_*); `$schema` inside the file points to the pack schema by logical name (unchanged after file rename).

---

## IDs inside files (at a glance)

| Prefix | Pack | Example |
|--------|------|---------|
| **stat_combat_** | combat-stats | stat_combat_might, stat_combat_max_hp |
| **trait_** | narrative-traits (thematic basis vectors) | trait_Comprehension, trait_Empathy, trait_Survival |
| **item_** | items | item_excalibur, item_warded_armor |
| **slot_** | equipment-slots (optional; current slotIds are weapon, armor, accessory) | slot_weapon or just weapon |
| **rarity_** | rarities (optional) | common, uncommon, rare, legendary |
| **effect_** | effects | effect_burn, unlock_dialogue_charm |

Narrative/progression stat names and combat stat ids are defined in **STAT-AND-BEHAVIOUR-TAXONOMY.md**. Narrative stats use traitId = `trait_` + name (e.g. trait_Fame, trait_Comprehension); combat stats use `stat_combat_*`.

---

## Summary

- **Stat and behaviour taxonomy:** STAT-AND-BEHAVIOUR-TAXONOMY.md (this directory).
- **Files:** lookup_*, content_*, config_*. Schemas defined in bundle/content pack; assets reference them via `$schema`.
- **Combat stats:** stat_combat_* (see taxonomy).
- **Narrative/progression stats:** trait_<Name> (see taxonomy; one named set).
- **Items:** item_*.
- One source of truth per lookup; reference by id everywhere.

---

## File mapping (convention)

| New name | Old name |
|----------|----------|
| lookup_rarities.json | rarities.json |
| lookup_entity_types.json | entity-types.json |
| lookup_occupations.json | occupations.json |
| lookup_party_roles.json | party-roles.json |
| lookup_spell_categories.json | spell-categories.json |
| lookup_runes.json | runes.json |
| lookup_effects.json | effects.json |
| lookup_equipment_slots.json | equipment-slots.json |
| lookup_combat_stats.json | combat-stats.json |
| lookup_narrative_traits.json | narrative-traits.json |
| content_titles.json | titles.json |
| content_spells.json | spells.json |
| content_archetypes.json | archetypes.json |
| content_items.json | items.json |
| content_quests.json | quests.json |
| content_world_map.json | world-map.json |
| content_dungeons.json | dungeons.json |
| content_spell_evolution.json | spell-evolution.json |
| content_spawn_table.json | spawn-table.json |
| content_mounts.json | mounts.json |
| content_cutscenes.json | cutscenes.json |
| content_events.json | events.json |
| content_dialogue.json | dialogue (flat pack: entries with optional sceneId grouping) |
| content_guides.json | guides.json |
| content_rooms.json | rooms.json |
| content_room_templates.json | room-templates.json |
| content_skills.json | skills.json |
| config_presenter_strings.json | presenter-strings.json |
| config_game_stats.json | game-stats.json |
| config_spell_progression.json | spell-progression.json |
| config_rune_affinity.json | rune-affinity.json |
| config_spell_forge_costs.json | spell-forge-costs.json |
| config_action_catalog.json | action-catalog.json |
| config_action_formulas.json | action-formulas.json |
| config_action_policies.json | action-policies.json |
| config_action_intents.json | action-intents.json |
| config_content_schema.json | content-schema.json |
| config_space_vectors.json | space-vectors.json |
