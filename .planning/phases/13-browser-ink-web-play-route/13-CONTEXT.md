# Phase 13 Context - Browser Play Route (Recovery Pivot)

## Desired Outcome

Ship **Escape the Dungeon** as a browser-playable 3-column experience at `/play` inside `docs-site`, with behavior parity tracked against Python baseline and dual publish gates before release.

## Constraints

- No gameplay backend service.
- Keep docs homepage docs-first; add prominent `/play` CTA.
- Python implementation remains baseline while parity closes.
- Browser embeddings v1 must be deterministic and lightweight (hash projection).
- Loop-based development artifacts must be updated each iteration.

## Non-Goals

- Replacing Python terminal binary target.
- Shipping model-weight browser embeddings in this phase.
- Full content-scale completion (Phase 14).

## Risks

- UI drift risk while pivoting from terminal to button-first gameplay.
- Drift between Python baseline and TS runtime behavior.
- CI runtime cost (build + e2e + terminal artifacts).

## Mitigations

- Explicit parity matrix with required rows.
- Deterministic tests for world/action/skill/event slices.
- Browser e2e smoke and terminal workflow gating by browser checks.
