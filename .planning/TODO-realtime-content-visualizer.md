# TODO: Realtime Content Visualizer

**Status:** Pending

## Context

Content spaces shift during a playthrough. The current Space Explorer shows a static PCA projection of catalog content (skills, archetypes, dialogue). During runtime, availability changes because of gates and state:

- **Progression gates:** Content can be on later strata of progression and therefore not currently reachable.
- **Branch locks:** Already selected branches or evolved skills can remove alternative paths.
- **Dynamic filters:** Room context, item tags, prerequisites, and depth all affect live reachability.

## Needed

1. **Realtime availability layer** - Show content available at the current turn, not just full-catalog positions.
2. **Space strata model** - Represent progression levels/strata and branch exclusions explicitly.
3. **State-coupled UX** - As turn selection changes, reflect current vector position and currently reachable regions immediately.

## References

- [Space Explorer](/play/reports/spaces) - current static visualization
- [Spaces doc](/docs/formulas/spaces) - canonical vector/space definitions
