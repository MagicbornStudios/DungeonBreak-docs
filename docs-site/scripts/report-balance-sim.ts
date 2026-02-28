import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CANONICAL_SEED_V1, simulateLongRunSuite } from "@dungeonbreak/engine";

const runBalanceReport = () => {
  const seeds = [CANONICAL_SEED_V1, CANONICAL_SEED_V1 + 1, CANONICAL_SEED_V1 + 2];
  const report = simulateLongRunSuite(seeds, [100, 250, 500], 2000);

  const root = join(fileURLToPath(import.meta.url), "..", "..");
  const outputDir = join(root, "test-reports");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, "balance-sim-report.json");
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote balance simulation report: ${outputPath}`);
};

runBalanceReport();
