# Entity Stats Convention

This is the canonical stat-structure rule for DungeonBreak.

## Canonical Entity Shape

```json
{
  "combatStats": {
    "might": 8,
    "agility": 6,
    "insight": 7,
    "willpower": 5,
    "defense": 2,
    "power": 5,
    "maxHp": 100,
    "currentHp": 100,
    "maxMana": 40,
    "currentMana": 40
  },
  "skillStats": {
    "Slashing": 12,
    "Bludgeoning": 4,
    "Ranged": 8,
    "Magic": 15
  },
  "narrativeStats": {
    "Comprehension": 0.2,
    "Direction": 0.4,
    "Fame": 12,
    "Effort": 80,
    "Momentum": 0.1
  },
  "runeStats": {
    "rune_d": 2.5,
    "rune_v": 1.0
  }
}
```

## Naming Rule

- Content packs may keep authored ids like `stat_combat_might`, `stat_skill_magic`, and `trait_Fame`.
- Runtime entities do not use those ids as map keys.
- Runtime entities use plain keys taken from each lookup row's `entityKey`.
- Runes are the exception because the rune id is already the canonical runtime key.

## Authoritative Sources

- Combat stats: [lookup_combat_stats.json](C:/Users/benja/Documents/DungeonBreak-docs/packages/engine/src/escape-the-dungeon/contracts/data/lookup_combat_stats.json)
- Skill stats: [lookup_skill_stats.json](C:/Users/benja/Documents/DungeonBreak-docs/packages/engine/src/escape-the-dungeon/contracts/data/lookup_skill_stats.json)
- Narrative stats: [lookup_narrative_traits.json](C:/Users/benja/Documents/DungeonBreak-docs/packages/engine/src/escape-the-dungeon/contracts/data/lookup_narrative_traits.json)
- Rune ids: [lookup_runes.json](C:/Users/benja/Documents/DungeonBreak-docs/packages/engine/src/escape-the-dungeon/contracts/data/lookup_runes.json)
- Content-schema metadata for the four domains: [content-source.json](C:/Users/benja/Documents/DungeonBreak-docs/packages/engine/src/escape-the-dungeon/contracts/source/content-source.json)

## Generated Artifacts

- TypeScript stat keys: [stat-keys.ts](C:/Users/benja/Documents/DungeonBreak-docs/packages/engine/src/escape-the-dungeon/contracts/generated/stat-keys.ts)
- Python stat keys: [stat_keys.py](C:/Users/benja/Documents/DungeonBreak-docs/notebooks/generated/stat_keys.py)
- Python entity model: [entity_model.py](C:/Users/benja/Documents/DungeonBreak-docs/notebooks/generated/entity_model.py)

## Engine Rule

- Canonical runtime/export shape is `combatStats`, `skillStats`, `narrativeStats`, `runeStats`.
- Legacy fields still exist temporarily in the engine:
  - `attributes`, `health`, `energy`
  - `traits`, `features`
  - `runeAffinities`
- The bridge that keeps them synchronized lives in [entity-stat-domains.ts](C:/Users/benja/Documents/DungeonBreak-docs/packages/engine/src/escape-the-dungeon/core/entity-stat-domains.ts).

## Old To New Mapping

| Old field | New field |
| --- | --- |
| `attributes.might` | `combatStats.might` |
| `attributes.agility` | `combatStats.agility` |
| `attributes.insight` | `combatStats.insight` |
| `attributes.willpower` | `combatStats.willpower` |
| `health` | `combatStats.currentHp` |
| `energy` | `combatStats.currentMana` |
| `traits.*` | `narrativeStats.*` |
| `features.*` | `narrativeStats.*` |
| `runeAffinities.*` | `runeStats.*` |

## Current Gap

<details>
<summary>Migration status</summary>

- The canonical shape now exists in engine types, content metadata, generated keys, and exported runtime snapshots/status.
- The gameplay runtime still mutates some legacy fields internally.
- Some compatibility surfaces still expose the old split names, mainly action-result/event payload fields like `traitDelta` and `featureDelta`.
- That is intentional for this pass; the bridge keeps the canonical maps synchronized until the action/event/archetype flows are fully moved onto the new maps and domain-specific deltas.

</details>
