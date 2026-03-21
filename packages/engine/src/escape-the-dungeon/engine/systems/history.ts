import { isAlive } from "../../core/entity-stats";
import type {
  EntityState,
  GameEvent,
  GameState,
  NumberMap,
  PlayerAction,
} from "../../core/types";
import { clamp } from "../../core/types";
import type { CutsceneHit } from "../../narrative/cutscenes";
import type { Deed, DeedVectorizer } from "../../narrative/deeds";
import type { ActionOutcome } from "../actions/action-types";
import { actFor, chapterFor, toNumberMap } from "../game-runtime-helpers";

interface RecordDialogueProgressInput {
  actor: EntityState;
  action: PlayerAction;
  historyLimit: number;
  result: ActionOutcome;
  state: GameState;
}

export const recordDialogueProgress = ({
  actor,
  action,
  historyLimit,
  result,
  state,
}: RecordDialogueProgressInput): void => {
  if (!["talk", "choose_dialogue"].includes(action.actionType)) {
    return;
  }

  const sequence = state.dialogueProgress.sequence + 1;
  const optionId =
    action.actionType === "choose_dialogue"
      ? String(action.payload.optionId ?? result.metadata.optionId ?? "")
      : "";
  const normalizedOptionId = optionId || null;
  const sceneId = String(result.metadata.sceneId ?? "") || null;
  const targetEntityId = String(result.metadata.targetId ?? "") || null;
  const dialogueActionType: "choose_dialogue" | "talk" =
    action.actionType === "choose_dialogue" ? "choose_dialogue" : "talk";
  const label =
    dialogueActionType === "choose_dialogue"
      ? String(
          result.metadata.optionLabel ??
            `choose ${normalizedOptionId ?? "dialogue"}`
        )
      : "talk";
  const responseText = String(result.message ?? "");

  const nextEntry = {
    sequence,
    turnIndex: state.turnIndex + 1,
    actionType: dialogueActionType,
    optionId: normalizedOptionId,
    sceneId,
    label,
    responseText,
    depth: actor.depth,
    roomId: actor.roomId,
    targetEntityId,
  };

  const visitedOptionIds =
    normalizedOptionId &&
    !state.dialogueProgress.visitedOptionIds.includes(normalizedOptionId)
      ? [...state.dialogueProgress.visitedOptionIds, normalizedOptionId]
      : [...state.dialogueProgress.visitedOptionIds];
  const visitedSceneIds =
    sceneId && !state.dialogueProgress.visitedSceneIds.includes(sceneId)
      ? [...state.dialogueProgress.visitedSceneIds, sceneId]
      : [...state.dialogueProgress.visitedSceneIds];

  state.dialogueProgress = {
    sequence,
    lastOptionId: normalizedOptionId ?? state.dialogueProgress.lastOptionId,
    lastSceneId: sceneId ?? state.dialogueProgress.lastSceneId,
    visitedOptionIds,
    visitedSceneIds,
    history: [...state.dialogueProgress.history, nextEntry].slice(
      -historyLimit
    ),
  };
};

export const ensureChapterPages = (state: GameState, chapter: number): void => {
  if (!state.chapterPages[chapter]) {
    state.chapterPages[chapter] = { chapter: [], entities: {} };
  }
  const row = state.chapterPages[chapter] as {
    chapter: string[];
    entities: Record<string, string[]>;
  };
  for (const entityId of Object.keys(state.entities)) {
    if (!row.entities[entityId]) {
      row.entities[entityId] = [];
    }
  }
};

const DEED_MEMORY_LIMIT = 160;
const RUMOR_BASE_MISINFORM_CHANCE = 0.18;
const RUMOR_TRANSFORM_MISINFORM_CHANCE = 0.22;
const RUMOR_SHARED_MISINFORM_CHANCE = 0.15;
const RUMOR_CONFIDENCE_DECAY_MISINFORMED = 0.2;
const RUMOR_CONFIDENCE_DECAY_RUMOR = 0.08;
const RUMOR_SHARED_CONFIDENCE_DECAY = 0.1;
const NORMALIZED_MIN = 0;
const NORMALIZED_MAX = 1;

interface ApplyDeedSemanticsInput {
  actionType: string;
  actor: EntityState;
  confidence: number;
  deedVectorizer: DeedVectorizer;
  foundItemTags: string[];
  message: string;
  sourceEntityId: string;
  subjectEntityId: string;
  beliefState: "verified" | "rumor" | "misinformed";
  turnIndex: number;
}

export const applyDeedSemantics = ({
  actionType,
  actor,
  confidence,
  deedVectorizer,
  foundItemTags,
  message,
  sourceEntityId,
  subjectEntityId,
  beliefState,
  turnIndex,
}: ApplyDeedSemanticsInput): {
  featureDelta: NumberMap;
  traitDelta: NumberMap;
} => {
  const deed: Deed = {
    deedId: `${actor.entityId}_${turnIndex}_${actionType}`,
    actorId: actor.entityId,
    actorName: actor.name,
    subjectId: subjectEntityId,
    sourceEntityId,
    beliefState,
    confidence,
    deedType: actionType,
    title: `${actionType} at depth ${actor.depth}`,
    summary: message,
    depth: actor.depth,
    roomId: actor.roomId,
    tags: [...foundItemTags, actionType, actor.faction],
    turnIndex,
  };
  const memory = deedVectorizer.vectorize(deed);
  actor.deeds.push(memory);
  if (actor.deeds.length > DEED_MEMORY_LIMIT) {
    actor.deeds.splice(0, actor.deeds.length - DEED_MEMORY_LIMIT);
  }
  return {
    traitDelta: memory.traitDelta,
    featureDelta: memory.featureDelta,
  };
};

interface SpreadRumorInput {
  actor: EntityState;
  baseConfidence: number;
  deedVectorizer: DeedVectorizer;
  entities: Record<string, EntityState>;
  nextFloat: () => number;
  subjectEntityId: string;
  summary: string;
  turnIndex: number;
}

export const spreadRumor = ({
  actor,
  baseConfidence,
  deedVectorizer,
  entities,
  nextFloat,
  subjectEntityId,
  summary,
  turnIndex,
}: SpreadRumorInput): void => {
  const baseBelief: "rumor" | "misinformed" =
    nextFloat() < RUMOR_BASE_MISINFORM_CHANCE ? "misinformed" : "rumor";
  const rumor = {
    rumorId: `rumor_${actor.entityId}_${turnIndex}`,
    sourceEntityId: actor.entityId,
    actorEntityId: actor.entityId,
    subjectEntityId,
    summary,
    beliefState: baseBelief,
    confidence: clamp(baseConfidence, NORMALIZED_MIN, NORMALIZED_MAX),
    turnIndex,
  };
  actor.rumors.push(rumor);

  for (const other of Object.values(entities)) {
    if (other.entityId === actor.entityId || other.depth !== actor.depth) {
      continue;
    }
    if (!isAlive(other)) {
      continue;
    }

    if (nextFloat() > rumor.confidence) {
      continue;
    }

    const transformedBelief: "rumor" | "misinformed" =
      rumor.beliefState === "misinformed" ||
      nextFloat() < RUMOR_TRANSFORM_MISINFORM_CHANCE
        ? "misinformed"
        : "rumor";
    const transformedSummary =
      transformedBelief === "misinformed"
        ? `${summary} (distorted by dungeon chatter)`
        : summary;
    const confidence = clamp(
      rumor.confidence -
        (transformedBelief === "misinformed"
          ? RUMOR_CONFIDENCE_DECAY_MISINFORMED
          : RUMOR_CONFIDENCE_DECAY_RUMOR),
      NORMALIZED_MIN,
      NORMALIZED_MAX
    );

    other.rumors.push({
      ...rumor,
      rumorId: `${rumor.rumorId}_${other.entityId}`,
      summary: transformedSummary,
      beliefState: transformedBelief,
      confidence,
    });

    applyDeedSemantics({
      actor: other,
      actionType: "rumor_heard",
      message: transformedSummary,
      foundItemTags: ["rumor"],
      subjectEntityId: rumor.subjectEntityId,
      sourceEntityId: rumor.sourceEntityId,
      beliefState: transformedBelief,
      confidence,
      deedVectorizer,
      turnIndex,
    });
  }
};

interface CrossPollinateRumorsInput {
  actor: EntityState;
  deedVectorizer: DeedVectorizer;
  nearby: EntityState[];
  nextFloat: () => number;
  turnIndex: number;
}

export const crossPollinateRumors = ({
  actor,
  deedVectorizer,
  nearby,
  nextFloat,
  turnIndex,
}: CrossPollinateRumorsInput): void => {
  const actorLatest = actor.rumors.at(-1);
  for (const other of nearby) {
    const otherLatest = other.rumors.at(-1);
    if (actorLatest) {
      const beliefState: "rumor" | "misinformed" =
        actorLatest.beliefState === "misinformed" ||
        nextFloat() < RUMOR_SHARED_MISINFORM_CHANCE
          ? "misinformed"
          : "rumor";
      const confidence = clamp(
        actorLatest.confidence - RUMOR_SHARED_CONFIDENCE_DECAY,
        NORMALIZED_MIN,
        NORMALIZED_MAX
      );
      other.rumors.push({
        ...actorLatest,
        rumorId: `${actorLatest.rumorId}_shared_${other.entityId}_${turnIndex}`,
        beliefState,
        confidence,
      });
      applyDeedSemantics({
        actor: other,
        actionType: "rumor_shared",
        message: actorLatest.summary,
        foundItemTags: ["rumor"],
        subjectEntityId: actorLatest.subjectEntityId,
        sourceEntityId: actorLatest.sourceEntityId,
        beliefState,
        confidence,
        deedVectorizer,
        turnIndex,
      });
    }
    if (otherLatest) {
      const beliefState: "rumor" | "misinformed" =
        otherLatest.beliefState === "misinformed" ||
        nextFloat() < RUMOR_SHARED_MISINFORM_CHANCE
          ? "misinformed"
          : "rumor";
      const confidence = clamp(
        otherLatest.confidence - RUMOR_SHARED_CONFIDENCE_DECAY,
        NORMALIZED_MIN,
        NORMALIZED_MAX
      );
      actor.rumors.push({
        ...otherLatest,
        rumorId: `${otherLatest.rumorId}_shared_${actor.entityId}_${turnIndex}`,
        beliefState,
        confidence,
      });
      applyDeedSemantics({
        actor,
        actionType: "rumor_shared",
        message: otherLatest.summary,
        foundItemTags: ["rumor"],
        subjectEntityId: otherLatest.subjectEntityId,
        sourceEntityId: otherLatest.sourceEntityId,
        beliefState,
        confidence,
        deedVectorizer,
        turnIndex,
      });
    }
  }
};

interface RecordGameEventInput {
  actor: EntityState;
  actionType: string;
  message: string;
  metadata: Record<string, unknown>;
  narrativeStatDelta: NumberMap;
  state: GameState;
  turnCost?: number;
  warnings: string[];
}

export const recordGameEvent = ({
  actor,
  actionType,
  message,
  metadata,
  narrativeStatDelta,
  state,
  turnCost = 1,
  warnings,
}: RecordGameEventInput): GameEvent => {
  const chapter = chapterFor(state, actor.depth);
  ensureChapterPages(state, chapter);
  const act = actFor(state, actor.depth);
  const entry = `${actionType}@${actor.roomId}: ${message}`;
  const chapterPage = state.chapterPages[chapter] as {
    chapter: string[];
    entities: Record<string, string[]>;
  };
  chapterPage.chapter.push(`[${state.turnIndex}] ${entry}`);
  chapterPage.entities[actor.entityId]?.push(`[${state.turnIndex}] ${entry}`);

  const event: GameEvent = {
    turnIndex: state.turnIndex,
    actorId: actor.entityId,
    actorName: actor.name,
    actionType,
    depth: actor.depth,
    roomId: actor.roomId,
    chapterNumber: chapter,
    actNumber: act,
    message,
    warnings: [...warnings],
    narrativeStatDelta: toNumberMap(narrativeStatDelta),
    metadata: { ...metadata },
  };
  state.eventLog.push(event);
  state.turnIndex += Math.max(0, Number(turnCost) || 0);
  return event;
};

interface RecordCutsceneHitsInput {
  actor: EntityState;
  hits: CutsceneHit[];
  recordEvent: (input: Omit<RecordGameEventInput, "state">) => GameEvent;
}

export const recordCutsceneHits = ({
  actor,
  hits,
  recordEvent,
}: RecordCutsceneHitsInput): void => {
  for (const hit of hits) {
    recordEvent({
      actor,
      actionType: "cutscene",
      message: `${hit.title}: ${hit.text}`,
      warnings: [],
      narrativeStatDelta: {},
      metadata: { cutsceneId: hit.cutsceneId },
    });
  }
};
