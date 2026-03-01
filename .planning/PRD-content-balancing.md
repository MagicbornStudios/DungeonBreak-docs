# PRD: Content Space Balancing

**Status:** Draft - future work

## Problem

If skills (or dialogue options) are too far in an evaluation space from vectors a player can realistically reach through gameplay, that content becomes unreachable. We need:

1. **Visibility** - Aggregated distance metrics (skills in range, minimum distance, mean distance to nearest `N`)
2. **Adjustment** - Move content vectors, gating radii, or player capability vectors so content becomes reachable
3. **Balancing** - Understand whole-space effects when one content point changes

## Aggregated Metrics (Implemented)

- **Skills in range** - Count of skills where `d(playerVector, skillVector) <= unlockRadius`
- **Minimum distance to skill** - Distance to nearest skill vector
- **Mean distance to nearest 5** - Average distance to the five closest skills
- **Reachable IDs** - Skill IDs currently in range

## Balancing Strategies

1. **Move content closer** - Reduce distance from content clusters to typical player trajectories
2. **Tune unlock radius** - Adjust skill reachability without collapsing progression
3. **Add jump mechanics** - Deeds/items/events that project vectors toward otherwise distant content
4. **Adjust action deltas** - Room influence and action deltas so typical paths traverse more useful regions

## Future Tooling

- **Balance algorithm** - Suggest vector shifts or radius changes to reach target coverage
- **Trajectory simulation** - Run `N` playthroughs, record player vectors over time, and visualize coverage
- **Content placement optimizer** - Given target "X% reachable by turn Y", suggest `vectorProfile` / `unlockRadius` updates

## References

- [Space Explorer](/play/reports/spaces) - reachability panel and distance metrics
- [Spaces doc](/docs/formulas/spaces) - canonical vector/space definitions
- [Formulas](/docs/formulas) - unlock rule `d(playerVector, skillVector) <= unlockRadius`
