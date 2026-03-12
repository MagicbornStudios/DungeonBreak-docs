import { describe, expect, test } from "vitest";
import {
  DUNGEON_LAYOUT_PACK,
  GameEngine,
  LEVEL_CONTENT_PACK,
  QUEST_PACK,
} from "@dungeonbreak/engine/runtime";

describe("runtime content overrides", () => {
  test("GameEngine.create uses overridden quest packs", () => {
    const engine = GameEngine.create(7, {
      contentPacks: {
        questPack: {
          quests: [
            ...QUEST_PACK.quests,
            {
              questId: "unit_test_contract",
              title: "Unit Test Contract",
              description: "Added by runtime override.",
              requiredProgress: { mode: "fixed", value: 1 },
              progressRules: [
                { kind: "action", actionType: "rest", amount: 1 },
              ],
            },
          ],
        },
      },
    });

    expect(engine.state.quests.unit_test_contract?.title).toBe(
      "Unit Test Contract"
    );
  });

  test("GameEngine.create uses overridden dungeon layouts", () => {
    const engine = GameEngine.create(7, {
      contentPacks: {
        dungeonLayouts: {
          dungeons: DUNGEON_LAYOUT_PACK.dungeons.map((dungeon, index) =>
            index === 0
              ? {
                  ...dungeon,
                  title: "Override Dungeon",
                }
              : dungeon
          ),
        },
      },
    });

    expect(engine.state.dungeon.title).toBe("Override Dungeon");
  });

  test("GameEngine.create prefers overridden level content", () => {
    const engine = GameEngine.create(7, {
      contentPacks: {
        levelContent: {
          ...LEVEL_CONTENT_PACK,
          dungeonRuns: LEVEL_CONTENT_PACK.dungeonRuns?.map((run, index) =>
            index === 0 ? { ...run, title: "Level Content Override" } : run
          ),
        },
      },
    });

    expect(engine.state.dungeon.title).toBe("Level Content Override");
  });
});
