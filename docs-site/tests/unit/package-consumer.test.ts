import { describe, expect, test } from "vitest";
import {
  ARCHETYPE_PACK,
  CANONICAL_SEED_V1,
  DungeonBreakGame,
  GameEngine,
  simulateBalanceRun,
} from "@dungeonbreak/engine";

describe("package consumer contract", () => {
  test("published package exports playable engine APIs", () => {
    const game = GameEngine.create(CANONICAL_SEED_V1);
    const result = game.dispatch({ actionType: "rest", payload: {} });
    expect(result.events.length).toBeGreaterThan(0);
    expect(typeof DungeonBreakGame).toBe("function");
  });

  test("package exports phase 11 archetype and harness APIs", () => {
    expect(ARCHETYPE_PACK.archetypes.length).toBeGreaterThan(0);
    const run = simulateBalanceRun(CANONICAL_SEED_V1, 20);
    expect(run.turnsPlayed).toBeGreaterThan(0);
    expect(typeof run.finalArchetype).toBe("string");
  });
});
