# TODO: Realtime Content Visualizer

**Status:** Pending

## Context

Content spaces can shift during playthroughs. The Space Explorer shows a static PCA projection of all content (skills, archetypes, dialogue). During play, availability changes:

- **Progression gates:** On level 12, certain content is literally on another "level" of the content space. Skills already evolved, options already chosen, branches locked.
- **Dynamic availability:** Room context, item tags, prerequisites, depth—all filter which content is reachable at a given moment.

## Needed

1. **Realtime content visualizer** — Show which content is available *at the current turn*, not the full static catalog. Content that is no longer reachable (e.g. other branch, already chosen, wrong depth) should appear differently or be filtered.
2. **Content space levels** — Model "levels" or strata of the space. E.g. level 1–5 content vs level 10+ content; content that becomes unreachable after a choice.
3. **UX:** Turn selector is currently a dropdown (not drag-with-handles). A future realtime viz would ideally reflect state as the player moves through the run.

## References

- [Space Explorer](/play/reports/spaces) — current static viz
- [Spaces doc](/docs/formulas/spaces) — vector space definitions
