import {
  createCombatStats,
  createNarrativeStats,
  createSkillStats,
  type EntityState,
} from "./types";

export const normalizeEntityStats = (entity: EntityState): EntityState => {
  entity.combatStats = createCombatStats(entity.combatStats);
  entity.skillStats = createSkillStats(entity.skillStats);
  entity.narrativeStats = createNarrativeStats(entity.narrativeStats);
  entity.runeStats = { ...entity.runeStats };
  return entity;
};
