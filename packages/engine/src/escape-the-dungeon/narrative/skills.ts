import { distanceBetween, TRAIT_NAMES, type EntityState, type NumberMap, type RoomNode } from "../core/types";
import { SKILL_PACK } from "../contracts";
import {
  type AvailabilityResult,
  type Prerequisite,
  evaluatePrerequisites,
} from "../narrative/prerequisites";
import { ROOM_FEATURE_RUNE_FORGE } from "../world/map";

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
  const skills: SkillDefinition[] = SKILL_PACK.skills.map((row) => ({
    skillId: row.skillId,
    name: row.name,
    description: row.description,
    vectorProfile: vector((row.vectorProfile as NumberMap | undefined) ?? {}),
    unlockRadius: Number(row.unlockRadius ?? 2.2),
    unlockRequirements: [...((row.unlockRequirements as Prerequisite[] | undefined) ?? [])],
    useRequirements: [...((row.useRequirements as Prerequisite[] | undefined) ?? [])],
    branchGroup: row.branchGroup ?? row.branch,
    evolvedFrom: row.evolvesFrom,
    requiresRuneForge: row.requiresRuneForge ?? false,
    traitBonus: vector((row.traitBonus as NumberMap | undefined) ?? {}),
    featureBonus: { ...((row.featureBonus as NumberMap | undefined) ?? {}) },
  }));
  return new SkillDirector(skills);
};
