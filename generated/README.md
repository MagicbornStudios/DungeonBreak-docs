# Generated Docs

This directory is the canonical review surface for committed DungeonBreak asset extraction.

## Slices

| Slice | Title | Assets | Source glob | Review docs | Canonical JSON |
| --- | --- | --- | --- | --- | --- |
| `thematic-basis-vectors` | Thematic Basis Vectors | `11` | `Content/DungeonBreak/Narrative/ThematicBasisVectors/*.uasset` | [README](./thematic-basis-vectors/README.md) | [JSON](./thematic-basis-vectors/thematic-basis-vectors.json) |
| `narrative-dialogs` | Narrative Dialogs | `9` | `Content/DungeonBreak/Narrative/Dialog/*.uasset` | [README](./narrative-dialogs/README.md) | [JSON](./narrative-dialogs/narrative-dialogs.json) |
| `narrative-entities` | Narrative Entities | `15` | `Content/DungeonBreak/Narrative/Entities/**/*.uasset` | [README](./narrative-entities/README.md) | [JSON](./narrative-entities/narrative-entities.json) |
| `economy-assets` | Economy Assets | `5` | `Content/DungeonBreak/Economy/**/DA_*.uasset` | [README](./economy-assets/README.md) | [JSON](./economy-assets/economy-assets.json) |
| `maps-metadata` | Maps Metadata | `6` | `Content/DungeonBreak/Maps/**/*.umap` | [README](./maps-metadata/README.md) | [JSON](./maps-metadata/maps-metadata.json) |
| `data-tables` | Data Tables | `4` | `Content/DungeonBreak/Characters/**/*.uasset [class=DataTable]` | [README](./data-tables/README.md) | [JSON](./data-tables/data-tables.json) |
| `curve-assets` | Curve Assets | `2` | `Content/DungeonBreak/Quaterra/Experience/FC_*.uasset [class=CurveFloat]` | [README](./curve-assets/README.md) | [JSON](./curve-assets/curve-assets.json) |
| `string-tables` | String Tables | `1` | `Content/DungeonBreak/HUD/StringTables/**/*.uasset [class=StringTable]` | [README](./string-tables/README.md) | [JSON](./string-tables/string-tables.json) |
| `input-assets` | Input Assets | `7` | `Content/DungeonBreak/Input/**/*.uasset [class=InputAction|InputMappingContext]` | [README](./input-assets/README.md) | [JSON](./input-assets/input-assets.json) |
| `ai-metadata` | AI Metadata | `2` | `Content/DungeonBreak/Characters/Common/ArtificialIntelligence/**/*.uasset` | [README](./ai-metadata/README.md) | [JSON](./ai-metadata/ai-metadata.json) |
| `hud-widget-summaries` | HUD Widget Summaries | `10` | `Content/DungeonBreak/HUD/**/WBP_*.uasset` | [README](./hud-widget-summaries/README.md) | [JSON](./hud-widget-summaries/hud-widget-summaries.json) |

## Validation contract

- `npm run extract:generate` rewrites this index and every registered slice.
- `npm run extract:verify` fails when this index or any slice output drifts from the committed assets.
- CI runs tests, regeneration, and drift detection on every push and pull request.
