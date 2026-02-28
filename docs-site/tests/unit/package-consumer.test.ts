import { describe, expect, test } from "vitest";
import {
  ACTION_CATALOG,
  ARCHETYPE_PACK,
  CANONICAL_SEED_V1,
  DungeonBreakGame,
  GameEngine,
  simulateBalanceRun,
} from "@dungeonbreak/engine";
import { runReplayFixture, type ReplayFixture } from "@dungeonbreak/engine/replay";
import fixture from "@/tests/fixtures/canonical-trace-v1.json";
import denseFixture from "@/tests/fixtures/canonical-dense-trace-v1.json";

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

  test("package replay helper validates dense 75-turn fixture coverage", () => {
    const replay = denseFixture as ReplayFixture;
    const runA = runReplayFixture(replay);
    const runB = runReplayFixture(replay);

    expect(replay.actions.length).toBeGreaterThanOrEqual(75);
    expect(runA.snapshotHash).toBe(runB.snapshotHash);
    expect(runA.snapshotHash).toBe(replay.expectedSnapshotHash);
    expect(
      runA.snapshot.eventLog.some((event: { actionType: string }) => event.actionType === "cutscene"),
    ).toBe(true);

    const expectedActionTypes = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));
    const coveredActionTypes = new Set(replay.actions.map((action) => action.actionType));
    for (const actionType of expectedActionTypes) {
      expect(coveredActionTypes.has(actionType)).toBe(true);
    }
  }, 30_000);

  test("package exports phase 11 archetype and harness APIs", () => {
    expect(ARCHETYPE_PACK.archetypes.length).toBeGreaterThan(0);
    const run = simulateBalanceRun(CANONICAL_SEED_V1, 20);
    expect(run.turnsPlayed).toBeGreaterThan(0);
    expect(typeof run.finalArchetype).toBe("string");
  });
});
