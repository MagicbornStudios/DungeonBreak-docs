# Maps Metadata

This slice captures high-value map metadata from committed `.umap` packages.
It highlights world-partition markers, narrative entity references, lighting, and gameplay-facing component signals.

## Summary

- Slice id: `maps-metadata`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Maps/**/*.umap`
- Assets parsed: `6`

## Parsed Assets

| Map | Folder | Entities | Partitioned | Navigation | Landscape | Lighting | Gameplay | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AnimStudio` | `.` | - | yes | yes | no | yes | no | 13466 | `c5ce5fb7e221` |
| `Gym_OneCharacter` | `Gyms` | - | no | yes | yes | yes | yes | 1600769 | `b9cae54c04ae` |
| `Gym_OneParty` | `Gyms` | `Garrick`, `Thrudder` | no | yes | yes | yes | yes | 1628046 | `e34ac27434bf` |
| `Gym_TwoCharacters` | `Gyms` | `Thrudder` | no | yes | yes | yes | yes | 1606856 | `6de6b6e3cfd2` |
| `Main` | `.` | `Garrick`, `Thrudder` | no | yes | yes | yes | yes | 42508872 | `eb0757648565` |
| `OpenWorld` | `.` | - | yes | yes | no | yes | no | 13459 | `452afd6f31c8` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
