# GAME_STRUCTURE

This is a one-off review document for the current `DungeonBreak-docs` repo structure, with emphasis on:

- where the engine’s static data lives
- how that data is generated, exported, bundled, and consumed
- which folders/files matter for gameplay systems
- where the gameplay design maps cleanly to code
- where the implementation or README is still behind the design

---

## Short Answer

Yes: there is a clear place for game data, but there are three layers to understand.

1. Authoring source:
  `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`
2. Direct-authored runtime pack files:
  `packages/engine/src/escape-the-dungeon/contracts/data/`
3. Canonical runtime/editor access layer:
  `packages/engine/src/escape-the-dungeon/contracts/index.ts`

The build scripts materialize source-derived packs out of `content-source.json` into `contracts/data`, direct-authored packs also live in `contracts/data`, and the runtime/editor consume the normalized access layer from `contracts/index.ts`. The pack registry itself is now generated in TS/C++/C# artifacts; it is not supposed to be hand-maintained inside `contracts/index.ts`. The engine package then re-exports the public canonical surfaces from `packages/engine/src/index.ts`.

The current README barely explains this. It tells you how to run the repo, but not how content actually reaches the game.

---

**1. Repo Map**

## 1. Repo Map

### Top-level areas that matter for the game


| Area                            | Purpose                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `README.md`                     | Very high-level repo usage. Good for booting, weak for architecture.                  |
| `.planning/GAMEPLAY-DESIGN.xml` | Product/design source of truth for how the game is supposed to play.                  |
| `packages/engine`               | Deterministic gameplay/runtime package. This is where the game rules live.            |
| `packages/kaplay-demo`          | Standalone KAPLAY implementation and current human-playable shell.                    |
| `docs-site`                     | Next.js docs site and browser-hosted build target for `/play` and public game assets. |
| `vendor/pokesprite`             | Vendored placeholder/icon sprite source used by KAPLAY UI.                            |


### Engine subfolders that matter


| Folder                                                       | Purpose                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `packages/engine/src/escape-the-dungeon/engine`              | Main runtime implementation, especially `game.ts`.               |
| `packages/engine/src/escape-the-dungeon/contracts/source`    | Canonical authored merged source document.                       |
| `packages/engine/src/escape-the-dungeon/contracts/data`      | Runtime JSON packs the engine imports directly.                  |
| `packages/engine/src/escape-the-dungeon/contracts/schemas`   | JSON Schemas for the packs.                                      |
| `packages/engine/src/escape-the-dungeon/contracts/generated` | Generated codecs/types for TS/C++/C#. Not hand-authored content. |
| `ages/engine/src/escape-the-dungeon/world`                   | Dungeon/world construction and room graph logic.                 |
| `packages/engine/src/escape-the-dungeon/narrative`           | `pack`Dialogue, archetypes, deeds, skills.                      |
| `packages/engine/scripts`                                    | Content generation and bundle build scripts.                     |


### KAPLAY subfolders that matter


| Folder/File                                        | Purpose                                                      |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `packages/kaplay-demo/src/main.ts`                 | Boot, optional content-pack loading, scene wiring.           |
| `packages/kaplay-demo/src/navigation-scene.ts`     | Primary in-dungeon shell.                                    |
| `packages/kaplay-demo/src/navigation-overlay.ts`   | Bag / spellbook / overlay menus inside the new shell.        |
| `packages/kaplay-demo/src/rune-forge-scene.ts`     | Rune forge implementation.                                   |
| `packages/kaplay-demo/scripts/build-standalone.ts` | Bundles KAPLAY and copies output to `docs-site/public/game`. |




---

**2. Static Data Flow**

## 2. Static Data Flow

### The real data pipeline

```text
content-source.json
  -> generate-contract-source-assets.mjs
  -> contracts/data/*.json
  -> contracts/index.ts exports normalized packs
  -> engine/game.ts, world/map.ts, narrative/*.ts consume packs
  -> build-content-pack-bundle.mjs emits content-pack.bundle.v1.json
  -> kaplay-demo/main.ts can fetch and verify bundle
  -> build-standalone.ts copies built assets to docs-site/public/game
```

### Canonical authoring source

Primary authored source document:

- `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`

This contains:

- `contentSchema`
- `vectorRuntime`
- `packs`

Important distinction:

- `packs` are the canonical/editorial game packs.
- `vectorRuntime` is still an internal semantic-runtime source section used by spatial/semantic tooling.
- `vectorRuntime` should not be treated as a first-class gameplay/content-editor pack.

The script at:

- `packages/engine/scripts/generate-contract-source-assets.mjs`

reads that file and writes runtime pack JSON into:

- `packages/engine/src/escape-the-dungeon/contracts/data/`

That script currently materializes at least:

- `config_action_catalog.json`
- `config_action_intents.json`
- `config_action_policies.json`
- `config_action_formulas.json`
- `content_room_templates.json`
- `content_items.json`
- `content_skills.json`
- `content_archetypes.json`
- `content_dialogue.json`
- `content_cutscenes.json`
- `content_quests.json`
- `content_events.json`
- `content_dungeons.json`
- plus generated `config_content_schema.json`
- plus generated `config_space_vectors.json` for internal semantic runtime consumers

### Runtime data root

Per the engine’s own docs, the runtime data root is:

- `packages/engine/src/escape-the-dungeon/contracts/data/`

That folder is where the engine keeps runtime JSON pack files, but the canonical published pack list is generated `CONTENT_PACK_REGISTRY` in `contracts/index.ts`, not a raw folder scan.

Important nuance:

- It is the runtime data root.
- It is not the only authoring source.
- Some of it is generated from `contracts/source/content-source.json`.
- Some packs are also directly authored there as standalone JSON files.

### Runtime export layer

`packages/engine/src/escape-the-dungeon/contracts/index.ts` imports:

- direct data packs from `contracts/data/*.json`
- the canonical merged source from `contracts/source/content-source.json`
- generated codecs from `contracts/generated/*`

It then exports normalized runtime constants like:

- `GAME_STATS`
- `RUNE_PACK`
- `SPELL_PACK`
- `SPELL_EVOLUTION_PACK`
- `ITEM_PACK`
- `ROOM_TEMPLATES`
- `DIALOGUE_PACK`
- `CUTSCENE_PACK`
- `WORLD_MAP_PACK`
- `CONTENT_SOURCE_DOCUMENT`
- `CONTENT_SCHEMA_DOCUMENT`
- `CONTENT_PACK_REGISTRY`
- `decodeContentPackBundle()`
- `decodeContentSourceDocument()`

Those are then re-exported again from:

- `packages/engine/src/index.ts`

This is the public API layer for consumers.

The content editor should treat `CONTENT_PACK_REGISTRY` as the canonical list of editorial pack identities, source paths, runtime exports, and top-level collection counts instead of reconstructing that list from raw directory scans.
It should not import internal semantic-runtime artifacts like `spaceVectors` as if they were gameplay packs.

### Bundle build layer

`packages/engine/scripts/build-content-pack-bundle.mjs`:

- regenerates pack assets
- reads `contracts/data/*.json`
- also includes `contracts/source/content-source.json`
- hashes the packs
- writes `content-pack.bundle.v1.json`

This is the bundle that KAPLAY and tooling can load/verify.



---

**3. Where Specific Static Data Lives**

## 3. Where Specific Static Data Lives

### Core gameplay/balance/config


| Data                            | File                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| game stats                      | `packages/engine/src/escape-the-dungeon/contracts/data/config_game_stats.json`                                                                  |
| presenter/feed strings          | `packages/engine/src/escape-the-dungeon/contracts/data/content_dialogue.json` under `presenterStrings`                                          |
| rune affinity rules             | `packages/engine/src/escape-the-dungeon/contracts/data/config_rune_affinity.json`                                                               |
| spell forge costs               | `packages/engine/src/escape-the-dungeon/contracts/data/config_spell_forge_costs.json`                                                           |
| spell progression               | `packages/engine/src/escape-the-dungeon/contracts/data/config_spell_progression.json`                                                           |
| action formulas                 | `packages/engine/src/escape-the-dungeon/contracts/data/config_action_formulas.json`                                                             |
| action intents/policies/catalog | `packages/engine/src/escape-the-dungeon/contracts/data/config_action_intents.json`, `config_action_policies.json`, `config_action_catalog.json` |


### Spells / rune forge / combat-adjacent authored content


| Data             | File                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| runes            | `packages/engine/src/escape-the-dungeon/contracts/data/lookup_runes.json`            |
| spell categories | `packages/engine/src/escape-the-dungeon/contracts/data/lookup_spell_categories.json` |
| spells           | `packages/engine/src/escape-the-dungeon/contracts/data/content_spells.json`          |
| spell evolutions | `packages/engine/src/escape-the-dungeon/contracts/data/content_spell_evolution.json` |
| effects          | `packages/engine/src/escape-the-dungeon/contracts/data/lookup_effects.json`          |


### Navigation / rooms / dungeon structure


| Data            | File                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| room templates  | `packages/engine/src/escape-the-dungeon/contracts/data/content_room_templates.json` |
| rooms           | `packages/engine/src/escape-the-dungeon/contracts/data/content_rooms.json`          |
| dungeon layouts | `packages/engine/src/escape-the-dungeon/contracts/data/content_dungeons.json`       |
| world map       | `packages/engine/src/escape-the-dungeon/contracts/data/content_world_map.json`      |

Current canonical note:
  The live runtime/bundle path uses `content_room_templates.json` plus `content_dungeons.json` as the canonical room-structure packs. `content_rooms.json` still exists as a room-catalog/reference asset, but it is not currently a first-class runtime pack in `CONTENT_PACK_REGISTRY`.


### Entities / items / progression / narrative


| Data       | File                                                                            |
| ---------- | ------------------------------------------------------------------------------- |
| items      | `packages/engine/src/escape-the-dungeon/contracts/data/content_items.json`      |
| skills     | `packages/engine/src/escape-the-dungeon/contracts/data/content_skills.json`     |
| archetypes | `packages/engine/src/escape-the-dungeon/contracts/data/content_archetypes.json` |
| titles     | `packages/engine/src/escape-the-dungeon/contracts/data/content_titles.json`     |
| quests     | `packages/engine/src/escape-the-dungeon/contracts/data/content_quests.json`     |
| dialogue   | `packages/engine/src/escape-the-dungeon/contracts/data/content_dialogue.json`   |
| cutscenes  | `packages/engine/src/escape-the-dungeon/contracts/data/content_cutscenes.json`  |
| events     | `packages/engine/src/escape-the-dungeon/contracts/data/content_events.json`     |
| guides     | `packages/engine/src/escape-the-dungeon/contracts/data/content_guides.json`     |
| mounts     | `packages/engine/src/escape-the-dungeon/contracts/data/content_mounts.json`     |


### Lookup/reference packs

Lookups live under:

- `packages/engine/src/escape-the-dungeon/contracts/data/lookup_*.json`

Examples:

- `lookup_rarities.json`
- `lookup_entity_types.json`
- `lookup_occupations.json`
- `lookup_party_roles.json`
- `lookup_combat_stats.json`
- `lookup_narrative_traits.json`
- `lookup_equipment_slots.json`



---

**4. Which Code Actually Uses the Data**

## 4. Which Code Actually Uses the Data

### Engine runtime

Main runtime consumer:

- `packages/engine/src/escape-the-dungeon/engine/game.ts`

Examples of pack usage:

- `SPELL_PACK` for authored spells
- `SPELL_EVOLUTION_PACK` for rune-forge evolution rules
- `ITEM_PACK` for inventory/shop/equipment
- `ACTION_CONTRACTS` / intents / policies for action behavior and UI metadata
- `GAME_STATS` for slot counts and defaults
- `RUNE_AFFINITY_PACK` for rune growth and forge behavior

Other direct consumers:


| System                | Main files                                                                          |
| --------------------- | ----------------------------------------------------------------------------------- |
| world/dungeon build   | `packages/engine/src/escape-the-dungeon/world/map.ts`                               |
| dialogue              | `packages/engine/src/escape-the-dungeon/narrative/dialogue.ts`                      |
| skills                | `packages/engine/src/escape-the-dungeon/narrative/skills.ts`                        |
| archetypes            | `packages/engine/src/escape-the-dungeon/narrative/archetypes.ts`                    |
| UI grouping/presenter | `packages/engine/src/escape-the-dungeon/ui/presenter.ts`, `ui/presenter-content.ts` |


### KAPLAY runtime

KAPLAY uses engine exports and sometimes reads contracts directly for display helpers.

Important files:


| File                                             | Role                                                    |
| ------------------------------------------------ | ------------------------------------------------------- |
| `packages/kaplay-demo/src/main.ts`               | boot, optional bundle fetch, parity verification        |
| `packages/kaplay-demo/src/content-visuals.ts`    | maps authored content visual refs to sprites            |
| `packages/kaplay-demo/src/spellbook-content.ts`  | builds codex/pool entries from spell packs              |
| `packages/kaplay-demo/src/rune-forge-content.ts` | builds forge previews from spell/rune/evolution packs   |
| `packages/kaplay-demo/src/navigation-overlay.ts` | overlay UI that reads engine state and content metadata |


### Docs-site/browser hosting

The KAPLAY build is copied to:

- `docs-site/public/game/`

by:

- `packages/kaplay-demo/scripts/build-standalone.ts`

That script also builds:

- `content-pack.bundle.v1.json`

so the browser-facing game has the pack bundle next to the standalone build.



---

**5. How The Browser Game Takes In Static Data**

## 5. How The Browser Game Takes In Static Data

### Default mode

By default, the KAPLAY build is bundled with the local engine package and the current generated pack data.

That means:

- imports resolve from `@dungeonbreak/engine`
- the engine package already includes the runtime exports from `contracts/index.ts`
- the build script also emits a public `content-pack.bundle.v1.json`

### Optional content-pack loading

`packages/kaplay-demo/src/main.ts` supports:

- `?contentPackUrl=...`
- `?contentPackStrict=1`

The flow is:

1. Fetch pack bundle
2. Decode it with `decodeContentPackBundle()`
3. Compare hashes against the runtime pack hashes
4. Optionally fail in strict mode
5. Apply visual overrides where supported

Important caveat:

- The current KAPLAY boot path does not fully swap the entire gameplay runtime over to remote content.
- It verifies parity and applies content visual overrides.
- The core engine logic still comes from the linked local engine package build.

So the current static-data story is:

- local engine pack exports are primary
- content-pack bundle is a parity/packaging layer
- remote bundle override support is partial, not a full hot-swappable runtime-content system



---

**6. Gameplay Design → Implementation Map**

## 6. Gameplay Design → Implementation Map

This section maps the gameplay design to the current codebase, and notes whether the root README helps explain it.


| Design Area                         | Current Implementation                                     | Main Files                                                                                        | README Coverage | Gap                                                                              |
| ----------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------- |
| deterministic engine package        | Implemented                                                | `packages/engine/src/escape-the-dungeon/engine/game.ts`, `packages/engine/src/index.ts`           | Partial         | README says the engine exists, but not how contracts/data feed it.               |
| static authored content             | Implemented                                                | `contracts/source/content-source.json`, `contracts/data/*.json`, `contracts/index.ts`             | Weak            | README does not explain authoring source vs generated runtime packs.             |
| floor/room navigation loop          | Implemented in KAPLAY shell                                | `packages/kaplay-demo/src/navigation-scene.ts`, `navigation-overlay.ts`, `grid-frame.ts`          | Weak            | README only says `/play` exists. It does not describe the shell.                 |
| world map data                      | Authored and exported                                      | `content_world_map.json`, `WORLD_MAP_PACK`                                                        | None            | README does not mention world-map content or how it is consumed.                 |
| dialogue/cutscenes/events           | Implemented, now more pack-driven                          | `content_dialogue.json`, `content_cutscenes.json`, `content_events.json`, `narrative/dialogue.ts`, `narrative/cutscenes.ts`, `engine/systems/progression.ts` | Weak            | README does not explain content packs for narrative, authored room-entry events, or that room-entry cutscenes are now authored. |
| rune-based spells                   | Implemented                                                | `content_spells.json`, `lookup_runes.json`, `game.ts`                                             | None            | README does not mention rune-based authored spell content.                       |
| rune affinity / authored evolutions | Implemented                                                | `config_rune_affinity.json`, `content_spell_evolution.json`, `game.ts`                            | None            | README does not mention this system.                                             |
| spell crafting at rune forge        | Partially implemented and now much closer                  | `rune-forge-scene.ts`, `rune-forge-content.ts`, `game.ts`                                         | None            | README does not mention the forge or recipe/evolution flow.                      |
| hidden recipes / hidden evolutions  | Implemented for authored recipes/evolutions                | `game.ts`, `spellbook-content.ts`, `navigation-overlay.ts`                                        | None            | README does not mention content discovery.                                       |
| custom spell naming                 | Implemented as persistent display names on authored spells | `game.ts`, `main.ts`, `rune-forge-scene.ts`                                                       | None            | README does not mention it.                                                      |
| fully procedural custom spells      | Not implemented                                            | n/a                                                                                               | None            | Current system is recipe-backed authored spells, not arbitrary new behaviors.    |
| summon conversion from spells       | Implemented for authored summon-form evolutions            | `core/types.ts`, `engine/game.ts`, `engine/game-entity-factories.ts`, `kaplay-demo/src/rune-forge-content.ts` | None            | Runtime summon support now persists summon-form spell ids, spawns a summon companion, and drives zero-turn follow-through attacks; README still does not explain it. |
| mana crystal economy                | Partially implemented                                      | items/currency tags, `config_spell_forge_costs.json`, `game.ts`                                   | Weak            | README does not explain currency or crystal flow.                                |
| mana vs energy                      | Implemented and converged on mana naming                   | `core/types.ts`, `engine/actions/navigation.ts`, `engine/actions/combat.ts`, `react/DungeonBreakGame.tsx`, `kaplay-demo/src/gameplay-hud.ts` | None            | README still does not explain mana as the canonical runtime resource or how mana crystals feed forge/combat progression. |
| pressure/spawn systems              | Partially implemented                                      | `game.ts` pressure counting, hostile spawning, action formulas                                    | None            | README does not mention pressure or spawn model.                                 |
| loot/search economy                 | Implemented for the current room-loop slice | `engine/actions/inventory.ts`, `engine/actions/combat.ts`, `engine/systems/loot.ts`, `navigation-helpers.ts` | Medium          | Search resolves full room loot, combat grants crystals, floor maps/dark maps are runtime state, and merchant buy/sell/buyback now runs through the same inventory economy. |
| dungeon pressure                    | Implemented for the current gameplay lane                  | `engine/systems/pressure.ts`, `engine/game.ts`, `map-content.ts`, `navigation-scene.ts` | Medium          | Boss spawns now respect the authored spawn interval/caps, temporary hostility decays by ticks, and the shell/map both surface the next-spawn countdown plus floor-threat warnings. |
| mount/whistle                       | Implemented                                                | `content_mounts.json`, `THE_MOUNT`, `mountSummoned` in `game.ts`                                  | Weak            | README mentions play, not mount system or content source.                        |
| deeds/fame/livestream               | Partially implemented                                      | `game.ts`, `narrative/deeds.ts`, stats UI                                                         | None            | README does not explain those systems at all.                                    |




---

**7. README Coverage vs Reality**

## 7. README Coverage vs Reality

### What the root README currently does well

- tells you the repo has:
  - docs site
  - browser-playable game
  - installable engine package
- explains local setup
- explains test commands
- points to MCP and release workflows

### What the root README currently does not explain

- where the game’s static data actually lives
- what `contracts/source` vs `contracts/data` means
- that `content-source.json` is materialized into runtime pack JSON
- that `contracts/index.ts` is the pack export layer
- that KAPLAY can verify a content-pack bundle at boot
- how `docs-site/public/game` is produced
- where the authoritative gameplay systems are implemented
- what systems are still partial vs complete

### Practical conclusion

If someone asks:

- “Where do I edit spell data?”
- “How does a new item get into the game?”
- “Which JSON is runtime-authoritative?”
- “How does the browser build load content?”

the root README does not answer those questions today.



---

**8. Design / Implementation Gaps Worth Reviewing Heavily**

## 8. Design / Implementation Gaps Worth Reviewing Heavily

### 8.1 Mana vocabulary is now canonical, but progression still needs follow-through

Current runtime:

- canonical runtime mana is `entity.combatStats.currentMana`
- rest/train/combat/status flows now speak `mana`
- content formulas and vector projection now use `manaDelta*` and `manaRecoveryScale`

This is visible in:

- `packages/engine/src/escape-the-dungeon/engine/game.ts`
- `packages/kaplay-demo/src/engine-bridge.ts`
- `packages/engine/src/escape-the-dungeon/contracts/data/config_action_formulas.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/config_space_vectors.json`
- various KAPLAY HUD/status files

Why this matters:

- gameplay design talks about mana and mana crystals clearly
- unified vocabulary keeps engine, content packs, codegen artifacts, and UI aligned
- docs should now describe mana as the canonical runtime resource

What still remains:

- explicit title equip UX is still missing
- the remaining entity/archetype/occupation progression seams are now narrower: runtime entities persist canonical `entityTypeId`, but hostile/boss/dungeoneer body assignment still comes from factory defaults because there is no authored NPC/entity-definition pack yet

### 8.2 Summon conversion is now real runtime behavior

The gameplay design says:

- any spell can become a summon

The current engine now supports authored summon evolutions by:

- persisting summon-form spell ids in `GameState`
- spawning a summon entity from the evolved/authored spell
- reusing the spell content as the summon's attack payload
- letting the summon follow the player and resolve zero-turn follow-through attacks before hostile NPC turns

Main files:

- `packages/engine/src/escape-the-dungeon/engine/game.ts`
- `packages/engine/src/escape-the-dungeon/engine/game-entity-factories.ts`
- `packages/engine/src/escape-the-dungeon/core/types.ts`

Remaining edge:

- summon support currently occupies the same active companion slot as recruited companions, so companion/summon coexistence is still a follow-up design/runtime decision.

### 8.3 Spell crafting is authored-recipe based, not fully procedural

Current implementation supports:

- exact rune recipe matching
- hidden recipe discovery
- hidden authored evolution discovery
- saved custom spell names

Current implementation does not support:

- arbitrary new procedural spell behaviors from unknown rune combos

This is an important review distinction. Right now “custom spell” mostly means:

- authored spell recipe
- optionally renamed by the player

not:

- fully new combat logic synthesized from runes

### 8.4 README understates the content architecture

The repo has a serious content architecture:

- schemas
- authoring source
- generated runtime packs
- bundle builder
- parity verification
- public bundle artifact

But the README presents the project mostly as:

- docs site
- play page
- engine package

That is too shallow for implementation review.

### 8.5 Design scope is broader than current room-loop implementation

Examples:

- loot/search economy is broader in design than current runtime
- pressure/boss cadence is broader in design than current runtime
- world-map / hub behavior exists in content but is not the central playable loop yet
- dialogue and interaction pillars still have planned follow-through

This is expected, but it should be documented as phase reality, not hidden.



---

**9. Recommended Review Order**

## 9. Recommended Review Order

If we want to review the implementation heavily, this is the order I would use:

1. `README.md`
  Check what a new engineer would believe after only reading the root docs.
2. `.planning/GAMEPLAY-DESIGN.xml`
  Reconfirm intended player loop and system expectations.
3. `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`
  Review canonical authored source.
4. `packages/engine/src/escape-the-dungeon/contracts/data/README.md`
  Review runtime data expectations.
5. `packages/engine/src/escape-the-dungeon/contracts/schemas/README.md`
  Review schema/data mapping.
6. `packages/engine/scripts/generate-contract-source-assets.mjs`
  Review how source becomes runtime data.
7. `packages/engine/scripts/build-content-pack-bundle.mjs`
  Review how runtime data becomes a browser/tooling bundle.
8. `packages/engine/src/escape-the-dungeon/contracts/index.ts`
  Review the export layer the runtime actually uses.
9. `packages/engine/src/escape-the-dungeon/engine/game.ts`
  Review the real game rules.
10. `packages/kaplay-demo/src/main.ts`
  Review boot, content-pack verification, and scene wiring.
11. `packages/kaplay-demo/src/navigation-scene.ts`
  Review the current actual play shell.
12. `packages/kaplay-demo/src/rune-forge-scene.ts`
  Review the current spell-crafting implementation against design.



---

**10. Concrete Files To Audit During Review**

## 10. Concrete Files To Audit During Review

### Highest-signal files

- `README.md`
- `.planning/GAMEPLAY-DESIGN.xml`
- `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/README.md`
- `packages/engine/src/escape-the-dungeon/contracts/schemas/README.md`
- `packages/engine/scripts/generate-contract-source-assets.mjs`
- `packages/engine/scripts/build-content-pack-bundle.mjs`
- `packages/engine/src/escape-the-dungeon/contracts/index.ts`
- `packages/engine/src/escape-the-dungeon/engine/game.ts`
- `packages/kaplay-demo/src/main.ts`
- `packages/kaplay-demo/src/navigation-overlay.ts`
- `packages/kaplay-demo/src/navigation-scene.ts`
- `packages/kaplay-demo/src/rune-forge-content.ts`
- `packages/kaplay-demo/src/rune-forge-scene.ts`
- `packages/kaplay-demo/scripts/build-standalone.ts`

### High-signal data packs

- `packages/engine/src/escape-the-dungeon/contracts/data/content_spells.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/content_spell_evolution.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/lookup_runes.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/config_rune_affinity.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/config_spell_forge_costs.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/content_items.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/content_world_map.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/content_room_templates.json`
- `packages/engine/src/escape-the-dungeon/contracts/data/content_rooms.json`



---

**11. Content Editor Alignment**

## 11. Content Editor Alignment

### What exists today

There are already three different authoring surfaces in the repo:

1. Engine contracts
  - `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`
  - `packages/engine/src/escape-the-dungeon/contracts/data/*.json`
  - `packages/engine/src/escape-the-dungeon/contracts/schemas/*.json`
2. Docs-site content editor UI
  - `docs-site/app/dungeonbreak-content-app/`*
  - `docs-site/components/reports/content-creator/*`
  - `docs-site/components/reports/space-explorer/*`
3. Payload CMS + Postgres
  - `docs-site/payload.config.ts`
  - `docs-site/collections/*`
  - `scripts/payload-sync-game-data.mjs`

Right now these are related, but they are not one coherent authoring system.

### Current architectural problem

The editor layer is still converging on the engine contract layer.

- The engine has a canonical runtime-content pipeline.
- The docs-site content app is the editorial platform where we view, edit, analyze, review, and publish content projects.
- Payload has CRUD and auth for that editorial platform.
- The live game should still consume published contract JSON and generated access/code artifacts, not Payload rows directly.

That means we still have drift risk:

- editor state can diverge from runtime contracts
- Payload records can diverge from pack JSON
- bundle publication can become a separate process instead of the output of a single canonical pipeline

### Recommended rule

Use this rule going forward:

- The canonical runtime artifact remains the content pack bundle plus the generated engine pack JSON.
- The content editor owns draft authoring, validation, review, and publishing.
- The database is an authoring backend, not the runtime contract format.

In other words:

- do not make the live game read arbitrary DB rows directly
- do make the editor read/write structured draft records in a DB
- always publish validated contract-shaped bundles from that DB into the engine-facing JSON/bundle layer

### Implemented Payload authoring baseline

The repo now has a first real Payload-backed authoring lane for engine contracts:

- Payload collections
  - `docs-site/collections/ContentProjects.ts`
  - `docs-site/collections/ContentSchemaImports.ts`
  - `docs-site/collections/ContentPackDocuments.ts`
- Server utility
  - `docs-site/lib/content-editor/payload-content-authoring.ts`
- Authoring API routes
  - `docs-site/app/api/content-editor/projects/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/import-canonical/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/export/route.ts`
- Content app workspace
  - `docs-site/app/dungeonbreak-content-app/content/page.tsx`

The implemented flow is:

1. Create a Payload content project with project metadata.
2. Import canonical engine pack definitions from `CONTENT_PACK_REGISTRY`.
3. Persist the imported schema metadata and contract-shaped pack documents in Payload.
4. Export those pack documents back out as JSON files under `docs-site/content-projects/<project-slug>/`.

That means the authoring system now has an actual DB-backed project model instead of only a schema viewer or filesystem report page.

### Implemented publish hardening

The baseline is no longer import/export-only. The repo now also has a working project publish loop:

- Additional Payload collections
  - `docs-site/collections/ContentCustomSchemas.ts`
  - `docs-site/collections/ContentPlatformData.ts`
  - `docs-site/collections/ContentDraftRevisions.ts`
  - `docs-site/collections/ContentPublishJobs.ts`
- Extended server utility
  - `docs-site/lib/content-editor/payload-content-authoring.ts`
- Additional authoring API routes
  - `docs-site/app/api/content-editor/projects/[projectId]/packs/[packId]/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/custom-schemas/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/custom-schemas/[schemaDocId]/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/platform-data/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/platform-data/[platformDocId]/route.ts`
  - `docs-site/app/api/content-editor/projects/[projectId]/publish/route.ts`
  - `docs-site/app/api/content-packs/route.ts`
- Repeatable bootstrap command
  - `docs-site/scripts/bootstrap-content-authoring.ts`
  - `pnpm --dir docs-site run content-editor:bootstrap`
  - `pnpm --dir docs-site run content-editor:bootstrap --publish`

The live flow is now:

1. Apply Payload migrations for the content authoring collections.
2. Bootstrap or reuse a content project in Payload.
3. Import canonical pack/schema definitions from `CONTENT_PACK_REGISTRY`.
4. Store canonical pack docs in `content-pack-documents`.
5. Export project files to `docs-site/content-projects/<project-slug>/`.
6. Publish canonical pack docs back into:
  - `packages/engine/src/escape-the-dungeon/contracts/data/*.json`
  - `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`
7. Run the existing engine + KAPLAY artifact pipeline:
  - `pnpm --dir packages/engine run build`
  - `pnpm --dir docs-site exec node scripts/ensure-engine-dist.mjs`
  - `pnpm --dir packages/kaplay-demo run build`

The browser workspace now also supports:

- pack JSON editing in `docs-site/app/dungeonbreak-content-app/content/page.tsx`
- project custom schema creation
- docs-site/Payload platform extension creation
- revision history visibility
- publish-job receipt visibility

This matters because the editor loop is now using the same file targets the game already consumes instead of inventing a second runtime data source.

### Registry and decoder compatibility note

The content-editor path now reads the canonical pack registry from engine source contracts, not from packaged engine dist runtime resolution.

- Source registry path:
  - `packages/engine/src/escape-the-dungeon/contracts/index.ts`
- Docs-site authoring consumers:
  - `docs-site/lib/content-editor/payload-content-authoring.ts`
  - `docs-site/app/api/content-packs/route.ts`

This was necessary because the generated content-source decoder is currently stricter than the live `content-source.json` shape in one area (`vectorRuntime.modelSchemas`). The engine contract layer now has a safe fallback so authoring/import/export/bootstrap can continue reading canonical source JSON while that codegen/schema drift is cleaned up.

### What is in the DB right now

The current bootstrap command successfully created and reused a project:

- project slug: `canonical-game-content`
- Payload project id: `1`
- imported canonical pack docs: `34`
- imported schema-import rows: `34`
- draft revision rows: populated by import/edit/publish operations
- publish job rows: populated by project publish operations

That means the database now contains a real imported snapshot of the engine-authored content pack set, not only empty authoring tables.

### Database options

#### Payload + Supabase/Postgres

Best fit for the repo as it exists now.

Why:

- Payload already exists
- auth/admin/jobs already exist
- Postgres CRUD is already in place
- collaborative editing is straightforward
- publishing workflows fit well

Risks:

- if Payload collections are treated as ad hoc CMS content instead of contract-backed pack rows, drift will continue
- schema evolution needs explicit versioning and migration tooling

Recommended usage:

- primary collaborative draft store
- admin/editor CRUD
- review/publish control plane

#### SQLite

Good for local or embedded authoring, not the best primary team backend.

Why:

- simple
- portable
- easy to ship with a local content tool

Risks:

- weaker collaboration story
- awkward as the main shared editor backend once multiple authors are active

Recommended usage:

- optional local cache
- offline editor mode
- test fixture store

#### Dolt

Useful, but not as the first database to build the editor around.

Why:

- excellent lineage
- strong branch/merge/audit story
- attractive for content promotion history

Risks:

- not the best direct fit for the current Payload CRUD layer
- will slow the first editor alignment pass if treated as the primary source of truth

Recommended usage:

- promotion/audit/history layer
- optional mirror of published pack state
- release-lineage backend after the editor/publish contract is stable

### Recommendation

Short version:

- Use Payload + Postgres/Supabase as the draft authoring backend.
- Keep engine contract JSON and `content-pack.bundle.v1.json` as the published runtime artifacts.
- Add Dolt later as lineage/promotion infrastructure, not as the first CRUD backend.
- Use SQLite only for local/offline tooling if we need it.



---

**12. game.ts Refactor Plan**

## 12. game.ts Refactor Plan

`packages/engine/src/escape-the-dungeon/engine/game.ts` is still too large to remain the main composition point for the engine. The first extraction slices are in, but the file still needs action-family decomposition.

### What the file is doing today

It currently mixes:

- engine bootstrap and state initialization
- entity creation
- player action dispatch
- combat resolution wiring
- room interaction rules
- dialogue and social interaction rules
- inventory/equipment/shop rules
- rune forge and spell rules
- event application
- status/snapshot serialization
- helper math and compatibility logic

That is too much responsibility for one file.

### Target structure

The goal should be a thin `GameEngine` orchestration layer with imported domain modules.

Suggested split:

- `engine/bootstrap/`*
  - initial state creation
  - entity seed/default creation
  - dungeon/world initialization
- `engine/actions/navigation.ts`
  - move
  - whistle
  - room transition helpers
- `engine/actions/social.ts`
  - talk
  - choose dialogue
  - speak
  - recruit
  - live stream
- `engine/actions/combat.ts`
  - fight
  - flee
  - combat side effects
- `engine/actions/inventory.ts`
  - search
  - use item
  - equip item
  - drop item
  - purchase
  - re-equip
- `engine/actions/rune-forge.ts`
  - unlock/evolve authored spells
  - recipe discovery
  - craft-name persistence
  - rune-affinity application
- `engine/systems/events.ts`
  - global event triggering
  - turn-based event application
- `engine/systems/progression.ts`
  - xp
  - quest progress
  - level helpers
  - title unlock persistence and auto-equip-by-archetype follow-through
- `engine/systems/history.ts`
  - event log
  - deed memory
  - rumor propagation
- `engine/serialization/*`
  - status payload
  - snapshot payload
  - external/public engine views
- `engine/compat/*`
  - temporary legacy bridges only

### Refactor rule

Do not do a giant rewrite.

Refactor by extraction slices:

1. move pure helpers first
2. move one action family at a time
3. keep public behavior identical while extracting
4. add narrow tests around each extracted action family
5. shrink `game.ts` until it becomes orchestration only

### Current extraction inventory

The current `game.ts` method map is already clean enough to split by responsibility. Based on the live file:

The first extracted runtime modules now exist:

- `packages/engine/src/escape-the-dungeon/engine/game-runtime-helpers.ts`
- `packages/engine/src/escape-the-dungeon/engine/game-state-persistence.ts`
- `packages/engine/src/escape-the-dungeon/engine/game-runtime-views.ts`
- `packages/engine/src/escape-the-dungeon/core/entity-stats.ts`
- `packages/engine/src/escape-the-dungeon/engine/game-entity-factories.ts`

The current canonical-stat cleanup slice also changed the public engine surface:

- `EntityState` no longer exposes deprecated `traits`, `features`, `attributes`, `health`, `energy`, or `runeAffinities`
- runtime consumers now read canonical maps through `combatStats`, `narrativeStats`, and `runeStats`
- legacy stat-shape migration is confined to `core/entity-stat-domains.ts`
- runtime inventory items now carry `narrativeStatDelta` instead of `traitDelta`

The action-family extraction is now real, not just planned:

- `packages/engine/src/escape-the-dungeon/engine/actions/navigation.ts`
- `packages/engine/src/escape-the-dungeon/engine/actions/social.ts`
- `packages/engine/src/escape-the-dungeon/engine/actions/combat.ts`
- `packages/engine/src/escape-the-dungeon/engine/actions/inventory.ts`
- `packages/engine/src/escape-the-dungeon/engine/actions/rune-forge.ts`
- `packages/engine/src/escape-the-dungeon/engine/actions/action-types.ts`

`GameEngine` now composes those files for `availabilityForAction()`, `performAction()`, prepared-spell execution, forge craft, and forge evolution. The extracted seams return one runtime `narrativeStatDelta`; only the record/history boundary still splits that into `traitDelta` / `featureDelta`.

- Top-level pure helpers and normalizers
  - currently in `engine/game-runtime-helpers.ts`
  - examples: `titleForArchetype`, `rarityLabel`, `runeComboKey`, `toNumberMap`, `applyNarrativeStatDelta`, `mergeDeltas`, `partitionNarrativeStatDelta`, `levelForEntity`
  - follow-on target:
    - split further only if the helper seam starts growing again
- Engine shell and dispatch seam
  - `GameEngine` should now keep constructor wiring, `create()`, `dispatch()`/public API, and imported domain calls here
  - target file to keep:
    - `engine/game.ts`
- Prepared spell and rune forge execution
  - execution now routes through:
    - `engine/actions/combat.ts`
    - `engine/actions/rune-forge.ts`
  - remaining helpers still in `game.ts`:
    - spell discovery/progress state
    - authored evolution resolution
  - target files:
    - keep `combat.ts` + `rune-forge.ts`
    - only split spell progression helpers if they continue growing
- Core action execution and availability
  - extracted into:
    - `engine/actions/navigation.ts`
    - `engine/actions/social.ts`
    - `engine/actions/combat.ts`
    - `engine/actions/inventory.ts`
    - `engine/actions/rune-forge.ts`
  - `game.ts` now dispatches into those modules instead of owning the branch bodies inline
- Loot, discovery, and floor-map reward state
  - extracted into:
    - `engine/systems/loot.ts`
  - owns:
    - discovered rooms by depth
    - documented depth tracking
    - mana crystal reward item creation
    - survey map vs dark map item creation
  - engine state now owns dungeon discovery; KAPLAY no longer treats browser localStorage as canonical game progress
- Pressure, boss spawn cadence, and temporary hostility
  - extracted into:
    - `engine/systems/pressure.ts`
  - owns:
    - ticks-until-next-boss-spawn calculation
    - boss-adjacent hostile room selection with authored caps
    - weighted spawn-table archetype choice
    - temporary hostility decay / restore to base faction
- Authored cutscenes and room-entry narrative
  - source of truth:
    - `contracts/source/content-source.json`
    - generated runtime pack: `contracts/data/content_cutscenes.json`
  - runtime reader:
    - `narrative/cutscenes.ts`
  - current workflow:
    - author trigger rules and text in the cutscene pack
    - build engine assets
    - runtime triggers cutscenes during action finalization using room/action context
    - KAPLAY shell reads resulting room event log entries via `navigation-helpers.ts`
- Dialogue, records, and chapter history
  - lines near `3737-3888`
  - examples: `recordDialogueProgress`, `ensureChapterPages`, `applyNarrativeStatDelta`, `record`
  - target files:
    - `engine/systems/history.ts`
    - `engine/systems/dialogue-progress.ts`
- Cutscenes, targeting, and inventory/equipment helpers
  - lines near `3888-4105`
  - examples: `recordCutscenes`, `nearbyEntities`, `resolveTarget`, `findInventoryItem`, `setEquippedItem`, `consumeCurrencyTokens`, `buildPurchasedItem`
  - target files:
    - `engine/systems/targets.ts`
    - `engine/systems/inventory.ts`
    - `engine/systems/equipment.ts`
- Quests, archetypes, deeds, rumors, and pressure
  - lines near `4105-4449`
  - examples: `updateQuests`, `refreshEntityArchetype`, `applyDeedSemantics`, `spreadRumor`, `crossPollinateRumors`, `enforcePressureCap`, `processGlobalEvents`
  - target files:
    - `engine/systems/progression.ts`
    - `engine/systems/archetypes.ts`
    - `engine/systems/history-rumors.ts`
    - `engine/systems/global-events.ts`
- NPC policy and hostile simulation
  - lines near `4449-4714`
  - examples: `spawnHostiles`, `resolveNpcPolicyId`, `choosePolicyAction`, `simulateNpcTurns`, `choosePredatorMove`
  - target files:
    - `engine/systems/hostiles.ts`
    - `engine/systems/npc-policy.ts`
- Bottom pure vector helpers
  - lines near `4714-4729`
  - examples: `diffMap`, `scaleVector`
  - target file:
    - `engine/game-helpers.ts`

### 62-01 exact goal

The first runtime decomposition phase should not touch combat math or room rules yet. It should:

1. extract pure helpers and shared normalizers
2. extract status/snapshot/serialization builders if they are pure or mostly pure
3. leave action semantics in place for now
4. introduce import seams that `62-02` can use to peel off action families safely



---

**13. Proposed Phases**

## 13. Proposed Phases

### Phase A: Contract-first content editor alignment

Goal:

- make the content editor speak in terms of engine pack schemas, not parallel ad hoc editor objects

Work:

- define a registry of pack types from `contracts/schemas`
- generate editor forms/table metadata from schema
- define one canonical editor model for pack rows, lookup rows, and config docs
- make `content-source.json` and generated packs explicit publish targets

Deliverable:

- editor can load, edit, validate, and export contract-shaped pack drafts

### Phase B: Draft storage backend

Goal:

- give the editor durable collaborative CRUD without making the DB the runtime source format

Work:

- use Payload + Postgres/Supabase as the draft store
- add collections/tables for pack documents, draft revisions, publish jobs, and migration receipts
- browser workspace now has JSON-first CRUD for pack documents plus create flows for custom schemas and platform extensions
- define publish states: draft, validated, staged, published

Deliverable:

- editor-backed pack drafts with auth, revision history, and validation status

### Phase C: Publish and bundle pipeline

Goal:

- make publishing a first-class operation, not a manual side process

Work:

- publish validated drafts into contract JSON
- regenerate `contracts/data/*.json`
- regenerate generated codecs/artifacts
- emit `content-pack.bundle.v1.json`
- write publish manifests and provenance

Deliverable:

- one publish action produces the runtime artifacts the game actually consumes

### Phase D: Delivery and lineage

Goal:

- separate draft authoring from release distribution and audit

Work:

- wire versioned bundle storage and retrieval
- connect to Supabase/S3 delivery contracts already planned in later phases
- add optional Dolt mirror for release lineage and promotion history

Deliverable:

- published pack versions can be audited, fetched, and promoted cleanly

### Phase E: Engine decomposition

Goal:

- reduce `game.ts` into imported subsystems

Work:

- extract action families in order: navigation, social, combat, inventory, rune forge
- extract event/progression/history systems
- leave only orchestration and public API wiring in `GameEngine`

Deliverable:

- `game.ts` becomes a coordinator instead of the whole runtime

### Phase F: Documentation and review hardening

Goal:

- make the architecture obvious to the next engineer

Work:

- update root `README.md`
- add content editor architecture docs
- document draft vs published vs runtime artifact layers
- document publish/delivery/versioning flow

Deliverable:

- repo docs match reality

### Suggested execution order

This is the order I would actually do:

1. Phase A
2. Phase B
3. Phase E slice 1
4. Phase C
5. Phase E slice 2+
6. Phase D
7. Phase F

Reason:

- editor/schema alignment has to happen before DB-heavy CRUD work
- `game.ts` decomposition should start early because it affects every later system
- delivery/lineage should come after publish contracts are real



---

## Bottom Line

The engine does have a real static-data architecture, but the next architectural step is not "pick a random DB."

It is:

- align the content editor to engine contracts
- use Payload + Postgres/Supabase for draft CRUD
- continue publishing contract JSON and bundle artifacts for runtime use
- treat Dolt as lineage/promotion infrastructure later
- start decomposing `game.ts` immediately by action-family extraction

If we do not separate draft storage, published runtime artifacts, and engine orchestration now, the editor, contracts, and runtime will keep drifting into three different systems.

---

**14. Naming Conventions**

## 14. Naming Conventions

### Stat naming rule

There are two naming layers on purpose:

1. Content pack ids
  - examples:
    - `stat_combat_might`
    - `stat_skill_magic`
    - `trait_Fame`
    - `rune_d`
2. Runtime entity keys
  - examples:
    - `might`
    - `currentMana`
    - `Magic`
    - `Fame`
    - `rune_d`

Rule:

- content references can keep authored ids
- runtime entity maps use the plain runtime key
- generated artifacts bridge between them

Main file:

- `packages/engine/src/escape-the-dungeon/contracts/generated/stat-keys.ts`

That file is the generated stat-key bridge:

- `COMBAT_STAT_IDS`
- `COMBAT_STAT_KEYS`
- `COMBAT_STAT_ID_TO_KEY`
- `SKILL_STAT_IDS`
- `SKILL_STAT_KEYS`
- `NARRATIVE_STAT_IDS`
- `NARRATIVE_STAT_NAMES`
- `NARRATIVE_STAT_ID_TO_KEY`
- `RUNE_IDS`

### Delta naming rule

Current rule in runtime code:

- generic helper:
  - `applyStatDelta()`
- generic helper with clamp:
  - `applyClampedStatDelta()`
- domain-specific helper:
  - `applyNarrativeStatDelta()`

Why both exist:

- `applyStatDelta()` is the generic concept
- `applyNarrativeStatDelta()` is the current specialization because narrative stats still have mixed behavior:
  - some keys are clamped trait-style values
  - some keys are non-clamped feature-style values

So the more specific helper is not replacing the generic concept. It is a domain wrapper on top of the generic idea because the narrative domain still has one last behavior wrinkle.

Short version:

- yes, the base concept is `applyStatDelta`
- `applyNarrativeStatDelta` exists because narrative stats still need domain-specific clamp logic
- if we later unify clamp policy more cleanly, this can become a generic policy-based helper

Main file:

- `packages/engine/src/escape-the-dungeon/engine/game-runtime-helpers.ts`

### Item stat payload naming rule

Runtime item instances should now use:

- `narrativeStatDelta`

not:

- `traitDelta`

Main files:

- `packages/engine/src/escape-the-dungeon/core/types.ts`
- `packages/engine/src/escape-the-dungeon/engine/game-entity-factories.ts`
- `packages/engine/src/escape-the-dungeon/replay/harness.ts`

### Runtime action outcome naming rule

New extracted engine action modules return:

- `narrativeStatDelta`

not:

- `traitDelta`
- `featureDelta`

The split only still exists at older record/history surfaces where event memory is still shaped that way.



---

**15. Engine Layout Now**

## 15. Engine Layout Now

### Current engine folder ownership


| Folder                                                  | Responsibility                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/engine/src/escape-the-dungeon/contracts`      | Canonical content source, runtime JSON packs, schemas, generated codecs, registry exports |
| `packages/engine/src/escape-the-dungeon/core`           | Fundamental engine data types, stat helpers, core transforms                              |
| `packages/engine/src/escape-the-dungeon/engine`         | `GameEngine` orchestration and extracted runtime seams                                    |
| `packages/engine/src/escape-the-dungeon/engine/actions` | Action-family availability and perform logic                                              |
| `packages/engine/src/escape-the-dungeon/engine/systems` | History, progression, and future runtime subsystems extracted out of `game.ts`            |
| `packages/engine/src/escape-the-dungeon/world`          | Dungeon layout, room traversal, room feature rules                                        |
| `packages/engine/src/escape-the-dungeon/narrative`      | Dialogue, deeds, archetypes, skills, fame                                                 |
| `packages/engine/src/escape-the-dungeon/combat`         | Combat resolution                                                                         |
| `packages/engine/src/escape-the-dungeon/replay`         | Deterministic fixture/replay helpers                                                      |


### Current `engine/` file roles


| File                                                                      | Role                                                                                    |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/engine/src/escape-the-dungeon/engine/game.ts`                   | Main composition root for runtime systems; still too large, but now thinner than before |
| `packages/engine/src/escape-the-dungeon/engine/game-runtime-helpers.ts`   | Generic and domain-specific stat/math helpers                                           |
| `packages/engine/src/escape-the-dungeon/engine/game-runtime-views.ts`     | Status/builders for public runtime views                                                |
| `packages/engine/src/escape-the-dungeon/engine/game-state-persistence.ts` | Snapshot capture/restore                                                                |
| `packages/engine/src/escape-the-dungeon/engine/game-entity-factories.ts`  | Player/NPC/hostile/boss bootstrap entities                                              |
| `packages/engine/src/escape-the-dungeon/engine/systems/history.ts`        | Dialogue progress, chapter pages, event log recording, cutscene event recording, deed/rumor memory propagation |
| `packages/engine/src/escape-the-dungeon/engine/systems/pressure.ts`       | Boss cadence countdown, spawn-room/archetype selection, hostile spawning, pressure-cap pruning, temporary hostility restore |
| `packages/engine/src/escape-the-dungeon/engine/systems/npc-turns.ts`      | NPC policy resolution, legal-action normalization, predator movement, and autonomous NPC turn simulation |
| `packages/engine/src/escape-the-dungeon/engine/systems/progression.ts`    | Quest updates, archetype refresh, global event trigger/effect processing                |


### Current `engine/actions/` file roles


| File                                                                    | Responsibility                                                          |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/engine/src/escape-the-dungeon/engine/actions/action-types.ts` | Shared action seam types                                                |
| `packages/engine/src/escape-the-dungeon/engine/actions/navigation.ts`   | `move`, `whistle`, `train`, `rest`                                      |
| `packages/engine/src/escape-the-dungeon/engine/actions/social.ts`       | `talk`, `choose_dialogue`, `speak`, `live_stream`, `steal`, `recruit`   |
| `packages/engine/src/escape-the-dungeon/engine/actions/combat.ts`       | `fight`, `flee`, `murder`, prepared spell usage                         |
| `packages/engine/src/escape-the-dungeon/engine/actions/inventory.ts`    | `search`, `use_item`, `equip_item`, `drop_item`, `purchase`, `re_equip` |
| `packages/engine/src/escape-the-dungeon/engine/actions/rune-forge.ts`   | skill evolution, forge craft, forge evolution                           |


### What still belongs in `game.ts`

Right now `game.ts` should be the place for:

- engine constructor/setup
- public engine API
- dispatch/orchestration
- cross-system turn finalization
- temporary glue while extraction continues

It should not keep re-accumulating:

- full action-family branch logic
- content lookup boilerplate
- inventory/equipment helper clutter
- event/history/progression subsystems



---

**16. Canonical Assets**

## 16. Canonical Assets

When we say "canonical assets" for the engine/content system right now, we mean these layers:

### 16.1 Canonical authored source

- `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`

This is the merged authored document. It is the canonical source-of-truth file for:

- `contentSchema`
- `vectorRuntime`
- `packs`

### 16.2 Canonical runtime JSON packs

- `packages/engine/src/escape-the-dungeon/contracts/data/*.json`

These are the runtime pack files the engine consumes directly and the content editor publishes back into.

### 16.3 Canonical generated contract/code assets

- `packages/engine/src/escape-the-dungeon/contracts/generated/`*

These are generated from schema/content and exist for convenient typed/runtime consumption:

- TS codecs
- C++ headers
- C# classes
- generated bundle/source decoders
- generated stat key artifacts

Important file:

- `packages/engine/src/escape-the-dungeon/contracts/generated/stat-keys.ts`

### 16.4 Canonical runtime export/registry layer

- `packages/engine/src/escape-the-dungeon/contracts/index.ts`

This is the engine-facing import surface for canonical content access. It already exports:

- normalized pack documents like `SPELL_PACK`, `ITEM_PACK`, `ACTION_CONTRACTS`
- schema documents like `CONTENT_SCHEMA_DOCUMENT`, `STAT_SCHEMA_DOCUMENT`
- the pack registry: `CONTENT_PACK_REGISTRY`

Important nuance:

- `CONTENT_PACK_REGISTRY` is generated from source/data assets into `contracts/generated/content-pack-registry.ts`
- `contracts/index.ts` consumes that generated metadata; it should not be hand-edited as a registry table
- internal semantic-runtime data like `vectorRuntime` / `config_space_vectors.json` is not part of the canonical gameplay/editor pack registry

This file is the current "canonical access layer" for gameplay code.

It now exports convenient collection accessors too, not just raw pack documents. Important examples:

- stat collections:
  - `COMBAT_STAT_LIST`, `COMBAT_STAT_BY_ID`, `COMBAT_STAT_BY_KEY`
  - `SKILL_STAT_LIST`, `SKILL_STAT_BY_ID`, `SKILL_STAT_BY_KEY`
  - `NARRATIVE_STAT_LIST`, `NARRATIVE_STAT_BY_ID`, `NARRATIVE_STAT_BY_KEY`
- content collections:
  - `SPELL_LIST`, `SPELL_BY_ID`, `SPELL_BY_RUNE_COMBO_KEY`
  - `RUNE_LIST`, `RUNE_BY_ID`
  - `ITEM_LIST`, `ITEM_BY_ID`
  - `QUEST_LIST`, `QUEST_BY_ID`
  - `EVENT_LIST`, `EVENT_BY_ID`
- action metadata:
  - `ACTION_CATALOG_LIST`, `ACTION_CATALOG_BY_ACTION_TYPE`
  - `ACTION_INTENT_LIST`, `ACTION_INTENT_BY_ACTION_TYPE`
  - `ACTION_POLICY_LIST`, `ACTION_POLICY_BY_ID`

That is the direction we want for all runtime content access: import a canonical list/record export from `contracts/index.ts`, not rebuild `new Map(...)` tables in gameplay files.

### 16.5 Canonical published bundle

- `docs-site/public/game/content-pack.bundle.v1.json`

This is the distributable bundle artifact, not the main authoring surface.



---

**17. Where To Put New Things**

## 17. Where To Put New Things

### New gameplay content row

Put it in:

- `packages/engine/src/escape-the-dungeon/contracts/source/content-source.json`

Then regenerate runtime assets.

Canonical row rule:

- every canonical content row should have a stable machine `id` field
- every canonical content row should also have `name`
- if UI display text needs to diverge later, add a UI-facing field like `label` instead of overloading the id

Use this when adding:

- new spells
- new evolutions
- new items
- new quests
- new events
- new dialogue rows

### New stat domain or stat definition

Put lookup/schema data in:

- `packages/engine/src/escape-the-dungeon/contracts/data/lookup_*.json`
- `packages/engine/src/escape-the-dungeon/contracts/schemas/*.schema.json`

Then make sure:

- `content-source.json` stat schema points at it
- codegen emits key artifacts
- runtime entity maps use the plain runtime key

### New runtime rule/system

If it is a gameplay rule:

- prefer `packages/engine/src/escape-the-dungeon/engine/actions/`* for direct player/NPC actions
- prefer `packages/engine/src/escape-the-dungeon/engine` or a new `engine/systems/*` seam for turn systems

If it is a content lookup or pack accessor:

- add it in `packages/engine/src/escape-the-dungeon/contracts/index.ts`

### New content-pack convenience export

Put it in:

- `packages/engine/src/escape-the-dungeon/contracts/index.ts`

Examples of what we should keep adding there:

- `BY_ID` records
- typed lookup maps
- stable list exports
- helper accessors for common runtime queries

That is better than rebuilding local `new Map(...)` tables all over gameplay code.

### New browser/UI-only representation

Put it in:

- `packages/kaplay-demo/src/*` if it is standalone/KAPLAY-facing
- `docs-site/*` if it is docs/editor-facing

Do not make UI-only metadata the runtime canonical source.



---

**18. Workflow Right Now**

## 18. Workflow Right Now

### Current workflow for gameplay/content changes

1. Edit canonical authored content or schemas
  - usually `contracts/source/content-source.json`
  - sometimes a lookup/schema JSON under `contracts/data` or `contracts/schemas`
2. Regenerate contract/code assets
  - `pnpm --dir packages/engine run build`
3. Consume content through engine exports
  - use `contracts/index.ts` exports
  - prefer `*_LIST`, `*_BY_ID`, `*_BY_KEY`, and `*_NAME_BY_ID` style exports
  - avoid raw file reads or local `new Map(...)` rebuilds in gameplay runtime code
4. Update runtime behavior in engine modules
  - `engine/actions/`*
  - `engine/game.ts`
  - `engine/systems/*`
5. Update KAPLAY/docs-site consumers if needed
  - `packages/kaplay-demo/*`
  - `docs-site/*`
6. Verify
  - `pnpm --dir packages/engine run typecheck`
  - `pnpm --dir packages/engine run build`
  - `pnpm --dir docs-site run typecheck`
  - `pnpm --dir packages/kaplay-demo exec tsc --noEmit --pretty false`

### Current workflow for editor-backed content

1. Import canonical packs from `CONTENT_PACK_REGISTRY`
2. Store/edit drafts in Payload
3. Export project files
4. Publish back into:
  - `contracts/source/content-source.json`
  - `contracts/data/*.json`
5. Rebuild engine/game artifacts

### Current extension rule

Right now the safest extension path is:

- extend content/schema first
- regenerate code/assets
- add convenient runtime exports in `contracts/index.ts`
- then update engine rules

Not:

- add ad hoc runtime constants first
- or add DB-only fields the engine cannot publish back into files

### Current workflow gap

What we still do not have cleanly enough yet:

- accessor coverage for every important collection and grouped query, even though the main stat/action/spell/rune/item surfaces now have canonical `LIST` / `BY_ID` exports
- generated codegen for those accessors instead of maintaining them manually in `contracts/index.ts`
- a fully finished stat-language cleanup for old trait/feature historical surfaces
- a fully thin `GameEngine`

Those are now explicit follow-on runtime tasks, not hidden cleanup.
