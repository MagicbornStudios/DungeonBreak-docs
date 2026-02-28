import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_SEED_V1 } from "@/lib/escape-the-dungeon/contracts";
import { FEATURE_NAMES, TRAIT_NAMES } from "@/lib/escape-the-dungeon/core/types";
import { GameEngine } from "@/lib/escape-the-dungeon/engine/game";

type UsageRow = Record<string, number>;

const increment = (row: UsageRow, key: string, amount: number) => {
  row[key] = (row[key] ?? 0) + amount;
};

const toSorted = (row: UsageRow): Array<{ key: string; value: number }> => {
  return Object.entries(row)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({ key, value }));
};

const runUsageReport = () => {
  const game = GameEngine.create(CANONICAL_SEED_V1);
  game.state.config.hostileSpawnPerTurn = 1;

  const traitUsage: UsageRow = Object.fromEntries(TRAIT_NAMES.map((name) => [name, 0]));
  const featureUsage: UsageRow = Object.fromEntries(FEATURE_NAMES.map((name) => [name, 0]));
  const actionUsage: UsageRow = {};

  for (let turn = 0; turn < 80; turn += 1) {
    const options = game.availableActions().filter((row) => row.available);
    const fallback = { actionType: "rest", payload: {} } as const;
    const chosen = options[turn % Math.max(1, options.length)];
    const result = game.dispatch(
      chosen
        ? {
            actionType: chosen.actionType,
            payload: chosen.payload,
          }
        : fallback,
    );

    increment(actionUsage, chosen?.actionType ?? fallback.actionType, 1);
    for (const event of result.events) {
      for (const [trait, value] of Object.entries(event.traitDelta)) {
        increment(traitUsage, trait, Math.abs(value));
      }
      for (const [feature, value] of Object.entries(event.featureDelta)) {
        increment(featureUsage, feature, Math.abs(value));
      }
    }
  }

  const lowTraitUsage = TRAIT_NAMES.filter((trait) => (traitUsage[trait] ?? 0) < 0.05);
  const lowFeatureUsage = FEATURE_NAMES.filter((feature) => (featureUsage[feature] ?? 0) < 0.05);

  const report = {
    generatedAt: new Date().toISOString(),
    seed: CANONICAL_SEED_V1,
    turnsSimulated: 80,
    actionUsage: toSorted(actionUsage),
    traitUsage: toSorted(traitUsage),
    featureUsage: toSorted(featureUsage),
    lowUsage: {
      traits: lowTraitUsage,
      features: lowFeatureUsage,
    },
  };

  const root = join(fileURLToPath(import.meta.url), "..", "..");
  const outputDir = join(root, "test-reports");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "vector-usage-report.json");
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote vector usage report: ${outputPath}`);
};

runUsageReport();
