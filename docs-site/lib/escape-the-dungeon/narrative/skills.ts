import { distanceBetween, TRAIT_NAMES, type EntityState, type NumberMap, type RoomNode } from "@/lib/escape-the-dungeon/core/types";
import {
  type AvailabilityResult,
  type Prerequisite,
  evaluatePrerequisites,
} from "@/lib/escape-the-dungeon/narrative/prerequisites";
import { ROOM_FEATURE_RUNE_FORGE } from "@/lib/escape-the-dungeon/world/map";

export interface SkillDefinition {
  skillId: string;
  name: string;
  description: string;
  vectorProfile: NumberMap;
  unlockRadius: number;
  unlockRequirements: Prerequisite[];
  useRequirements: Prerequisite[];
  branchGroup?: string;
  evolvedFrom?: string;
  requiresRuneForge?: boolean;
  traitBonus: NumberMap;
  featureBonus: NumberMap;
}

export interface SkillEligibility {
  skillId: string;
  name: string;
  available: boolean;
  distance: number;
  blockedReasons: string[];
}

const vector = (values: NumberMap = {}): NumberMap => {
  const next: NumberMap = {};
  for (const trait of TRAIT_NAMES) {
    next[trait] = values[trait] ?? 0;
  }
  return next;
};

export class SkillDirector {
  readonly skills: Record<string, SkillDefinition>;

  constructor(skills: SkillDefinition[]) {
    this.skills = {};
    for (const skill of skills) {
      this.skills[skill.skillId] = skill;
    }
  }

  private branchTaken(actor: EntityState, branchGroup?: string): boolean {
    if (!branchGroup) {
      return false;
    }
    for (const [skillId, state] of Object.entries(actor.skills)) {
      if (!state.unlocked) {
        continue;
      }
      const definition = this.skills[skillId];
      if (definition?.branchGroup === branchGroup) {
        return true;
      }
    }
    return false;
  }

  evaluateUnlocks(actor: EntityState, room: RoomNode, nearbyEntities: EntityState[] = []): SkillEligibility[] {
    const rows: SkillEligibility[] = [];

    for (const definition of Object.values(this.skills)) {
      const existing = actor.skills[definition.skillId];
      if (existing?.unlocked) {
        continue;
      }
      if (definition.evolvedFrom) {
        continue;
      }

      const blockedReasons: string[] = [];
      const distance = distanceBetween(actor.traits, definition.vectorProfile, TRAIT_NAMES);
      if (distance > definition.unlockRadius) {
        blockedReasons.push("skill_vector_distance");
      }
      if (definition.requiresRuneForge && room.feature !== ROOM_FEATURE_RUNE_FORGE) {
        blockedReasons.push("needs_rune_forge");
      }
      if (this.branchTaken(actor, definition.branchGroup)) {
        blockedReasons.push("exclusive_branch_taken");
      }

      const prereq = evaluatePrerequisites(definition.unlockRequirements, {
        actor,
        room,
        nearbyEntities,
      });
      blockedReasons.push(...prereq.blockedReasons);

      rows.push({
        skillId: definition.skillId,
        name: definition.name,
        available: blockedReasons.length === 0,
        distance,
        blockedReasons,
      });
    }

    return rows.sort((a, b) => a.distance - b.distance);
  }

  unlockNewSkills(actor: EntityState, room: RoomNode, nearbyEntities: EntityState[] = []): SkillDefinition[] {
    const unlocked: SkillDefinition[] = [];
    for (const row of this.evaluateUnlocks(actor, room, nearbyEntities)) {
      if (!row.available) {
        continue;
      }
      const definition = this.skills[row.skillId];
      if (!definition || this.branchTaken(actor, definition.branchGroup)) {
        continue;
      }
      actor.skills[row.skillId] = {
        skillId: definition.skillId,
        name: definition.name,
        unlocked: true,
        mastery: 0,
      };
      applyNumberMap(actor.traits, definition.traitBonus);
      applyNumberMap(actor.features, definition.featureBonus);
      unlocked.push(definition);
    }
    return unlocked;
  }

  canUse(actor: EntityState, room: RoomNode, skillId: string, nearbyEntities: EntityState[] = []): SkillEligibility {
    const definition = this.skills[skillId];
    if (!definition) {
      return {
        skillId,
        name: skillId,
        available: false,
        distance: 999,
        blockedReasons: ["unknown_skill"],
      };
    }

    const state = actor.skills[skillId];
    if (!state?.unlocked) {
      return {
        skillId,
        name: definition.name,
        available: false,
        distance: 999,
        blockedReasons: ["skill_locked"],
      };
    }

    const result: AvailabilityResult = evaluatePrerequisites(definition.useRequirements, {
      actor,
      room,
      nearbyEntities,
    });

    return {
      skillId,
      name: definition.name,
      available: result.available,
      distance: distanceBetween(actor.traits, definition.vectorProfile, TRAIT_NAMES),
      blockedReasons: result.blockedReasons,
    };
  }

  availableEvolutions(actor: EntityState, room: RoomNode): SkillEligibility[] {
    const rows: SkillEligibility[] = [];

    for (const definition of Object.values(this.skills)) {
      if (!definition.evolvedFrom) {
        continue;
      }
      if (actor.skills[definition.skillId]?.unlocked) {
        continue;
      }

      const blockedReasons: string[] = [];
      const parent = actor.skills[definition.evolvedFrom];
      if (!parent?.unlocked) {
        blockedReasons.push("parent_skill_locked");
      }
      if (definition.requiresRuneForge && room.feature !== ROOM_FEATURE_RUNE_FORGE) {
        blockedReasons.push("needs_rune_forge");
      }
      const prereq = evaluatePrerequisites(definition.unlockRequirements, {
        actor,
        room,
        nearbyEntities: [],
      });
      blockedReasons.push(...prereq.blockedReasons);

      rows.push({
        skillId: definition.skillId,
        name: definition.name,
        available: blockedReasons.length === 0,
        distance: distanceBetween(actor.traits, definition.vectorProfile, TRAIT_NAMES),
        blockedReasons,
      });
    }

    return rows.sort((a, b) => a.distance - b.distance);
  }

  evolveSkill(actor: EntityState, room: RoomNode, skillId: string): { ok: boolean; reason: string } {
    const definition = this.skills[skillId];
    if (!definition) {
      return { ok: false, reason: "unknown_skill" };
    }
    if (!definition.evolvedFrom) {
      return { ok: false, reason: "not_evolution_skill" };
    }
    if (actor.skills[skillId]?.unlocked) {
      return { ok: false, reason: "already_unlocked" };
    }

    const parent = actor.skills[definition.evolvedFrom];
    if (!parent?.unlocked) {
      return { ok: false, reason: "parent_skill_locked" };
    }

    if (definition.requiresRuneForge && room.feature !== ROOM_FEATURE_RUNE_FORGE) {
      return { ok: false, reason: "needs_rune_forge" };
    }

    const prereq = evaluatePrerequisites(definition.unlockRequirements, {
      actor,
      room,
      nearbyEntities: [],
    });

    if (!prereq.available) {
      return { ok: false, reason: prereq.blockedReasons.join(",") || "blocked" };
    }

    actor.skills[definition.skillId] = {
      skillId: definition.skillId,
      name: definition.name,
      unlocked: true,
      mastery: 0,
    };
    applyNumberMap(actor.traits, definition.traitBonus);
    applyNumberMap(actor.features, definition.featureBonus);
    return { ok: true, reason: "evolved" };
  }
}

const applyNumberMap = (target: Record<string, number>, delta: NumberMap): void => {
  for (const [key, value] of Object.entries(delta)) {
    target[key] = Number(target[key] ?? 0) + Number(value);
  }
};

export const buildDefaultSkillDirector = (): SkillDirector => {
  const skills: SkillDefinition[] = [
    {
      skillId: "appraisal",
      name: "Appraisal",
      description: "Inspect entities and items to reveal quality and risk.",
      vectorProfile: vector({ Comprehension: 0.3, Construction: 0.2 }),
      unlockRadius: 2.2,
      unlockRequirements: [
        { kind: "min_attribute", key: "insight", value: 5, description: "Need Insight 5+" },
      ],
      useRequirements: [],
      branchGroup: "perception_branch",
      traitBonus: vector({ Comprehension: 0.04 }),
      featureBonus: { Awareness: 0.15 },
    },
    {
      skillId: "xray",
      name: "X-Ray Instinct",
      description: "Sense hidden traps and contents without opening containers.",
      vectorProfile: vector({ Projection: 0.2, Survival: 0.3 }),
      unlockRadius: 2.4,
      unlockRequirements: [
        { kind: "trait_below", key: "Comprehension", value: 0, description: "Unlocked by rough instinct" },
      ],
      useRequirements: [],
      branchGroup: "perception_branch",
      traitBonus: vector({ Survival: 0.04 }),
      featureBonus: { Awareness: 0.12 },
    },
    {
      skillId: "deep_appraisal",
      name: "Deep Appraisal",
      description: "Advanced appraisal that reveals hidden bonuses and faction clues.",
      vectorProfile: vector({ Comprehension: 0.45, Construction: 0.35 }),
      unlockRadius: 2,
      unlockRequirements: [
        { kind: "min_attribute", key: "insight", value: 7, description: "Need Insight 7+" },
        { kind: "min_feature", key: "Awareness", value: 0.3, description: "Need Awareness" },
      ],
      useRequirements: [],
      evolvedFrom: "appraisal",
      requiresRuneForge: true,
      traitBonus: vector({ Comprehension: 0.08, Construction: 0.04 }),
      featureBonus: { Awareness: 0.2 },
    },
    {
      skillId: "trap_vision",
      name: "Trap Vision",
      description: "Evolved xray skill specialized in trap prediction and bypass.",
      vectorProfile: vector({ Survival: 0.45, Projection: 0.3 }),
      unlockRadius: 2,
      unlockRequirements: [
        { kind: "min_attribute", key: "willpower", value: 6, description: "Need Willpower 6+" },
        { kind: "min_feature", key: "Awareness", value: 0.25, description: "Need Awareness" },
      ],
      useRequirements: [],
      evolvedFrom: "xray",
      requiresRuneForge: true,
      traitBonus: vector({ Survival: 0.08, Projection: 0.04 }),
      featureBonus: { Awareness: 0.18 },
    },
    {
      skillId: "keen_eye",
      name: "Keen Eye",
      description: "Perceive value and patterns in crowded rooms.",
      vectorProfile: vector({ Comprehension: 0.35, Survival: 0.25 }),
      unlockRadius: 1.8,
      unlockRequirements: [
        { kind: "min_attribute", key: "insight", value: 6, description: "Need Insight 6+" },
        { kind: "min_trait", key: "Comprehension", value: 0.05, description: "Need Comprehension focus" },
      ],
      useRequirements: [],
      traitBonus: vector({ Comprehension: 0.06 }),
      featureBonus: { Awareness: 0.25 },
    },
    {
      skillId: "shadow_hand",
      name: "Shadow Hand",
      description: "Steal from distracted targets when opportunity appears.",
      vectorProfile: vector({ Constraint: 0.25, Survival: 0.35, Projection: 0.2 }),
      unlockRadius: 1.9,
      unlockRequirements: [
        { kind: "skill_unlocked", key: "keen_eye", description: "Need Keen Eye" },
        { kind: "min_attribute", key: "agility", value: 6, description: "Need Agility 6+" },
        { kind: "min_feature", key: "Awareness", value: 0.2, description: "Need Awareness" },
      ],
      useRequirements: [
        { kind: "target_exists", description: "Need a target" },
        { kind: "target_has_item_tag", key: "loot", description: "Target must carry loot" },
      ],
      traitBonus: vector({ Survival: 0.05, Constraint: 0.04 }),
      featureBonus: { Guile: 0.25 },
    },
    {
      skillId: "battle_broadcast",
      name: "Battle Broadcast",
      description: "Turn danger into audience momentum while streaming.",
      vectorProfile: vector({ Direction: 0.35, Projection: 0.25, Survival: 0.3 }),
      unlockRadius: 2,
      unlockRequirements: [
        { kind: "min_attribute", key: "might", value: 7, description: "Need Might 7+" },
        { kind: "min_feature", key: "Fame", value: 5, description: "Need Fame 5+" },
      ],
      useRequirements: [],
      traitBonus: vector({ Direction: 0.06, Projection: 0.05 }),
      featureBonus: { Momentum: 0.5 },
    },
  ];

  return new SkillDirector(skills);
};
