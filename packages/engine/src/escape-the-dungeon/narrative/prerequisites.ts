import type { EntityState, RoomNode } from "../core/types";
import { hasRoomItemTag } from "../world/map";

export type PrerequisiteKind =
  | "room_feature_is"
  | "min_attribute"
  | "min_trait"
  | "min_feature"
  | "skill_unlocked"
  | "target_exists"
  | "target_has_item_tag"
  | "min_reputation"
  | "max_reputation"
  | "faction_is"
  | "target_faction_is"
  | "trait_below";

export interface Prerequisite {
  kind: PrerequisiteKind;
  key?: string;
  value?: number | string;
  description?: string;
}

export interface PrerequisiteContext {
  actor: EntityState;
  room: RoomNode;
  nearbyEntities: EntityState[];
  targetEntity?: EntityState | null;
}

export interface AvailabilityResult {
  available: boolean;
  blockedReasons: string[];
}

const selectTarget = (ctx: PrerequisiteContext): EntityState | null => {
  if (ctx.targetEntity) {
    return ctx.targetEntity;
  }
  return ctx.nearbyEntities[0] ?? null;
};

const attributeValue = (actor: EntityState, key: string): number => {
  return Number((actor.attributes as unknown as Record<string, number>)[key] ?? 0);
};

const traitValue = (actor: EntityState, key: string): number => {
  return Number((actor.traits as unknown as Record<string, number>)[key] ?? 0);
};

const featureValue = (actor: EntityState, key: string): number => {
  return Number((actor.features as unknown as Record<string, number>)[key] ?? 0);
};

const evaluateOne = (
  prereq: Prerequisite,
  ctx: PrerequisiteContext,
): { pass: boolean; reason: string } => {
  const reason = prereq.description ?? prereq.kind;

  if (prereq.kind === "room_feature_is") {
    return { pass: ctx.room.feature === String(prereq.value ?? ""), reason };
  }

  if (prereq.kind === "min_attribute") {
    const key = String(prereq.key ?? "");
    const minimum = Number(prereq.value ?? 0);
    const current = attributeValue(ctx.actor, key);
    return { pass: current >= minimum, reason };
  }

  if (prereq.kind === "min_trait") {
    const key = String(prereq.key ?? "");
    const minimum = Number(prereq.value ?? 0);
    return { pass: traitValue(ctx.actor, key) >= minimum, reason };
  }

  if (prereq.kind === "min_feature") {
    const key = String(prereq.key ?? "");
    const minimum = Number(prereq.value ?? 0);
    return { pass: featureValue(ctx.actor, key) >= minimum, reason };
  }

  if (prereq.kind === "skill_unlocked") {
    const key = String(prereq.key ?? "");
    return { pass: Boolean(ctx.actor.skills[key]?.unlocked), reason };
  }

  if (prereq.kind === "target_exists") {
    return { pass: selectTarget(ctx) !== null, reason };
  }

  if (prereq.kind === "target_has_item_tag") {
    const target = selectTarget(ctx);
    const tag = String(prereq.key ?? "");
    if (!target) {
      return { pass: false, reason };
    }
    return {
      pass: target.inventory.some((item) => item.tags.includes(tag)),
      reason,
    };
  }

  if (prereq.kind === "min_reputation") {
    return { pass: ctx.actor.reputation >= Number(prereq.value ?? 0), reason };
  }

  if (prereq.kind === "max_reputation") {
    return { pass: ctx.actor.reputation <= Number(prereq.value ?? 0), reason };
  }

  if (prereq.kind === "faction_is") {
    return {
      pass: ctx.actor.faction.toLowerCase() === String(prereq.value ?? "").toLowerCase(),
      reason,
    };
  }

  if (prereq.kind === "target_faction_is") {
    const target = selectTarget(ctx);
    if (!target) {
      return { pass: false, reason };
    }
    return {
      pass: target.faction.toLowerCase() === String(prereq.value ?? "").toLowerCase(),
      reason,
    };
  }

  if (prereq.kind === "trait_below") {
    const key = String(prereq.key ?? "");
    const threshold = Number(prereq.value ?? 0);
    return { pass: traitValue(ctx.actor, key) <= threshold, reason };
  }

  return { pass: false, reason: `unknown_prerequisite:${prereq.kind}` };
};

export const evaluatePrerequisites = (
  prerequisites: readonly Prerequisite[],
  ctx: PrerequisiteContext,
): AvailabilityResult => {
  const blockedReasons: string[] = [];
  for (const prereq of prerequisites) {
    const result = evaluateOne(prereq, ctx);
    if (!result.pass) {
      blockedReasons.push(result.reason);
    }
  }
  return {
    available: blockedReasons.length === 0,
    blockedReasons,
  };
};

export const roomHasItemTag = (room: RoomNode, tag: string): boolean => {
  return hasRoomItemTag(room, tag);
};
