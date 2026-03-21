import type {
  CombatStatKey,
  EntityState,
  NarrativeStatName,
  NumberMap,
  RuneStatId,
  SkillStatKey,
} from "./types";

export const combatStat = (entity: EntityState, key: CombatStatKey): number =>
  Number(entity.combatStats[key] ?? 0);

export const setCombatStat = (
  entity: EntityState,
  key: CombatStatKey,
  value: number,
): number => {
  const next = Number(value ?? 0);
  entity.combatStats[key] = next;
  return next;
};

export const adjustCombatStat = (
  entity: EntityState,
  key: CombatStatKey,
  delta: number,
): number => setCombatStat(entity, key, combatStat(entity, key) + Number(delta ?? 0));

export const skillStat = (entity: EntityState, key: SkillStatKey): number =>
  Number(entity.skillStats[key] ?? 0);

export const setSkillStat = (
  entity: EntityState,
  key: SkillStatKey,
  value: number,
): number => {
  const next = Number(value ?? 0);
  entity.skillStats[key] = next;
  return next;
};

export const narrativeStat = (
  entity: EntityState,
  key: NarrativeStatName | string,
): number => Number((entity.narrativeStats as NumberMap)[key] ?? 0);

export const setNarrativeStat = (
  entity: EntityState,
  key: NarrativeStatName | string,
  value: number,
): number => {
  const next = Number(value ?? 0);
  (entity.narrativeStats as NumberMap)[key] = next;
  return next;
};

export const adjustNarrativeStat = (
  entity: EntityState,
  key: NarrativeStatName | string,
  delta: number,
): number =>
  setNarrativeStat(entity, key, narrativeStat(entity, key) + Number(delta ?? 0));

export const runeStat = (entity: EntityState, runeId: RuneStatId | string): number =>
  Number(entity.runeStats[runeId] ?? 0);

export const setRuneStat = (
  entity: EntityState,
  runeId: RuneStatId | string,
  value: number,
): number => {
  const next = Number(value ?? 0);
  entity.runeStats[runeId] = next;
  return next;
};

export const adjustRuneStat = (
  entity: EntityState,
  runeId: RuneStatId | string,
  delta: number,
): number => setRuneStat(entity, runeId, runeStat(entity, runeId) + Number(delta ?? 0));

export const currentHp = (entity: EntityState): number =>
  combatStat(entity, "currentHp");

export const setCurrentHp = (entity: EntityState, value: number): number =>
  setCombatStat(entity, "currentHp", value);

export const currentMana = (entity: EntityState): number =>
  combatStat(entity, "currentMana");

export const setCurrentMana = (entity: EntityState, value: number): number =>
  setCombatStat(entity, "currentMana", value);

export const isAlive = (entity: EntityState): boolean => currentHp(entity) > 0;
