import { describe, expect, test } from "vitest";
import { GameEngine } from "@/lib/escape-the-dungeon/engine/game";
import { DEFAULT_GAME_CONFIG } from "@/lib/escape-the-dungeon/core/types";
import {
  buildDungeonWorld,
  getLevel,
  getRoom,
  ROOM_FEATURE_RUNE_FORGE,
  ROOM_FEATURE_TREASURE,
} from "@/lib/escape-the-dungeon/world/map";

const createIsolatedGame = () => {
  const game = GameEngine.create(7);
  game.state.config.hostileSpawnPerTurn = 0;
  return game;
};

describe("Escape the Dungeon browser engine", () => {
  test("world generation keeps fixed feature counts per level", () => {
    const world = buildDungeonWorld(DEFAULT_GAME_CONFIG);

    for (let depth = DEFAULT_GAME_CONFIG.totalLevels; depth >= 1; depth -= 1) {
      const level = getLevel(world, depth);
      const rooms = Object.values(level.rooms);
      const treasure = rooms.filter((room) => room.feature === ROOM_FEATURE_TREASURE).length;
      const runeForge = rooms.filter((room) => room.feature === ROOM_FEATURE_RUNE_FORGE).length;

      expect(rooms).toHaveLength(50);
      expect(level.startRoomId).toBeDefined();
      expect(level.exitRoomId).toBeDefined();
      expect(treasure).toBe(20);
      expect(runeForge).toBe(5);
    }
  });

  test("movement boundaries return blocked reason", () => {
    const game = createIsolatedGame();
    const player = game.player;
    const level = getLevel(game.state.dungeon, player.depth);
    player.roomId = level.startRoomId;

    const result = game.dispatch({
      actionType: "move",
      payload: { direction: "north" },
    });

    const blockedEvent = result.events.find(
      (event) => event.actorId === player.entityId && event.actionType === "move",
    );
    expect(blockedEvent?.warnings).toContain("move_blocked");
    expect(blockedEvent?.message).toContain("cannot use 'move'");
  });

  test("action gating exposes blocked reasons", () => {
    const game = createIsolatedGame();
    const murderAction = game.availableActions().find((row) => row.actionType === "murder");

    expect(murderAction).toBeDefined();
    expect(murderAction?.available).toBe(false);
    expect(murderAction?.blockedReasons.join(" ")).toMatch(/trait|gate|target/i);
  });

  test("skill branch appraisal vs xray is exclusive per run", () => {
    const game = createIsolatedGame();
    const player = game.player;

    game.dispatch({ actionType: "rest", payload: {} });

    const unlocked = Object.values(player.skills)
      .filter((skill) => skill.unlocked)
      .map((skill) => skill.skillId);

    expect(unlocked.includes("appraisal") || unlocked.includes("xray")).toBe(true);
    expect(unlocked.includes("appraisal") && unlocked.includes("xray")).toBe(false);
    expect(["appraisal", "xray"]).toContain(game.state.runBranchChoice);
  });

  test("hostiles spawn from current depth exit each turn", () => {
    const game = GameEngine.create(7);
    const player = game.player;
    const level = getLevel(game.state.dungeon, player.depth);
    const before = Object.values(game.state.entities).filter((entity) => entity.entityKind === "hostile").length;

    game.dispatch({ actionType: "rest", payload: {} });

    const hostiles = Object.values(game.state.entities).filter((entity) => entity.entityKind === "hostile");
    expect(hostiles.length).toBe(before + game.state.config.hostileSpawnPerTurn);
    expect(hostiles.some((entity) => entity.depth === player.depth && entity.roomId === level.exitRoomId)).toBe(true);
  });

  test("hostiles cannot move into rune forge rooms", () => {
    const game = createIsolatedGame();
    const playerDepth = game.player.depth;
    const level = getLevel(game.state.dungeon, playerDepth);
    const runeForgeRoom = Object.values(level.rooms).find((room) => room.feature === ROOM_FEATURE_RUNE_FORGE);
    expect(runeForgeRoom).toBeDefined();

    const neighbor = Object.values(level.rooms).find((room) =>
      Object.values(room.exits).some((exit) => exit?.roomId === runeForgeRoom?.roomId),
    );
    expect(neighbor).toBeDefined();

    const hostile = {
      ...game.player,
      entityId: "test_hostile",
      isPlayer: false,
      entityKind: "hostile" as const,
      faction: "dungeon_legion",
      roomId: neighbor?.roomId ?? game.player.roomId,
      depth: playerDepth,
    };
    game.state.entities[hostile.entityId] = hostile;

    const blockedMove = game.availableActions(hostile).find((row) => {
      if (row.actionType !== "move") {
        return false;
      }
      const direction = String(row.payload.direction ?? "");
      const next = getRoom(game.state.dungeon, hostile.depth, hostile.roomId).exits[direction as "north"];
      return next?.roomId === runeForgeRoom?.roomId;
    });

    expect(blockedMove).toBeDefined();
    expect(blockedMove?.available).toBe(false);
    expect(blockedMove?.blockedReasons).toContain("move_blocked");
  });

  test("murder gate opens with trait and reputation plus target", () => {
    const game = createIsolatedGame();
    const player = game.player;
    player.traits.Survival = 0.35;
    player.reputation = -8;

    const nearbyEnemy = Object.values(game.state.entities).find(
      (entity) => !entity.isPlayer && entity.depth === player.depth,
    );
    expect(nearbyEnemy).toBeDefined();
    if (!nearbyEnemy) {
      return;
    }
    nearbyEnemy.roomId = player.roomId;
    nearbyEnemy.faction = "dungeon_legion";

    const murderAction = game.availableActions().find((row) => row.actionType === "murder");
    expect(murderAction?.available).toBe(true);
  });

  test("rumors spread after livestream deeds", () => {
    const game = createIsolatedGame();
    const player = game.player;
    const sameDepthIds = Object.values(game.state.entities)
      .filter((entity) => !entity.isPlayer && entity.depth === player.depth)
      .map((entity) => entity.entityId);
    const before = sameDepthIds.reduce((sum, entityId) => sum + game.state.entities[entityId]!.rumors.length, 0);

    game.dispatch({ actionType: "live_stream", payload: { effort: 10 } });

    const after = sameDepthIds.reduce((sum, entityId) => sum + game.state.entities[entityId]!.rumors.length, 0);
    expect(after).toBeGreaterThan(before);
  });

  test("chapter pages include action@room logs", () => {
    const game = createIsolatedGame();
    const player = game.player;
    game.state.entities = { [player.entityId]: player };

    game.dispatch({ actionType: "rest", payload: {} });

    const pages = game.pagesForCurrentChapter();
    const playerPage = pages.entities[player.entityId] ?? [];
    expect(playerPage.some((line) => line.includes("rest@"))).toBe(true);
  });

  test("snapshot restore keeps deterministic state", () => {
    const game = createIsolatedGame();
    game.state.entities = { [game.player.entityId]: game.player };
    game.dispatch({ actionType: "rest", payload: {} });
    game.dispatch({ actionType: "search", payload: {} });

    const snapshot = game.snapshot();
    const restored = GameEngine.create(99);
    restored.restore(snapshot);

    const restoredStatus = restored.status();
    const originalStatus = game.status();
    delete (restoredStatus as Record<string, unknown>).semanticCacheSize;
    delete (originalStatus as Record<string, unknown>).semanticCacheSize;
    expect(restoredStatus).toEqual(originalStatus);
    expect(restored.look()).toEqual(game.look());
  });
});
