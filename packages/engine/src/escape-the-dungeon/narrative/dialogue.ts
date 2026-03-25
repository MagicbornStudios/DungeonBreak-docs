import { DIALOGUE_PACK } from "../contracts";
import {
  type DialogueProgressState,
  distanceBetween,
  type EntityState,
  mergeNumberMaps,
  type NumberMap,
  type RoomNode,
  TRAIT_NAMES,
} from "../core/types";
import {
  effectiveRoomVector,
  hasRoomItemTag,
  takeFirstItemWithTag,
} from "../world/map";

export interface DialogueOption {
  optionId: string;
  label: string;
  line: string;
  sceneId: string;
  anchorVector: NumberMap;
  radius: number;
  effectVector: NumberMap;
  responseText: string;
  requiresRoomFeature?: string;
  requiresItemTagPresent?: string;
  requiresItemTagAbsent?: string;
  requiresSkillId?: string;
  takeItemTag?: string;
  nextOptionId?: string;
  onSelectEventIds?: string[];
  onSelectCutsceneIds?: string[];
}

export interface DialogueEvaluation {
  optionId: string;
  label: string;
  sceneId: string;
  available: boolean;
  distance: number;
  blockedReasons: string[];
  line: string;
  responseText: string;
}

const vector = (values: NumberMap = {}): NumberMap => {
  const next: NumberMap = {};
  for (const trait of TRAIT_NAMES) {
    next[trait] = values[trait] ?? 0;
  }
  return next;
};

export class DialogueDirector {
  readonly options: DialogueOption[];
  readonly prerequisiteByOptionId: Record<string, string[]>;

  constructor(options: DialogueOption[]) {
    this.options = options;
    this.prerequisiteByOptionId = {};
    for (const option of options) {
      if (!this.prerequisiteByOptionId[option.optionId]) {
        this.prerequisiteByOptionId[option.optionId] = [];
      }
    }
    for (const option of options) {
      const nextOptionId = option.nextOptionId;
      if (!nextOptionId) {
        continue;
      }
      const prerequisites = this.prerequisiteByOptionId[nextOptionId] ?? [];
      this.prerequisiteByOptionId[nextOptionId] = [
        ...prerequisites,
        option.optionId,
      ];
    }
  }

  roomContextVector(entity: EntityState, room: RoomNode): NumberMap {
    return mergeNumberMaps(entity.narrativeStats, effectiveRoomVector(room));
  }

  evaluateOptions(
    entity: EntityState,
    room: RoomNode,
    progress?: DialogueProgressState
  ): DialogueEvaluation[] {
    const context = this.roomContextVector(entity, room);
    const visitedOptionIds = new Set(progress?.visitedOptionIds ?? []);
    const rows: DialogueEvaluation[] = [];

    for (const option of this.options) {
      const distance = distanceBetween(
        context,
        option.anchorVector,
        TRAIT_NAMES
      );
      const blockedReasons: string[] = [];

      if (
        option.requiresRoomFeature &&
        option.requiresRoomFeature !== room.feature
      ) {
        blockedReasons.push("room_feature_mismatch");
      }
      if (
        option.requiresItemTagPresent &&
        !hasRoomItemTag(room, option.requiresItemTagPresent)
      ) {
        blockedReasons.push("required_item_missing");
      }
      if (
        option.requiresItemTagAbsent &&
        hasRoomItemTag(room, option.requiresItemTagAbsent)
      ) {
        blockedReasons.push("forbidden_item_present");
      }
      if (
        option.requiresSkillId &&
        !entity.skills[option.requiresSkillId]?.unlocked
      ) {
        blockedReasons.push("required_skill_missing");
      }
      if (distance > option.radius) {
        blockedReasons.push("option_out_of_range");
      }
      const prerequisites = this.prerequisiteByOptionId[option.optionId] ?? [];
      if (
        prerequisites.length > 0 &&
        !prerequisites.some((requiredOptionId) =>
          visitedOptionIds.has(requiredOptionId)
        )
      ) {
        blockedReasons.push("dialogue_progress_locked");
      }

      rows.push({
        optionId: option.optionId,
        label: option.label,
        sceneId: option.sceneId,
        available: blockedReasons.length === 0,
        distance,
        blockedReasons,
        line: option.line,
        responseText: option.responseText,
      });
    }

    return rows.sort((a, b) => a.distance - b.distance);
  }

  availableOptions(
    entity: EntityState,
    room: RoomNode,
    progress?: DialogueProgressState
  ): DialogueEvaluation[] {
    return this.evaluateOptions(entity, room, progress).filter(
      (row) => row.available
    );
  }

  chooseOption(
    entity: EntityState,
    room: RoomNode,
    optionId: string,
    progress?: DialogueProgressState
  ): {
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
  } {
    const option = this.findOption(optionId);
    if (!option) {
      return {
        message: "That dialogue option does not exist.",
        warnings: ["dialogue_option_unknown"],
        traitDelta: {},
        takenItemId: null,
        optionId: null,
        optionLabel: null,
        optionLine: null,
        sceneId: null,
        triggeredEventIds: [],
        triggeredCutsceneIds: [],
      };
    }

    const evaluation = this.evaluateOptions(entity, room, progress).find(
      (row) => row.optionId === option.optionId
    );
    if (!evaluation?.available) {
      return {
        message: "That option is out of range right now.",
        warnings: ["dialogue_option_out_of_range"],
        traitDelta: {},
        takenItemId: null,
        optionId: null,
        optionLabel: null,
        optionLine: null,
        sceneId: null,
        triggeredEventIds: [],
        triggeredCutsceneIds: [],
      };
    }

    const traitStore = entity.narrativeStats as Record<string, number>;
    for (const [key, delta] of Object.entries(option.effectVector)) {
      traitStore[key] = Number(traitStore[key] ?? 0) + Number(delta);
    }

    let takenItemId: string | null = null;
    const warnings: string[] = [];
    if (option.takeItemTag) {
      const item = takeFirstItemWithTag(room, option.takeItemTag);
      if (item) {
        takenItemId = item.itemId;
      } else {
        warnings.push("dialogue_item_missing");
      }
    }

    return {
      message: option.responseText,
      warnings,
      traitDelta: { ...option.effectVector },
      takenItemId,
      optionId: option.optionId,
      optionLabel: option.label,
      optionLine: option.line,
      sceneId: option.sceneId,
      triggeredEventIds: [...(option.onSelectEventIds ?? [])],
      triggeredCutsceneIds: [...(option.onSelectCutsceneIds ?? [])],
    };
  }

  private findOption(optionId: string): DialogueOption | null {
    const normalized = optionId.trim().toLowerCase();
    for (const option of this.options) {
      if (option.optionId.toLowerCase() === normalized) {
        return option;
      }
    }
    return null;
  }

  findNextOptionId(optionId: string): string | null {
    const option = this.findOption(optionId);
    return option?.nextOptionId ?? null;
  }
}

export const buildDefaultDialogueDirector = (): DialogueDirector => {
  const pack = DIALOGUE_PACK as {
    dialogues: Array<{
      dialogueId: string;
      sceneId?: string;
      label: string;
      line: string;
      responseText: string;
      anchorVector?: NumberMap;
      radius?: number;
      effectVector?: NumberMap;
      requiresRoomFeature?: string;
      requiresItemTagPresent?: string;
      requiresItemTagAbsent?: string;
      requiresSkillId?: string;
      takeItemTag?: string;
      nextDialogueId?: string;
      onSelectEventIds?: string[];
      onSelectCutsceneIds?: string[];
    }>;
  };
  const options: DialogueOption[] = (pack.dialogues ?? []).map((d) => ({
    optionId: d.dialogueId,
    label: d.label,
    line: d.line,
    sceneId: d.sceneId ?? "",
    anchorVector: vector(d.anchorVector),
    radius: Number(d.radius ?? 2),
    effectVector: vector(d.effectVector),
    responseText: d.responseText,
    requiresRoomFeature: d.requiresRoomFeature,
    requiresItemTagPresent: d.requiresItemTagPresent,
    requiresItemTagAbsent: d.requiresItemTagAbsent,
    requiresSkillId: d.requiresSkillId,
    takeItemTag: d.takeItemTag,
    nextOptionId: d.nextDialogueId,
    onSelectEventIds: d.onSelectEventIds,
    onSelectCutsceneIds: d.onSelectCutsceneIds,
  }));
  return new DialogueDirector(options);
};
