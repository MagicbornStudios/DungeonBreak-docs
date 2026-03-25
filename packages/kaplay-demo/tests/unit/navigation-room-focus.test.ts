import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTION_TYPE,
  buildDungeonWorld,
  DEFAULT_GAME_CONFIG,
} from "@dungeonbreak/engine";
import { roomDialogueActionItems } from "../../src/navigation-helpers";
import { isRoomFocusFeature } from "../../src/navigation-room-focus";

test("room focus features stay limited to treasure, training, and rune forge", () => {
  assert.equal(isRoomFocusFeature("treasure"), true);
  assert.equal(isRoomFocusFeature("training"), true);
  assert.equal(isRoomFocusFeature("rune_forge"), true);
  assert.equal(isRoomFocusFeature("dialogue"), false);
  assert.equal(isRoomFocusFeature("combat"), false);
});

test("dialogue room options expand into concrete room actions", () => {
  const actions = roomDialogueActionItems({
    groups: [
      {
        items: [
          {
            id: "room-dialogue",
            label: "choose room option",
            available: true,
            blockedReasons: [],
            action: {
              kind: "player",
              playerAction: {
                actionType: ACTION_TYPE.CHOOSE_DIALOGUE,
                payload: {
                  options: [
                    {
                      optionId: "loot_treasure",
                      label: "Loot the treasure cache",
                    },
                    {
                      optionId: "appraise_cache",
                      label: "Appraise the cache seals",
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    ],
  } as Parameters<typeof roomDialogueActionItems>[0]);

  assert.equal(actions.length, 2);
  assert.equal(actions[0]?.label, "Loot the treasure cache");
  assert.deepEqual(actions[0]?.action, {
    kind: "player",
    playerAction: {
      actionType: ACTION_TYPE.CHOOSE_DIALOGUE,
      payload: { optionId: "loot_treasure" },
    },
  });
  assert.equal(actions[1]?.label, "Appraise the cache seals");
});

test("fallback dungeon generation no longer assigns combat-specific rooms", () => {
  const dungeon = buildDungeonWorld({
    ...DEFAULT_GAME_CONFIG,
    roomsPerLevel: 20,
    levelRows: 4,
    levelColumns: 5,
  });

  const combatRooms = Object.values(dungeon.levels).flatMap((level) => {
    return Object.values(level.rooms).filter((room) => room.feature === "combat");
  });

  assert.equal(combatRooms.length, 0);
});
