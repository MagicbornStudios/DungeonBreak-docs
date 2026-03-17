# Gameplay spec checklist

Discovery and spec progress. Tick when we've locked decisions and written them into GAMEPLAY-DESIGN.xml (or linked spec). Keep chatting to fill these out.

---

## Core loop & identity
- [x] One-liner, pacing, primary driver (loot)
- [x] Success criteria / anti-goals (unclear next step, narrative ignored)
- [x] **Beat the dungeon** = get past boss (deal = golden crystal only, or defeat). Golden value = 10,000 mana crystals.
- [x] **Opening:** Stuck at bottom after bad teleport; "Guess I got to get out"; then room-to-room.

## Navigation & maps
- [x] No tile movement; room-as-view; exits as choices
- [x] Hub/dungeon/world map build approach (graph, levelLayouts, mapLayout)
- [x] **Overworld/hub schema**: hubId, places[] (placeId, name, description, exits[{ label?, targetPlaceId }], visualRef?), mapLayout? { placeId → {x,y} }. One place = dungeon entrance; codegen for TS/Unreal.
- [x] **Tile-composition format**: room/place visualRef = image URL/key OR compositionId → tiles[] (tileRef, x, y). Content or composition pack.
- [x] Dark maps (completeness, threshold, sell penalty)
- [x] **Discovery/fog**: in save (per run). Discovered room ids by depth; map item completeness from discovery. Not in content payload.

## Dungeon game loop
- [x] Race concept; boss spawns enemies over time
- [x] Boss always guards exit; beat dungeon = get past boss
- [x] **Dungeoneers**: other NPCs in dungeon, navigate rooms; not hostile unless we spell them or talk wrong; trade, quests, deeds; they meet and have background encounters (same options, they perform)
- [x] **NPC–NPC turns**: initiative order; each NPC performs one action; done when each has performed one action (single round). Outcome applied to both. Share news = deed spread.
- [x] **Dungeon tick** = going to a room advances one tick (player or NPC entering room)
- [x] **Spawn**: every 3 ticks; origin = room adjacent to boss; pick rooms randomly from there; spawn table/cap in content
- [x] **NPC tick** = same global tick (any entity entering room advances tick)
- [x] **Spawn table** = content table: which enemy type (and by depth) to spawn when boss spawns; weights optional. Cap per room/level in content.
- [x] **UI time pressure**: show tick count; optional "spawn in 1 tick" warning; narrative line when spawns occur. Content drives message.
- [x] Dungeoneer hostility lasts 3 dungeon ticks (or configurable), then reverts
- [x] NPC–NPC encounters: already spec'd (initiative, one action/round, share news, outcome applied)

## Character progression
- [x] XP exists; rune affinity grows on spell use
- [x] **XP sources**: combat win, quest complete (e.g. complete floor X), deed spread, boss bypass. Level curve proposed: L2=100, L3=250, L4=450, L5=700, L6=1000, +~350/level; rewards per source in content (combat 10–30, quest 50–100, deed 5–15, bypass 25–50)
- [x] **Level grants (proposed):** +max mana/HP per level. Spell slot count is fixed (not level-gated). Optional Fame/unlocks. Amounts in content.

## Economy
- [x] **Mana crystals** = currency (create spells, buy things). **Golden mana crystal** = key item, huge value; can offer to boss to pass or keep. Player and NPCs can find it.
- [x] Golden crystal: max 1 per floor; offering to boss consumes it (no take-back)
- [x] **Mana**: max 999; convert crystals → mana at any time. **Conversion:** 1 crystal = 10 mana (content can override).
- [x] **Tables (proposed):** spell costs utility 5–15 / combat 10–30 / summon 20–40; livestream 5 mana/tick, 2 Fame/tick; rest = full mana+HP (or tune). Content overrides.
- [x] **Mana regen** = rest only or mana crystals (convert). No passive regen.
- [x] **Loot:** (1) Search = treasure chests (mana crystals, items). (2) Combat win = mana crystals at least (+ optional other rewards; amounts in content). Golden = 1/floor, 10k value. Creation cost at forge in content.

## Spells & runes
- [x] 26 runes; order matters; affinity; evolution at forge
- [x] Spell slot/pool: pool = all known, slots = equipped; rune forge = prepare + craft
- [x] Spellbook types = Pokemon types; **spell categories** (content: spell-categories pack): conversation, transportation, exploration, combat, crafting, detection. **Utility spells** = conversation (dialogue unlock), transportation (haste, teleport), exploration/detection (light, detect_traps, scout).
- [x] **Spell level-up:** useCount → level 1–5 (spell-progression.json); evolution can require minLevel (evolution table).
- [x] **Evolution naming:** content-driven; evolution table has resultSpellId, resultName, optional minLevel.
- [x] **Affinity decay:** no decay. Affinity only increases on spell use.
- [x] **Rune schema:** runeId, name, basePower, type, optional weight, visualRef; min/max runes per spell in content.

## Fame & deeds
- [x] **Livestream**: toggle on/off (no cost to toggle). While on: each tick costs mana and grants Fame per tick. Exact numbers in content.
- [x] **Deeds**: acquired only during livestreams. Entities that encounter us see our deeds; dialogue differs. **NPC–NPC deed sharing:** when two NPCs have an encounter, one can "share news"—listener gains speaker's knownDeeds (about player). Each NPC has knownDeeds set; spreads when they meet and share.
- [x] **Fame does:** unlocks companions, dialogue, shop items; changes NPC treatment. Earned via livestream (per tick); thresholds in content; UI shows current Fame.

## Companions (= summon spells)
- [x] Max 1 summon at a time
- [x] **Any spell can become a summon** — convert at rune forge. Summons use Pokemon sprites. Duration = until dismissed.
- [x] **Summon in combat**: has a turn after player; auto-casts spell it was created from. **Room:** summons do nothing in room; only work in combat.

## Traits (narrative / progression stats)
- [x] Narrative/progression stats = single named set for dialogue, narration, NPC AI, unlocks. Canonical list: STAT-AND-BEHAVIOUR-TAXONOMY.md (15 names; lookup_narrative_traits.json). Dialogue nodes reference thresholds by stat name. Current phase: static options; later phase will use these stats to drive which options appear (dialogue first).

## Interaction view & UI
- [x] One scene, mode-driven (combat, dialogue, rune_forge, cutscene)
- [x] **Per-mode:** Combat = enemy sprite/HP, Fight/Spells/Bag/Run, exit when done. Dialogue = NPC sprite, options + shared actions, exit when done. Rune forge = campfire, craft/evolve/slots, back. Cutscene = scene art/text, no actions, exit when done.
- [x] **Journal:** Quests + Bestiary + Guides only (no Log). Guides: Spell craft, Runes & affinity, Maps & dark maps, Combat & summons, Turn order, Gameplay/controls. Bestiary = entity catalogue. Unlock: always visible or first-time-X. Content: journalPack/guidePack.

## Room entry, dialogue, search
- [x] **Room entry:** Mandatory/optional events (cutscene, dialogue, environmental). Content: eventId, type, payload. **Dialogue display:** spec for narrator vs NPC (layout, speaker label); substantial dialogue/narration content in content.
- [x] **Search & treasure chests:** Search = room action where content allows (room feature or chest object). Loot = mana crystals + items from loot table; one-shot or cooldown per content. Schema: treasureChestRef/lootTableId per room or object.

## Rest
- [x] **Rest** (room action): restores mana, HP, status. Cost = 1 dungeon tick.

## Rarity
- [x] **Rarity (cross-cutting):** Applies to titles, items, spells, and quests. One content-defined scale (e.g. common → legendary). Display, sorting, optional drop/reward tuning.

## Entity type, archetype, occupation, party role, titles
- [x] **Four layers (content-driven):** (1) **Entity type** = what can spawn; physical. (2) **Archetype** = build (from title). (3) **Occupation** = dungeoneer, merchant, boss—drives behavior. (4) **Party role** = flavor only for dungeoneers (Jack of all trades, etc.); narration/dialogue, no mechanics.
- [x] **Titles:** Can point to archetype; one equipped at a time or none. Rarity in content. Unlock = predicate list. Stat mods and rules on archetype only.
- [x] **Quests:** Main (escape, story beats) vs side (optional favors, bounties); Journal can separate. Occupations: dungeoneer (trade, quests, deeds), merchant (sells), boss (floor boss). Optional rarity for quests.
- [x] **Stat mod pattern:** Archetype/entity baseline: override or add/mul per stat. Codegen-ready.
- [x] **Content:** ~50 titles, ~50 archetypes; entityTypePack, archetypePack, titlePack, occupationPack, partyRolePack (flavor). Codegen from schema.

## Narrative flow & content scope
- [x] **Flow:** Main menu (New Game / Continue) → intro beat (bad teleport, "Guess I got to get out") → dungeon start (12 floors). Cutscenes: blocking narrative; trigger on start, room entry, quest milestone, boss.
- [x] **Content scope:** Build dialogue and narration so the 12-floor run is supported: intro, room flavour for key rooms, key cutscenes/beats, NPC dialogue. Minimum viable for 12 floors; expand later.

## Effect/types & content
- [x] Full Pokemon-style status; effect formulas in content
- [x] **Types** = PokeAPI (e.g. gen-viii). **Status defs** in content: id, name, duration, tick, stacking.
- [x] **Map items:** itemKind map, completeness, isDarkMap threshold. Sell to NPC: price = f(completeness); dark = penalty. Formula in content.

## UI taxonomy
- [x] **Gameplay UI vs display UI:** Gameplay = movement (exits, room actions), interaction view (target + actions), HUD (tick, mana, HP). Display = Map, Bag, Journal, Spellbook, Stats, Equipped, Settings (menus/overlays).
- [x] **Hierarchy:** Primitives → components → composite views → screens/flows. Nomenclature stable; build order: primitives → gameplay components → LocationView/HUD → InteractionView → display screens → MainMenu/GameScreen.

## Content inventory & reuse
- [x] **Inventory:** Rarities, entityTypes, archetypes, occupations, partyRoles, titles, predicates, spells (categoryId), spellCategories, spellProgression, evolutions (resultSpellId, minLevel), runes, rooms, actions, encounters, bosses, items, effects, quests, **presenterStrings** (action group titles, system labels, initial feed, templates). Reference shared ids; single source of truth.
- [x] **Presenter/UI strings:** No hardcoded UI text in presenter; content pack (e.g. presenter-strings.json) for action group titles, system action labels, initial feed, templates, defaults. Codegen or runtime loads it.
- [x] **Tooling:** Validate references; report orphans.

## Rebalancing & tooling
- [x] **Rebalancing:** Tuning so new content does not break difficulty/economy/fairness; iterative add → check → tune.
- [x] **Tooling deferred:** Skip balance validators/calculators for now. Ship game and content first; add tooling when we need it.

## Implementation readiness
- [x] **Ready:** Spec is enough to start. First slice: menu → intro → location view (few rooms, exits) → one interaction mode (combat or dialogue) in one room. Minimal content: one dungeon, one entity type, one encounter. Then add floors, HUD, save, other modes, menus.

## Reuse & implementation
- [x] Spell slot/pool: reusable slot list + pool picker + assign flow
- [x] **Location view:** one component for dungeon room + hub place (agreed; implement when building).
- [x] **Content contract:** what’s in packs for KAPLAY + Unreal: dungeon+rooms+exits, hub+mapLayout, runes, spells, items, traits, spawn/evolution tables, balance, dialogue, events, fame/deed rules.

---

*Next discovery:* Pick any unchecked item and we’ll talk it through and lock it in.

---

## Could elaborate further (next layer)

Ticked items that could use more detail when we implement or balance:

- **Overworld/hub** — Full JSON schema file; codegen script; example hub with 3–4 places.
- **Tile composition** — Exact schema for compositionId and tiles[] (tileset key, coordinate space); how KAPLAY renders it.
- **Level grants** — Concrete: +X mana/HP per level; slot count fixed in content (not level-gated); tie to content-schema.
- **Mana crystal economy** — Exact rewards from search/combat; golden value; rune forge creation cost.
- **Rune schema** — Full 26: ids and names (A–Z or semantic); example content JSON.
- **Evolution table** — Format: rune combo (ordered) → result (name, bonuses, effects); lookup rules.
- **Spawn table** — Example rows (enemyId, weight, depth); cap per room; how "adjacent to boss" is computed.
- **NPC–NPC AI** — Priority when multiple actions valid; how "done" is determined; round cap N.
- ~~**Summon room behavior**~~ — Done: nothing in room; combat only.
- ~~**Traits**~~ — Done: 0–100; dialogue nodes reference in content.
- ~~**Journal**~~ — Design doc: Quests + Bestiary + Guides only (no Log). Guides: Spell craft, Runes, Maps, Combat, Turn order, Gameplay/controls; journalPack/guidePack.
- ~~**Boss deal**~~ — Done: golden mana crystal only each time.
- ~~**Save format**~~ — Done: full game state = player save (location, tick, discovered, stats, inventory, slots, affinity, Fame, deeds, traits, map state, companion state, etc.).
- **Evolution table** — Created: `contracts/data/spell-evolution.json` + `.planning/schemas/spell-evolution-schema.json`. Merge spellEvolutionPack into content-source when ready.
- **Spawn table** — Created: `contracts/data/spawn-table.json` + `.planning/schemas/spawn-table-schema.json`. Merge spawnTablePack into content-source when ready.
