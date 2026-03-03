# HUD Widget Summaries

This slice surfaces the committed HUD-facing Widget Blueprints as review-friendly layout summaries.
It captures panel/widget markers, string-table dependencies, and cross-widget references to support UI design iteration outside Unreal.

## Summary

- Slice id: `hud-widget-summaries`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/HUD/**/WBP_*.uasset`
- Assets parsed: `10`

## Parsed Assets

| Widget | Layout Markers | String Tables | Referenced Widgets | Folder | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- |
| `WBP_MouseCursor` | `CanvasPanel`, `Image` | - | - | `MouseCursor` | 27443 | `b3daf11a5e83` |
| `WBP_MouseRenderTool` | `CanvasPanel`, `Button` | - | - | `MouseCursor` | 44154 | `0e9f38777d32` |
| `WBP_DialogBubble` | `CanvasPanel`, `Overlay`, `Image` | - | - | `Narrative/Dialog` | 32851 | `795e054c9d81` |
| `WBP_DialogCard` | `CanvasPanel`, `Border` | - | - | `Narrative/Dialog` | 47459 | `7797e45aa12e` |
| `WBP_DialogDrawer` | `CanvasPanel`, `HorizontalBox`, `Border` | - | `WBP_DialogCard` | `Narrative/Dialog` | 45169 | `5d40b36300be` |
| `WBP_ProgressionBar` | `Overlay`, `HorizontalBox`, `SizeBox` | - | - | `Quaterra/Characters` | 31115 | `47b66123e947` |
| `WBP_CharacterMenu` | `Overlay`, `VerticalBox`, `Border` | `ST_CharacterMenu`, `ST_CharacterMenu` | `WBP_ProgressionBar`, `WBP_CharacterTraitBlock` | `.` | 40487 | `7e7c1173d8b2` |
| `WBP_CharacterMenuContainer` | `HorizontalBox` | - | `WBP_CharacterMenu` | `.` | 27749 | `37145a49997c` |
| `WBP_CharacterTraitBlock` | `VerticalBox`, `ScrollBox`, `SizeBox` | - | - | `.` | 28522 | `1e315d13b6d7` |
| `WBP_HUDRoot` | `CanvasPanel` | - | `WBP_DialogDrawer`, `WBP_CharacterMenuContainer` | `.` | 27625 | `eb8990c74d30` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
