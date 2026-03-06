export type UnifiedSpaceVector = {
  traits: Record<string, number>;
  features: Record<string, number>;
};

export type RuntimeUnifiedModel = {
  actionSpace: Array<{ actionType: string; vector: UnifiedSpaceVector }>;
  eventSpace: Array<{
    eventId: string;
    kind: string;
    vector: UnifiedSpaceVector;
  }>;
  effectSpace: Array<{
    effectId: string;
    sourceType: string;
    delta: UnifiedSpaceVector;
    behavior: { style: string; aggregates: { netImpact: number } };
  }>;
};

export function vectorToCoords(vector: number[]): { x: number; y: number; z: number } {
  let x = vector[0] ?? 0;
  let y = vector[1] ?? 0;
  let z = vector[2] ?? 0;
  for (let i = 3; i < vector.length; i++) {
    const weight = 0.18 / (i - 1);
    x += (vector[i] ?? 0) * weight;
    y += (vector[i] ?? 0) * weight * 0.8;
    z += (vector[i] ?? 0) * weight * 1.2;
  }
  return { x, y, z };
}

export function flattenUnifiedVector(vector: UnifiedSpaceVector): number[] {
  const merged = {
    ...(vector.traits ?? {}),
    ...(vector.features ?? {}),
  };
  const orderedIds = Object.keys(merged).sort((a, b) => a.localeCompare(b));
  return orderedIds.map((featureId) => Number(merged[featureId] ?? 0));
}

export function coordsFromUnifiedVector(vector: UnifiedSpaceVector): {
  x: number;
  y: number;
  z: number;
} {
  return vectorToCoords(flattenUnifiedVector(vector));
}
