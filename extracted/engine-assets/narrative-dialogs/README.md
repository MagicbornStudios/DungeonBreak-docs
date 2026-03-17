# Narrative Dialogs

Phase 08 extends the parser to a richer asset family.
These dialog assets expose class identity, inferred label/phrase text, and referenced thematic vectors.

## Summary

- Slice id: `narrative-dialogs`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Narrative/Dialog/*.uasset`
- Assets parsed: `9`

## Parsed Assets

| Asset | Label | Phrase | Thematic vectors | Class | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- |
| `DA_BeReadyToDie` | `Warn` | `Be ready to die` | `Empathy`, `Freedom`, `Levity`, `Projection`, `Survival` | `NarrativeDialogDef` | 2602 | `f4ddadc410f9` |
| `DA_Goodbye` | `Depart` | `Goodbye` | `Conviction`, `Freedom` | `NarrativeDialogDef` | 2290 | `0a339b35d376` |
| `DA_Hello` | `Greet` | `Hello` | `Conviction`, `Levity` | `NarrativeDialogDef` | 2165 | `44ce9ebbba7f` |
| `DA_HumbleBrag` | `Brag` | `-` | `Freedom`, `Levity`, `Projection`, `Survival` | `NarrativeDialogDef` | 2472 | `579ed328ef15` |
| `DA_KillMeFirst` | `Threaten` | `-` | `Conviction`, `Freedom`, `Projection`, `Survival` | `NarrativeDialogDef` | 2517 | `bfe377820db3` |
| `DA_ManaDynamics` | `Educate` | `-` | `Comprehension`, `Equilibrium`, `Levity` | `NarrativeDialogDef` | 2458 | `c213a890a97c` |
| `DA_OminousGoodbye` | `Disparage` | `I hope you face increasingly harder times this year.` | `Constraint`, `Levity`, `Projection`, `Survival` | `NarrativeDialogDef` | 2592 | `430196990f4b` |
| `DA_SplendidAdventurer` | `Proclaim` | `-` | `Constraint`, `Conviction`, `Freedom`, `Projection` | `NarrativeDialogDef` | 2604 | `c9c5aed74e34` |
| `DA_StopTheDungeonBreaks` | `Proclaim` | `I will stop the Dungeon Breaks!` | `Constraint`, `Conviction`, `Freedom`, `Projection`, `Survival` | `NarrativeDialogDef` | 2728 | `db742be97d97` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
