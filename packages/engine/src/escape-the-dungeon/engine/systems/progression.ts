import type { EntityState, GameState, NumberMap } from "../../core/types";
import { narrativeStat } from "../../core/entity-stats";

interface QuestRuleDefinition {
  actionType?: string;
  amount?: number;
  kind: string;
  setToRequired?: boolean;
}

interface QuestDefinitionLike {
  progressRules: QuestRuleDefinition[];
  questId: string;
}

interface RuntimeEventTrigger {
  gte: number;
  key?: string;
  metric: string;
}

interface RuntimeEventDefinition {
  eventId: string;
  globalEnemyLevelBonusDelta?: number;
  kind: string;
  message: string;
  narrativeStatDelta?: NumberMap;
  probability?: number;
  trigger: RuntimeEventTrigger;
}

interface UpdateQuestsInput {
  actionType: string;
  actor: EntityState;
  chapterCompleted?: number;
  questDefinitions: readonly QuestDefinitionLike[];
  state: GameState;
}

export const updateQuests = ({
  actionType,
  actor,
  chapterCompleted,
  questDefinitions,
  state,
}: UpdateQuestsInput): void => {
  if (!actor.isPlayer) {
    return;
  }

  for (const definition of questDefinitions) {
    const quest = state.quests[definition.questId];
    if (!quest) {
      continue;
    }

    for (const rule of definition.progressRules) {
      if (rule.kind === "action") {
        if (actionType === rule.actionType) {
          quest.progress += Number(rule.amount ?? 1);
        }
        continue;
      }

      if (rule.kind === "chapter_completed") {
        if (chapterCompleted !== undefined) {
          quest.progress += Number(rule.amount ?? 1);
        }
        continue;
      }

      if (rule.kind === "escape" && state.escaped) {
        if (rule.setToRequired) {
          quest.progress = quest.requiredProgress;
        } else {
          quest.progress += Number(rule.amount ?? 1);
        }
      }
    }

    quest.progress = Math.min(quest.requiredProgress, quest.progress);
    quest.isComplete = quest.progress >= quest.requiredProgress;
  }
};

interface RefreshEntityArchetypeInput {
  classify: (entity: EntityState, currentHeading: string) => string;
  entity: EntityState;
}

export const refreshEntityArchetype = ({
  classify,
  entity,
}: RefreshEntityArchetypeInput): void => {
  entity.archetypeHeading = classify(entity, entity.archetypeHeading);
};

interface RefreshAllArchetypesInput {
  classify: (entity: EntityState, currentHeading: string) => string;
  entities: Record<string, EntityState>;
}

export const refreshAllArchetypes = ({
  classify,
  entities,
}: RefreshAllArchetypesInput): void => {
  for (const entity of Object.values(entities)) {
    refreshEntityArchetype({ classify, entity });
  }
};

export const eventTriggerSatisfied = (
  event: RuntimeEventDefinition,
  player: EntityState,
  turnIndex: number,
  context?: {
    actionType?: string;
    roomFeature?: string;
    roomId?: string;
  }
): boolean => {
  if (event.trigger.metric === "turn_index") {
    return turnIndex >= event.trigger.gte;
  }
  if (event.trigger.metric === "player_feature") {
    const value = narrativeStat(player, String(event.trigger.key ?? ""));
    return value >= event.trigger.gte;
  }
  if (event.trigger.metric === "room_entry_feature") {
    return (
      context?.actionType === "move" &&
      Number(event.trigger.gte) <= 1 &&
      String(event.trigger.key ?? "") === String(context.roomFeature ?? "")
    );
  }
  if (event.trigger.metric === "room_entry_room") {
    return (
      context?.actionType === "move" &&
      Number(event.trigger.gte) <= 1 &&
      String(event.trigger.key ?? "") === String(context.roomId ?? "")
    );
  }
  return false;
};

interface ProcessGlobalEventsInput {
  actionType?: string;
  applyEventNarrativeDelta: (delta: NumberMap) => NumberMap;
  events: readonly RuntimeEventDefinition[];
  nextFloat: () => number;
  player: EntityState;
  recordEvent: (input: {
    actionType: string;
    actor: EntityState;
    message: string;
    metadata: Record<string, unknown>;
    narrativeStatDelta: NumberMap;
    warnings: string[];
  }) => void;
  roomFeature?: string;
  roomId?: string;
  state: GameState;
}

interface TitleUnlockConditionLike {
  [key: string]: unknown;
  type?: string;
}

interface TitleDefinitionLike {
  archetypeId: string;
  rarityId?: string;
  titleId: string;
  unlockCondition: TitleUnlockConditionLike[];
}

export const processGlobalEvents = ({
  actionType,
  applyEventNarrativeDelta,
  events,
  nextFloat,
  player,
  recordEvent,
  roomFeature,
  roomId,
  state,
}: ProcessGlobalEventsInput): void => {
  for (const event of events) {
    if (state.globalEventFlags.includes(event.eventId)) {
      continue;
    }
    if (
      !eventTriggerSatisfied(event, player, state.turnIndex, {
        actionType,
        roomFeature,
        roomId,
      })
    ) {
      continue;
    }
    if (event.kind === "emergent") {
      const probability = Number(event.probability ?? 0);
      if (nextFloat() > probability) {
        continue;
      }
    }

    state.globalEventFlags.push(event.eventId);
    state.globalEnemyLevelBonus += Number(event.globalEnemyLevelBonusDelta ?? 0);

    const narrativeStatDelta = event.narrativeStatDelta
      ? applyEventNarrativeDelta(event.narrativeStatDelta)
      : {};

    recordEvent({
      actor: player,
      actionType: event.trigger.metric.startsWith("room_entry_")
        ? "room_event"
        : "global_event",
      message: event.message,
      warnings: [],
      narrativeStatDelta,
      metadata: {
        globalEventId: event.eventId,
        eventKind: event.kind,
        triggerMetric: event.trigger.metric,
        triggerKey: event.trigger.key ?? null,
      },
    });
  }
};

const countActions = (state: GameState, actionType: string): number => {
  return state.actionHistory.filter((entry) => entry === actionType).length;
};

const countCombatVictories = (state: GameState): number => {
  return state.eventLog.filter((event) => {
    return (
      ["fight", "cast_spell"].includes(event.actionType) &&
      Boolean(event.metadata.defenderDefeated)
    );
  }).length;
};

const countBossDefeats = (
  state: GameState,
  entities: Record<string, EntityState>,
): number => {
  return state.eventLog.filter((event) => {
    if (
      !["fight", "cast_spell"].includes(event.actionType) ||
      !Boolean(event.metadata.defenderDefeated)
    ) {
      return false;
    }
    const targetId = String(event.metadata.targetId ?? "");
    if (!targetId) {
      return false;
    }
    return entities[targetId]?.occupationId === "boss";
  }).length;
};

const discoveredRoomCount = (state: GameState): number => {
  return Object.values(state.discoveredRoomsByDepth).reduce((sum, roomIds) => {
    return sum + roomIds.length;
  }, 0);
};

const shallowestReachedDepth = (state: GameState, player: EntityState): number => {
  const depthValues = [
    player.depth,
    ...Object.keys(state.discoveredRoomsByDepth).map((depth) => Number(depth)),
    ...state.documentedDepths,
  ].filter((depth) => Number.isFinite(depth));
  return depthValues.length > 0 ? Math.min(...depthValues) : player.depth;
};

const titleConditionSatisfied = (input: {
  condition: TitleUnlockConditionLike;
  entities: Record<string, EntityState>;
  player: EntityState;
  state: GameState;
}): boolean => {
  const { condition, entities, player, state } = input;
  const type = String(condition.type ?? "");

  if (type === "castSpell") {
    const spellId = String(condition.spellId ?? "");
    const required = Math.max(1, Number(condition.count ?? 1));
    if (spellId.length > 0) {
      return Number(player.spellUseCounts[spellId] ?? 0) >= required;
    }
    const totalUses = Object.values(player.spellUseCounts).reduce(
      (sum, value) => sum + Number(value ?? 0),
      0,
    );
    return totalUses >= required;
  }

  if (type === "evolveSpell") {
    return state.discoveredEvolutionIds.length >= Math.max(1, Number(condition.count ?? 1));
  }

  if (type === "reachDepth") {
    const targetDepth = Number(condition.depth ?? Number.POSITIVE_INFINITY);
    return shallowestReachedDepth(state, player) <= targetDepth;
  }

  if (type === "searchCount") {
    return countActions(state, "search") >= Math.max(1, Number(condition.count ?? 1));
  }

  if (type === "winCombat") {
    return countCombatVictories(state) >= Math.max(1, Number(condition.count ?? 1));
  }

  if (type === "restCount") {
    return countActions(state, "rest") >= Math.max(1, Number(condition.count ?? 1));
  }

  if (type === "roomsDiscovered") {
    return discoveredRoomCount(state) >= Math.max(1, Number(condition.count ?? 1));
  }

  if (type === "fleeCount") {
    return countActions(state, "flee") >= Math.max(1, Number(condition.count ?? 1));
  }

  if (type === "talkToNpc") {
    return countActions(state, "talk") >= Math.max(1, Number(condition.count ?? 1));
  }

  if (type === "fameReached") {
    return narrativeStat(player, "Fame") >= Number(condition.value ?? 0);
  }

  if (type === "bossDefeated") {
    return countBossDefeats(state, entities) >= Math.max(1, Number(condition.count ?? 1));
  }

  return false;
};

export const syncPlayerTitles = (input: {
  currentEquippedTitleId: string | null;
  currentUnlockedTitleIds: string[];
  entities: Record<string, EntityState>;
  player: EntityState;
  rarityOrderById: Record<string, number>;
  state: GameState;
  titles: readonly TitleDefinitionLike[];
}): {
  equippedTitleId: string | null;
  newlyUnlockedTitleIds: string[];
  unlockedTitleIds: string[];
} => {
  const {
    currentEquippedTitleId,
    currentUnlockedTitleIds,
    entities,
    player,
    rarityOrderById,
    state,
    titles,
  } = input;

  const unlocked = new Set(currentUnlockedTitleIds);
  const newlyUnlockedTitleIds: string[] = [];

  for (const title of titles) {
    const isUnlocked = title.unlockCondition.every((condition) => {
      return titleConditionSatisfied({ condition, entities, player, state });
    });
    if (isUnlocked && !unlocked.has(title.titleId)) {
      unlocked.add(title.titleId);
      newlyUnlockedTitleIds.push(title.titleId);
    }
  }

  const unlockedTitleIds = [...unlocked].sort((left, right) => left.localeCompare(right));
  const matchingTitles = titles
    .filter((title) => {
      return (
        unlocked.has(title.titleId) &&
        title.archetypeId === player.archetypeHeading
      );
    })
    .sort((left, right) => {
      const rarityDelta =
        Number(rarityOrderById[right.rarityId ?? ""] ?? 0) -
        Number(rarityOrderById[left.rarityId ?? ""] ?? 0);
      if (rarityDelta !== 0) {
        return rarityDelta;
      }
      return left.titleId.localeCompare(right.titleId);
    });

  let equippedTitleId =
    currentEquippedTitleId && unlocked.has(currentEquippedTitleId)
      ? currentEquippedTitleId
      : null;

  if (matchingTitles.length > 0) {
    equippedTitleId = matchingTitles[0]?.titleId ?? equippedTitleId;
  }

  return {
    equippedTitleId,
    newlyUnlockedTitleIds,
    unlockedTitleIds,
  };
};
