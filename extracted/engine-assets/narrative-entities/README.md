# Narrative Entities

Phase 09 extends coverage into narrative entities and surfaces redirectors alongside authored entity definitions.
The slice highlights thematic-vector coverage, `StartingCoordinates`, and alias assets that point at canonical entity defs.

## Summary

- Slice id: `narrative-entities`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Narrative/Entities/**/*.uasset`
- Assets parsed: `15`

## Parsed Assets

| Asset | Role | Redirect target | Thematic vectors | Start coords | Class | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `00_Kaiza` | `redirector` | `Kaiza` | - | no | `ObjectRedirector` | 1452 | `5bd7959068db` |
| `01_Nolem` | `redirector` | `Nolem` | - | no | `ObjectRedirector` | 1452 | `a4040ea86c96` |
| `02_Azzolan` | `redirector` | `Azzolan` | - | no | `ObjectRedirector` | 1470 | `c6983f6b6675` |
| `03_Magnus` | `redirector` | `Magnus` | - | no | `ObjectRedirector` | 1461 | `ce8c82e8339d` |
| `04_Hector` | `redirector` | `Hector` | - | no | `ObjectRedirector` | 1461 | `affbdc9781bc` |
| `05_Shade` | `redirector` | `Shade` | - | no | `ObjectRedirector` | 1452 | `07d6ce53de33` |
| `06_Garrick` | `redirector` | `Garrick` | - | no | `ObjectRedirector` | 1470 | `e3e02b095696` |
| `Azzolan` | `entity-definition` | `-` | - | no | `NarrativeEntityDef` | 1222 | `796c7fe2613c` |
| `Garrick` | `entity-definition` | `-` | `Comprehension`, `Constraint`, `Conviction`, `Empathy`, `Equilibrium`, `Freedom`, `Levity`, `Survival` | yes | `NarrativeEntityDef` | 2376 | `41316de294af` |
| `Hector` | `entity-definition` | `-` | - | no | `NarrativeEntityDef` | 1217 | `36176a9ad6d5` |
| `Kaiza` | `entity-definition` | `-` | `Comprehension`, `Constraint`, `Construction`, `Conviction`, `Empathy`, `Equilibrium`, `Freedom`, `Levity`, `Projection`, `Survival` | yes | `NarrativeEntityDef` | 2618 | `a3278dddd66e` |
| `Magnus` | `redirector` | `Thrudder` | - | no | `ObjectRedirector` | 1454 | `b0ce93bd53bf` |
| `Nolem` | `entity-definition` | `-` | - | no | `NarrativeEntityDef` | 1212 | `12dd424b00ab` |
| `Shade` | `entity-definition` | `-` | - | no | `NarrativeEntityDef` | 1212 | `fa10f7046d92` |
| `Thrudder` | `entity-definition` | `-` | `Comprehension`, `Constraint`, `Construction`, `Conviction`, `Empathy`, `Equilibrium`, `Freedom`, `Levity`, `Projection`, `Survival` | yes | `NarrativeEntityDef` | 2633 | `55cd85c6ccdb` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
