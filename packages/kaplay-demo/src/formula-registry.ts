import type { FogMetrics } from "./scene-contracts";

function readNumeric(record: unknown, key: string): number {
  if (!record || typeof record !== "object") return 0;
  const value = (record as Record<string, unknown>)[key];
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export const formulaRegistry = {
  fogMetrics(status: Record<string, unknown>): FogMetrics {
    const level = Number(status.level ?? 1);
    const comprehension = readNumeric(status.traits, "Comprehension");
    const awareness = readNumeric(status.features, "Awareness");

    const levelFactor = level >= 10 ? 1 : 0;
    const comprehensionFactor = comprehension >= 1 ? 1 : 0;
    const awarenessFactor = awareness >= 1 ? 1 : 0;
    const radius = Math.max(1, Math.min(4, 1 + levelFactor + comprehensionFactor + awarenessFactor));

    return { radius, levelFactor, comprehensionFactor, awarenessFactor };
  },
};

