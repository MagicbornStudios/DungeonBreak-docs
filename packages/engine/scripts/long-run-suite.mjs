import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CANONICAL_SEED_V1, simulateLongRunSuite } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, "../test-reports");
const outputPath = path.resolve(outDir, "long-run-balance-report.json");

const seeds = [CANONICAL_SEED_V1, CANONICAL_SEED_V1 + 1, CANONICAL_SEED_V1 + 2];
const report = simulateLongRunSuite(seeds, [100, 250, 500], 2000);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Long-run balance report written: ${outputPath}`);
console.log(`Worst p95 turn ms: ${report.summary.worstP95TurnMs.toFixed(2)} (budget ${report.summary.performanceBudgetMs})`);
console.log(`Dead action types across windows: ${report.summary.deadActionTypesAcrossWindows.join(", ") || "none"}`);
