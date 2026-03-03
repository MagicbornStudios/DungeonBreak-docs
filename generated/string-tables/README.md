# String Tables

This slice surfaces committed `StringTable` assets used by the current HUD.
It infers label keys and display strings directly from the binary token stream so UI copy can be reviewed outside Unreal.

## Summary

- Slice id: `string-tables`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/HUD/StringTables/**/*.uasset [class=StringTable]`
- Assets parsed: `1`

## Parsed Assets

| Table | Entries | Folder | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- |
| `ST_CharacterMenu` | `AttributeLabel=Attributes`, `SkillLabel=Skills`, `CallingLabel=Traits` | `.` | 1668 | `9d42537a2006` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
