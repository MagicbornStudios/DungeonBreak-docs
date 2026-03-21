import { ACTION_CONTRACTS, ACTION_POLICY_BY_ID } from "../../contracts";
import { isAlive } from "../../core/entity-stats";
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
  const npcIds = Object.values(entities)
    .filter((entity) => {
      return (
        !entity.isPlayer &&
        entity.entityKind !== "summon" &&
        entity.companionTo !== playerId &&
        isAlive(entity)
      );
    })
    .map((entity) => entity.entityId)
    .sort((left, right) => left.localeCompare(right));

  for (const entityId of npcIds) {
    const actor = entities[entityId];
    if (!(actor && isAlive(actor))) {
      continue;
    }

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
