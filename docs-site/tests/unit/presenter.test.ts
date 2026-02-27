import { describe, expect, test } from "vitest";
import type { TurnResult } from "@/lib/escape-the-dungeon/core/types";
import { GameEngine } from "@/lib/escape-the-dungeon/engine/game";
import {
  buildActionGroups,
  extractCutsceneQueue,
  initialFeed,
  toFeedMessages,
} from "@/lib/escape-the-dungeon/ui/presenter";

describe("escape dungeon presenter", () => {
  test("buildActionGroups includes utility actions and blocked reasons", () => {
    const game = GameEngine.create(7);
    game.state.config.hostileSpawnPerTurn = 0;

    const groups = buildActionGroups(game);
    const items = groups.flatMap((group) => group.items);

    expect(items.some((item) => item.id === "action-look-around")).toBe(true);
    expect(items.some((item) => item.id === "action-save-slot-a")).toBe(true);

    const murder = items.find((item) => item.id.startsWith("action-murder"));
    expect(murder).toBeDefined();
    expect(murder?.available).toBe(false);
    expect((murder?.blockedReasons.length ?? 0) > 0).toBe(true);
  });

  test("toFeedMessages keeps deterministic order and warnings", () => {
    const turn: TurnResult = {
      escaped: false,
      events: [
        {
          turnIndex: 11,
          actorId: "kael",
          actorName: "Kael",
          actionType: "rest",
          depth: 12,
          roomId: "L12-R01",
          chapterNumber: 1,
          actNumber: 1,
          message: "Kael takes a breath.",
          warnings: ["low_energy"],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
        },
        {
          turnIndex: 12,
          actorId: "npc_1",
          actorName: "Mira",
          actionType: "talk",
          depth: 12,
          roomId: "L12-R01",
          chapterNumber: 1,
          actNumber: 1,
          message: "Mira shares a rumor.",
          warnings: [],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
        },
      ],
    };

    const messages = toFeedMessages(turn);
    expect(messages).toHaveLength(3);
    expect(messages[0]?.text).toContain("Kael rest@L12-R01");
    expect(messages[1]?.tone).toBe("warning");
    expect(messages[2]?.text).toContain("Mira talk@L12-R01");
  });

  test("extractCutsceneQueue parses title and body", () => {
    const turn: TurnResult = {
      escaped: false,
      events: [
        {
          turnIndex: 22,
          actorId: "kael",
          actorName: "Kael",
          actionType: "cutscene",
          depth: 10,
          roomId: "L10-R10",
          chapterNumber: 3,
          actNumber: 1,
          message: "Signal in the Dark: The audience count moves from zero to one.",
          warnings: [],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
        },
      ],
    };

    const queue = extractCutsceneQueue(turn);
    expect(queue).toHaveLength(1);
    expect(queue[0]?.title).toBe("Signal in the Dark");
    expect(queue[0]?.text).toContain("audience count");
  });

  test("initialFeed seeds boot narrative", () => {
    const game = GameEngine.create(7);
    const feed = initialFeed(game);

    expect(feed).toHaveLength(2);
    expect(feed[0]?.text).toContain("Escape the Dungeon loaded");
    expect(feed[1]?.text).toContain("Available actions");
  });
});
