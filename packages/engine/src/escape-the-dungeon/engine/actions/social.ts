import { ACTION_CONTRACTS } from "../../contracts";
import { currentMana } from "../../core/entity-stats";
import type { EntityState, NumberMap, PlayerAction, RoomNode } from "../../core/types";
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
  liveStreamTickManaCost: number;
  streamActive: boolean;
}): ActionAvailabilityResult | null => {
  const {
    actor,
    action,
    room,
    nearby,
    activeCompanionId,
    resolveTarget,
    availableDialogueOptions,
    liveStreamTickManaCost,
    streamActive,
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

  if (action.actionType === "live_stream") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    if (!streamActive && currentMana(actor) < liveStreamTickManaCost) {
      return { available: false, blockedReasons: ["Need more mana"] };
    }
    return { available: true, blockedReasons: [] };
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
  streamActive: boolean;
  setActiveCompanionId: (value: string | null) => void;
  setStreamActive: (value: boolean) => void;
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
    triggeredEventIds: string[];
    triggeredCutsceneIds: string[];
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
    streamActive,
    setActiveCompanionId,
    setStreamActive,
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
        dialogueTriggeredEventIds: chosen.triggeredEventIds,
        dialogueTriggeredCutsceneIds: chosen.triggeredCutsceneIds,
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
    const nextStreamState = !streamActive;
    setStreamActive(nextStreamState);
    return {
      message: nextStreamState
        ? `${actor.name} starts livestreaming the dungeon.`
        : `${actor.name} ends the livestream and refocuses on the crawl.`,
      warnings: [],
      narrativeStatDelta: {},
      metadata: { streamActive: nextStreamState },
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
