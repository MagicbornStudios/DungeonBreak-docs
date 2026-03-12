import { useMemo } from "react";
import { useDebouncedValue } from "@/lib/use-debounced-value";

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
    () =>
      Array.from(new Set([...Object.keys(traits), ...Object.keys(traitDeltas)])).sort(
        (a, b) => a.localeCompare(b)
      ),
    [traits, traitDeltas]
  );
  const featureIds = useMemo(
    () =>
      Array.from(
        new Set([...Object.keys(features), ...Object.keys(featureDeltas)])
      ).sort((a, b) => a.localeCompare(b)),
    [features, featureDeltas]
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

  const featureVector = useMemo(
    () =>
      featureIds.map(
        (featureId) =>
          Number(features[featureId] ?? 0) + Number(featureDeltas[featureId] ?? 0)
      ),
    [featureIds, features, featureDeltas]
  );

  const debouncedTraitVector = useDebouncedValue(traitVector, 120);
  const debouncedFeatureVector = useDebouncedValue(featureVector, 120);

  const combinedVector = useMemo(
    () => [...debouncedTraitVector, ...debouncedFeatureVector],
    [debouncedTraitVector, debouncedFeatureVector]
  );

  return {
    combinedVector,
    movementBudget: 0,
  };
}
