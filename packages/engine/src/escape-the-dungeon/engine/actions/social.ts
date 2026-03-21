import { ACTION_CONTRACTS } from "../../contracts";
import { narrativeStat } from "../../core/entity-stats";
import type {
  EntityState,
  NumberMap,
  PlayerAction,
  RoomNode,
} from "../../core/types";
import { computeFameGain } from "../../narrative/fame";
import { effectiveRoomVector, ROOM_FEATURE_COMBAT } from "../../world/map";
import { mergeDeltas, toNumberMap } from "../game-runtime-helpers";
import type { ActionAvailabilityResult, ActionOutcome } from "./action-types";

export const availabilityForSocialAction = (input: {
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
  nearby: EntityState[];
  activeCompanionId: string | null;
  resolveTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[],
    enemyOnly: boolean
  ) => EntityState | null;
  availableDialogueOptions: (
    actor: EntityState,
    room: RoomNode
  ) => Array<{ optionId: string }>;
}): ActionAvailabilityResult | null => {
  const {
    actor,
    action,
    room,
    nearby,
    activeCompanionId,
    resolveTarget,
    availableDialogueOptions,
  } = input;

  if (action.actionType === "talk" && nearby.length === 0) {
    return { available: false, blockedReasons: ["Need someone nearby"] };
  }

  if (action.actionType === "choose_dialogue") {
    const optionId = String(action.payload.optionId ?? "");
    if (!optionId) {
      return { available: false, blockedReasons: ["Missing option id"] };
    }
    const option = availableDialogueOptions(actor, room).find(
      (row) => row.optionId === optionId
    );
    return option
      ? { available: true, blockedReasons: [] }
      : {
          available: false,
          blockedReasons: ["Dialogue option unavailable"],
        };
  }

  if (
    action.actionType === "live_stream" &&
    narrativeStat(actor, "Effort") <
      Number(
        action.payload.effort ??
          ACTION_CONTRACTS.actions.liveStream?.effortCost ??
          10
      )
  ) {
    return { available: false, blockedReasons: ["Need more Effort"] };
  }

  if (action.actionType === "steal") {
    if (!actor.skills.shadow_hand?.unlocked) {
      return { available: false, blockedReasons: ["Need shadow_hand"] };
    }
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      false
    );
    if (!target) {
      return { available: false, blockedReasons: ["Need target"] };
    }
    if (
      !target.inventory.some((item: EntityState["inventory"][number]) =>
        item.tags.includes("loot")
      )
    ) {
      return { available: false, blockedReasons: ["Target has no loot"] };
    }
  }

  if (action.actionType === "recruit") {
    if (activeCompanionId) {
      return {
        available: false,
        blockedReasons: ["Companion slot already filled"],
      };
    }
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      false
    );
    if (!target) {
      return { available: false, blockedReasons: ["Need target"] };
    }
    if (["laughing_face", "dungeon_legion"].includes(target.faction)) {
      return {
        available: false,
        blockedReasons: ["Target faction refuses companionship"],
      };
    }
  }

  return null;
};

export const performSocialAction = (input: {
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
  nearby: EntityState[];
  lastActionType: string | null;
  setActiveCompanionId: (value: string | null) => void;
  resolveTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[],
    enemyOnly: boolean
  ) => EntityState | null;
  chooseDialogueOption: (
    actor: EntityState,
    room: RoomNode,
    optionId: string
  ) => {
    message: string;
    warnings: string[];
    traitDelta: NumberMap;
    takenItemId: string | null;
    optionId: string | null;
    optionLabel: string | null;
    optionLine: string | null;
    sceneId: string | null;
  };
  projectIntent: (intentText: string) => {
    traitDelta: NumberMap;
    featureDelta: NumberMap;
  };
  makeTargetTemporarilyHostile: (target: EntityState) => void;
}): ActionOutcome | null => {
  const {
    actor,
    action,
    room,
    nearby,
    lastActionType,
    setActiveCompanionId,
    resolveTarget,
    chooseDialogueOption,
    projectIntent,
    makeTargetTemporarilyHostile,
  } = input;
  const formulas = ACTION_CONTRACTS.actions;

  if (action.actionType === "talk") {
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      false
    );
    if (!target) {
      return {
        message: `${actor.name} speaks into the dark. No one answers.`,
        warnings: ["talk_no_target"],
        narrativeStatDelta: toNumberMap(
          formulas.talk?.noTargetTraitDelta ?? { Empathy: -0.01 }
        ),
        metadata: {},
        foundItemTags: [],
      };
    }
    return {
      message: `${actor.name} talks with ${target.name} and trades rumors.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.talk?.traitDelta ?? {
          Empathy: 0.05,
          Comprehension: 0.03,
        },
        formulas.talk?.featureDelta ?? { Awareness: 0.05 }
      ),
      metadata: {
        targetId: target.entityId,
        optionLabel: "talk",
        sceneId: "social_scene",
      },
      foundItemTags: [],
      subjectEntityId: target.entityId,
    };
  }

  if (action.actionType === "choose_dialogue") {
    const optionId = String(action.payload.optionId ?? "");
    const chosen = chooseDialogueOption(actor, room, optionId);
    return {
      message: chosen.message,
      warnings: chosen.warnings,
      narrativeStatDelta: {},
      metadata: {
        optionId,
        takenItemId: chosen.takenItemId,
        optionLabel: chosen.optionLabel,
        optionLine: chosen.optionLine,
        sceneId: chosen.sceneId,
        nextOptionId: chosen.optionId ? chosen.optionId : null,
      },
      foundItemTags: chosen.takenItemId ? ["treasure"] : [],
    };
  }

  if (action.actionType === "speak") {
    const intentText = String(action.payload.intentText ?? "");
    const projection = projectIntent(intentText || "...");
    return {
      message: `${actor.name} speaks: "${intentText || "..."}"`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        projection.traitDelta,
        projection.featureDelta
      ),
      metadata: { intentText },
      foundItemTags: [],
    };
  }

  if (action.actionType === "live_stream") {
    const effort = Number(
      action.payload.effort ?? formulas.liveStream?.effortCost ?? 10
    );
    let riskLevel = 0.35;
    if (room.feature === ROOM_FEATURE_COMBAT) {
      riskLevel = 1;
    } else if (room.feature === "treasure") {
      riskLevel = 0.6;
    }
    const fame = computeFameGain({
      currentFame: narrativeStat(actor, "Fame"),
      effortSpent: effort,
      roomVector: effectiveRoomVector(room),
      actionNovelty: lastActionType === "live_stream" ? 0.75 : 1,
      riskLevel,
      momentum: narrativeStat(actor, "Momentum"),
      hasBroadcastSkill: Boolean(actor.skills.battle_broadcast?.unlocked),
    });
    const momentum = Number(formulas.liveStream?.featureDelta?.Momentum ?? 0.2);
    return {
      message: `${actor.name} goes live and gains ${fame.gain.toFixed(2)} Fame.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.liveStream?.traitDelta ?? { Projection: 0.03 },
        {
          Fame: fame.gain,
          Effort: -effort,
          Momentum: momentum,
        }
      ),
      metadata: { fame },
      foundItemTags: [],
    };
  }

  if (action.actionType === "steal") {
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      false
    );
    if (!target) {
      return {
        message: `${actor.name} finds no valid target to steal from.`,
        warnings: ["steal_no_target"],
        narrativeStatDelta: {},
        metadata: {},
        foundItemTags: [],
      };
    }
    const item = target.inventory.find(
      (entry: EntityState["inventory"][number]) => entry.tags.includes("loot")
    );
    if (!item) {
      return {
        message: `${target.name} has nothing worth stealing.`,
        warnings: ["steal_no_loot"],
        narrativeStatDelta: {},
        metadata: { targetId: target.entityId },
        foundItemTags: [],
      };
    }
    target.inventory = target.inventory.filter(
      (entry: EntityState["inventory"][number]) => entry.itemId !== item.itemId
    );
    actor.inventory.push(item);
    makeTargetTemporarilyHostile(target);
    return {
      message: `${actor.name} steals ${item.name} from ${target.name}.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.steal?.traitDelta ?? {
          Constraint: 0.01,
          Survival: 0.02,
        },
        formulas.steal?.featureDelta ?? { Guile: 0.15 }
      ),
      metadata: { targetId: target.entityId, itemId: item.itemId },
      foundItemTags: [...item.tags],
      subjectEntityId: target.entityId,
    };
  }

  if (action.actionType === "recruit") {
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      false
    );
    if (!target) {
      return {
        message: `${actor.name} has no one to recruit here.`,
        warnings: ["recruit_no_target"],
        narrativeStatDelta: {},
        metadata: {},
        foundItemTags: [],
      };
    }
    target.faction = "party";
    target.companionTo = actor.entityId;
    setActiveCompanionId(target.entityId);
    return {
      message: `${target.name} joins ${actor.name} as a companion.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.recruit?.traitDelta ?? { Empathy: 0.04 },
        formulas.recruit?.featureDelta ?? { Awareness: 0.1 }
      ),
      metadata: { targetId: target.entityId },
      foundItemTags: [],
      subjectEntityId: target.entityId,
    };
  }

  return null;
};
