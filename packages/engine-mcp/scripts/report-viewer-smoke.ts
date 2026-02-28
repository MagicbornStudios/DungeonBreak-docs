import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AgentPlayRunReport,
  getEventCount,
  iterateEntityDialogueEvents,
  iterateEvents,
  iterateTurnEvents,
} from "../src/report-viewer.js";

type AgentPlayReportFile = {
  run: AgentPlayRunReport;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

const inputPath = process.env.DUNGEONBREAK_AGENT_REPORT_PATH
  ? path.resolve(process.cwd(), process.env.DUNGEONBREAK_AGENT_REPORT_PATH)
  : path.resolve(repoRoot, ".planning/test-reports/agent-play-report.json");

if (!fs.existsSync(inputPath)) {
  throw new Error(`Report file not found: ${inputPath}`);
}

const parsed = JSON.parse(fs.readFileSync(inputPath, "utf8")) as AgentPlayReportFile;
const run = parsed.run;
const totalByMetadata = getEventCount(run);

let totalByIterator = 0;
for (const _event of iterateEvents(run)) {
  totalByIterator += 1;
}
assert.equal(totalByIterator, totalByMetadata, "iterateEvents count mismatch");

let totalByTurns = 0;
for (const timelineRow of run.turnTimeline) {
  for (const _event of iterateTurnEvents(run, timelineRow.playerTurn)) {
    totalByTurns += 1;
  }
}
assert.equal(totalByTurns, totalByMetadata, "iterateTurnEvents total mismatch");

let dialogueEventCount = 0;
const entityIds = Object.keys(run.entityActionSummaries ?? {});
for (const entityId of entityIds) {
  for (const _event of iterateEntityDialogueEvents(run, entityId)) {
    dialogueEventCount += 1;
  }
}

console.log(`report path: ${inputPath}`);
console.log(`event ledger format: ${run.eventLedgerFormat ?? "legacy"}`);
console.log(`events: ${totalByMetadata}`);
console.log(`turn rows: ${run.turnTimeline.length}`);
console.log(`entities with summaries: ${entityIds.length}`);
console.log(`dialogue events resolved: ${dialogueEventCount}`);
