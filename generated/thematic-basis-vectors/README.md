# Thematic Basis Vectors

This is the first extraction slice and the baseline for the shared Phase 08 schema.
It validates the Unreal package tag and records deterministic asset metadata for review in GitHub.

## Summary

- Slice id: `thematic-basis-vectors`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Narrative/ThematicBasisVectors/*.uasset`
- Assets parsed: `11`

## Parsed Assets

| Asset | Class | Size (bytes) | SHA256 | Package tag | UE4 version | Licensee version |
| --- | --- | --- | --- | --- | --- | --- |
| `Comprehension` | `NarrativeBasisVector` | 1605 | `4b9a08430064` | `0x9E2A83C1` | 864 | 522 |
| `Constraint` | `NarrativeBasisVector` | 1578 | `3a862f6140a1` | `0x9E2A83C1` | 864 | 522 |
| `Construction` | `NarrativeBasisVector` | 1596 | `ee4283403f2e` | `0x9E2A83C1` | 864 | 522 |
| `Conviction` | `NarrativeBasisVector` | 2214 | `25f05e543ed0` | `0x9E2A83C1` | 864 | 522 |
| `Direction` | `Conviction'` | 1473 | `61d135ffdf86` | `0x9E2A83C1` | 864 | 522 |
| `Empathy` | `NarrativeBasisVector` | 1551 | `174a3ac3289a` | `0x9E2A83C1` | 864 | 522 |
| `Equilibrium` | `NarrativeBasisVector` | 1587 | `cccfc73608e8` | `0x9E2A83C1` | 864 | 522 |
| `Freedom` | `NarrativeBasisVector` | 3034 | `8f833fd8b6e8` | `0x9E2A83C1` | 864 | 522 |
| `Levity` | `NarrativeBasisVector` | 1542 | `5e7bea153ee3` | `0x9E2A83C1` | 864 | 522 |
| `Projection` | `NarrativeBasisVector` | 1578 | `aa99d1987e65` | `0x9E2A83C1` | 864 | 522 |
| `Survival` | `NarrativeBasisVector` | 1560 | `57df97735b8f` | `0x9E2A83C1` | 864 | 522 |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
