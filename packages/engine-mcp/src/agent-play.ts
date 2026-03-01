import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import {
  ACTION_CATALOG,
  ACTION_POLICIES,
  CANONICAL_SEED_V1,
  GameEngine,
  type EntityState,
  type GameEvent,
  type GameSnapshot,
  type NumberMap,
  type PlayerAction,
} from "@dungeonbreak/engine";
import { applyReplayFixtureSetup, hashSnapshot, type ReplayFixture } from "@dungeonbreak/engine/replay";

import { GameSessionStore } from "./session-store.js";

type AgentRunMode = "autonomous" | "hybrid" | "fixture";
type ReportDetail = "compact" | "full";
type ActionSource = "policy" | "fixture";
type SplitStorageFormat = "json" | "jsonl";

type AvailableActionRow = {
  actionType: string;
  available: boolean;
  payload: Record<string, unknown>;
};

type DialogueChoiceOption = {
  optionId: string;
  label?: string;
};

type EventRange = {
  startIndex: number;
  endIndex: number;
  count: number;
};

type EntityStateDigest = {
  entityId: string;
  name: string;
  entityKind: string;
  isPlayer: boolean;
  depth: number;
  roomId: string;
  level: number;
  faction: string;
  reputation: number;
  health: number;
  energy: number;
  archetypeHeading: string;
  traits: NumberMap;
  features: NumberMap;
  skills: string[];
  rumorCount: number;
  deedCount: number;
  effectCount: number;
  inventoryCount: number;
};

type EntityStateSnapshot = Omit<EntityStateDigest, "entityId" | "name" | "entityKind" | "isPlayer">;

type PageDelta = {
  chaptersTouched: number[];
  chapterNewLines: Record<string, string[]>;
  entityNewLines: Record<string, Record<string, string[]>>;
  totalNewChapterLines: number;
  totalNewEntityLines: number;
};

type PageDeltaSummary = {
  chaptersTouched: number[];
  totalNewChapterLines: number;
  totalNewEntityLines: number;
};

type EventLedgerEntry = {
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
  warnings?: string[];
  traitDelta?: NumberMap;
  featureDelta?: NumberMap;
  metadata?: Record<string, unknown>;
};

type PackedEventRow = [
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

type PackedEventLedger = {
  format: "packed-v1";
  rows: PackedEventRow[];
  actors: string[];
  actions: string[];
  rooms: string[];
  messages: string[];
};

type ExternalEventLedger = {
  format: "external-v1";
  sourceFormat: "inline-v1" | "packed-v1";
  storageFormat: "json-v1" | "jsonl-v1";
  relativePath: string;
  gzipRelativePath: string | null;
  eventCount: number;
};

type EventLedger = EventLedgerEntry[] | PackedEventLedger | ExternalEventLedger;

type JsonlMetaLine = {
  type: "meta";
  schemaVersion: string;
  sourceFormat: "inline-v1" | "packed-v1";
  eventCount: number;
  actors?: string[];
  actions?: string[];
  rooms?: string[];
  messages?: string[];
};

type EntityCatalogRow = {
  entityId: string;
  name: string;
  entityKind: string;
  isPlayer: boolean;
};

type EntityActionSummary = {
  entityId: string;
  totalEvents: number;
  actionUsage: Record<string, number>;
  dialogueEventIndices: number[];
  lastKnownStateRef: string;
};

type ActionTraceEntry = {
  playerTurn: number;
  action: PlayerAction;
  source: ActionSource;
  eventCount: number;
  playerEventCount: number;
  nonPlayerEventCount: number;
};

type PlayerTimelinePoint = {
  playerTurn: number;
  engineTurn: number;
  depth: number;
  roomId: string;
  chapter: number;
  act: number;
  health: number;
  energy: number;
  level: number;
  reputation: number;
  archetypeHeading: string;
  traits: NumberMap;
  features: NumberMap;
  skills: string[];
};

type TurnTimelineEntry = {
  playerTurn: number;
  source: ActionSource;
  selectedAction: PlayerAction;
  availableActionTypes: string[];
  dialogueOptionsPresented: DialogueChoiceOption[];
  eventRange?: EventRange;
  events?: GameEvent[];
  dialogueText?: string[];
  cutsceneText?: string[];
  pageDelta: PageDelta | PageDeltaSummary;
  playerBefore?: EntityStateDigest;
  playerAfter?: EntityStateDigest;
  playerBeforeRef?: number;
  playerAfterRef?: number;
  playerTraitDelta: NumberMap;
  playerFeatureDelta: NumberMap;
  actorStatesAfterTurn?: EntityStateDigest[];
};

type FixtureUsage = {
  path: string | null;
  setupApplied: boolean;
  scriptedActionCount: number;
  scriptedTurnsUsed: number;
  policyTurnsUsed: number;
};

type AgentRunResult = {
  seed: number;
  mode: AgentRunMode;
  reportDetail: ReportDetail;
  turnsRequested: number;
  turnsPlayed: number;
  sessionId: string;
  fixtureUsage: FixtureUsage;
  actionUsage: Record<string, number>;
  actionTrace: ActionTraceEntry[];
  eventLedger: EventLedger;
  eventCount: number;
  eventLedgerFormat: "inline-v1" | "packed-v1";
  entityCatalog: Record<string, EntityCatalogRow>;
  entityLastKnownStates: Record<string, EntityStateSnapshot | null>;
  entityActionSummaries: Record<string, EntityActionSummary>;
  playerInitialState: EntityStateDigest;
  playerTimeline: PlayerTimelinePoint[];
  turnTimeline: TurnTimelineEntry[];
  finalHash: string;
  finalStatus: Record<string, unknown>;
  finalSnapshot: {
    escaped: boolean;
    pressure: number;
    chapterPagesIncluded: boolean;
    chapterPages: GameSnapshot["chapterPages"] | null;
    chapterPageSummary: Record<string, { chapterLines: number; entityLineCounts: Record<string, number> }>;
  };
  escaped: boolean;
};

type AgentRunOutput = Omit<AgentRunResult, "eventLedger" | "eventLedgerFormat"> & {
  eventLedger: EventLedger;
  eventLedgerFormat: "inline-v1" | "packed-v1" | "external-v1";
};

const FORCE_ORDER = ACTION_CATALOG.actions.map((row) => row.actionType);
const PRIORITY_ORDER: readonly string[] =
  ACTION_POLICIES.policies.find((policy) => policy.policyId === "agent-play-default")?.priorityOrder ?? FORCE_ORDER;

const DIALOGUE_ACTION_TYPES = new Set(["choose_dialogue", "talk", "speak"]);
const EVENT_MESSAGE_ACTION_TYPES = new Set(["choose_dialogue", "talk", "speak", "cutscene"]);
const FIXTURE_RELATIVE_PATH = "../../engine/test-fixtures/canonical-dense-trace-v1.json";
const REPORT_SCHEMA_VERSION = "agent-play-report/v2";
const EVENT_LEDGER_SCHEMA_VERSION = "agent-play-event-ledger/v1";
const EVENT_LEDGER_JSONL_SCHEMA_VERSION = "agent-play-event-ledger-jsonl/v1";

const parseMode = (value: string | undefined): AgentRunMode => {
  const normalized = String(value ?? "autonomous").trim().toLowerCase();
  if (normalized === "hybrid" || normalized === "fixture" || normalized === "autonomous") {
    return normalized;
  }
  return "autonomous";
};

const parseReportDetail = (value: string | undefined): ReportDetail => {
  const normalized = String(value ?? "compact").trim().toLowerCase();
  if (normalized === "full" || normalized === "compact") {
    return normalized;
  }
  return "compact";
};

const parseSplitStorageFormat = (value: string | undefined): SplitStorageFormat => {
  const normalized = String(value ?? "json").trim().toLowerCase();
  if (normalized === "jsonl") {
    return "jsonl";
  }
  return "json";
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const diffMap = (before: NumberMap, after: NumberMap): NumberMap => {
  const next: NumberMap = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const diff = Number(after[key] ?? 0) - Number(before[key] ?? 0);
    if (Math.abs(diff) > 1e-9) {
      next[key] = Number(diff.toFixed(6));
    }
  }
  return next;
};

const levelForEntity = (snapshot: GameSnapshot, entity: EntityState): number => {
  const byXp = Math.floor(entity.xp / snapshot.config.baseXpPerLevel);
  const hostileBonus =
    entity.entityKind === "hostile" || entity.entityKind === "boss" ? snapshot.globalEnemyLevelBonus : 0;
  return Math.max(1, entity.baseLevel + byXp + hostileBonus);
};

const chapterForSnapshotDepth = (snapshot: GameSnapshot, depth: number): number => {
  return Number(snapshot.dungeon.levels[depth]?.chapterNumber ?? 1);
};

const actForChapter = (snapshot: GameSnapshot, chapter: number): number => {
  return Math.floor((chapter - 1) / snapshot.dungeon.chaptersPerAct) + 1;
};

const toEntityDigest = (snapshot: GameSnapshot, entity: EntityState): EntityStateDigest => ({
  entityId: entity.entityId,
  name: entity.name,
  entityKind: entity.entityKind,
  isPlayer: entity.isPlayer,
  depth: entity.depth,
  roomId: entity.roomId,
  level: levelForEntity(snapshot, entity),
  faction: entity.faction,
  reputation: entity.reputation,
  health: entity.health,
  energy: entity.energy,
  archetypeHeading: entity.archetypeHeading,
  traits: { ...(entity.traits as NumberMap) },
  features: { ...(entity.features as NumberMap) },
  skills: Object.values(entity.skills as Record<string, { unlocked: boolean; skillId: string }>)
    .filter((skill) => skill.unlocked)
    .map((skill) => skill.skillId)
    .sort(),
  rumorCount: entity.rumors.length,
  deedCount: entity.deeds.length,
  effectCount: entity.effects.length,
  inventoryCount: entity.inventory.length,
});

const toEntityStateSnapshot = (digest: EntityStateDigest): EntityStateSnapshot => ({
  depth: digest.depth,
  roomId: digest.roomId,
  level: digest.level,
  faction: digest.faction,
  reputation: digest.reputation,
  health: digest.health,
  energy: digest.energy,
  archetypeHeading: digest.archetypeHeading,
  traits: { ...digest.traits },
  features: { ...digest.features },
  skills: [...digest.skills],
  rumorCount: digest.rumorCount,
  deedCount: digest.deedCount,
  effectCount: digest.effectCount,
  inventoryCount: digest.inventoryCount,
});

const extractDialogueOptions = (rows: AvailableActionRow[]): DialogueChoiceOption[] => {
  const dialogueRows = rows.filter((row) => row.available && row.actionType === "choose_dialogue");
  const options: DialogueChoiceOption[] = [];
  for (const row of dialogueRows) {
    const candidates = (row.payload.options as Array<{ optionId: string; label?: string }> | undefined) ?? [];
    for (const option of candidates) {
      options.push({ optionId: option.optionId, label: option.label });
    }
  }
  return options;
};

const collectPageDelta = (before: GameSnapshot, after: GameSnapshot): PageDelta => {
  const chapters = new Set<number>([
    ...Object.keys(before.chapterPages).map((key) => Number(key)),
    ...Object.keys(after.chapterPages).map((key) => Number(key)),
  ]);
  const chapterNewLines: Record<string, string[]> = {};
  const entityNewLines: Record<string, Record<string, string[]>> = {};
  const chaptersTouched: number[] = [];
  let totalNewChapterLines = 0;
  let totalNewEntityLines = 0;

  for (const chapter of [...chapters].sort((a, b) => a - b)) {
    const beforePage = before.chapterPages[chapter] ?? { chapter: [], entities: {} };
    const afterPage = after.chapterPages[chapter] ?? { chapter: [], entities: {} };
    const newChapterLines = afterPage.chapter.slice(beforePage.chapter.length);
    const chapterKey = String(chapter);
    if (newChapterLines.length > 0) {
      chapterNewLines[chapterKey] = newChapterLines;
      totalNewChapterLines += newChapterLines.length;
    }

    const entityIds = new Set<string>([
      ...Object.keys(beforePage.entities),
      ...Object.keys(afterPage.entities),
    ]);
    const entityDeltaForChapter: Record<string, string[]> = {};
    for (const entityId of [...entityIds].sort((a, b) => a.localeCompare(b))) {
      const beforeLines = beforePage.entities[entityId] ?? [];
      const afterLines = afterPage.entities[entityId] ?? [];
      const newEntityLines = afterLines.slice(beforeLines.length);
      if (newEntityLines.length > 0) {
        entityDeltaForChapter[entityId] = newEntityLines;
        totalNewEntityLines += newEntityLines.length;
      }
    }
    if (Object.keys(entityDeltaForChapter).length > 0) {
      entityNewLines[chapterKey] = entityDeltaForChapter;
    }
    if (newChapterLines.length > 0 || Object.keys(entityDeltaForChapter).length > 0) {
      chaptersTouched.push(chapter);
    }
  }

  return {
    chaptersTouched,
    chapterNewLines,
    entityNewLines,
    totalNewChapterLines,
    totalNewEntityLines,
  };
};

const summarizePageDelta = (delta: PageDelta): PageDeltaSummary => ({
  chaptersTouched: [...delta.chaptersTouched],
  totalNewChapterLines: delta.totalNewChapterLines,
  totalNewEntityLines: delta.totalNewEntityLines,
});

const chapterPageSummary = (
  chapterPages: GameSnapshot["chapterPages"],
): Record<string, { chapterLines: number; entityLineCounts: Record<string, number> }> => {
  const summary: Record<string, { chapterLines: number; entityLineCounts: Record<string, number> }> = {};
  for (const [chapterKey, page] of Object.entries(chapterPages as Record<string, GameSnapshot["chapterPages"][number]>)) {
    summary[chapterKey] = {
      chapterLines: page.chapter.length,
      entityLineCounts: Object.fromEntries(
        Object.entries(page.entities as Record<string, string[]>).map(([entityId, lines]) => [entityId, lines.length]),
      ),
    };
  }
  return summary;
};

const indexRef = (table: string[], reverse: Map<string, number>, value: string): number => {
  const existing = reverse.get(value);
  if (existing !== undefined) {
    return existing;
  }
  const next = table.length;
  table.push(value);
  reverse.set(value, next);
  return next;
};

const loadDenseFixture = (): { fixture: ReplayFixture | null; fixturePath: string | null } => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fixturePath = path.resolve(__dirname, FIXTURE_RELATIVE_PATH);
  if (!fs.existsSync(fixturePath)) {
    return { fixture: null, fixturePath: null };
  }
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as ReplayFixture;
  return { fixture, fixturePath };
};

const toAction = (actionType: string, payload: Record<string, unknown>): PlayerAction => {
  if (actionType === "choose_dialogue") {
    const options = (payload.options as Array<{ optionId: string }> | undefined) ?? [];
    return {
      actionType: "choose_dialogue",
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (actionType === "evolve_skill") {
    return {
      actionType: "evolve_skill",
      payload: { skillId: String(payload.skillId ?? "") },
    };
  }
  if (actionType === "live_stream") {
    return {
      actionType: "live_stream",
      payload: { effort: 10 },
    };
  }
  if (actionType === "speak") {
    return {
      actionType: "speak",
      payload: { intentText: "Agent run: hold formation and keep moving." },
    };
  }
  return {
    actionType: actionType as PlayerAction["actionType"],
    payload: { ...payload },
  };
};

const chooseAction = (
  rows: AvailableActionRow[],
  turnIndex: number,
  covered: Set<string>,
  preferCoverage: boolean,
  priorityOrder: readonly string[],
): PlayerAction => {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) {
    return { actionType: "rest", payload: {} };
  }

  if (preferCoverage && turnIndex < FORCE_ORDER.length) {
    const forcedType = FORCE_ORDER[turnIndex];
    const forced = legal.find((row) => row.actionType === forcedType);
    if (forced) {
      covered.add(forced.actionType);
      return toAction(forced.actionType, forced.payload);
    }
  }

  for (const actionType of priorityOrder) {
    const found = legal.find((row) => row.actionType === actionType);
    if (found) {
      covered.add(found.actionType);
      return toAction(found.actionType, found.payload);
    }
  }

  const fallback = legal[0] as AvailableActionRow;
  covered.add(fallback.actionType);
  return toAction(fallback.actionType, fallback.payload);
};

const runAgentSession = (
  seed: number,
  turns: number,
  sessionId: string,
  mode: AgentRunMode,
  reportDetail: ReportDetail,
  includeChapterPages: boolean,
): AgentRunResult => {
  const store = new GameSessionStore();
  const session = store.createSession(seed, sessionId);
  const loadedFixture = loadDenseFixture();
  const seededFixture = loadedFixture.fixture;

  const shouldApplyFixtureSetup = Boolean(seededFixture?.setup && (mode === "hybrid" || mode === "fixture"));
  if (shouldApplyFixtureSetup && seededFixture?.setup) {
    const prepared = GameEngine.create(seed);
    applyReplayFixtureSetup(prepared, seededFixture.setup);
    store.restoreSnapshot(session.sessionId, prepared.snapshot());
  }

  const covered = new Set<string>();
  const actionUsage: Record<string, number> = {};
  const actionTrace: ActionTraceEntry[] = [];
  const inlineEventLedger: EventLedgerEntry[] = [];
  const packedRows: PackedEventRow[] = [];
  const packedActors: string[] = [];
  const packedActions: string[] = [];
  const packedRooms: string[] = [];
  const packedMessages: string[] = [];
  const actorIndexById = new Map<string, number>();
  const actionIndexByType = new Map<string, number>();
  const roomIndexById = new Map<string, number>();
  const messageIndexByText = new Map<string, number>();
  const playerTimeline: PlayerTimelinePoint[] = [];
  const turnTimeline: TurnTimelineEntry[] = [];
  const entityCatalog: Record<string, EntityCatalogRow> = {};
  const entityLastKnownStates: Record<string, EntityStateSnapshot | null> = {};
  const entityActionSummaries: Record<string, EntityActionSummary> = {};
  let playerInitialState: EntityStateDigest | null = null;
  let scriptedTurnsUsed = 0;
  let policyTurnsUsed = 0;

  for (let turn = 0; turn < turns; turn += 1) {
    const beforeSnapshot = store.getSnapshot(session.sessionId);
    const playerBefore = beforeSnapshot.entities[beforeSnapshot.playerId];
    if (!playerBefore) {
      throw new Error("player entity missing before dispatch");
    }

    const legalRows = store.listActions(session.sessionId) as AvailableActionRow[];
    const availableActionTypes = [
      ...new Set(legalRows.filter((row) => row.available).map((row) => row.actionType)),
    ].sort();
    const dialogueOptionsPresented = extractDialogueOptions(legalRows);

    let action: PlayerAction | null = null;
    let source: ActionSource = "policy";
    if ((mode === "hybrid" || mode === "fixture") && seededFixture?.actions?.[turn]) {
      action = seededFixture.actions[turn] as PlayerAction;
      source = "fixture";
      scriptedTurnsUsed += 1;
    }
    if (!action) {
      const preferCoverage = mode !== "autonomous";
      action = chooseAction(legalRows, turn, covered, preferCoverage, PRIORITY_ORDER);
      source = "policy";
      policyTurnsUsed += 1;
    } else {
      covered.add(action.actionType);
    }

    actionUsage[action.actionType] = Number(actionUsage[action.actionType] ?? 0) + 1;
    const result = store.dispatchAction(session.sessionId, action) as {
      turnResult: { events: GameEvent[]; escaped: boolean };
      status: Record<string, unknown>;
    };
    const events = result.turnResult.events;
    const postSnapshot = store.getSnapshot(session.sessionId);
    const playerAfter = postSnapshot.entities[postSnapshot.playerId];
    if (!playerAfter) {
      throw new Error("player entity missing after dispatch");
    }

    const playerBeforeDigest = toEntityDigest(beforeSnapshot, playerBefore);
    if (playerInitialState === null) {
      playerInitialState = playerBeforeDigest;
    }
    const playerAfterDigest = toEntityDigest(postSnapshot, playerAfter);
    const pageDelta = collectPageDelta(beforeSnapshot, postSnapshot);
    const eventStartIndex = reportDetail === "full" ? inlineEventLedger.length : packedRows.length;
    for (let eventOffset = 0; eventOffset < events.length; eventOffset += 1) {
      const event = events[eventOffset] as GameEvent;
      if (reportDetail === "full") {
        const eventIndex = inlineEventLedger.length;
        const ledgerEntry: EventLedgerEntry = {
          eventIndex,
          playerTurn: turn + 1,
          eventTurnIndex: event.turnIndex,
          actorId: event.actorId,
          actionType: event.actionType,
          depth: event.depth,
          roomId: event.roomId,
          chapterNumber: event.chapterNumber,
          actNumber: event.actNumber,
          actorName: event.actorName,
          message: event.message,
          warnings: [...event.warnings],
          traitDelta: { ...(event.traitDelta as NumberMap) },
          featureDelta: { ...(event.featureDelta as NumberMap) },
          metadata: { ...event.metadata },
        };
        inlineEventLedger.push(ledgerEntry);
      } else {
        const actorIndex = indexRef(packedActors, actorIndexById, event.actorId);
        const actionIndex = indexRef(packedActions, actionIndexByType, event.actionType);
        const roomIndex = indexRef(packedRooms, roomIndexById, event.roomId);
        const messageIndex =
          EVENT_MESSAGE_ACTION_TYPES.has(event.actionType) && event.message.length > 0
            ? indexRef(packedMessages, messageIndexByText, event.message)
            : -1;
        packedRows.push([
          turn + 1,
          event.turnIndex,
          actorIndex,
          actionIndex,
          event.depth,
          roomIndex,
          event.chapterNumber,
          event.actNumber,
          messageIndex,
        ]);
      }
    }
    const eventEndIndex = (reportDetail === "full" ? inlineEventLedger.length : packedRows.length) - 1;
    const eventRange: EventRange | undefined =
      events.length > 0 ? { startIndex: eventStartIndex, endIndex: eventEndIndex, count: events.length } : undefined;

    const actorStatesAfterTurn: EntityStateDigest[] | undefined =
      reportDetail === "full"
        ? [...new Set(events.map((event) => event.actorId))]
            .map((actorId) => {
              const actor = postSnapshot.entities[actorId] ?? beforeSnapshot.entities[actorId];
              if (!actor) {
                return null;
              }
              return toEntityDigest(postSnapshot.entities[actorId] ? postSnapshot : beforeSnapshot, actor);
            })
            .filter((row): row is EntityStateDigest => row !== null)
        : undefined;

    for (let eventOffset = 0; eventOffset < events.length; eventOffset += 1) {
      const event = events[eventOffset] as GameEvent;
      const eventIndex = eventStartIndex + eventOffset;
      const stateAfterEvent =
        postSnapshot.entities[event.actorId] ?? beforeSnapshot.entities[event.actorId] ?? null;
      const digest = stateAfterEvent
        ? toEntityDigest(postSnapshot.entities[event.actorId] ? postSnapshot : beforeSnapshot, stateAfterEvent)
        : null;
      if (!entityCatalog[event.actorId]) {
        entityCatalog[event.actorId] = {
          entityId: event.actorId,
          name: event.actorName,
          entityKind: digest?.entityKind ?? "unknown",
          isPlayer: digest?.isPlayer ?? event.actorId === beforeSnapshot.playerId,
        };
      }
      const existing =
        entityActionSummaries[event.actorId] ??
        ({
          entityId: event.actorId,
          totalEvents: 0,
          actionUsage: {},
          dialogueEventIndices: [],
          lastKnownStateRef: event.actorId,
        } satisfies EntityActionSummary);
      existing.totalEvents += 1;
      existing.actionUsage[event.actionType] = Number(existing.actionUsage[event.actionType] ?? 0) + 1;
      if (DIALOGUE_ACTION_TYPES.has(event.actionType) || event.actionType === "cutscene") {
        existing.dialogueEventIndices.push(eventIndex);
      }
      existing.lastKnownStateRef = event.actorId;
      entityLastKnownStates[event.actorId] = digest ? toEntityStateSnapshot(digest) : null;
      entityActionSummaries[event.actorId] = existing;
    }

    const chapter = chapterForSnapshotDepth(postSnapshot, playerAfter.depth);
    const act = actForChapter(postSnapshot, chapter);
    const engineTurn = Number(postSnapshot.turnIndex);
    playerTimeline.push({
      playerTurn: turn + 1,
      engineTurn,
      depth: playerAfter.depth,
      roomId: playerAfter.roomId,
      chapter,
      act,
      health: playerAfter.health,
      energy: playerAfter.energy,
      level: levelForEntity(postSnapshot, playerAfter),
      reputation: playerAfter.reputation,
      archetypeHeading: playerAfter.archetypeHeading,
      traits: { ...(playerAfter.traits as NumberMap) },
      features: { ...(playerAfter.features as NumberMap) },
      skills: playerAfterDigest.skills,
    });

    const turnCommon = {
      playerTurn: turn + 1,
      source,
      selectedAction: action,
      availableActionTypes,
      dialogueOptionsPresented,
      pageDelta: reportDetail === "full" ? pageDelta : summarizePageDelta(pageDelta),
      playerTraitDelta: diffMap(playerBeforeDigest.traits, playerAfterDigest.traits),
      playerFeatureDelta: diffMap(playerBeforeDigest.features, playerAfterDigest.features),
    };
    if (reportDetail === "full") {
      turnTimeline.push({
        ...turnCommon,
        playerBefore: playerBeforeDigest,
        playerAfter: playerAfterDigest,
        eventRange,
        events: [...events],
        dialogueText: events
          .filter((event) => DIALOGUE_ACTION_TYPES.has(event.actionType))
          .map((event) => `[t${event.turnIndex}] ${event.actorName}: ${event.message}`),
        cutsceneText: events
          .filter((event) => event.actionType === "cutscene")
          .map((event) => `[t${event.turnIndex}] ${event.message}`),
        actorStatesAfterTurn,
      });
    } else {
      turnTimeline.push({
        ...turnCommon,
        playerBeforeRef: turn === 0 ? -1 : turn - 1,
        playerAfterRef: turn,
        eventRange,
      });
    }

    actionTrace.push({
      playerTurn: turn + 1,
      action,
      source,
      eventCount: events.length,
      playerEventCount: events.filter((event) => event.actorId === beforeSnapshot.playerId).length,
      nonPlayerEventCount: events.filter((event) => event.actorId !== beforeSnapshot.playerId).length,
    });

    if (Boolean(result.status.escaped ?? false)) {
      break;
    }
  }

  const finalSnapshot = store.getSnapshot(session.sessionId);
  for (const [entityId, entity] of Object.entries(finalSnapshot.entities)) {
    const typed = entity as EntityState;
    if (!entityCatalog[entityId]) {
      entityCatalog[entityId] = {
        entityId,
        name: typed.name,
        entityKind: typed.entityKind,
        isPlayer: typed.isPlayer,
      };
    }
    if (!Object.prototype.hasOwnProperty.call(entityLastKnownStates, entityId)) {
      entityLastKnownStates[entityId] = toEntityStateSnapshot(toEntityDigest(finalSnapshot, typed));
    }
  }
  const eventLedger: EventLedger =
    reportDetail === "full"
      ? inlineEventLedger
      : {
          format: "packed-v1",
          rows: packedRows,
          actors: packedActors,
          actions: packedActions,
          rooms: packedRooms,
          messages: packedMessages,
        };
  const eventCount = reportDetail === "full" ? inlineEventLedger.length : packedRows.length;
  const eventLedgerFormat = reportDetail === "full" ? "inline-v1" : "packed-v1";
  return {
    seed,
    mode,
    reportDetail,
    turnsRequested: turns,
    turnsPlayed: actionTrace.length,
    sessionId: session.sessionId,
    fixtureUsage: {
      path: loadedFixture.fixturePath,
      setupApplied: shouldApplyFixtureSetup,
      scriptedActionCount: seededFixture?.actions?.length ?? 0,
      scriptedTurnsUsed,
      policyTurnsUsed,
    },
    actionUsage,
    actionTrace,
    eventLedger,
    eventCount,
    eventLedgerFormat,
    entityCatalog,
    entityLastKnownStates,
    entityActionSummaries,
    playerInitialState: playerInitialState ?? toEntityDigest(finalSnapshot, finalSnapshot.entities[finalSnapshot.playerId]),
    playerTimeline,
    turnTimeline,
    finalHash: hashSnapshot(finalSnapshot),
    finalStatus: store.getStatus(session.sessionId),
    finalSnapshot: {
      escaped: Boolean(finalSnapshot.escaped),
      pressure: (Object.values(finalSnapshot.entities) as EntityState[]).filter((entity) => entity.health > 0).length,
      chapterPagesIncluded: includeChapterPages,
      chapterPages: includeChapterPages ? finalSnapshot.chapterPages : null,
      chapterPageSummary: chapterPageSummary(finalSnapshot.chapterPages),
    },
    escaped: Boolean(finalSnapshot.escaped),
  };
};

const buildJsonlLedgerText = (run: AgentRunResult): string => {
  const lines: string[] = [];
  if (run.eventLedgerFormat === "packed-v1") {
    const packed = run.eventLedger as PackedEventLedger;
    const meta: JsonlMetaLine = {
      type: "meta",
      schemaVersion: EVENT_LEDGER_JSONL_SCHEMA_VERSION,
      sourceFormat: "packed-v1",
      eventCount: run.eventCount,
      actors: packed.actors,
      actions: packed.actions,
      rooms: packed.rooms,
      messages: packed.messages,
    };
    lines.push(JSON.stringify(meta));
    for (const row of packed.rows) {
      lines.push(JSON.stringify({ type: "event", row }));
    }
  } else {
    const inlineRows = run.eventLedger as EventLedgerEntry[];
    const meta: JsonlMetaLine = {
      type: "meta",
      schemaVersion: EVENT_LEDGER_JSONL_SCHEMA_VERSION,
      sourceFormat: "inline-v1",
      eventCount: run.eventCount,
    };
    lines.push(JSON.stringify(meta));
    for (const event of inlineRows) {
      lines.push(JSON.stringify({ type: "event", event }));
    }
  }
  return `${lines.join("\n")}\n`;
};

const main = () => {
  const turns = Number(process.env.DUNGEONBREAK_AGENT_TURNS ?? 120);
  const seed = Number(process.env.DUNGEONBREAK_AGENT_SEED ?? CANONICAL_SEED_V1);
  const mode = parseMode(process.env.DUNGEONBREAK_AGENT_MODE);
  const reportDetail = parseReportDetail(process.env.DUNGEONBREAK_AGENT_REPORT_DETAIL);
  const splitStorageFormat = parseSplitStorageFormat(process.env.DUNGEONBREAK_AGENT_SPLIT_STORAGE_FORMAT);
  const includeChapterPages = parseBoolean(process.env.DUNGEONBREAK_AGENT_INCLUDE_CHAPTER_PAGES, false);
  const writeGzip = parseBoolean(process.env.DUNGEONBREAK_AGENT_WRITE_GZIP, true);
  const prettyJson = parseBoolean(process.env.DUNGEONBREAK_AGENT_PRETTY_JSON, false);
  const splitArtifacts = parseBoolean(process.env.DUNGEONBREAK_AGENT_SPLIT_ARTIFACTS, false);
  const effectiveTurns = Number.isFinite(turns) && turns > 0 ? Math.trunc(turns) : 120;
  const effectiveSeed = Number.isFinite(seed) ? Math.trunc(seed) : CANONICAL_SEED_V1;

  const runA = runAgentSession(effectiveSeed, effectiveTurns, "agent-run-a", mode, reportDetail, includeChapterPages);
  const runB = runAgentSession(effectiveSeed, effectiveTurns, "agent-run-b", mode, reportDetail, includeChapterPages);
  if (runA.finalHash !== runB.finalHash) {
    throw new Error(`Agent run is non-deterministic. Hash A=${runA.finalHash}, Hash B=${runB.finalHash}`);
  }
  if (JSON.stringify(runA.actionTrace) !== JSON.stringify(runB.actionTrace)) {
    throw new Error("Agent run action trace drifted across repeated deterministic sessions.");
  }

  const operator = {
    runner: "packages/engine-mcp/src/agent-play.ts",
    operatorId:
      process.env.DUNGEONBREAK_AGENT_OPERATOR_ID ??
      process.env.USERNAME ??
      process.env.USER ??
      "unknown-operator",
    operatorLabel: process.env.DUNGEONBREAK_AGENT_LABEL ?? "DungeonBreak Agent Runner",
    client: process.env.DUNGEONBREAK_AGENT_CLIENT ?? "local-cli",
    host: process.env.COMPUTERNAME ?? os.hostname(),
    runtime: `node ${process.version}`,
    platform: `${process.platform}/${process.arch}`,
    pid: process.pid,
    mode,
    reportDetail,
  };

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "../../..");
  const outputDir = path.resolve(repoRoot, ".planning/test-reports");
  const outputPath = path.resolve(outputDir, "agent-play-report.json");
  const outputGzipPath = `${outputPath}.gz`;
  const eventLedgerPath = path.resolve(
    outputDir,
    `agent-play-report.events.${splitStorageFormat === "jsonl" ? "jsonl" : "json"}`,
  );
  const eventLedgerRelativePath = path.basename(eventLedgerPath);
  const eventLedgerGzipPath = `${eventLedgerPath}.gz`;
  const eventLedgerGzipRelativePath = path.basename(eventLedgerGzipPath);

  fs.mkdirSync(outputDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  let runForOutput: AgentRunOutput = runA;
  let eventLedgerRawBytes = 0;
  let eventLedgerGzipBytes = 0;
  if (splitArtifacts) {
    if (splitStorageFormat === "jsonl") {
      const jsonl = buildJsonlLedgerText(runA);
      fs.writeFileSync(eventLedgerPath, jsonl, "utf8");
      eventLedgerRawBytes = Buffer.byteLength(jsonl);
      if (writeGzip) {
        const gz = zlib.gzipSync(Buffer.from(jsonl), { level: zlib.constants.Z_BEST_COMPRESSION });
        eventLedgerGzipBytes = gz.length;
        fs.writeFileSync(eventLedgerGzipPath, gz);
      }
    } else {
      const eventLedgerPayload = {
        schemaVersion: EVENT_LEDGER_SCHEMA_VERSION,
        generatedAt,
        sourceFormat: runA.eventLedgerFormat,
        eventCount: runA.eventCount,
        eventLedger: runA.eventLedger,
      };
      const eventLedgerJson = prettyJson
        ? `${JSON.stringify(eventLedgerPayload, null, 2)}\n`
        : JSON.stringify(eventLedgerPayload);
      fs.writeFileSync(eventLedgerPath, eventLedgerJson, "utf8");
      eventLedgerRawBytes = Buffer.byteLength(eventLedgerJson);
      if (writeGzip) {
        const gz = zlib.gzipSync(Buffer.from(eventLedgerJson), { level: zlib.constants.Z_BEST_COMPRESSION });
        eventLedgerGzipBytes = gz.length;
        fs.writeFileSync(eventLedgerGzipPath, gz);
      }
    }
    if (writeGzip) {
      // gzip byte size already tracked in format branch above.
    }
    runForOutput = {
      ...runA,
      eventLedgerFormat: "external-v1",
      eventLedger: {
        format: "external-v1",
        sourceFormat: runA.eventLedgerFormat,
        storageFormat: splitStorageFormat === "jsonl" ? "jsonl-v1" : "json-v1",
        relativePath: eventLedgerRelativePath,
        gzipRelativePath: writeGzip ? eventLedgerGzipRelativePath : null,
        eventCount: runA.eventCount,
      },
    };
  }
  const report = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt,
    seed: effectiveSeed,
    turnsRequested: effectiveTurns,
    operator,
    determinism: {
      finalHash: runA.finalHash,
      repeatedRunHash: runB.finalHash,
      passed: true,
    },
    actionCoverage: {
      expected: FORCE_ORDER,
      covered: [...new Set(runA.actionTrace.map((row) => row.action.actionType))].sort(),
      missing: FORCE_ORDER.filter(
        (actionType) => !runA.actionTrace.some((row) => row.action.actionType === actionType),
      ),
    },
    run: runForOutput,
  };
  const json = prettyJson ? `${JSON.stringify(report, null, 2)}\n` : JSON.stringify(report);
  fs.writeFileSync(outputPath, json, "utf8");
  const rawBytes = Buffer.byteLength(json);

  let gzipBytes = 0;
  if (writeGzip) {
    const gz = zlib.gzipSync(Buffer.from(json), { level: zlib.constants.Z_BEST_COMPRESSION });
    gzipBytes = gz.length;
    fs.writeFileSync(outputGzipPath, gz);
  }

  const nonPlayerEvents = runA.actionTrace.reduce((sum, row) => sum + row.nonPlayerEventCount, 0);
  console.log(`Agent play report written: ${outputPath}`);
  if (writeGzip) {
    console.log(`Compressed report written: ${outputGzipPath}`);
  }
  if (splitArtifacts) {
    console.log(`Event ledger artifact written: ${eventLedgerPath}`);
    if (writeGzip) {
      console.log(`Compressed event ledger written: ${eventLedgerGzipPath}`);
    }
    console.log(`Event ledger size (raw): ${eventLedgerRawBytes} bytes`);
    if (writeGzip) {
      console.log(`Event ledger size (gzip): ${eventLedgerGzipBytes} bytes`);
    }
  }
  console.log(`Mode: ${mode}`);
  console.log(`Report detail: ${reportDetail}`);
  console.log(`Split artifacts: ${splitArtifacts}`);
  if (splitArtifacts) {
    console.log(`Split storage format: ${splitStorageFormat}`);
  }
  console.log(`Deterministic final hash: ${runA.finalHash}`);
  console.log(`Turns played: ${runA.turnsPlayed}/${effectiveTurns}`);
  console.log(`Non-player events captured: ${nonPlayerEvents}`);
  console.log(`Scripted turns used: ${runA.fixtureUsage.scriptedTurnsUsed}`);
  console.log(`Missing action types: ${report.actionCoverage.missing.join(", ") || "none"}`);
  console.log(`Report size (raw): ${rawBytes} bytes`);
  if (writeGzip) {
    console.log(`Report size (gzip): ${gzipBytes} bytes`);
  }
};

main();
