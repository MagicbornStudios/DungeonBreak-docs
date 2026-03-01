# PRD: Content Space Balancing

**Status:** Draft — future work

## Problem

If skills (or dialogue options, etc.) are too far in trait/feature space from what the player can achieve through in-game actions, they become unreachable. We need:

1. **Visibility** — See aggregated distance metrics (skills in range, min distance, mean distance to nearest N)
2. **Adjustment** — Move content or player capability so content becomes reachable
3. **Balancing** — Moving one piece of content affects the whole space; we need tooling to understand and tune

## Aggregated Metrics (Implemented)

- **Skills in range** — Count of skills where `d(player, skill) ≤ unlockRadius`
- **Min distance to skill** — Distance to nearest skill
- **Mean distance to nearest 5** — Average of distances to 5 closest skills
- **Reachable IDs** — List of skill IDs currently in range

## Balancing Strategies

1. **Move content closer** — Reduce distance from content cluster to typical player trajectories
2. **Increase unlock radius** — Make skills easier to reach (may oversimplify progression)
3. **Add jump mechanics** — Deeds, items, or events that project the player toward distant content
4. **Adjust action deltas** — Room influence, action traitDelta, featureDelta — so typical play paths reach more content

## Future Tooling

- **Balance algorithm** — Suggest content shifts or radius changes to achieve target reachability
- **Trajectory simulation** — Run N playthroughs, record player positions over time; visualize coverage
- **Content placement optimizer** — Given target "X% of skills reachable by turn Y", suggest vectorProfile / unlockRadius changes

## References

- [Space Explorer](/play/reports/spaces) — Reachability panel, distance metrics
- [Spaces doc](/docs/formulas/spaces) — Vector space definitions
- [Formulas](/docs/formulas) — Skill unlock formula `d ≤ unlockRadius`
