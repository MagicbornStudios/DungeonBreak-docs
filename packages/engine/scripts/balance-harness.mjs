import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CANONICAL_SEED_V1, simulateBalanceBatch } from "../dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, "../test-reports");
const outputPath = path.resolve(outDir, "balance-harness-report.json");

const seeds = [CANONICAL_SEED_V1, CANONICAL_SEED_V1 + 1, CANONICAL_SEED_V1 + 2];
const report = simulateBalanceBatch(seeds, 100);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Balance harness report written: ${outputPath}`);
