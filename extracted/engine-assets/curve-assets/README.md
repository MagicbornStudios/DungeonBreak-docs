# Curve Assets

This slice surfaces committed `CurveFloat` assets used for progression and experience tuning.
It records the binary-default float value and the span between the `Keys` payload tag and `DefaultValue`, which gives a stable review hook before deeper keyframe decoding lands.

## Summary

- Slice id: `curve-assets`
- Schema version: `2`
- Source glob: `Content/DungeonBreak/Quaterra/Experience/FC_*.uasset [class=CurveFloat]`
- Assets parsed: `2`

## Parsed Assets

| Curve | Default | Has Keys | Curve Span (bytes) | Folder | Size (bytes) | SHA256 |
| --- | --- | --- | --- | --- | --- | --- |
| `FC_AttributeExpCurve` | `0.0` | yes | 18155 | `.` | 22360 | `5e6d582a0504` |
| `FC_SkillExpCurve` | `0.0` | yes | 27038 | `.` | 31223 | `b7e17ee09a1b` |

## Validation contract

- `npm run extract:generate` rewrites this README and the paired JSON file.
- `npm run extract:verify` fails when committed output drifts from the current assets.
- CI runs both commands on every push and pull request.
