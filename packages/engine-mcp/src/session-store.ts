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

const nowIso = (): string => new Date().toISOString();

const toSeed = (seed: number | undefined): number => {
  if (typeof seed !== "number" || !Number.isFinite(seed)) {
    return CANONICAL_SEED_V1;
  }
  return Math.trunc(seed);
};

export class GameSessionStore {
  private readonly sessions = new Map<string, SessionRecord>();

  createSession(seed?: number, sessionId?: string): SessionSummary {
    const nextSeed = toSeed(seed);
    const nextSessionId = sessionId?.trim() ? sessionId.trim() : randomUUID();
    if (this.sessions.has(nextSessionId)) {
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
    this.sessions.set(nextSessionId, record);
    return this.toSummary(record);
  }

  listSessions(): SessionSummary[] {
    return [...this.sessions.values()].map((record) => this.toSummary(record));
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  getSnapshot(sessionId: string): GameSnapshot {
    const record = this.requireRecord(sessionId);
    this.touch(record);
    return record.engine.snapshot();
  }

  restoreSnapshot(sessionId: string, snapshot: GameSnapshot): SessionSummary {
    const record = this.requireRecord(sessionId);
    record.engine.restore(snapshot);
    this.touch(record);
    return this.toSummary(record);
  }

  getStatus(sessionId: string): Record<string, unknown> {
    const record = this.requireRecord(sessionId);
    this.touch(record);
    return record.engine.status();
  }

  getLook(sessionId: string): string {
    const record = this.requireRecord(sessionId);
    this.touch(record);
    return record.engine.look();
  }

  listActions(sessionId: string, entityId?: string) {
    const record = this.requireRecord(sessionId);
    const entity = this.resolveEntity(record.engine, entityId);
    this.touch(record);
    return record.engine.availableActions(entity);
  }

  dispatchAction(sessionId: string, action: PlayerAction) {
    const record = this.requireRecord(sessionId);
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

  getLogPage(sessionId: string, chapter?: number, entityId?: string) {
    const record = this.requireRecord(sessionId);
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

  private requireRecord(sessionId: string): SessionRecord {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`session '${sessionId}' not found`);
    }
    return record;
  }

  private touch(record: SessionRecord): void {
    record.updatedAt = nowIso();
  }

  private resolveEntity(engine: GameEngine, entityId?: string): EntityState | undefined {
    if (!entityId) {
      return undefined;
    }
    const entity = engine.state.entities[entityId];
    if (!entity) {
      throw new Error(`entity '${entityId}' not found in this session`);
    }
    return entity;
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
