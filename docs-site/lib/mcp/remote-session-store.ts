import { randomUUID } from "node:crypto";

import {
  CANONICAL_SEED_V1,
  GameEngine,
  type EntityState,
  type GameSnapshot,
  type PlayerAction,
} from "@dungeonbreak/engine";

type SessionRecord = {
  sessionId: string;
  seed: number;
  createdAt: string;
  updatedAt: string;
  engine: GameEngine;
};

type SessionMap = Map<string, SessionRecord>;

export type SessionSummary = {
  sessionId: string;
  seed: number;
  createdAt: string;
  updatedAt: string;
  turn: number;
  depth: number;
  level: number;
  escaped: boolean;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_LIMIT_PER_USER = 8;

const nowIso = (): string => new Date().toISOString();

const toSeed = (seed: number | undefined): number => {
  if (typeof seed !== "number" || !Number.isFinite(seed)) {
    return CANONICAL_SEED_V1;
  }
  return Math.trunc(seed);
};

const asEntity = (value: EntityState | undefined, entityId?: string): EntityState | undefined => {
  if (!entityId) {
    return value;
  }
  if (!value) {
    throw new Error(`entity '${entityId}' not found in this session`);
  }
  return value;
};

export class RemoteGameSessionStore {
  private readonly sessionsByUser = new Map<string, SessionMap>();
  private readonly requestWindows = new Map<string, number[]>();

  assertRateLimit(userId: string): void {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const history = this.requestWindows.get(userId) ?? [];
    const kept = history.filter((entry) => entry >= windowStart);
    if (kept.length >= RATE_LIMIT_MAX_REQUESTS) {
      throw new Error("rate_limit_exceeded");
    }
    kept.push(now);
    this.requestWindows.set(userId, kept);
  }

  createSession(userId: string, seed?: number, sessionId?: string): SessionSummary {
    this.cleanupExpiredSessions();
    const sessions = this.requireUserSessions(userId, true);
    if (sessions.size >= SESSION_LIMIT_PER_USER) {
      throw new Error("session_limit_exceeded");
    }

    const nextSeed = toSeed(seed);
    const nextSessionId = sessionId?.trim() ? sessionId.trim() : randomUUID();
    if (sessions.has(nextSessionId)) {
      throw new Error(`session '${nextSessionId}' already exists`);
    }

    const engine = GameEngine.create(nextSeed);
    const createdAt = nowIso();
    const record: SessionRecord = {
      sessionId: nextSessionId,
      seed: nextSeed,
      createdAt,
      updatedAt: createdAt,
      engine,
    };
    sessions.set(nextSessionId, record);
    return this.toSummary(record);
  }

  listSessions(userId: string): SessionSummary[] {
    this.cleanupExpiredSessions();
    const sessions = this.requireUserSessions(userId);
    return [...sessions.values()].map((record) => this.toSummary(record));
  }

  deleteSession(userId: string, sessionId: string): boolean {
    const sessions = this.requireUserSessions(userId);
    return sessions.delete(sessionId);
  }

  getSnapshot(userId: string, sessionId: string): GameSnapshot {
    const record = this.requireRecord(userId, sessionId);
    this.touch(record);
    return record.engine.snapshot();
  }

  restoreSnapshot(userId: string, sessionId: string, snapshot: GameSnapshot): SessionSummary {
    const record = this.requireRecord(userId, sessionId);
    record.engine.restore(snapshot);
    this.touch(record);
    return this.toSummary(record);
  }

  getStatus(userId: string, sessionId: string): Record<string, unknown> {
    const record = this.requireRecord(userId, sessionId);
    this.touch(record);
    return record.engine.status();
  }

  getLook(userId: string, sessionId: string): string {
    const record = this.requireRecord(userId, sessionId);
    this.touch(record);
    return record.engine.look();
  }

  listActions(userId: string, sessionId: string, entityId?: string) {
    const record = this.requireRecord(userId, sessionId);
    const entity = entityId ? asEntity(record.engine.state.entities[entityId], entityId) : undefined;
    this.touch(record);
    return record.engine.availableActions(entity);
  }

  dispatchAction(userId: string, sessionId: string, action: PlayerAction) {
    const record = this.requireRecord(userId, sessionId);
    const turnResult = record.engine.dispatch(action);
    this.touch(record);
    return {
      session: this.toSummary(record),
      turnResult,
      status: record.engine.status(),
      look: record.engine.look(),
      recentCutscenes: record.engine.recentCutscenes(6),
      recentDeeds: record.engine.recentDeeds(6),
    };
  }

  getLogPage(userId: string, sessionId: string, chapter?: number, entityId?: string) {
    const record = this.requireRecord(userId, sessionId);
    const engine = record.engine;
    const status = engine.status();
    const currentChapter = Number(status.chapter ?? 1);
    const selectedChapter = Number.isInteger(chapter) ? Number(chapter) : currentChapter;
    const page = engine.state.chapterPages[selectedChapter] ?? { chapter: [], entities: {} };
    this.touch(record);

    if (entityId) {
      return {
        chapter: selectedChapter,
        currentChapter,
        entityId,
        chapterLines: page.chapter,
        entityLines: page.entities[entityId] ?? [],
      };
    }

    return {
      chapter: selectedChapter,
      currentChapter,
      chapterLines: page.chapter,
      entities: page.entities,
    };
  }

  getCanonicalSeed(): number {
    return CANONICAL_SEED_V1;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, sessions] of this.sessionsByUser.entries()) {
      for (const [sessionId, record] of sessions.entries()) {
        const updated = new Date(record.updatedAt).getTime();
        if (now - updated > SESSION_TTL_MS) {
          sessions.delete(sessionId);
        }
      }
      if (sessions.size === 0) {
        this.sessionsByUser.delete(userId);
      }
    }
  }

  private requireUserSessions(userId: string, create = false): SessionMap {
    const existing = this.sessionsByUser.get(userId);
    if (existing) {
      return existing;
    }
    if (!create) {
      return new Map();
    }
    const sessions = new Map<string, SessionRecord>();
    this.sessionsByUser.set(userId, sessions);
    return sessions;
  }

  private requireRecord(userId: string, sessionId: string): SessionRecord {
    this.cleanupExpiredSessions();
    const sessions = this.sessionsByUser.get(userId);
    const record = sessions?.get(sessionId);
    if (!record) {
      throw new Error(`session '${sessionId}' not found`);
    }
    return record;
  }

  private touch(record: SessionRecord): void {
    record.updatedAt = nowIso();
  }

  private toSummary(record: SessionRecord): SessionSummary {
    const status = record.engine.status();
    return {
      sessionId: record.sessionId,
      seed: record.seed,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      turn: Number(status.turn ?? 0),
      depth: Number(status.depth ?? 0),
      level: Number(status.level ?? 1),
      escaped: Boolean(record.engine.state.escaped),
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __dungeonbreak_remote_mcp_store: RemoteGameSessionStore | undefined;
}

export const getRemoteMcpStore = (): RemoteGameSessionStore => {
  if (!globalThis.__dungeonbreak_remote_mcp_store) {
    globalThis.__dungeonbreak_remote_mcp_store = new RemoteGameSessionStore();
  }
  return globalThis.__dungeonbreak_remote_mcp_store;
};
