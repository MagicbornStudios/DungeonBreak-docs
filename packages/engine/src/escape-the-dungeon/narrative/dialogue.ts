import { distanceBetween, mergeNumberMaps, TRAIT_NAMES, type EntityState, type NumberMap, type RoomNode } from "../core/types";
import { DIALOGUE_PACK } from "../contracts";
import { effectiveRoomVector, hasRoomItemTag, takeFirstItemWithTag } from "../world/map";

export interface DialogueOption {
  optionId: string;
  label: string;
  line: string;
  clusterId: string;
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
}

export interface DialogueCluster {
  clusterId: string;
  title: string;
  centerVector: NumberMap;
  radius: number;
  options: DialogueOption[];
}

export interface DialogueEvaluation {
  optionId: string;
  label: string;
  clusterId: string;
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
  readonly clusters: Record<string, DialogueCluster>;

  constructor(clusters: DialogueCluster[]) {
    this.clusters = {};
    for (const cluster of clusters) {
      this.clusters[cluster.clusterId] = cluster;
    }
  }

  roomContextVector(entity: EntityState, room: RoomNode): NumberMap {
    return mergeNumberMaps(entity.traits, effectiveRoomVector(room));
  }

  evaluateOptions(entity: EntityState, room: RoomNode): DialogueEvaluation[] {
    const context = this.roomContextVector(entity, room);
    const rows: DialogueEvaluation[] = [];

    for (const cluster of Object.values(this.clusters)) {
      const clusterDistance = distanceBetween(context, cluster.centerVector, TRAIT_NAMES);
      for (const option of cluster.options) {
        const distance = distanceBetween(context, option.anchorVector, TRAIT_NAMES);
        const blockedReasons: string[] = [];

        if (clusterDistance > cluster.radius) {
          blockedReasons.push("cluster_out_of_range");
        }
        if (option.requiresRoomFeature && option.requiresRoomFeature !== room.feature) {
          blockedReasons.push("room_feature_mismatch");
        }
        if (option.requiresItemTagPresent && !hasRoomItemTag(room, option.requiresItemTagPresent)) {
          blockedReasons.push("required_item_missing");
        }
        if (option.requiresItemTagAbsent && hasRoomItemTag(room, option.requiresItemTagAbsent)) {
          blockedReasons.push("forbidden_item_present");
        }
        if (option.requiresSkillId && !entity.skills[option.requiresSkillId]?.unlocked) {
          blockedReasons.push("required_skill_missing");
        }
        if (distance > option.radius) {
          blockedReasons.push("option_out_of_range");
        }

        rows.push({
          optionId: option.optionId,
          label: option.label,
          clusterId: option.clusterId,
          available: blockedReasons.length === 0,
          distance,
          blockedReasons,
          line: option.line,
          responseText: option.responseText,
        });
      }
    }

    return rows.sort((a, b) => a.distance - b.distance);
  }

  availableOptions(entity: EntityState, room: RoomNode): DialogueEvaluation[] {
    return this.evaluateOptions(entity, room).filter((row) => row.available);
  }

  chooseOption(
    entity: EntityState,
    room: RoomNode,
    optionId: string,
  ): {
    message: string;
    warnings: string[];
    traitDelta: NumberMap;
    takenItemId: string | null;
    optionId: string | null;
    optionLabel: string | null;
    optionLine: string | null;
    clusterId: string | null;
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
        clusterId: null,
      };
    }

    const evaluation = this.evaluateOptions(entity, room).find((row) => row.optionId === option.optionId);
    if (!evaluation || !evaluation.available) {
      return {
        message: "That option is out of range right now.",
        warnings: ["dialogue_option_out_of_range"],
        traitDelta: {},
        takenItemId: null,
        optionId: null,
        optionLabel: null,
        optionLine: null,
        clusterId: null,
      };
    }

    const traitStore = entity.traits as unknown as Record<string, number>;
    for (const [key, delta] of Object.entries(option.effectVector)) {
      traitStore[key] = Number(traitStore[key] ?? 0) + Number(delta);
    }

    let takenItemId: string | null = null;
    const warnings: string[] = [];
    if (option.takeItemTag) {
      const item = takeFirstItemWithTag(room, option.takeItemTag);
      if (!item) {
        warnings.push("dialogue_item_missing");
      } else {
        takenItemId = item.itemId;
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
      clusterId: option.clusterId,
    };
  }

  private findOption(optionId: string): DialogueOption | null {
    const normalized = optionId.trim().toLowerCase();
    for (const cluster of Object.values(this.clusters)) {
      for (const option of cluster.options) {
        if (option.optionId.toLowerCase() === normalized) {
          return option;
        }
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
  const clusters: DialogueCluster[] = DIALOGUE_PACK.clusters.map((cluster) => ({
    clusterId: cluster.clusterId,
    title: cluster.title,
    centerVector: vector(cluster.centerVector as NumberMap),
    radius: Number(cluster.radius),
    options: cluster.options.map((option) => ({
      optionId: option.optionId,
      label: option.label,
      line: option.line,
      clusterId: option.clusterId,
      anchorVector: vector(option.anchorVector as NumberMap),
      radius: Number(option.radius),
      effectVector: vector(option.effectVector as NumberMap),
      responseText: option.responseText,
      requiresRoomFeature: option.requiresRoomFeature,
      requiresItemTagPresent: option.requiresItemTagPresent,
      requiresItemTagAbsent: option.requiresItemTagAbsent,
      requiresSkillId: option.requiresSkillId,
      takeItemTag: option.takeItemTag,
      nextOptionId: option.nextOptionId,
    })),
  }));
  return new DialogueDirector(clusters);
};
