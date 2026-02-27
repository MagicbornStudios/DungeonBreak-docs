import { distanceBetween, mergeNumberMaps, TRAIT_NAMES, type EntityState, type NumberMap, type RoomNode } from "@/lib/escape-the-dungeon/core/types";
import { effectiveRoomVector, hasRoomItemTag, takeFirstItemWithTag } from "@/lib/escape-the-dungeon/world/map";

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
  takeItemTag?: string;
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
  } {
    const option = this.findOption(optionId);
    if (!option) {
      return {
        message: "That dialogue option does not exist.",
        warnings: ["dialogue_option_unknown"],
        traitDelta: {},
        takenItemId: null,
      };
    }

    const evaluation = this.evaluateOptions(entity, room).find((row) => row.optionId === option.optionId);
    if (!evaluation || !evaluation.available) {
      return {
        message: "That option is out of range right now.",
        warnings: ["dialogue_option_out_of_range"],
        traitDelta: {},
        takenItemId: null,
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
}

export const buildDefaultDialogueDirector = (): DialogueDirector => {
  const clusters: DialogueCluster[] = [
    {
      clusterId: "treasure_cluster",
      title: "Treasure choices",
      centerVector: vector({ Projection: 0.5, Survival: 0.4 }),
      radius: 2,
      options: [
        {
          optionId: "loot_treasure",
          label: "Loot the treasure cache",
          line: "I pry open the cache and take what I can.",
          clusterId: "treasure_cluster",
          anchorVector: vector({ Projection: 0.6, Survival: 0.5 }),
          radius: 1.6,
          effectVector: vector({ Construction: 0.1, Survival: 0.15 }),
          responseText: "You salvage useful supplies from the opened cache.",
          requiresItemTagPresent: "treasure",
          takeItemTag: "treasure",
        },
        {
          optionId: "wish_something_else_was_here",
          label: "Say: I wish something else was here",
          line: "I wish something else was here.",
          clusterId: "treasure_cluster",
          anchorVector: vector({ Comprehension: 0.2, Projection: 0.25 }),
          radius: 2.1,
          effectVector: vector({ Comprehension: 0.06, Levity: -0.02 }),
          responseText: "You stare at the empty corner and note what has changed.",
          requiresItemTagAbsent: "treasure",
        },
      ],
    },
    {
      clusterId: "training_cluster",
      title: "Training mindset",
      centerVector: vector({ Constraint: 0.5, Direction: 0.4 }),
      radius: 2,
      options: [
        {
          optionId: "discipline_oath",
          label: "Make a discipline oath",
          line: "No wasted motion. No wasted turns.",
          clusterId: "training_cluster",
          anchorVector: vector({ Constraint: 0.55, Direction: 0.35 }),
          radius: 1.8,
          effectVector: vector({ Constraint: 0.1, Direction: 0.08 }),
          responseText: "You lock into a strict routine.",
          requiresRoomFeature: "training",
        },
      ],
    },
    {
      clusterId: "social_cluster",
      title: "Social options",
      centerVector: vector({ Empathy: 0.35, Comprehension: 0.25 }),
      radius: 2,
      options: [
        {
          optionId: "ask_for_routes",
          label: "Ask about hidden routes",
          line: "Tell me what path you saw last.",
          clusterId: "social_cluster",
          anchorVector: vector({ Empathy: 0.45, Comprehension: 0.35 }),
          radius: 1.9,
          effectVector: vector({ Comprehension: 0.09, Empathy: 0.06 }),
          responseText: "The reply gives you clues about nearby corridors.",
          requiresRoomFeature: "dialogue",
        },
      ],
    },
  ];

  return new DialogueDirector(clusters);
};
