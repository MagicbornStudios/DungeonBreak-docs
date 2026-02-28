import { ARCHETYPE_PACK } from "../contracts";
import { FEATURE_NAMES, TRAIT_NAMES, type EntityState, type NumberMap } from "../core/types";

export interface ArchetypeDefinition {
  archetypeId: string;
  label: string;
  description: string;
  vectorProfile: NumberMap;
  featureProfile: NumberMap;
  preferredSkills: string[];
}

export interface ArchetypeScore {
  archetypeId: string;
  label: string;
  score: number;
}

const dot = (a: NumberMap, b: NumberMap, keys: readonly string[]): number => {
  let total = 0;
  for (const key of keys) {
    total += Number(a[key] ?? 0) * Number(b[key] ?? 0);
  }
  return total;
};

const magnitude = (a: NumberMap, keys: readonly string[]): number => {
  let total = 0;
  for (const key of keys) {
    const value = Number(a[key] ?? 0);
    total += value * value;
  }
  return Math.sqrt(total);
};

const cosine = (a: NumberMap, b: NumberMap, keys: readonly string[]): number => {
  const magA = magnitude(a, keys);
  const magB = magnitude(b, keys);
  if (magA <= 1e-9 || magB <= 1e-9) {
    return 0;
  }
  return dot(a, b, keys) / (magA * magB);
};

const toTraitVector = (source: NumberMap): NumberMap => {
  const next: NumberMap = {};
  for (const key of TRAIT_NAMES) {
    next[key] = Number(source[key] ?? 0);
  }
  return next;
};

const toFeatureVector = (source: NumberMap): NumberMap => {
  const next: NumberMap = {};
  for (const key of FEATURE_NAMES) {
    next[key] = Number(source[key] ?? 0);
  }
  return next;
};

export class ArchetypeDirector {
  readonly archetypes: ArchetypeDefinition[];

  constructor(archetypes: ArchetypeDefinition[]) {
    this.archetypes = archetypes;
  }

  rank(entity: EntityState): ArchetypeScore[] {
    const traitVector = toTraitVector(entity.traits);
    const featureVector = toFeatureVector(entity.features);

    const rows = this.archetypes.map((definition) => {
      const traitScore = cosine(traitVector, definition.vectorProfile, TRAIT_NAMES);
      const featureScore = cosine(featureVector, definition.featureProfile, FEATURE_NAMES);
      const unlockedPreferred = definition.preferredSkills.filter((skillId) => entity.skills[skillId]?.unlocked).length;
      const skillScore = Math.min(0.24, unlockedPreferred * 0.08);
      return {
        archetypeId: definition.archetypeId,
        label: definition.label,
        score: traitScore * 0.65 + featureScore * 0.25 + skillScore,
      };
    });

    return rows.sort((a, b) => b.score - a.score);
  }

  classify(entity: EntityState, currentHeading: string): string {
    const ranked = this.rank(entity);
    const best = ranked[0];
    if (!best) {
      return currentHeading;
    }
    if (best.score < 0.12) {
      return currentHeading;
    }
    const current = ranked.find((row) => row.archetypeId === currentHeading);
    if (current && best.score - current.score < 0.05) {
      return currentHeading;
    }
    return best.archetypeId;
  }
}

export const buildDefaultArchetypeDirector = (): ArchetypeDirector => {
  const rows: ArchetypeDefinition[] = ARCHETYPE_PACK.archetypes.map((entry) => ({
    archetypeId: entry.archetypeId,
    label: entry.label,
    description: entry.description,
    vectorProfile: toTraitVector(entry.vectorProfile as NumberMap),
    featureProfile: toFeatureVector((entry.featureProfile as NumberMap | undefined) ?? {}),
    preferredSkills: [...(entry.preferredSkills ?? [])],
  }));
  return new ArchetypeDirector(rows);
};
