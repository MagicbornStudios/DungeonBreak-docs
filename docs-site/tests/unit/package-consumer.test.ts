import { describe, expect, test } from "vitest";
import { ARCHETYPE_PACK, CANONICAL_SEED_V1, DungeonBreakGame, GameEngine, simulateBalanceRun } from "@dungeonbreak/engine";
import { runReplayFixture, type ReplayFixture } from "@dungeonbreak/engine/replay";
import fixture from "@/tests/fixtures/canonical-trace-v1.json";

describe("package consumer contract", () => {
  test("published package exports playable engine APIs", () => {
    const game = GameEngine.create(CANONICAL_SEED_V1);
    const result = game.dispatch({ actionType: "rest", payload: {} });
    expect(result.events.length).toBeGreaterThan(0);
    expect(typeof DungeonBreakGame).toBe("function");
  });

  test("package replay helper returns deterministic hash", () => {
    const replay = fixture as ReplayFixture;
    const runA = runReplayFixture(replay);
    const runB = runReplayFixture(replay);
    expect(runA.snapshotHash).toBe(runB.snapshotHash);
  }, 30_000);

  test("package exports phase 11 archetype and harness APIs", () => {
    expect(ARCHETYPE_PACK.archetypes.length).toBeGreaterThan(0);
    const run = simulateBalanceRun(CANONICAL_SEED_V1, 20);
    expect(run.turnsPlayed).toBeGreaterThan(0);
    expect(typeof run.finalArchetype).toBe("string");
  });
});
