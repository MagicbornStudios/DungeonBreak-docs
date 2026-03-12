import { GameEngine, type PlayerAction } from "@dungeonbreak/engine";

export type ActionTraceEntry = {
  playerTurn: number;
  action: { actionType: string; payload?: Record<string, unknown> };
};

export type ReportData = {
  seed: number;
  run: { actionTrace: ActionTraceEntry[] };
};

export type PackIdentity = {
  source: string;
  packId: string;
  packVersion: string;
  packHash: string;
  schemaVersion: string;
  engineVersion: string;
  reportId?: string;
};

export type DeliveryVersionRecord = {
  version: string;
  packId: string;
  packHash: string;
  publishedAt: string;
  artifacts: {
    bundleKey: string;
    manifestKey: string;
    reportKey?: string;
  };
};

export type DeliveryPullResponse = {
  ok: boolean;
  version?: string;
  record?: DeliveryVersionRecord;
  downloads?: {
    bundle: string;
    manifest: string;
    report?: string | null;
  };
  error?: string;
};

export function projectPoint(
  vector: number[],
  mean: number[],
  components: number[][]
): [number, number, number] {
  const centered = vector.map((v, i) => v - (mean[i] ?? 0));
  const dims = Math.min(3, components.length);
  const result = [0, 0, 0];
  for (let d = 0; d < dims; d++) {
    const comp = components[d];
    if (!comp) continue;
    let sum = 0;
    for (let i = 0; i < centered.length; i++) {
      sum += centered[i] * (comp[i] ?? 0);
    }
    result[d] = sum;
  }
  return result as [number, number, number];
}

export function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function hashToUnit(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function modelSurfaceHue(modelRootId: string): number {
  return Math.round(hashToUnit(modelRootId) * 360);
}

export function modelSurfaceColor(modelRootId: string, depth: number): string {
  const hue = modelSurfaceHue(modelRootId);
  const saturation = Math.max(40, 86 - depth * 7);
  const lightness = Math.min(72, 45 + depth * 5);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function rotatedHue(index: number): number {
  return Math.round((index * 137.508) % 360);
}

export function overlayColorByDepth(
  baseHue: number,
  depthIndex: number,
  alpha = 0.24,
  lightness = 56
): string {
  const hue = (baseHue + depthIndex * 113) % 360;
  const sat = Math.max(70, 88 - depthIndex * 2);
  return `hsla(${hue}, ${sat}%, ${lightness}%, ${alpha})`;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom <= 1e-8) return 0;
  return dot / denom;
}

export function getPlayerStateAtTurn(
  seed: number,
  actionTrace: ActionTraceEntry[],
  upToTurn: number
): { traits: Record<string, number>; features: Record<string, number> } | null {
  const engine = GameEngine.create(seed);
  for (let i = 0; i < upToTurn && i < actionTrace.length; i++) {
    engine.dispatch(actionTrace[i].action as PlayerAction);
  }
  const snapshot = engine.snapshot();
  const player = snapshot?.entities?.[snapshot.playerId];
  if (!player?.traits || !player?.features) return null;
  return {
    traits: { ...(player.traits as Record<string, number>) },
    features: { ...(player.features as Record<string, number>) },
  };
}
