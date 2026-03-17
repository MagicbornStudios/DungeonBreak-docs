# Generated / authored content (gameplay design alignment)

Content added or extended to align with `.planning/GAMEPLAY-DESIGN.xml` and checklist.

## New files (reference by id in other content)

| File | Contents | Referenced by |
|------|----------|---------------|
| **rarities.json** | common, uncommon, rare, legendary | titles, items, spells, quests (`rarityId`) |
| **entity-types.json** | 21 types: human, werewolf, goblin, slime, orc, skeleton, bat, spider, ghost, dragon, elemental_fire, troll, wraith, imp, serpent, beast, crow, rat, mimic, knight, summon | spawn table, NPC defs, player |
| **occupations.json** | dungeoneer, merchant, boss | NPC defs (`occupationId`) |
| **party-roles.json** | jack_of_all_trades, tank, healer, scout, face | NPC/player flavor (`partyRoleId`) |
| **titles.json** | 31 titles + unlockPredicateTypes (castSpell, evolveSpell, reachDepth, searchCount, winCombat, restCount, roomsDiscovered, fleeCount, talkToNpc, fameReached, bossDefeated). spellIds in predicates reference spells.json. | player equipped title; unlock evaluation |
| **runes.json** | **26 runes** (rune_a–rune_z: Flame, Flow, Stone, Breeze, Spark, Shade, Heart, Edge, Vine, Fang, Shell, Crag, Frost, Mind, Fist, Wisp, Scale, Pulse, Ember, Tide, Root, Gale, Storm, Void, Gleam, Forge) | spells (`runeCombo`), evolution |
| **spells.json** | **44 spells**: 8 conversation, 4 transportation, 3 detection/exploration, 29 combat; all have categoryId + rarityId | spellbook, evolution, title unlock |
| **spell-categories.json** | conversation, transportation, exploration, combat, crafting, detection | spells (categoryId) |
| **spell-progression.json** | levelUp (useCount → level 1–5), evolution conditions (minLevel, minAffinityPerRune) | spells, spell-evolution |
| **rune-affinity.json** | Gain per cast per rune, cap, evolution minAffinityPerRune, spell power bonus formula at forge | rune forge, evolution table |
| **effects.json** | Effect definitions: status (burn, paralyze, slow, poison, confuse), dialogue (unlock_*), environmental (haste, teleport, reveal, light, scout) | spells, spell-evolution (effectIds) |
| **world-map.json** | World **Dungeonbreak** (worldId: dungeonbreak). Regions: 12 hub regions (Emberfall, Frostmere, Ashford, Verdant Hollow, Ironweald, Sundermarch, Blackmarsh, Cinderwick, Graveheath, Pale Reach, Stormholm) + dungeon-floors + transition + dungeon_region. Every hub has town (with districts), wilderness, outskirts; dungeon entrances in wilderness or outskirts. structure: townCount, districtCount, wildernessZoneCount, outskirtsZoneCount, dungeonEntranceCount. | navigation, map menu, level-browser payload |
| **presenter-strings.json** | actionGroupTitles, systemActionLabels, initialFeed, templates, defaults | presenter/codegen (no hardcoded UI text) |

## Updated files

| File | Change |
|------|--------|
| **archetypes.json** | **27 archetypes**: original 8 (wanderer, delver, warden, hunter, tactician, showrunner, sweet_talker, forgemaster) + paladin, berserker, scout, healer, face, shadow, alchemist, sentinel, blademaster, pyromancer, frostmage, stormcaller, shadowdancer, runekeeper, diplomat, brawler, trickster, zealot, wayfinder. |
| **items.json** | Added `mana_crystal`, `golden_mana_crystal`; items can use `rarityId`. |
| **quests.json** | Added `questKind` (main | side), `rarityId` per quest. |

## Existing (unchanged)

- **skills.json** — existing skill tree (branch, vectorProfile); coexists with **spells.json** (rune-based).
- **spell-evolution.json** — rune combo → result (resultSpellId, minLevel, minAffinityPerRune); includes utility evolutions (haste→swift_step, teleport→floor recall). Evolution conditions use rune-affinity.json.
- **spawn-table.json** — uses `archetypeId` (hunter, warden); can later add `entityTypeId` if spawn is by entity type.
- **dungeons.json** — room blueprints; already has rooms and structure.

## Wiring

These files live in `contracts/data/`. The main **content-source.json** (or the bundle build) may need to be updated to include or merge:

- rarities, entityTypes, occupations, partyRoles, titles, runes, spells, spellCategories, spellProgression, runeAffinity, effects, spellEvolution, worldMap (regions), presenterStrings

until the content-source schema and build script accept these packs. Use this README as the checklist for what to plug in when implementing.
