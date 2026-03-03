# Input Assets

This slice surfaces the committed Enhanced Input assets used by the browser-first prototype and Unreal runtime.
It captures value types, player-mappability flags, referenced actions, and exposed key names directly from the binary token stream.

## Summary

- Slice id: `input-assets`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Input/**/*.uasset [class=InputAction|InputMappingContext]`
- Assets parsed: `7`

## Parsed Assets

| Asset | Role | Value Type | Mappable | Actions | Keys | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `_InputMapping` | `mapping-context` | `-` | yes | `IA_CameraZoom`, `IA_Interact`, `IA_Mod_Shift`, `IA_MultiSelect`, `IA_Select`, `IA_ToggleCharacterMenu` | `LeftMouseButton`, `LeftShift`, `MouseWheelAxis`, `RightMouseButton` | 4722 | `39370016db12` |
| `IA_CameraZoom` | `input-action` | `Axis1D` | yes | `IA_CameraZoom` | - | 1641 | `241eab105780` |
| `IA_Interact` | `input-action` | `Boolean` | yes | `IA_Interact` | - | 1435 | `79e6c4959a5e` |
| `IA_Mod_Shift` | `input-action` | `Boolean` | no | `IA_Mod_Shift` | - | 1486 | `3486aa24c851` |
| `IA_MultiSelect` | `input-action` | `Boolean` | yes | `IA_MultiSelect`, `IA_Mod_Shift` | - | 1931 | `c268594e335e` |
| `IA_Select` | `input-action` | `Boolean` | yes | `IA_Select` | - | 1425 | `b412d4de08a3` |
| `IA_ToggleCharacterMenu` | `input-action` | `Boolean` | yes | `IA_ToggleCharacterMenu` | - | 1490 | `275ee46f6548` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
