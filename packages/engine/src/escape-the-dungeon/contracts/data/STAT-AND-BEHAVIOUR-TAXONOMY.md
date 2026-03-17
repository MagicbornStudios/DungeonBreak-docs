# Stat and behaviour taxonomy

**Single source of truth** for how we name and group stats, currency, room behaviour, and rune progression. Gameplay design, content schemas, and engine code should align with this document.

---

## 1. Combat stats

**Definition:** Numeric stats used for combat resolution: damage, defence, turn order, and current/max pools for health and mana.

| Stat | Meaning | Engine (current) | Content lookup |
|------|---------|------------------|----------------|
| Might | Physical attack strength | `attributes.might` | `stat_combat_might` |
| Agility | Speed and accuracy | `attributes.agility` | `stat_combat_agility` |
| Insight | Mental/spell accuracy (engine name) | `attributes.insight` | — |
| Willpower | Mental resilience (engine name) | `attributes.willpower` | — |
| Defense | Damage reduction | — | `stat_combat_defense` |
| Power | Spell damage scaling | — | `stat_combat_power` |
| **Current HP** | Health pool (in-combat and overworld) | `entity.health` | — |
| **Current mana** | Mana pool for casting | `entity.energy` (exposed as `mana` in status) | — |
| Max HP | Maximum health (for formulas/UI) | Derived / content | `stat_combat_max_hp` |
| Max mana | Maximum mana (for formulas/UI) | Derived / content | `stat_combat_max_mana` |

**Canonical content:** `lookup_combat_stats.json` (combat-stats pack). Engine uses a fixed `AttributeBlock` (might, agility, insight, willpower) plus `health` and `energy`; content may define additional combat stats (e.g. defense, power, max_hp, max_mana) for formulas or future use. When we refer to “combat stats,” we mean this set: attributes + current HP + current mana (+ optional max/mods from content).

---

## 2. Narrative / progression stats (named set)

**Definition:** A single set of named numeric variables used for dialogue, unlocks, narration, archetype fit, and progression. **We do not split these into “traits” vs “features” in the taxonomy**—they are one named set. (The engine may still use two internal maps for legacy reasons; the canonical list is below.)

**Canonical list (15 names):**

| Name | Typical use |
|------|-------------|
| Comprehension | Dialogue, fog formulas, understanding |
| Constraint | Discipline, control |
| Construction | Building, crafting |
| Direction | Purpose, drive |
| Empathy | Rapport, dialogue tone |
| Equilibrium | Balance, steadiness |
| Freedom | Liberty, escape |
| Levity | Lightness, charm |
| Projection | Reach, influence |
| Survival | Endurance, persistence |
| **Fame** | Renown, unlock thresholds, livestream reward |
| **Effort** | Exertion, livestream cost, action costs |
| **Awareness** | Perception, fog formulas, alertness |
| **Guile** | Cunning, dialogue outcomes |
| **Momentum** | “Repeat behaviour” growth; hidden in UI when desired |

**Canonical content:** `lookup_narrative_traits.json` (narrative-traits pack). IDs: `trait_<Name>` (e.g. `trait_Fame`, `trait_Comprehension`). Same names are used in archetype profiles (vectorProfile / featureProfile in content_archetypes.json), dialogue conditions, and event/effect deltas. Do not use the word "features" to mean these stats in design, planning, or user-facing text; use "narrative stats", "progression stats", or "traits". Reserve "feature" for room type only. Do not introduce a second label (e.g. “features”) for a subset of this list in design or schema docs—call them “narrative stats” or “progression stats” or “the named stat set.”

**Options and dialogue (later phase):** Current phase uses static, authored options (fixed dialogue branches, static dropdowns). A later phase will use these narrative stats to drive which options appear—e.g. dialogue options gated or weighted by stat thresholds, then optionally similarity/clustering for emergent option sets. Start with dialogue; expand to other option surfaces as needed.

---

## 3. Rune affinity

**Definition:** Per-rune progression: how much the entity has used or aligned with each rune (e.g. for spell crafting and evolution). **Not** part of the narrative-stat set.

- **Engine:** `entity.runeAffinities` — `Record<string, number>` keyed by rune id (e.g. `rune_d`, `rune_v`).
- **Content:** `config_rune_affinity.json` — gain per cast, cap, etc.
- **Use:** Spell evolution thresholds, forge behaviour, optional UI (e.g. “Rune affinity” section in Stats).

---

## 4. Currency

**Definition:** Mana crystals (and optionally other currency items). **Not** a numeric stat on the entity.

- **Representation:** Currency is **inventory-based**. Mana crystals are items in `entity.inventory` with tags that include `"currency"` (and typically `"loot"`). “How much currency” = count or sum of those items (by item id or tag).
- **Use:** Rune forge costs, shop purchases, boss deal (golden mana crystal). Content defines item ids (e.g. mana_crystal, golden_mana_crystal) and tags; engine resolves from inventory.

---

## 5. Room features (room type / behaviour)

**Definition:** The **kind of room** — what the room is and what behaviours/actions it allows. **Not** entity stats. “Feature” here means “room feature” only.

**Canonical list (room types):** corridor, start, exit, stairs_up, stairs_down, escape_gate, training, dialogue, rest, treasure, rune_forge, combat.

**Use:** Gates which actions are available (e.g. rest only in rest rooms, rune forge only in rune_forge rooms), dialogue prerequisites (`requiresRoomFeature`), and narrative/UI (e.g. “combat room,” “rest room”). Engine: `room.feature` (type `RoomFeature`). Content: room definitions and room-templates reference the same enum. When we say “room features,” we mean **room type / behaviour** only—never the narrative stat set (Fame, Guile, etc.).

---

## Summary table

| Category | What it is | Where it lives (engine) | Canonical content |
|----------|------------|--------------------------|-------------------|
| **Combat stats** | Attributes + current HP + current mana (+ optional max/mod from content) | `entity.attributes`, `entity.health`, `entity.energy` | lookup_combat_stats.json |
| **Narrative / progression stats** | Single named set (15 names) for dialogue, unlocks, archetype, progression | `entity.traits`, `entity.features` (two maps, same logical set) | lookup_narrative_traits.json |
| **Rune affinity** | Per-rune progression | `entity.runeAffinities` | config_rune_affinity.json |
| **Currency** | Mana crystals (and similar) as items | `entity.inventory` (items with currency tag) | content_items.json, tags |
| **Room features** | Room type / behaviour (what you can do there) | `room.feature` | content_rooms.json, content_room_templates.json |

---

## Cross-references

- **File and ID naming:** `NAMING-CONVENTION.md` in this directory.
- **Gameplay design:** `.planning/GAMEPLAY-DESIGN.xml` — should reference this taxonomy for stat and behaviour definitions and avoid redefining stats with different names or groupings.
