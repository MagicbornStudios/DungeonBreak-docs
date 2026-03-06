import { useMemo } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  MOVEMENT_CONTROL_NAMES,
  NAVIGATION_FEATURE_NAMES,
} from "@/components/reports/space-explorer/config";

interface UseSpacePlayerVectorsParams {
  traits: Record<string, number>;
  features: Record<string, number>;
  traitDeltas: Record<string, number>;
  featureDeltas: Record<string, number>;
}

export function useSpacePlayerVectors({
  traits,
  features,
  traitDeltas,
  featureDeltas,
}: UseSpacePlayerVectorsParams) {
  const traitFeatureIds = useMemo(
    () => Object.keys(traits).sort((a, b) => a.localeCompare(b)),
    [traits]
  );

  const traitVector = useMemo(
    () =>
      traitFeatureIds
        .map(
          (featureId) =>
            Number(traits[featureId] ?? 0) + Number(traitDeltas[featureId] ?? 0)
        )
        .map((value) => Math.max(-1, Math.min(1, value))),
    [traits, traitDeltas, traitFeatureIds]
  );

  const navigationFeatureVector = useMemo(
    () =>
      NAVIGATION_FEATURE_NAMES.map(
        (featureId) =>
          Number(features[featureId] ?? 0) + Number(featureDeltas[featureId] ?? 0)
      ),
    [features, featureDeltas]
  );

  const movementControlVector = useMemo(
    () =>
      MOVEMENT_CONTROL_NAMES.map((featureId) =>
        Math.max(
          0,
          Number(features[featureId] ?? 0) + Number(featureDeltas[featureId] ?? 0)
        )
      ),
    [features, featureDeltas]
  );

  const debouncedTraitVector = useDebouncedValue(traitVector, 120);
  const debouncedFeatureVector = useDebouncedValue(navigationFeatureVector, 120);

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
