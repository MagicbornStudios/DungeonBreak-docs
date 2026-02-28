export type EventRange = {
  startIndex: number;
  endIndex: number;
  count: number;
};

export type TurnTimelineEntry = {
  playerTurn: number;
  eventRange?: EventRange;
};

export type EntityCatalogRow = {
  entityId: string;
  name: string;
  entityKind: string;
  isPlayer: boolean;
};

export type PackedEventRow = [
  playerTurn: number,
  eventTurnIndex: number,
  actorIndex: number,
  actionIndex: number,
  depth: number,
  roomIndex: number,
  chapterNumber: number,
  actNumber: number,
  messageIndex: number,
];

export type PackedEventLedger = {
  format: "packed-v1";
  rows: PackedEventRow[];
  actors: string[];
  actions: string[];
  rooms: string[];
  messages: string[];
};

export type ExternalEventLedger = {
  format: "external-v1";
  sourceFormat: "inline-v1" | "packed-v1";
  relativePath: string;
  gzipRelativePath: string | null;
  eventCount: number;
};

export type InlineEventEntry = {
  eventIndex: number;
  playerTurn: number;
  eventTurnIndex: number;
  actorId: string;
  actionType: string;
  depth: number;
  roomId: string;
  chapterNumber: number;
  actNumber: number;
  actorName?: string;
  message?: string;
};

export type EntityActionSummary = {
  dialogueEventIndices?: number[];
  dialogueMessages?: Array<{
    turnIndex: number;
    actionType: string;
    roomId: string;
    message: string;
  }>;
};

export type AgentPlayRunReport = {
  eventLedgerFormat?: "inline-v1" | "packed-v1" | "external-v1";
  eventLedger: PackedEventLedger | InlineEventEntry[] | ExternalEventLedger;
  eventCount?: number;
  turnTimeline: TurnTimelineEntry[];
  entityCatalog?: Record<string, EntityCatalogRow>;
  entityActionSummaries?: Record<string, EntityActionSummary>;
};

export type ResolvedReportEvent = {
  eventIndex: number;
  playerTurn: number;
  eventTurnIndex: number;
  actorId: string;
  actorName?: string;
  actionType: string;
  depth: number;
  roomId: string;
  chapterNumber: number;
  actNumber: number;
  message?: string;
};

const isPackedLedger = (ledger: AgentPlayRunReport["eventLedger"]): ledger is PackedEventLedger =>
  !Array.isArray(ledger) && ledger.format === "packed-v1";

const isExternalLedger = (ledger: AgentPlayRunReport["eventLedger"]): ledger is ExternalEventLedger =>
  !Array.isArray(ledger) && ledger.format === "external-v1";

const safeLookup = (items: string[], index: number, fallback: string): string =>
  index >= 0 && index < items.length ? items[index] : fallback;

export const hasExternalLedger = (run: AgentPlayRunReport): boolean => isExternalLedger(run.eventLedger);

export const hydrateExternalLedger = (run: AgentPlayRunReport, reportPath: string): AgentPlayRunReport => {
  if (!isExternalLedger(run.eventLedger)) {
    return run;
  }
  const reportDir = path.dirname(path.resolve(reportPath));
  const descriptor = run.eventLedger;
  const jsonPath = path.resolve(reportDir, descriptor.relativePath);
  const gzipPath = descriptor.gzipRelativePath ? path.resolve(reportDir, descriptor.gzipRelativePath) : null;

  let payloadText: string;
  if (fs.existsSync(jsonPath)) {
    payloadText = fs.readFileSync(jsonPath, "utf8");
  } else if (gzipPath && fs.existsSync(gzipPath)) {
    const gz = fs.readFileSync(gzipPath);
    payloadText = zlib.gunzipSync(gz).toString("utf8");
  } else {
    throw new Error(
      `External ledger file not found. Expected one of: ${jsonPath}${gzipPath ? `, ${gzipPath}` : ""}`,
    );
  }

  const payload = JSON.parse(payloadText) as {
    sourceFormat: "inline-v1" | "packed-v1";
    eventCount: number;
    eventLedger: PackedEventLedger | InlineEventEntry[];
  };
  return {
    ...run,
    eventLedgerFormat: payload.sourceFormat,
    eventCount: payload.eventCount,
    eventLedger: payload.eventLedger,
  };
};

export const getEventCount = (run: AgentPlayRunReport): number => {
  if (typeof run.eventCount === "number" && Number.isFinite(run.eventCount) && run.eventCount >= 0) {
    return Math.trunc(run.eventCount);
  }
  if (isPackedLedger(run.eventLedger)) {
    return run.eventLedger.rows.length;
  }
  if (isExternalLedger(run.eventLedger)) {
    return run.eventLedger.eventCount;
  }
  return run.eventLedger.length;
};

export const resolveEventAt = (run: AgentPlayRunReport, eventIndex: number): ResolvedReportEvent | null => {
  if (!Number.isFinite(eventIndex) || eventIndex < 0) {
    return null;
  }
  const index = Math.trunc(eventIndex);
  const entityCatalog = run.entityCatalog ?? {};
  if (isPackedLedger(run.eventLedger)) {
    const row = run.eventLedger.rows[index];
    if (!row) {
      return null;
    }
    const actorId = safeLookup(run.eventLedger.actors, row[2], "unknown_actor");
    const actionType = safeLookup(run.eventLedger.actions, row[3], "unknown_action");
    const roomId = safeLookup(run.eventLedger.rooms, row[5], "unknown_room");
    const message = row[8] >= 0 ? safeLookup(run.eventLedger.messages, row[8], "") : undefined;
    return {
      eventIndex: index,
      playerTurn: row[0],
      eventTurnIndex: row[1],
      actorId,
      actorName: entityCatalog[actorId]?.name,
      actionType,
      depth: row[4],
      roomId,
      chapterNumber: row[6],
      actNumber: row[7],
      message: message && message.length > 0 ? message : undefined,
    };
  }
  if (isExternalLedger(run.eventLedger)) {
    return null;
  }

  const row = run.eventLedger[index];
  if (!row) {
    return null;
  }
  return {
    eventIndex: index,
    playerTurn: row.playerTurn,
    eventTurnIndex: row.eventTurnIndex,
    actorId: row.actorId,
    actorName: row.actorName ?? entityCatalog[row.actorId]?.name,
    actionType: row.actionType,
    depth: row.depth,
    roomId: row.roomId,
    chapterNumber: row.chapterNumber,
    actNumber: row.actNumber,
    message: row.message,
  };
};

export function* iterateEvents(run: AgentPlayRunReport): IterableIterator<ResolvedReportEvent> {
  const total = getEventCount(run);
  for (let eventIndex = 0; eventIndex < total; eventIndex += 1) {
    const event = resolveEventAt(run, eventIndex);
    if (event) {
      yield event;
    }
  }
}

export function* iterateTurnEvents(
  run: AgentPlayRunReport,
  playerTurn: number,
): IterableIterator<ResolvedReportEvent> {
  const timeline = run.turnTimeline.find((entry) => entry.playerTurn === playerTurn);
  if (timeline?.eventRange) {
    const { startIndex, endIndex } = timeline.eventRange;
    for (let eventIndex = startIndex; eventIndex <= endIndex; eventIndex += 1) {
      const event = resolveEventAt(run, eventIndex);
      if (event) {
        yield event;
      }
    }
    return;
  }

  for (const event of iterateEvents(run)) {
    if (event.playerTurn === playerTurn) {
      yield event;
    }
  }
}

export function* iterateEntityDialogueEvents(
  run: AgentPlayRunReport,
  entityId: string,
): IterableIterator<ResolvedReportEvent> {
  const summary = run.entityActionSummaries?.[entityId];
  if (!summary) {
    return;
  }

  if (Array.isArray(summary.dialogueEventIndices)) {
    for (const eventIndex of summary.dialogueEventIndices) {
      const event = resolveEventAt(run, eventIndex);
      if (event) {
        yield event;
      }
    }
    return;
  }

  if (Array.isArray(summary.dialogueMessages)) {
    const actorName = run.entityCatalog?.[entityId]?.name;
    for (const row of summary.dialogueMessages) {
      yield {
        eventIndex: -1,
        playerTurn: -1,
        eventTurnIndex: row.turnIndex,
        actorId: entityId,
        actorName,
        actionType: row.actionType,
        depth: -1,
        roomId: row.roomId,
        chapterNumber: -1,
        actNumber: -1,
        message: row.message,
      };
    }
  }
}
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
