import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_SEED_V1, simulateBalanceBatch } from "@dungeonbreak/engine";

const runBalanceReport = () => {
  const seeds = [CANONICAL_SEED_V1, CANONICAL_SEED_V1 + 1, CANONICAL_SEED_V1 + 2, CANONICAL_SEED_V1 + 3];
  const report = simulateBalanceBatch(seeds, 100);

  const root = join(fileURLToPath(import.meta.url), "..", "..");
  const outputDir = join(root, "test-reports");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "balance-sim-report.json");
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote balance simulation report: ${outputPath}`);
};

runBalanceReport();
