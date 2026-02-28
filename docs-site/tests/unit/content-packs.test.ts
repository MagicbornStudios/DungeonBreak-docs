import { describe, expect, test } from "vitest";
import { EVENT_PACK, GameEngine, QUEST_PACK } from "@dungeonbreak/engine";

describe("phase 17 content packs", () => {
  test("quest and event packs are loaded from schema-driven JSON contracts", () => {
    expect(QUEST_PACK.quests.length).toBeGreaterThanOrEqual(3);
    expect(EVENT_PACK.events.length).toBeGreaterThanOrEqual(3);
    expect(QUEST_PACK.quests.some((quest) => quest.questId === "escape")).toBe(true);
    expect(EVENT_PACK.events.some((event) => event.eventId === "fame_watchers_20")).toBe(true);
  });

  test("game initializes quest state from quest pack definitions", () => {
    const game = GameEngine.create(7);
    for (const quest of QUEST_PACK.quests) {
      const state = game.state.quests[quest.questId];
      expect(state).toBeDefined();
      if (!state) {
        continue;
      }
      if (quest.requiredProgress.mode === "total_levels") {
        expect(state.requiredProgress).toBe(game.state.config.totalLevels);
      } else {
        expect(state.requiredProgress).toBe(quest.requiredProgress.value);
      }
    }
  });

  test("deterministic global events from contracts update state and flags", () => {
    const game = GameEngine.create(7);
    game.state.config.hostileSpawnPerTurn = 0;
    game.player.features.Fame = 25;

    game.dispatch({ actionType: "rest", payload: {} });

    expect(game.state.globalEventFlags).toContain("fame_watchers_20");
    expect(game.player.features.Momentum).toBeGreaterThan(0);
    expect(
      game.state.eventLog.some(
        (event: { actionType: string; metadata: Record<string, unknown> }) =>
          event.actionType === "global_event" &&
          String(event.metadata.globalEventId) === "fame_watchers_20",
      ),
    ).toBe(true);
  });
});
