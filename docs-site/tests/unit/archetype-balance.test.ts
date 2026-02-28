import { describe, expect, test } from "vitest";
import {
  ARCHETYPE_PACK,
  CANONICAL_SEED_V1,
  DIALOGUE_PACK,
  GameEngine,
  simulateBalanceBatch,
  simulateLongRunSuite,
  SKILL_PACK,
} from "@dungeonbreak/engine";

describe("phase 11 archetype + balance systems", () => {
  test("content packs expose expanded archetypes, dialogue, and skill trees", () => {
    expect(ARCHETYPE_PACK.archetypes.length).toBeGreaterThanOrEqual(6);
    expect(DIALOGUE_PACK.clusters.length).toBeGreaterThanOrEqual(5);
    const optionCount = DIALOGUE_PACK.clusters.reduce((sum, cluster) => sum + cluster.options.length, 0);
    expect(optionCount).toBeGreaterThanOrEqual(12);
    expect(SKILL_PACK.skills.length).toBeGreaterThanOrEqual(12);
  });

  test("engine status exposes archetype heading and compass scores", () => {
    const game = GameEngine.create(CANONICAL_SEED_V1);
    game.dispatch({ actionType: "rest", payload: {} });
    game.dispatch({ actionType: "search", payload: {} });

    const status = game.status();
    expect(typeof status.archetypeHeading).toBe("string");
    expect(Array.isArray(status.archetypeScores)).toBe(true);
    expect((status.archetypeScores as unknown[]).length).toBeGreaterThan(0);
  });

  test("balance harness produces deterministic aggregate output shape", () => {
    const runA = simulateBalanceBatch([CANONICAL_SEED_V1], 12);
    const runB = simulateBalanceBatch([CANONICAL_SEED_V1], 12);

    expect(runA.runs).toHaveLength(1);
    expect(runA.turnsPerRun).toBe(12);
    expect(runA.aggregate.averageLevel).toBeGreaterThanOrEqual(1);
    expect(Object.keys(runA.aggregate.actionUsage).length).toBeGreaterThan(0);
    expect(Object.keys(runA.aggregate.archetypeDistribution).length).toBeGreaterThan(0);

    expect(runA.runs[0]?.actionUsage).toEqual(runB.runs[0]?.actionUsage);
    expect(runA.runs[0]?.finalArchetype).toBe(runB.runs[0]?.finalArchetype);
    expect(runA.runs[0]?.archetypeTransitions).toBe(runB.runs[0]?.archetypeTransitions);
  }, 30_000);

  test("long-run suite emits deterministic window metrics", () => {
    const runA = simulateLongRunSuite([CANONICAL_SEED_V1], [20, 40, 60], 2000);
    const runB = simulateLongRunSuite([CANONICAL_SEED_V1], [20, 40, 60], 2000);

    expect(runA.windows).toHaveLength(3);
    expect(runA.windows.map((row) => row.turns)).toEqual([20, 40, 60]);
    expect(runA.summary.performanceBudgetMs).toBe(2000);
    expect(runA.summary.worstP95TurnMs).toBeGreaterThanOrEqual(0);

    expect(runA.windows[0]?.batch.aggregate.actionUsage).toEqual(runB.windows[0]?.batch.aggregate.actionUsage);
    expect(runA.summary.deadActionTypesAcrossWindows).toEqual(runB.summary.deadActionTypesAcrossWindows);
  }, 30_000);
});
