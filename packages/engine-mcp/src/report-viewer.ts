import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import zlib from "node:zlib";

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
  storageFormat?: "json-v1" | "jsonl-v1";
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

type JsonlMetaRecord = {
  type: "meta";
  sourceFormat?: "inline-v1" | "packed-v1";
  eventCount?: number;
  actors?: string[];
  actions?: string[];
  rooms?: string[];
  messages?: string[];
};

type JsonlEventRecord = {
  type: "event";
  row?: PackedEventRow;
  event?: InlineEventEntry;
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

const isJsonlDescriptor = (descriptor: ExternalEventLedger): boolean => {
  if (descriptor.storageFormat === "jsonl-v1") {
    return true;
  }
  return descriptor.relativePath.endsWith(".jsonl") || descriptor.relativePath.endsWith(".jsonl.gz");
};

const resolveExternalLedgerPaths = (
  descriptor: ExternalEventLedger,
  reportPath: string,
): { jsonPath: string; gzipPath: string | null } => {
  const reportDir = path.dirname(path.resolve(reportPath));
  return {
    jsonPath: path.resolve(reportDir, descriptor.relativePath),
    gzipPath: descriptor.gzipRelativePath ? path.resolve(reportDir, descriptor.gzipRelativePath) : null,
  };
};

const readExternalLedgerText = (descriptor: ExternalEventLedger, reportPath: string): string => {
  const { jsonPath, gzipPath } = resolveExternalLedgerPaths(descriptor, reportPath);
  if (fs.existsSync(jsonPath)) {
    return fs.readFileSync(jsonPath, "utf8");
  }
  if (gzipPath && fs.existsSync(gzipPath)) {
    return zlib.gunzipSync(fs.readFileSync(gzipPath)).toString("utf8");
  }
  throw new Error(`External ledger file not found. Expected one of: ${jsonPath}${gzipPath ? `, ${gzipPath}` : ""}`);
};

const parseJsonlPayload = (
  payloadText: string,
  fallbackSourceFormat: "inline-v1" | "packed-v1",
): {
  sourceFormat: "inline-v1" | "packed-v1";
  eventCount: number;
  eventLedger: PackedEventLedger | InlineEventEntry[];
} => {
  const lines = payloadText.split(/\r?\n/);
  let sourceFormat: "inline-v1" | "packed-v1" = fallbackSourceFormat;
  let metaEventCount = 0;
  let actors: string[] = [];
  let actions: string[] = [];
  let rooms: string[] = [];
  let messages: string[] = [];
  const packedRows: PackedEventRow[] = [];
  const inlineEvents: InlineEventEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const parsed = JSON.parse(trimmed) as JsonlMetaRecord | JsonlEventRecord;
    if (parsed.type === "meta") {
      if (parsed.sourceFormat === "inline-v1" || parsed.sourceFormat === "packed-v1") {
        sourceFormat = parsed.sourceFormat;
      }
      if (typeof parsed.eventCount === "number" && Number.isFinite(parsed.eventCount) && parsed.eventCount >= 0) {
        metaEventCount = Math.trunc(parsed.eventCount);
      }
      if (Array.isArray(parsed.actors)) {
        actors = [...parsed.actors];
      }
      if (Array.isArray(parsed.actions)) {
        actions = [...parsed.actions];
      }
      if (Array.isArray(parsed.rooms)) {
        rooms = [...parsed.rooms];
      }
      if (Array.isArray(parsed.messages)) {
        messages = [...parsed.messages];
      }
      continue;
    }

    if (parsed.type !== "event") {
      continue;
    }

    if (sourceFormat === "packed-v1") {
      if (Array.isArray(parsed.row) && parsed.row.length >= 9) {
        packedRows.push(parsed.row as PackedEventRow);
      }
      continue;
    }

    if (parsed.event) {
      inlineEvents.push({
        ...parsed.event,
        eventIndex: Number.isFinite(parsed.event.eventIndex)
          ? Math.trunc(parsed.event.eventIndex)
          : inlineEvents.length,
      });
    }
  }

  if (sourceFormat === "packed-v1") {
    return {
      sourceFormat: "packed-v1",
      eventCount: metaEventCount > 0 ? metaEventCount : packedRows.length,
      eventLedger: {
        format: "packed-v1",
        rows: packedRows,
        actors,
        actions,
        rooms,
        messages,
      },
    };
  }

  return {
    sourceFormat: "inline-v1",
    eventCount: metaEventCount > 0 ? metaEventCount : inlineEvents.length,
    eventLedger: inlineEvents,
  };
};

const resolvePackedEvent = (
  row: PackedEventRow,
  eventIndex: number,
  actors: string[],
  actions: string[],
  rooms: string[],
  messages: string[],
  entityCatalog: Record<string, EntityCatalogRow>,
): ResolvedReportEvent => {
  const actorId = safeLookup(actors, row[2], "unknown_actor");
  const actionType = safeLookup(actions, row[3], "unknown_action");
  const roomId = safeLookup(rooms, row[5], "unknown_room");
  const message = row[8] >= 0 ? safeLookup(messages, row[8], "") : undefined;
  return {
    eventIndex,
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
};

export const hasExternalLedger = (run: AgentPlayRunReport): boolean => isExternalLedger(run.eventLedger);

export const isExternalJsonlLedger = (run: AgentPlayRunReport): boolean =>
  isExternalLedger(run.eventLedger) && isJsonlDescriptor(run.eventLedger);

export const hydrateExternalLedger = (run: AgentPlayRunReport, reportPath: string): AgentPlayRunReport => {
  if (!isExternalLedger(run.eventLedger)) {
    return run;
  }
  const descriptor = run.eventLedger;
  const payloadText = readExternalLedgerText(descriptor, reportPath);
  const payload = isJsonlDescriptor(descriptor)
    ? parseJsonlPayload(payloadText, descriptor.sourceFormat)
    : (JSON.parse(payloadText) as {
        sourceFormat: "inline-v1" | "packed-v1";
        eventCount: number;
        eventLedger: PackedEventLedger | InlineEventEntry[];
      });
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
    return resolvePackedEvent(
      row,
      index,
      run.eventLedger.actors,
      run.eventLedger.actions,
      run.eventLedger.rooms,
      run.eventLedger.messages,
      entityCatalog,
    );
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

export async function* iterateExternalEventsStreaming(
  run: AgentPlayRunReport,
  reportPath: string,
): AsyncIterableIterator<ResolvedReportEvent> {
  if (!isExternalLedger(run.eventLedger)) {
    for (const event of iterateEvents(run)) {
      yield event;
    }
    return;
  }

  const descriptor = run.eventLedger;
  if (!isJsonlDescriptor(descriptor)) {
    const hydrated = hydrateExternalLedger(run, reportPath);
    for (const event of iterateEvents(hydrated)) {
      yield event;
    }
    return;
  }

  const { jsonPath, gzipPath } = resolveExternalLedgerPaths(descriptor, reportPath);
  let input: NodeJS.ReadableStream;
  if (fs.existsSync(jsonPath)) {
    input = fs.createReadStream(jsonPath);
  } else if (gzipPath && fs.existsSync(gzipPath)) {
    input = fs.createReadStream(gzipPath).pipe(zlib.createGunzip());
  } else {
    throw new Error(`External ledger file not found. Expected one of: ${jsonPath}${gzipPath ? `, ${gzipPath}` : ""}`);
  }

  const entityCatalog = run.entityCatalog ?? {};
  let sourceFormat: "inline-v1" | "packed-v1" = descriptor.sourceFormat;
  let actors: string[] = [];
  let actions: string[] = [];
  let rooms: string[] = [];
  let messages: string[] = [];
  let eventIndex = 0;
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }
    const parsed = JSON.parse(trimmed) as JsonlMetaRecord | JsonlEventRecord;
    if (parsed.type === "meta") {
      if (parsed.sourceFormat === "inline-v1" || parsed.sourceFormat === "packed-v1") {
        sourceFormat = parsed.sourceFormat;
      }
      if (Array.isArray(parsed.actors)) {
        actors = [...parsed.actors];
      }
      if (Array.isArray(parsed.actions)) {
        actions = [...parsed.actions];
      }
      if (Array.isArray(parsed.rooms)) {
        rooms = [...parsed.rooms];
      }
      if (Array.isArray(parsed.messages)) {
        messages = [...parsed.messages];
      }
      continue;
    }

    if (parsed.type !== "event") {
      continue;
    }

    if (sourceFormat === "packed-v1") {
      if (!Array.isArray(parsed.row) || parsed.row.length < 9) {
        continue;
      }
      yield resolvePackedEvent(parsed.row as PackedEventRow, eventIndex, actors, actions, rooms, messages, entityCatalog);
      eventIndex += 1;
      continue;
    }

    if (!parsed.event) {
      continue;
    }
    const inline = parsed.event as InlineEventEntry;
    const resolvedEventIndex = Number.isFinite(inline.eventIndex) ? Math.trunc(inline.eventIndex) : eventIndex;
    yield {
      eventIndex: resolvedEventIndex,
      playerTurn: inline.playerTurn,
      eventTurnIndex: inline.eventTurnIndex,
      actorId: inline.actorId,
      actorName: inline.actorName ?? entityCatalog[inline.actorId]?.name,
      actionType: inline.actionType,
      depth: inline.depth,
      roomId: inline.roomId,
      chapterNumber: inline.chapterNumber,
      actNumber: inline.actNumber,
      message: inline.message,
    };
    eventIndex += 1;
  }
}

export async function* iterateEventsAsync(
  run: AgentPlayRunReport,
  reportPath?: string,
): AsyncIterableIterator<ResolvedReportEvent> {
  if (!isExternalLedger(run.eventLedger)) {
    for (const event of iterateEvents(run)) {
      yield event;
    }
    return;
  }
  if (!reportPath) {
    throw new Error("reportPath is required for external ledger iteration.");
  }
  for await (const event of iterateExternalEventsStreaming(run, reportPath)) {
    yield event;
  }
}

export async function* iterateTurnEventsAsync(
  run: AgentPlayRunReport,
  playerTurn: number,
  reportPath?: string,
): AsyncIterableIterator<ResolvedReportEvent> {
  if (!isExternalLedger(run.eventLedger)) {
    for (const event of iterateTurnEvents(run, playerTurn)) {
      yield event;
    }
    return;
  }
  if (!reportPath) {
    throw new Error("reportPath is required for external ledger iteration.");
  }

  const timeline = run.turnTimeline.find((entry) => entry.playerTurn === playerTurn);
  for await (const event of iterateExternalEventsStreaming(run, reportPath)) {
    if (timeline?.eventRange) {
      if (event.eventIndex < timeline.eventRange.startIndex) {
        continue;
      }
      if (event.eventIndex > timeline.eventRange.endIndex) {
        break;
      }
      yield event;
      continue;
    }
    if (event.playerTurn === playerTurn) {
      yield event;
    }
  }
}
