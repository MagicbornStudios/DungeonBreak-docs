# Extracted Engine Assets (reference only)

This directory holds **assets extracted from the game engine** (Unreal .uasset and related). It is **reference only**—do not update these files for the game. Game data lives in **packages/engine/.../contracts/data/** and is built/bundled from there.

- **extracted/** = snapshot of engine-extracted data for reference.
- **generated/** = outputs from repo scripts (e.g. build bundles, codegen); also reference.
- **contracts/data/** = single game data root; the game loads from here.

## Slices

| Slice | Title | Source | Canonical JSON |
|-------|--------|--------|----------------|
| **traits** | Traits (dialogue) | `Content/.../ThematicBasisVectors/*.uasset` | [traits.json](./traits/traits.json) |
| **narrative-dialogs** | Narrative Dialogs | `Content/.../Narrative/Dialog/*.uasset` | [narrative-dialogs.json](./narrative-dialogs/narrative-dialogs.json) |
| **narrative-entities** | Narrative Entities | `Content/.../Narrative/Entities/**/*.uasset` | [narrative-entities.json](./narrative-entities/narrative-entities.json) |
| **economy-assets** | Economy Assets | `Content/.../Economy/**/DA_*.uasset` | [economy-assets.json](./economy-assets/economy-assets.json) |
| **maps-metadata** | Maps Metadata | `Content/.../Maps/**/*.umap` | [maps-metadata.json](./maps-metadata/maps-metadata.json) |
| **data-tables** | Data Tables | `Content/.../Characters/**/*.uasset [DataTable]` | [data-tables.json](./data-tables/data-tables.json) |
| **curve-assets** | Curve Assets | `Content/.../FC_*.uasset [CurveFloat]` | [curve-assets.json](./curve-assets/curve-assets.json) |
| **string-tables** | String Tables | `Content/.../HUD/StringTables/**/*.uasset` | [string-tables.json](./string-tables/string-tables.json) |
| **input-assets** | Input Assets | `Content/.../Input/**/*.uasset` | [input-assets.json](./input-assets/input-assets.json) |
| **ai-metadata** | AI Metadata | `Content/.../ArtificialIntelligence/**/*.uasset` | [ai-metadata.json](./ai-metadata/ai-metadata.json) |
| **hud-widget-summaries** | HUD Widget Summaries | `Content/.../HUD/**/WBP_*.uasset` | [hud-widget-summaries.json](./hud-widget-summaries/hud-widget-summaries.json) |

## Updating

If your pipeline writes extracted slices (e.g. `npm run extract:generate`), configure it to output to `extracted/engine-assets/` instead of `generated/`. Consumers should read from this directory.
