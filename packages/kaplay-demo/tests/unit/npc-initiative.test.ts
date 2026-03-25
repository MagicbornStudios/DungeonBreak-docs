import assert from "node:assert/strict";
import test from "node:test";
import { GameEngine } from "@dungeonbreak/engine";
import { DeterministicRng } from "../../../engine/src/escape-the-dungeon/core/rng";
import { createHostileEntity } from "../../../engine/src/escape-the-dungeon/engine/game-entity-factories";
import { simulateNpcTurns } from "../../../engine/src/escape-the-dungeon/engine/systems/npc-turns";

test("initiative queue resolves only ready actors and favors faster threats", () => {
  const game = GameEngine.create();
  const state = game.snapshot();
  const playerId = state.playerId;
  const boss = Object.values(state.entities).find((entity) => {
    return entity.entityKind === "boss";
  });
  const hostile =
    Object.values(state.entities).find((entity) => {
      return entity.entityKind === "hostile";
    }) ??
    createHostileEntity({
      config: state.config,
      depth: boss.depth,
      roomId: boss.roomId,
      room: state.dungeon.levels[boss.depth]!.rooms[boss.roomId]!,
      hostileSpawnIndex: 999,
      globalEnemyLevelBonus: 0,
      archetypeHeading: "prowler",
      name: "Queue Hound",
    });
  const dungeoneer = Object.values(state.entities).find((entity) => {
    return entity.entityKind === "dungeoneer";
  });

  assert.ok(boss);
  assert.ok(hostile);
  assert.ok(dungeoneer);
  state.entities[hostile.entityId] = hostile;

  for (const entity of Object.values(state.entities)) {
    if (
      entity.entityId !== playerId &&
      entity.entityId !== boss.entityId &&
      entity.entityId !== hostile.entityId &&
      entity.entityId !== dungeoneer.entityId
    ) {
      entity.combatStats.currentHp = 0;
    }
  }

  boss.combatStats.agility = 5;
  hostile.combatStats.agility = 5;
  dungeoneer.combatStats.agility = 4;
  state.initiativeMeters = {};
  state.lastInitiativeOrder = [];

  const makeAvailableAction = () => {
    return [
      {
        actionType: "search" as const,
        label: "Search",
        available: true,
        blockedReasons: [],
        payload: {},
      },
    ];
  };
  const firstTurnActors: string[] = [];
  simulateNpcTurns({
    availableActions: () => makeAvailableAction(),
    entities: state.entities,
    executeAction: (actor) => {
      firstTurnActors.push(actor.entityId);
    },
    isEnemy: () => false,
    nearbyEntities: () => [],
    playerId,
    rng: new DeterministicRng(7),
    state,
  });

  assert.deepEqual(firstTurnActors, [boss.entityId]);
  assert.deepEqual(state.lastInitiativeOrder.slice(0, 3), [
    boss.entityId,
    hostile.entityId,
    dungeoneer.entityId,
  ]);
  assert.equal(state.initiativeMeters[boss.entityId], 0);
  assert.equal(state.initiativeMeters[hostile.entityId], 60);
  assert.equal(state.initiativeMeters[dungeoneer.entityId], 40);

  const secondTurnActors: string[] = [];
  simulateNpcTurns({
    availableActions: () => makeAvailableAction(),
    entities: state.entities,
    executeAction: (actor) => {
      secondTurnActors.push(actor.entityId);
    },
    isEnemy: () => false,
    nearbyEntities: () => [],
    playerId,
    rng: new DeterministicRng(7),
    state,
  });

  assert.deepEqual(secondTurnActors, [hostile.entityId, boss.entityId]);
  assert.deepEqual(state.lastInitiativeOrder.slice(0, 3), [
    hostile.entityId,
    boss.entityId,
    dungeoneer.entityId,
  ]);
  assert.equal(state.initiativeMeters[boss.entityId], 0);
  assert.equal(state.initiativeMeters[hostile.entityId], 20);
  assert.equal(state.initiativeMeters[dungeoneer.entityId], 80);
});
