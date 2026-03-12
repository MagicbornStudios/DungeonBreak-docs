export const ENGINE_RUNTIME_TRAIT_STAT_SET_ID = "engine.runtime.traits";
export const ENGINE_RUNTIME_FEATURE_STAT_SET_ID = "engine.runtime.features";

export type StatValueMap = Record<string, number>;
export type StatSetValuesById = Record<string, StatValueMap>;

function orderedStatSetIds(input: {
  statSetValuesById: StatSetValuesById;
  statSetDeltaValuesById: StatSetValuesById;
  preferredStatSetIds?: string[];
}): string[] {
  const ordered = new Set(input.preferredStatSetIds ?? []);
  for (const statSetId of Object.keys(input.statSetValuesById)) {
    ordered.add(statSetId);
  }
  for (const statSetId of Object.keys(input.statSetDeltaValuesById)) {
    ordered.add(statSetId);
  }
  return [...ordered];
}

export function mergeStatValueMaps(
  baseValues?: StatValueMap,
  deltaValues?: StatValueMap
): StatValueMap {
  const featureIds = new Set([
    ...Object.keys(baseValues ?? {}),
    ...Object.keys(deltaValues ?? {}),
  ]);
  return Object.fromEntries(
    [...featureIds].map((featureId) => [
      featureId,
      Number(baseValues?.[featureId] ?? 0) +
        Number(deltaValues?.[featureId] ?? 0),
    ])
  );
}

export function getMergedStatSetValues(
  statSetValuesById: StatSetValuesById,
  statSetDeltaValuesById: StatSetValuesById,
  statSetId: string
): StatValueMap {
  return mergeStatValueMaps(
    statSetValuesById[statSetId],
    statSetDeltaValuesById[statSetId]
  );
}

export function listStatSetFeatureIds(
  statSetValuesById: StatSetValuesById,
  statSetDeltaValuesById: StatSetValuesById,
  statSetId: string
): string[] {
  return Object.keys(
    getMergedStatSetValues(statSetValuesById, statSetDeltaValuesById, statSetId)
  ).sort((left, right) => left.localeCompare(right));
}

export function resolveOwningStatSetId(input: {
  featureId: string;
  statSetValuesById: StatSetValuesById;
  statSetDeltaValuesById: StatSetValuesById;
  preferredStatSetIds?: string[];
}): string | null {
  for (const statSetId of orderedStatSetIds(input)) {
    if (
      input.featureId in (input.statSetValuesById[statSetId] ?? {}) ||
      input.featureId in (input.statSetDeltaValuesById[statSetId] ?? {})
    ) {
      return statSetId;
    }
  }
  return null;
}

export function getFeatureValueFromStatSets(input: {
  featureId: string;
  statSetValuesById: StatSetValuesById;
  statSetDeltaValuesById: StatSetValuesById;
  preferredStatSetIds?: string[];
}): number | null {
  const statSetId = resolveOwningStatSetId(input);
  if (!statSetId) {
    return null;
  }
  return Number(input.statSetValuesById[statSetId]?.[input.featureId] ?? 0);
}

export function setFeatureValueInStatSets(input: {
  featureId: string;
  value: number;
  statSetValuesById: StatSetValuesById;
  statSetDeltaValuesById: StatSetValuesById;
  preferredStatSetIds?: string[];
}): StatSetValuesById | null {
  const statSetId = resolveOwningStatSetId(input);
  if (!statSetId) {
    return null;
  }
  return {
    ...input.statSetValuesById,
    [statSetId]: {
      ...(input.statSetValuesById[statSetId] ?? {}),
      [input.featureId]: input.value,
    },
  };
}

export function toEngineRuntimeStatMaps(
  statSetValuesById: StatSetValuesById,
  statSetDeltaValuesById: StatSetValuesById
): {
  traits: StatValueMap;
  features: StatValueMap;
} {
  return {
    traits: getMergedStatSetValues(
      statSetValuesById,
      statSetDeltaValuesById,
      ENGINE_RUNTIME_TRAIT_STAT_SET_ID
    ),
    features: getMergedStatSetValues(
      statSetValuesById,
      statSetDeltaValuesById,
      ENGINE_RUNTIME_FEATURE_STAT_SET_ID
    ),
  };
}
