import {
  buildUnifiedSpaceModel,
  projectEntitySpaceVector,
  type SpaceVectorPack,
  type SpaceVectorPackOverrides,
  type UnifiedSpaceModel,
} from "@dungeonbreak/engine";
import type { GameState } from "./engine-bridge";

const TRAIT_NAMES = [
  "Comprehension",
  "Constraint",
  "Construction",
  "Direction",
  "Empathy",
  "Equilibrium",
  "Freedom",
  "Levity",
  "Projection",
  "Survival",
] as const;

const FEATURE_NAMES = ["Fame", "Effort", "Awareness", "Guile", "Momentum"] as const;

const SEMANTIC_AXES = [
  "combatIntensity",
  "socialIntensity",
  "explorationIntensity",
  "craftingIntensity",
  "recoveryIntensity",
  "risk",
  "pressure",
  "mobility",
  "visibility",
] as const;
// Feature-first default: semantics are experimental and excluded from similarity hints.
const INCLUDE_SEMANTIC_AXES_IN_SIMILARITY = false;

export type VectorRuntime = {
  overrides?: SpaceVectorPackOverrides;
  model: UnifiedSpaceModel;
};

export type VectorRuntimeHints = {
  topActions: Array<{ actionType: string; similarity: number }>;
  topEvents: Array<{ eventId: string; similarity: number }>;
  topEffects: Array<{ effectId: string; similarity: number; netImpact: number; style: string }>;
};

const clamp = (value: number, min = -1, max = 1): number => Math.max(min, Math.min(max, value));

const toFlatVector = (input: { traits: Record<string, number>; features: Record<string, number>; semantics: Record<string, number> }): number[] => [
  ...TRAIT_NAMES.map((trait) => Number(input.traits[trait] ?? 0)),
  ...FEATURE_NAMES.map((feature) => Number(input.features[feature] ?? 0)),
  ...(INCLUDE_SEMANTIC_AXES_IN_SIMILARITY
    ? SEMANTIC_AXES.map((axis) => Number(input.semantics[axis] ?? 0))
    : []),
];

const dot = (a: number[], b: number[]): number => {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
};

const magnitude = (values: number[]): number => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

const cosineSimilarity = (a: number[], b: number[]): number => {
  const denom = magnitude(a) * magnitude(b);
  if (denom <= 1e-8) {
    return 0;
  }
  return clamp(dot(a, b) / denom, -1, 1);
};

export const createVectorRuntime = (overrides?: SpaceVectorPackOverrides): VectorRuntime => ({
  overrides,
  model: buildUnifiedSpaceModel(overrides),
});

export const coerceSpaceVectorOverrides = (value: unknown): SpaceVectorPackOverrides | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as SpaceVectorPack;
};

export const computeVectorRuntimeHints = (state: GameState, runtime: VectorRuntime): VectorRuntimeHints => {
  const snapshot = state.engine.snapshot();
  const player = snapshot.entities[snapshot.playerId];
  const projected = projectEntitySpaceVector(
    {
      traits: player.traits as Record<string, number>,
      features: player.features as Record<string, number>,
      health: player.health,
      energy: player.energy,
      reputation: player.reputation,
    },
    runtime.overrides,
  );
  const source = toFlatVector(projected as { traits: Record<string, number>; features: Record<string, number>; semantics: Record<string, number> });

  const topActions = runtime.model.actionSpace
    .map((point) => ({
      actionType: point.actionType,
      similarity: cosineSimilarity(
        source,
        toFlatVector(point.vector as { traits: Record<string, number>; features: Record<string, number>; semantics: Record<string, number> }),
      ),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  const topEvents = runtime.model.eventSpace
    .map((point) => ({
      eventId: point.eventId,
      similarity: cosineSimilarity(
        source,
        toFlatVector(point.vector as { traits: Record<string, number>; features: Record<string, number>; semantics: Record<string, number> }),
      ),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  const topEffects = runtime.model.effectSpace
    .map((point) => ({
      effectId: point.effectId,
      similarity: cosineSimilarity(
        source,
        toFlatVector(point.delta as { traits: Record<string, number>; features: Record<string, number>; semantics: Record<string, number> }),
      ),
      netImpact: point.behavior.aggregates.netImpact,
      style: point.behavior.style,
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  return { topActions, topEvents, topEffects };
};
