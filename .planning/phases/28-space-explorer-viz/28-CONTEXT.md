# Phase 28 Context: Space Explorer — 3D Viz, Leva Controls, KNN, Deltas

## Outcome

Reporting-focused space visualization. Player position in trait/feature/skill/dialogue/archetype spaces shown in 3D (PCA projection). Leva sliders drive position; KNN shows nearest content. Report + turn selector loads player state. Color by archetype/branch. Deltas (effects, buffs) displayed.

## Constraints

- No game UI — strict reporting only
- Match current theme (shadcn/dark)
- Plotly.js for 3D (zoom, rotate, click)
- Layout: left hero (name), center viz, right Leva (sections by space)

## Non-goals

- Real-time game playback in this view
- Kaplay integration

## DoD Signals

- /play/reports/spaces (or /reports/spaces) renders
- All spaces (skill, dialogue, archetype, combined) with 3D points
- Leva sliders for traits/features; player point updates in viz
- KNN list for nearest content
- Report + turn loads player; sliders sync
