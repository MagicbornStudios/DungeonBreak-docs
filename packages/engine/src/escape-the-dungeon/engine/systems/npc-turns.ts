import { ACTION_CONTRACTS, ACTION_POLICY_BY_ID } from "../../contracts";
import { combatStat, isAlive } from "../../core/entity-stats";
import type { DeterministicRng } from "../../core/rng";
import type {
  ActionAvailability,
  EntityState,
  GameState,
  MoveDirection,
  PlayerAction,
} from "../../core/types";
import { chooseFromLegalActions } from "../../entities/simulation";
import { getRoom } from "../../world/map";

const INITIATIVE_THRESHOLD = 100;
const INITIATIVE_METER_CAP = 199;
const MAX_NPC_ACTIONS_PER_PLAYER_TURN = 4;

const initiativeKindBonus = (
  entityKind: EntityState["entityKind"]
): number => {
  switch (entityKind) {
    case "boss":
      return 50;
    case "hostile":
      return 10;
    default:
      return 0;
  }
};

const initiativeGainFor = (actor: EntityState): number => {
  return Math.max(
    25,
    Math.floor(combatStat(actor, "agility")) * 10 +
      initiativeKindBonus(actor.entityKind)
  );
};

const initiativeKindPriority = (
  entityKind: EntityState["entityKind"]
): number => {
  switch (entityKind) {
    case "boss":
      return 0;
    case "hostile":
      return 1;
    case "dungeoneer":
      return 2;
    default:
      return 3;
  }
};

const compareInitiativeOrder = (
  left: EntityState,
  right: EntityState,
  meters: Record<string, number>
): number => {
  const leftMeter = Number(meters[left.entityId] ?? 0);
  const rightMeter = Number(meters[right.entityId] ?? 0);
  if (leftMeter !== rightMeter) {
    return rightMeter - leftMeter;
  }

  const leftAgility = combatStat(left, "agility");
  const rightAgility = combatStat(right, "agility");
  if (leftAgility !== rightAgility) {
    return rightAgility - leftAgility;
  }

  const leftKindPriority = initiativeKindPriority(left.entityKind);
  const rightKindPriority = initiativeKindPriority(right.entityKind);
  if (leftKindPriority !== rightKindPriority) {
    return leftKindPriority - rightKindPriority;
  }

  return left.entityId.localeCompare(right.entityId);
};

export const resolveNpcPolicyId = (
  entityKind: EntityState["entityKind"],
  policyOverrides: Partial<Record<EntityState["entityKind"], string>>
): string | null => {
  const override = policyOverrides[entityKind];
  if (override && ACTION_POLICY_BY_ID[override]) {
    return override;
  }
  return null;
};

export const choosePolicyAction = (
  legalActions: PlayerAction[],
  policyId: string | null
): PlayerAction | null => {
  if (!policyId) {
    return null;
  }

  const policy = ACTION_POLICY_BY_ID[policyId];
  if (!policy) {
    return null;
  }

  for (const actionType of policy.priorityOrder) {
    const found = legalActions.find(
      (action) => action.actionType === actionType
    );
    if (found) {
      return found;
    }
  }

  return null;
};

const toNpcAction = (row: ActionAvailability): PlayerAction => {
  if (row.actionType === "choose_dialogue") {
    const options =
      (row.payload.options as Array<{ optionId: string }> | undefined) ?? [];
    const optionId = options[0]?.optionId;
    return {
      actionType: "choose_dialogue",
      payload: optionId ? { optionId } : {},
    };
  }

  if (row.actionType === "evolve_skill") {
    return {
      actionType: "evolve_skill",
      payload: { skillId: row.payload.skillId as string },
    };
  }

  if (row.actionType === "live_stream") {
    return {
      actionType: "live_stream",
      payload: {
        effort: Number(ACTION_CONTRACTS.actions.liveStream?.effortCost ?? 10),
      },
    };
  }

  if (row.actionType === "speak") {
    return {
      actionType: "speak",
      payload: { intentText: "I keep moving." },
    };
  }

  return {
    actionType: row.actionType,
    payload: { ...row.payload },
  };
};

export const choosePredatorMove = (input: {
  actor: EntityState;
  dungeon: GameState["dungeon"];
  entities: Record<string, EntityState>;
  isEnemy: (actor: EntityState, target: EntityState) => boolean;
  legalActions: PlayerAction[];
}): PlayerAction | null => {
  const { actor, dungeon, entities, isEnemy, legalActions } = input;
  const targets = Object.values(entities).filter((entity) => {
    if (entity.entityId === actor.entityId || !isAlive(entity)) {
      return false;
    }
    if (entity.depth !== actor.depth) {
      return false;
    }
    return isEnemy(actor, entity);
  });
  if (targets.length === 0) {
    return null;
  }

  const room = getRoom(dungeon, actor.depth, actor.roomId);
  const sortedTargets = [...targets].sort((left, right) => {
    const leftRoom = getRoom(dungeon, left.depth, left.roomId);
    const rightRoom = getRoom(dungeon, right.depth, right.roomId);
    const leftDistance =
      Math.abs(room.row - leftRoom.row) +
      Math.abs(room.column - leftRoom.column);
    const rightDistance =
      Math.abs(room.row - rightRoom.row) +
      Math.abs(room.column - rightRoom.column);
    return leftDistance - rightDistance;
  });

  const nearest = sortedTargets[0];
  if (!nearest) {
    return null;
  }

  const targetRoom = getRoom(dungeon, nearest.depth, nearest.roomId);
  const preferredDirections: MoveDirection[] = [];
  if (targetRoom.row < room.row) {
    preferredDirections.push("north");
  } else if (targetRoom.row > room.row) {
    preferredDirections.push("south");
  }
  if (targetRoom.column < room.column) {
    preferredDirections.push("west");
  } else if (targetRoom.column > room.column) {
    preferredDirections.push("east");
  }

  for (const direction of preferredDirections) {
    const found = legalActions.find((action) => {
      return (
        action.actionType === "move" &&
        String(action.payload.direction) === direction
      );
    });
    if (found) {
      return found;
    }
  }

  return null;
};

interface SimulateNpcTurnsInput {
  availableActions: (actor: EntityState) => ActionAvailability[];
  entities: Record<string, EntityState>;
  executeAction: (actor: EntityState, action: PlayerAction) => void;
  isEnemy: (actor: EntityState, target: EntityState) => boolean;
  nearbyEntities: (actor: EntityState) => EntityState[];
  playerId: string;
  policyOverrides?: Partial<Record<EntityState["entityKind"], string>>;
  rng: DeterministicRng;
  state: GameState;
}

export const simulateNpcTurns = ({
  availableActions,
  entities,
  executeAction,
  isEnemy,
  nearbyEntities,
  playerId,
  policyOverrides,
  rng,
  state,
}: SimulateNpcTurnsInput): void => {
  const resolvedPolicyOverrides =
    policyOverrides ?? state.config.npcActionPolicyIds;
  const canQueueNpc = (entity: EntityState | undefined): entity is EntityState =>
    Boolean(
      entity &&
        !entity.isPlayer &&
        entity.entityKind !== "summon" &&
        entity.companionTo !== playerId &&
        isAlive(entity)
    );
  const initiativeMeters = state.initiativeMeters;

  for (const entityId of Object.keys(initiativeMeters)) {
    if (!canQueueNpc(entities[entityId])) {
      delete initiativeMeters[entityId];
    }
  }

  const queuedActors = Object.values(entities).filter((entity) =>
    canQueueNpc(entity)
  );
  if (queuedActors.length === 0) {
    state.lastInitiativeOrder = [];
    return;
  }

  for (const actor of queuedActors) {
    const nextMeter = Number(initiativeMeters[actor.entityId] ?? 0);
    initiativeMeters[actor.entityId] = Math.min(
      INITIATIVE_METER_CAP,
      Math.max(0, nextMeter) + initiativeGainFor(actor)
    );
  }

  const orderedActors = [...queuedActors].sort((left, right) =>
    compareInitiativeOrder(left, right, initiativeMeters)
  );
  state.lastInitiativeOrder = orderedActors.map((actor) => actor.entityId);

  const readyActorIds = orderedActors
    .filter((actor) => {
      return Number(initiativeMeters[actor.entityId] ?? 0) >= INITIATIVE_THRESHOLD;
    })
    .slice(0, MAX_NPC_ACTIONS_PER_PLAYER_TURN)
    .map((actor) => actor.entityId);

  for (const entityId of readyActorIds) {
    const actor = entities[entityId];
    if (!canQueueNpc(actor)) {
      delete initiativeMeters[entityId];
      continue;
    }
    initiativeMeters[entityId] = Math.max(
      0,
      Number(initiativeMeters[entityId] ?? 0) - INITIATIVE_THRESHOLD
    );

    const legalActions = availableActions(actor)
      .filter((row) => row.available)
      .map(toNpcAction);
    if (legalActions.length === 0) {
      continue;
    }

    const room = getRoom(state.dungeon, actor.depth, actor.roomId);
    const nearbyEnemyCount = nearbyEntities(actor).filter((target) => {
      return isEnemy(actor, target);
    }).length;

    let chosenAction: PlayerAction | null = null;
    if (
      (actor.entityKind === "hostile" || actor.entityKind === "boss") &&
      nearbyEnemyCount === 0
    ) {
      chosenAction = choosePredatorMove({
        actor,
        dungeon: state.dungeon,
        entities,
        isEnemy,
        legalActions,
      });
    }

    if (!chosenAction) {
      chosenAction = choosePolicyAction(
        legalActions,
        resolveNpcPolicyId(actor.entityKind, resolvedPolicyOverrides)
      );
    }

    if (!chosenAction) {
      chosenAction = chooseFromLegalActions(
        actor,
        legalActions,
        room.feature,
        nearbyEnemyCount,
        rng
      );
    }

    executeAction(actor, chosenAction);
  }
};
