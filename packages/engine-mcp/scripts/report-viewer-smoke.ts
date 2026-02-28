import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type AgentPlayRunReport,
  getEventCount,
  hasExternalLedger,
  hydrateExternalLedger,
  iterateEntityDialogueEvents,
  iterateEvents,
  iterateEventsAsync,
  isExternalJsonlLedger,
} from "../src/report-viewer.js";

type AgentPlayReportFile = {
  schemaVersion?: string;
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

const main = async () => {
  const parsed = JSON.parse(fs.readFileSync(inputPath, "utf8")) as AgentPlayReportFile;
  const supportedSchemas = new Set([undefined, "agent-play-report/v2"]);
  if (!supportedSchemas.has(parsed.schemaVersion)) {
    throw new Error(`Unsupported report schemaVersion: ${String(parsed.schemaVersion)}`);
  }

  const externalJsonl = hasExternalLedger(parsed.run) && isExternalJsonlLedger(parsed.run);
  const run = hasExternalLedger(parsed.run) && !externalJsonl ? hydrateExternalLedger(parsed.run, inputPath) : parsed.run;

  if (hasExternalLedger(parsed.run)) {
    const supportedStorageFormats = new Set([undefined, "json-v1", "jsonl-v1"]);
    if (!supportedStorageFormats.has(parsed.run.eventLedger.storageFormat)) {
      throw new Error(`Unsupported external storage format: ${String(parsed.run.eventLedger.storageFormat)}`);
    }
  }

  const supportedLedgerFormats = new Set([undefined, "inline-v1", "packed-v1", "external-v1"]);
  if (!supportedLedgerFormats.has(run.eventLedgerFormat)) {
    throw new Error(`Unsupported eventLedgerFormat: ${String(run.eventLedgerFormat)}`);
  }

  const totalByMetadata = getEventCount(run);
  const turnEventCounts = new Map<number, number>();
  let totalByIterator = 0;

  if (externalJsonl) {
    for await (const event of iterateEventsAsync(parsed.run, inputPath)) {
      totalByIterator += 1;
      turnEventCounts.set(event.playerTurn, Number(turnEventCounts.get(event.playerTurn) ?? 0) + 1);
    }
  } else {
    for (const event of iterateEvents(run)) {
      totalByIterator += 1;
      turnEventCounts.set(event.playerTurn, Number(turnEventCounts.get(event.playerTurn) ?? 0) + 1);
    }
  }
  assert.equal(totalByIterator, totalByMetadata, "iterateEvents count mismatch");

  let totalByTurns = 0;
  for (const timelineRow of run.turnTimeline) {
    if (timelineRow.eventRange) {
      totalByTurns += timelineRow.eventRange.count;
    } else {
      totalByTurns += Number(turnEventCounts.get(timelineRow.playerTurn) ?? 0);
    }
  }
  assert.equal(totalByTurns, totalByMetadata, "turn timeline event total mismatch");

  const dialogueRun = hasExternalLedger(parsed.run) ? hydrateExternalLedger(parsed.run, inputPath) : run;
  let dialogueEventCount = 0;
  const entityIds = Object.keys(dialogueRun.entityActionSummaries ?? {});
  for (const entityId of entityIds) {
    for (const _event of iterateEntityDialogueEvents(dialogueRun, entityId)) {
      dialogueEventCount += 1;
    }
  }

  console.log(`report path: ${inputPath}`);
  console.log(`event ledger format: ${run.eventLedgerFormat ?? "legacy"}`);
  if (hasExternalLedger(parsed.run)) {
    console.log(`external storage format: ${parsed.run.eventLedger.storageFormat ?? "json-v1"}`);
  }
  console.log(`events: ${totalByMetadata}`);
  console.log(`turn rows: ${run.turnTimeline.length}`);
  console.log(`entities with summaries: ${entityIds.length}`);
  console.log(`dialogue events resolved: ${dialogueEventCount}`);
};

await main();
