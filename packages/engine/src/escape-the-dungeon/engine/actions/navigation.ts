import { ACTION_CONTRACTS, THE_MOUNT } from "../../contracts";
import { currentMana, setCurrentMana } from "../../core/entity-stats";
import {
  clamp,
  createTransform,
  type EntityState,
  type GameState,
  type MoveDirection,
  type PlayerAction,
  type RoomNode,
} from "../../core/types";
import {
  dungeonStep,
  ROOM_FEATURE_REST,
  ROOM_FEATURE_RUNE_FORGE,
  ROOM_FEATURE_TRAINING,
  roomCenterPosition,
} from "../../world/map";
import { chapterFor, mergeDeltas, toNumberMap } from "../game-runtime-helpers";
import type { ActionAvailabilityResult, ActionOutcome } from "./action-types";

export const availabilityForNavigationAction = (input: {
  state: GameState;
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
}): ActionAvailabilityResult | null => {
  const { state, actor, action, room } = input;

  if (action.actionType === "move") {
    const direction = String(action.payload.direction ?? "") as MoveDirection;
    const next = dungeonStep(
      state.dungeon,
      actor.depth,
      actor.roomId,
      direction,
      actor.entityKind === "hostile" || actor.entityKind === "boss"
        ? [ROOM_FEATURE_RUNE_FORGE]
        : []
    );
    return next
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["move_blocked"] };
  }

  if (action.actionType === "whistle") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    if (!THE_MOUNT) {
      return { available: false, blockedReasons: ["No mount configured"] };
    }
    return { available: true, blockedReasons: [] };
  }

  if (action.actionType === "train") {
    return room.feature === ROOM_FEATURE_TRAINING
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["Need training room"] };
  }

  if (action.actionType === "rest") {
    return { available: true, blockedReasons: [] };
  }

  return null;
};

export const performNavigationAction = (input: {
  state: GameState;
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
  currentMoveTickCost: () => number;
  mountMovementApplies: () => boolean;
  defaultMoveTickCost: number;
  onPlayerMoved?: (input: {
    actor: EntityState;
    previousDepth: number;
    previousRoomId: string;
    direction: MoveDirection;
    escaped: boolean;
  }) =>
    | {
        rewardMessage?: string | null;
        foundItemTags?: string[];
        metadata?: Record<string, unknown>;
      }
    | null
    | undefined;
}): ActionOutcome | null => {
  const {
    state,
    actor,
    action,
    room,
    currentMoveTickCost,
    mountMovementApplies,
    defaultMoveTickCost,
    onPlayerMoved,
  } = input;
  const formulas = ACTION_CONTRACTS.actions;

  if (action.actionType === "move") {
    const direction = String(
      action.payload.direction ?? ""
    ).toLowerCase() as MoveDirection;
    const turnCost = actor.isPlayer
      ? currentMoveTickCost()
      : defaultMoveTickCost;
    const next = dungeonStep(
      state.dungeon,
      actor.depth,
      actor.roomId,
      direction,
      actor.entityKind === "hostile" || actor.entityKind === "boss"
        ? [ROOM_FEATURE_RUNE_FORGE]
        : []
    );
    if (!next) {
      return {
        message: `${actor.name} cannot go ${direction} from here.`,
        warnings: ["move_blocked"],
        narrativeStatDelta: {},
        metadata: {},
        foundItemTags: [],
      };
    }
    const previousDepth = actor.depth;
    const previousRoomId = actor.roomId;
    actor.depth = next.depth;
    actor.roomId = next.roomId;
    const nextRoom = state.dungeon.levels[actor.depth]?.rooms[actor.roomId];
    if (!nextRoom) {
      return {
        message: `${actor.name} cannot stabilize the move target ${actor.roomId}.`,
        warnings: ["move_target_missing"],
        narrativeStatDelta: {},
        metadata: {
          direction,
          fromDepth: previousDepth,
          fromRoomId: previousRoomId,
        },
        foundItemTags: [],
      };
    }
    actor.transform = createTransform({
      position: roomCenterPosition(nextRoom),
    });
    let chapterCompleted: number | undefined;
    if (previousDepth > actor.depth) {
      chapterCompleted = chapterFor(state, previousDepth);
    }
    if (actor.isPlayer && previousDepth === 1 && direction === "up") {
      state.escaped = true;
    }
    const moveResolution = actor.isPlayer
      ? (onPlayerMoved?.({
          actor,
          previousDepth,
          previousRoomId,
          direction,
          escaped: state.escaped,
        }) ?? null)
      : null;
    return {
      message: [
        `${actor.name} moves ${direction} to ${actor.roomId}.`,
        moveResolution?.rewardMessage ?? null,
      ]
        .filter(Boolean)
        .join(" "),
      warnings: [],
      narrativeStatDelta: {},
      metadata: {
        direction,
        fromDepth: previousDepth,
        toDepth: actor.depth,
        moveTickCost: turnCost,
        mountApplied: actor.isPlayer && mountMovementApplies(),
        ...(moveResolution?.metadata ?? {}),
      },
      foundItemTags: [...(moveResolution?.foundItemTags ?? [])],
      turnCost,
      chapterCompleted,
    };
  }

  if (action.actionType === "whistle") {
    if (!THE_MOUNT) {
      return {
        message: `${actor.name} has no mount to call.`,
        warnings: ["mount_missing"],
        narrativeStatDelta: {},
        metadata: {},
        foundItemTags: [],
      };
    }
    state.mountSummoned = !state.mountSummoned;
    return {
      message: state.mountSummoned
        ? `${actor.name} calls ${THE_MOUNT.name}.`
        : `${actor.name} dismisses ${THE_MOUNT.name}.`,
      warnings: [],
      narrativeStatDelta: { Momentum: state.mountSummoned ? 0.03 : 0 },
      metadata: {
        mountId: THE_MOUNT.mountId,
        mountSummoned: state.mountSummoned,
      },
      foundItemTags: [],
    };
  }

  if (action.actionType === "train") {
    actor.combatStats.might += 1;
    actor.combatStats.willpower += 1;
    setCurrentMana(
      actor,
      clamp(
        currentMana(actor) + Number(formulas.train?.manaDelta ?? -0.15),
        0,
        1
      )
    );
    actor.xp += Number(formulas.train?.xpDelta ?? 5);
    return {
      message: `${actor.name} drills forms and gains strength.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.train?.traitDelta ?? {
          Constraint: 0.07,
          Direction: 0.05,
        },
        formulas.train?.featureDelta ?? { Momentum: 0.1 }
      ),
      metadata: {},
      foundItemTags: [],
    };
  }

  if (action.actionType === "rest") {
    const bonus =
      room.feature === ROOM_FEATURE_REST
        ? Number(formulas.rest?.manaDeltaRestRoom ?? 0.3)
        : Number(formulas.rest?.manaDeltaBase ?? 0.2);
    setCurrentMana(actor, clamp(currentMana(actor) + bonus, 0, 1));
    return {
      message: `${actor.name} takes a breath and recovers mana.`,
      warnings: [],
      narrativeStatDelta: toNumberMap(
        formulas.rest?.traitDelta ?? {
          Equilibrium: 0.04,
          Levity: 0.02,
        }
      ),
      metadata: { restBonus: bonus },
      foundItemTags: [],
    };
  }

  return null;
};
