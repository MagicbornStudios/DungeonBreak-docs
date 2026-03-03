# AI Metadata

This slice surfaces the committed AI-facing assets that define decision-state context outside Blueprint graphs.
It extracts blackboard entry names from binary tags and captures lightweight StateTree state-name hints from the token stream.

## Summary

- Slice id: `ai-metadata`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Characters/Common/ArtificialIntelligence/**/*.uasset`
- Assets parsed: `2`

## Parsed Assets

| Asset | Class | Entries / States | Modules | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- |
| `BB_Character` | `BlackboardData` | `Self`, `Target`, `TargetLocation`, `SelfActor` | - | 3361 | `2fe69bfe5981` |
| `ST_Character` | `StateTree` | `Acquire Target`, `Combat`, `Interact Target` | `CoreUObject`, `GameplayTags`, `PropertyBindingUtils`, `StateTreeEditorModule`, `StateTreeModule`, `DungeonBreak`, `Engine`, `GameplayStateTreeModule` | 50727 | `08f8196706be` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
