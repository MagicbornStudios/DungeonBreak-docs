# Data Tables

This slice surfaces the committed `UDataTable` assets that currently define character attributes, skills, and stats.
It captures row structs, column keys, row names, and decoded `AttributeMetaData` values directly from the binary package without requiring Unreal to load the asset.

## Summary

- Slice id: `data-tables`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Characters/**/*.uasset [class=DataTable]`
- Assets parsed: `4`

## Parsed Assets

| Table | Struct | Rows | Base Values | Columns | Folder | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `DefaultAttributes` | `AttributeMetaData` | `Dexterity`, `Intellect`, `Strength` | `Dexterity=10`, `Intellect=10`, `Strength=10` | `BaseValue`, `bCanStack`, `DerivedAttributeInfo`, `MinValue`, `MaxValue` | `Common/AttributeTables` | 2638 | `2b1ec401300a` |
| `DefaultSkills` | `AttributeMetaData` | `Blunt`, `Finesse`, `GeosentMagic`, `Ranged`, `Slashing`, `SpatialMagic` | `Blunt=8`, `Finesse=8`, `GeosentMagic=8`, `Ranged=8`, `Slashing=8`, `SpatialMagic=8` | `BaseValue`, `bCanStack`, `DerivedAttributeInfo`, `MinValue`, `MaxValue` | `Common/AttributeTables` | 3160 | `973453a408f7` |
| `DefaultStats` | `AttributeMetaData` | `Armor`, `AttackSpeed`, `Dodge`, `Fortitude`, `Health`, `Mana`, `MaxDamage`, `MaxHealth`, `MaxMana`, `MinDamage` | `Armor=0`, `AttackSpeed=1`, `Dodge=0`, `Fortitude=0`, `Health=100`, `Mana=15`, `MaxDamage=8`, `MaxHealth=100`, `MaxMana=100`, `MinDamage=5` | `BaseValue`, `bCanStack`, `DerivedAttributeInfo`, `MinValue`, `MaxValue` | `Common/AttributeTables` | 3823 | `95137877a7f3` |
| `DummyStats` | `AttributeMetaData` | `Armor`, `AttackSpeed`, `Dodge`, `Fortitude`, `Health`, `Mana`, `MaxDamage`, `MaxHealth`, `MaxMana`, `MinDamage` | `Armor=10`, `AttackSpeed=1`, `Dodge=10`, `Fortitude=10`, `Health=99999`, `Mana=15`, `MaxDamage=8`, `MaxHealth=99999`, `MaxMana=100`, `MinDamage=5` | `BaseValue`, `bCanStack`, `DerivedAttributeInfo`, `MinValue`, `MaxValue` | `TrainingDummy` | 3815 | `a212e64038f8` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
