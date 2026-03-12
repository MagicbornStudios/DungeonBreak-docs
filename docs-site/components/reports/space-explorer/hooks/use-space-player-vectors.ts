import { useMemo } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  MOVEMENT_CONTROL_NAMES,
  NAVIGATION_FEATURE_NAMES,
} from "@/components/reports/space-explorer/config";
import {
  ENGINE_RUNTIME_FEATURE_STAT_SET_ID,
  ENGINE_RUNTIME_TRAIT_STAT_SET_ID,
  getMergedStatSetValues,
  listStatSetFeatureIds,
  type StatSetValuesById,
} from "@/components/reports/space-explorer/stat-set-state";

interface UseSpacePlayerVectorsParams {
  statSetValuesById: StatSetValuesById;
  statSetDeltaValuesById: StatSetValuesById;
}

export function useSpacePlayerVectors({
  statSetValuesById,
  statSetDeltaValuesById,
}: UseSpacePlayerVectorsParams) {
  const traitFeatureIds = useMemo(
    () =>
      listStatSetFeatureIds(
        statSetValuesById,
        statSetDeltaValuesById,
        ENGINE_RUNTIME_TRAIT_STAT_SET_ID
      ),
    [statSetValuesById, statSetDeltaValuesById]
  );

  const mergedTraitValues = useMemo(
    () =>
      getMergedStatSetValues(
        statSetValuesById,
        statSetDeltaValuesById,
        ENGINE_RUNTIME_TRAIT_STAT_SET_ID
      ),
    [statSetValuesById, statSetDeltaValuesById]
  );

  const mergedFeatureValues = useMemo(
    () =>
      getMergedStatSetValues(
        statSetValuesById,
        statSetDeltaValuesById,
        ENGINE_RUNTIME_FEATURE_STAT_SET_ID
      ),
    [statSetValuesById, statSetDeltaValuesById]
  );

  const traitVector = useMemo(
    () =>
      traitFeatureIds
        .map((featureId) => Number(mergedTraitValues[featureId] ?? 0))
        .map((value) => Math.max(-1, Math.min(1, value))),
    [mergedTraitValues, traitFeatureIds]
  );

  const navigationFeatureVector = useMemo(
    () =>
      NAVIGATION_FEATURE_NAMES.map((featureId) =>
        Number(mergedFeatureValues[featureId] ?? 0)
      ),
    [mergedFeatureValues]
  );

  const movementControlVector = useMemo(
    () =>
      MOVEMENT_CONTROL_NAMES.map((featureId) =>
        Math.max(0, Number(mergedFeatureValues[featureId] ?? 0))
      ),
    [mergedFeatureValues]
  );

  const debouncedTraitVector = useDebouncedValue(traitVector, 120);
  const debouncedFeatureVector = useDebouncedValue(
    navigationFeatureVector,
    120
  );

  const combinedVector = useMemo(
    () => [...debouncedTraitVector, ...debouncedFeatureVector],
    [debouncedTraitVector, debouncedFeatureVector]
  );

  const movementBudget = useMemo(() => {
    const effort = movementControlVector[0] ?? 0;
    const momentum = movementControlVector[1] ?? 0;
    return (effort + momentum) / 2;
  }, [movementControlVector]);

  return {
    combinedVector,
    movementBudget,
  };
}
