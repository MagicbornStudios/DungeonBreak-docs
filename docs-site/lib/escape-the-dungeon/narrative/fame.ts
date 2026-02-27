import { clamp } from "@/lib/escape-the-dungeon/core/types";

export interface FameFormulaInput {
  currentFame: number;
  effortSpent: number;
  roomVector: Record<string, number>;
  actionNovelty: number;
  riskLevel: number;
  momentum: number;
  hasBroadcastSkill: boolean;
}

export interface FameFormulaResult {
  gain: number;
  baseGain: number;
  contextMultiplier: number;
  diminishingFactor: number;
  components: Record<string, number>;
}

export const computeFameGain = (input: FameFormulaInput): FameFormulaResult => {
  const projection = Number(input.roomVector.Projection ?? 0);
  const levity = Number(input.roomVector.Levity ?? 0);
  const direction = Number(input.roomVector.Direction ?? 0);
  const survival = Number(input.roomVector.Survival ?? 0);

  const roomInterest = clamp(
    0.6 * projection + 0.4 * levity + 0.25 * direction + 0.2 * survival,
    -0.6,
    1.6,
  );
  const novelty = clamp(Number(input.actionNovelty), 0, 1.6);
  const risk = clamp(Number(input.riskLevel), 0, 1.4);
  const momentumBonus = clamp(Number(input.momentum) * 0.04, 0, 0.3);
  const skillBonus = input.hasBroadcastSkill ? 0.15 : 0;

  const contextMultiplier = Math.max(
    0.15,
    1 + 0.45 * roomInterest + 0.3 * novelty + 0.25 * risk + momentumBonus + skillBonus,
  );

  const effortFactor = Math.max(0, Number(input.effortSpent) / 10);
  const baseGain = 1 * effortFactor;
  const diminishingFactor = 1 / (1 + Math.max(0, Number(input.currentFame)) / 120);
  const gain = Number(Math.max(0, baseGain * contextMultiplier * diminishingFactor).toFixed(4));

  return {
    gain,
    baseGain,
    contextMultiplier,
    diminishingFactor,
    components: {
      roomInterest,
      novelty,
      risk,
      momentumBonus,
      skillBonus,
    },
  };
};
