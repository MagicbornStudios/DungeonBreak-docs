# Stats inheritance and modifiers (OOP view)

**Nomenclature:** All stat/trait ids use prefixes so you can tell what something is at a glance.

| Prefix | Pack | Purpose |
|--------|------|--------|
| `stat_combat_*` | combat-stats.json | Combat stats: used when spells are cast or physical attacks are made |
| `trait_*` | narrative-traits.json | Narrative stats we call traits; same axes as thematic basis vectors (Comprehension, Empathy, etc.) |
| slot id | equipment-slots.json | Slots: weapon, armor, accessory. Items reference via equip_slot_id. |
| `item_*` | items.json | Items; equippables reference combat_stats + traits for modifiers |

Rune affinity is **not** in these packs: it lives in rune-affinity.json and is used only for **crafting** (rune forge). Gained by using spells that contain those runes.

---

## What inherits what

```
Entity (base)
  ├── Combat stats (from combat-stats.json: stat_combat_might, etc.)
  │     base value per stat_combat_* = defaultValue from pack
  ├── Narrative traits (from narrative-traits.json: trait_Comprehension, trait_Empathy, etc. = thematic basis vectors)
  │     base value per trait_* = defaultValue from pack
  │
  ├── + Archetype modifiers (archetype has combat_stat_modifiers, narrative_trait_modifiers)
  ├── + Title modifiers (title → archetype, or direct modifiers)
  └── + Equipped item modifiers (each equipped item has combat_stat_modifiers, narrative_trait_modifiers)
```

**Effective stat** = base (from pack default) + sum(archetype modifiers) + sum(title modifiers) + sum(equipped item modifiers).

- **Entity** = gets base combat stats and narrative traits. Base values come from combat-stats.json and narrative-traits.json defaults.
- **Archetype** = adds modifiers to combat stats and narrative traits. (Archetypes are attached via title or NPC definition.)
- **Title** = when equipped, applies an archetype (which has modifiers) or can have direct modifiers.
- **Item (equippable)** = when equipped in a slot, adds combat_stat_modifiers and narrative_trait_modifiers. Keys are stat_combat_* and trait_* (thematic basis vector names with trait_ prefix).

Reusability: one definition of `stat_combat_might` in combat-stats.json; every item, archetype, or title that affects might references that same id in its modifier map.

---

## File roles

| File | Role |
|------|------|
| combat-stats.json | Defines which combat stats exist (statId, name, description, defaultValue). Ids: stat_combat_*. |
| narrative-traits.json | Defines narrative stats we call traits; same as thematic basis vectors. Ids: trait_<Name>. |
| equipment-slots.json | Defines slots (slotId: weapon, armor, accessory). Items reference via equip_slot_id. |
| items.json | Equippables have equip_slot_id, rarityId, optional combat_stat_modifiers, narrative_trait_modifiers (keys = stat_combat_*, trait_*). |
| archetypes.json | Each archetype can have combat_stat_modifiers, narrative_trait_modifiers (same key convention). |
| titles.json | Title equips an archetype (which carries modifiers) or can override with direct modifiers. |

---

## Modifier shape (for items and archetypes)

```json
{
  "combat_stat_modifiers": {
    "stat_combat_might": 2,
    "stat_combat_defense": 1
  },
  "narrative_trait_modifiers": {
    "trait_Empathy": 1
  }
}
```

Keys must be ids from combat-stats.json (stat_combat_*) and narrative-traits.json (trait_* = thematic basis vector names). Values are flat deltas (can be negative).

---

## Hidden traits: Momentum

**trait_Momentum** has `hidden: true` in narrative-traits.json. Do not show it in UI.

- **Role:** Used to calculate how much experience is applied to other traits when they progress (e.g. during conversations, dialogue outcomes, or other narrative events).
- **Logic:** If the same type of behavior keeps being used (e.g. same kind of dialogue choice or action), momentum builds in that direction and **more growth** is applied to the related trait. If the player switches behavior, momentum is lost and **less growth** is applied. So: "if we are being bad and continue, we get badder faster" and vice versa for the opposite direction.
- **Implementation:** When granting trait XP, scale the amount by current momentum (or a momentum value per axis/direction). Persist momentum in entity state; decay or reset it when behavior shifts. Exact formula lives in engine/content.
