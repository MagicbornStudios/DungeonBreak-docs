# Game Value Concept

**Purpose:** Define a measurable statistic for the *conceptual* worth of the game design. Implementation value varies; this doc frames the analysis loop.

---

## Conceptual vs Implementation Value

| Dimension | Conceptual value | Implementation value |
|-----------|------------------|----------------------|
| **Scope** | Design space, playthroughs, emergent metrics | Specific build (2D/3D, engine, monetization) |
| **Measurable** | Replayability, excitement, emergent behaviors, action coverage | Revenue, engagement, technical quality |
| **Implementation** | Varies | Varies |

The **Game Value** page analyzes spaces and playthroughs to derive metrics that approximate conceptual worth. The actual implementation (Escape the Dungeon vs DungeonBreak) affects real-world value but not the conceptual design quality.

---

## Implementations

| Implementation | Engine | Notes | Relative value |
|----------------|--------|------|----------------|
| **Escape the Dungeon** | Kaplay (basic 2D) | Current reference; no monetization; small scope | Low |
| **DungeonBreak** | Unreal Engine | 3D; more systems/behaviors; larger scope | High (target) |

Moving from 2D to 3D (DungeonBreak) will require defining additional systems and behaviors in the design space. The conceptual analysis informs that expansion.

---

## Measurable Metrics (Tooling PRD)

- **Replayability:** Action diversity entropy, coverage ratio, unique action–room pairs
- **Excitement:** Per-turn scores, rolling average, mean excitement
- **Emergent:** Novel event combinations, action-type entropy

These feed the Game Value page tabs and Space Explorer for visualizing content and playthrough structure.

---

## Planning Loop

1. Run playthroughs (browser or MCP agent).
2. Analyze reports (replayability, excitement, emergent).
3. Explore spaces (PCA, K-means, Reachability).
4. Adjust policies/content.
5. Re-run and compare.

Phase 30 delivers the Game Value page and browser-side analysis tools. Future phases extend the loop for DungeonBreak 3D expansion.
