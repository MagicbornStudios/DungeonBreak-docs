import { describe, expect, test } from "vitest";
import {
  ACTION_CONTRACTS,
  CANONICAL_SEED_V1,
} from "@/lib/escape-the-dungeon/contracts";
import {
  ACTION_CATALOG,
  ACTION_POLICIES,
  ACTION_TYPE,
  adjustNarrativeStat,
  narrativeStat,
  type PlayerAction,
} from "@dungeonbreak/engine";
import { DEFAULT_GAME_CONFIG } from "@/lib/escape-the-dungeon/core/types";
import { GameEngine } from "@/lib/escape-the-dungeon/engine/game";
import {
  buildDungeonWorld,
  getLevel,
  getRoom,
  ROOM_FEATURE_RUNE_FORGE,
  ROOM_FEATURE_TREASURE,
} from "@/lib/escape-the-dungeon/world/map";

const createIsolatedGame = (seed = 7) => {
  const game = GameEngine.create(seed);
  game.state.config.hostileSpawnPerTurn = 0;
  return game;
};

const findFirstNpcAtDepth = (game: GameEngine, depth: number) => {
  return Object.values(game.state.entities).find(
    (entity) => !entity.isPlayer && entity.depth === depth
  );
};

type AvailableActionRow = {
  actionType: string;
  available: boolean;
  payload: Record<string, unknown>;
};

const FORCE_ORDER = ACTION_CATALOG.actions.map((row) => row.actionType);
const PRIORITY_ORDER: readonly string[] =
  ACTION_POLICIES.policies.find(
    (policy) => policy.policyId === "agent-play-default"
  )?.priorityOrder ?? FORCE_ORDER;

const toPlayerAction = (
  actionType: string,
  payload: Record<string, unknown>
): PlayerAction => {
  if (actionType === ACTION_TYPE.CHOOSE_DIALOGUE) {
    const options =
      (payload.options as Array<{ optionId: string }> | undefined) ?? [];
    return {
      actionType: ACTION_TYPE.CHOOSE_DIALOGUE,
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (actionType === ACTION_TYPE.EVOLVE_SKILL) {
    return {
      actionType: ACTION_TYPE.EVOLVE_SKILL,
      payload: { skillId: String(payload.skillId ?? "") },
    };
  }
  if (actionType === "live_stream") {
    return {
      actionType: "live_stream",
      payload: { effort: 10 },
    };
  }
  if (actionType === "speak") {
    return {
      actionType: "speak",
      payload: { intentText: "Reference run test action." },
    };
  }
  return {
    actionType: actionType as PlayerAction["actionType"],
    payload: structuredClone(payload),
  };
};

const chooseReferenceAction = (
  rows: AvailableActionRow[],
  turnIndex: number,
  covered: Set<string>
): PlayerAction => {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) {
    return { actionType: ACTION_TYPE.REST, payload: {} };
  }

  if (turnIndex < FORCE_ORDER.length) {
    const forcedType = FORCE_ORDER[turnIndex];
    const forced = legal.find((row) => row.actionType === forcedType);
    if (forced) {
      covered.add(forced.actionType);
      return toPlayerAction(forced.actionType, forced.payload);
    }
  }

  for (const actionType of PRIORITY_ORDER) {
    const row = legal.find((candidate) => candidate.actionType === actionType);
    if (row) {
      covered.add(row.actionType);
      return toPlayerAction(row.actionType, row.payload);
    }
  }

  const fallback = legal[0] as AvailableActionRow;
  covered.add(fallback.actionType);
  return toPlayerAction(fallback.actionType, fallback.payload);
};

describe("Escape the Dungeon browser engine", () => {
  test("world generation keeps fixed feature counts per level", () => {
    const world = buildDungeonWorld(DEFAULT_GAME_CONFIG);

    for (let depth = DEFAULT_GAME_CONFIG.totalLevels; depth >= 1; depth -= 1) {
      const level = getLevel(world, depth);
      const rooms = Object.values(level.rooms);
      const treasure = rooms.filter(
        (room) => room.feature === ROOM_FEATURE_TREASURE
      ).length;
      const runeForge = rooms.filter(
        (room) => room.feature === ROOM_FEATURE_RUNE_FORGE
      ).length;

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
      (event) =>
        event.actorId === player.entityId && event.actionType === "move"
    );
    expect(blockedEvent?.warnings).toContain("move_blocked");
    expect(blockedEvent?.message).toContain("cannot use 'move'");
  });

  test("action gating exposes blocked reasons", () => {
    const game = createIsolatedGame();
    const murderAction = game
      .availableActions()
      .find((row) => row.actionType === "murder");

    expect(murderAction).toBeDefined();
    expect(murderAction?.available).toBe(false);
    expect(murderAction?.blockedReasons.join(" ")).toMatch(
      /trait|gate|target/i
    );
  });

  test("skill branch appraisal vs xray is exclusive per run", () => {
    const game = createIsolatedGame();
    const player = game.player;

    game.dispatch({ actionType: "rest", payload: {} });

    const unlocked = Object.values(player.skills)
      .filter((skill) => skill.unlocked)
      .map((skill) => skill.skillId);

    expect(unlocked.includes("appraisal") || unlocked.includes("xray")).toBe(
      true
    );
    expect(unlocked.includes("appraisal") && unlocked.includes("xray")).toBe(
      false
    );
    expect(["appraisal", "xray"]).toContain(game.state.runBranchChoice);
  });

  test("hostiles spawn from current depth exit each turn", () => {
    const game = GameEngine.create(7);
    const player = game.player;
    const level = getLevel(game.state.dungeon, player.depth);
    const before = Object.values(game.state.entities).filter(
      (entity) => entity.entityKind === "hostile"
    ).length;

    const result = game.dispatch({ actionType: "rest", payload: {} });

    const hostiles = Object.values(game.state.entities).filter(
      (entity) => entity.entityKind === "hostile"
    );
    const spawnEvent = result.events.find(
      (event) => event.actionType === "spawn"
    );
    expect(hostiles.length).toBe(
      before + game.state.config.hostileSpawnPerTurn
    );
    expect(spawnEvent?.metadata.spawnRoomId).toBe(level.exitRoomId);
  });

  test("hostiles cannot move into rune forge rooms", () => {
    const game = createIsolatedGame();
    const playerDepth = game.player.depth;
    const level = getLevel(game.state.dungeon, playerDepth);
    const runeForgeRoom = Object.values(level.rooms).find(
      (room) => room.feature === ROOM_FEATURE_RUNE_FORGE
    );
    expect(runeForgeRoom).toBeDefined();

    const neighbor = Object.values(level.rooms).find((room) =>
      Object.values(room.exits).some(
        (exit) => exit?.roomId === runeForgeRoom?.roomId
      )
    );
    expect(neighbor).toBeDefined();

    const hostile = {
      ...game.player,
      entityId: "test_hostile",
      isPlayer: false,
      entityKind: "hostile" as const,
      entityTypeId: "beast",
      occupationId: null,
      occupationName: null,
      partyRoleId: null,
      partyRoleName: null,
      faction: "dungeon_legion",
      baseFaction: "dungeon_legion",
      roomId: neighbor?.roomId ?? game.player.roomId,
      depth: playerDepth,
    };
    game.state.entities[hostile.entityId] = hostile;

    const blockedMove = game.availableActions(hostile).find((row) => {
      if (row.actionType !== "move") {
        return false;
      }
      const direction = String(row.payload.direction ?? "");
      const next = getRoom(game.state.dungeon, hostile.depth, hostile.roomId)
        .exits[direction as "north"];
      return next?.roomId === runeForgeRoom?.roomId;
    });

    expect(blockedMove).toBeDefined();
    expect(blockedMove?.available).toBe(false);
    expect(blockedMove?.blockedReasons).toContain("move_blocked");
  });

  test("murder gate opens with trait and reputation plus target", () => {
    const game = createIsolatedGame();
    const player = game.player;
    adjustNarrativeStat(
      player,
      "Survival",
      0.35 - narrativeStat(player, "Survival")
    );
    player.reputation = -8;

    const nearbyEnemy = findFirstNpcAtDepth(game, player.depth);
    expect(nearbyEnemy).toBeDefined();
    if (!nearbyEnemy) {
      return;
    }
    nearbyEnemy.roomId = player.roomId;
    nearbyEnemy.faction = "dungeon_legion";

    const murderAction = game
      .availableActions()
      .find((row) => row.actionType === "murder");
    expect(murderAction?.available).toBe(true);
  });

  test("rumors spread after livestream deeds", () => {
    const game = createIsolatedGame();
    const player = game.player;
    const sameDepthIds = Object.values(game.state.entities)
      .filter((entity) => !entity.isPlayer && entity.depth === player.depth)
      .map((entity) => entity.entityId);
    const before = sameDepthIds.reduce(
      (sum, entityId) => sum + game.state.entities[entityId]!.rumors.length,
      0
    );

    game.dispatch({ actionType: "live_stream", payload: { effort: 10 } });

    const after = sameDepthIds.reduce(
      (sum, entityId) => sum + game.state.entities[entityId]!.rumors.length,
      0
    );
    expect(after).toBeGreaterThan(before);
  });

  test("flee resolves as deterministic legal movement without fail roll", () => {
    const game = createIsolatedGame();
    const player = game.player;
    const enemy = findFirstNpcAtDepth(game, player.depth);
    expect(enemy).toBeDefined();
    if (!enemy) {
      return;
    }
    enemy.faction = "dungeon_legion";
    enemy.roomId = player.roomId;

    const move = game
      .availableActions()
      .find(
        (row) =>
          row.actionType === "flee" && String(row.payload.direction) === "east"
      );
    expect(move?.available).toBe(true);

    const beforeRoom = player.roomId;
    const result = game.dispatch({
      actionType: "flee",
      payload: { direction: "east" },
    });
    const fleeEvent = result.events.find(
      (event) =>
        event.actorId === player.entityId && event.actionType === "flee"
    );
    expect(fleeEvent?.warnings ?? []).toHaveLength(0);
    expect(player.roomId).not.toBe(beforeRoom);
  });

  test("deed memories include misinformation states from rumor propagation", () => {
    const game = createIsolatedGame(CANONICAL_SEED_V1);
    const player = game.player;

    for (const entity of Object.values(game.state.entities)) {
      if (entity.isPlayer || entity.depth !== player.depth) {
        continue;
      }
      entity.roomId = player.roomId;
    }

    for (let index = 0; index < 8; index += 1) {
      game.dispatch({ actionType: "live_stream", payload: { effort: 10 } });
      game.dispatch({ actionType: "talk", payload: {} });
    }

    const beliefs = Object.values(game.state.entities).flatMap((entity) =>
      entity.deeds.map((deed) => deed.beliefState)
    );
    expect(beliefs.includes("rumor") || beliefs.includes("misinformed")).toBe(
      true
    );
    expect(beliefs.includes("misinformed")).toBe(true);
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

  test(
    "25-turn reference run with canonical seed covers integrated systems",
    { timeout: 20_000 },
    () => {
      const game = GameEngine.create(CANONICAL_SEED_V1);
      game.state.config.hostileSpawnPerTurn = 0;
      const player = game.player;
      adjustNarrativeStat(
        player,
        "Survival",
        0.4 - narrativeStat(player, "Survival")
      );
      player.reputation = -7;
      player.skills.shadow_hand = {
        skillId: "shadow_hand",
        name: "Shadow Hand",
        unlocked: true,
        mastery: 0,
      };

      const level = getLevel(game.state.dungeon, player.depth);
      const treasureRoom = Object.values(level.rooms).find(
        (room) => room.feature === ROOM_FEATURE_TREASURE
      );
      if (treasureRoom) {
        player.roomId = treasureRoom.roomId;
      }

      const npc = findFirstNpcAtDepth(game, player.depth);
      if (npc) {
        npc.roomId = player.roomId;
        npc.faction = "dungeon_legion";
        npc.inventory.push({
          itemId: "fixture_loot",
          name: "Fixture Loot",
          rarity: "common",
          description: "Used for deterministic tests.",
          tags: ["loot"],
          narrativeStatDelta: {},
        });
      }

      const covered = new Set<string>();
      for (let turnIndex = 0; turnIndex < 25; turnIndex += 1) {
        const action = chooseReferenceAction(
          game.availableActions() as AvailableActionRow[],
          turnIndex,
          covered
        );
        game.dispatch(action);
      }

      const page = game.pagesForCurrentChapter();
      expect(covered.size).toBeGreaterThanOrEqual(5);
      expect(covered.has("move")).toBe(true);
      expect(covered.has("search")).toBe(true);
      expect(
        covered.has("talk") ||
          covered.has("speak") ||
          covered.has("whistle") ||
          covered.has("choose_dialogue")
      ).toBe(true);
      expect(game.state.eventLog.length).toBeGreaterThan(25);
      expect(page.chapter.some((line) => line.includes("@"))).toBe(true);
      expect(game.snapshot()).toEqual(game.snapshot());
    }
  );

  test("pressure policy keeps p95 turn time under budget and prunes hostiles", () => {
    const game = GameEngine.create(CANONICAL_SEED_V1);
    game.state.config.hostileSpawnPerTurn = 5;
    game.state.config.entityPressureCap = 105;
    game.state.config.countItemsAsEntitiesForPressure =
      ACTION_CONTRACTS.entityPressure.countItemsAsEntities;

    const durations: number[] = [];
    for (let index = 0; index < 35; index += 1) {
      const startedAt = performance.now();
      game.dispatch({
        actionType: index % 2 === 0 ? "rest" : "search",
        payload: {},
      });
      durations.push(performance.now() - startedAt);
    }
    const sorted = [...durations].sort((a, b) => a - b);
    const p95 =
      sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ??
      0;
    const status = game.status();
    const pressure = Number(status.pressure ?? 0);

    expect(p95).toBeLessThanOrEqual(2000);
    expect(pressure).toBeLessThanOrEqual(game.state.config.entityPressureCap);
    expect(
      game.state.eventLog.some(
        (event) => event.actionType === "pressure_control"
      )
    ).toBe(true);
  }, 30_000);
});
