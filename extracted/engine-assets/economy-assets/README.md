# Economy Assets

This slice surfaces item and equipable data assets used by the current economy prototype.
It highlights display names, mesh references, gameplay effects, and equip sockets directly from committed binaries.

## Summary

- Slice id: `economy-assets`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Economy/**/DA_*.uasset`
- Assets parsed: `5`

## Parsed Assets

| Asset | Role | Display | Mesh | Equipable | Socket | Effects | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DA_WeaponEquip_RightHand` | `equipable-definition` | `-` | `-` | `-` | `weapon_r` | - | 1332 | `c374dd4649b7` |
| `DA_Bow` | `item-definition` | `Splintered Longbow` | `SK_Bow` | `DA_WeaponEquip_Bow` | `-` | `GE_Bow_Equip` | 2556 | `7c93e58370ba` |
| `DA_WeaponEquip_Bow` | `equipable-definition` | `-` | `-` | `-` | `weapon_l` | - | 1597 | `556a70dde7e0` |
| `DA_Knife` | `item-definition` | `Rusty Knife` | `SM_Knife` | `DA_WeaponEquip_RightHand` | `-` | `GE_Knife_Equip` | 2338 | `861ee9610aea` |
| `DA_Sword` | `item-definition` | `Rusty Blade` | `SM_Sword` | `DA_WeaponEquip_RightHand` | `-` | `GE_Sword_Equip` | 2338 | `df2b528d5935` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
