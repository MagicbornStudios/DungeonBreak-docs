import type { ActionAvailability, GameEvent, TurnResult } from "../core/types";
import type { GameEngine } from "../engine/game";
import type {
  ActionGroup,
  ActionItem,
  CutsceneMessage,
  FeedMessage,
} from "../ui/types";
import {
  buildInitialFeedLines,
  defaultCutsceneTitle,
  feedToneForEvent,
  formatDialogueChoiceLabel,
  formatEventFeedText,
  formatWarningFeedText,
  getActionGroupMeta,
  getSpeakIntentText,
  getSystemActionDefinitions,
  getUtilityGroupMeta,
} from "./presenter-content";

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const pushItem = (
  groups: Map<string, ActionGroup>,
  groupId: string,
  title: string,
  item: ActionItem
): void => {
  const existing = groups.get(groupId);
  if (existing) {
    existing.items.push(item);
    return;
  }
  groups.set(groupId, { id: groupId, title, items: [item] });
};

const actionId = (row: ActionAvailability, suffix = ""): string => {
  const parts = [row.actionType, slug(row.label), suffix].filter(Boolean);
  return `action-${parts.join("-")}`;
};

const pushSystemActionItems = (groups: Map<string, ActionGroup>): void => {
  const utilityGroup = getUtilityGroupMeta();
  for (const definition of getSystemActionDefinitions()) {
    pushItem(groups, utilityGroup.id, utilityGroup.title, {
      id: `action-${slug(definition.label)}`,
      label: definition.label,
      available: true,
      blockedReasons: [],
      action: { kind: "system", systemAction: definition.action },
    });
  }
};

const mapActionRows = (rows: ActionAvailability[]): ActionGroup[] => {
  const groups = new Map<string, ActionGroup>();

  pushSystemActionItems(groups);

  for (const row of rows) {
    const meta = getActionGroupMeta(row.actionType);

    if (row.actionType === "choose_dialogue") {
      const options = (
        (row.payload.options as
          | Array<{ optionId: string; label: string }>
          | undefined) ?? []
      ).filter((option) => option.optionId);
      for (const option of options) {
        pushItem(groups, meta.id, meta.title, {
          id: `action-dialogue-${slug(option.optionId)}`,
          label: formatDialogueChoiceLabel(option.label),
          available: row.available,
          blockedReasons: [...row.blockedReasons],
          uiIntent: row.uiIntent,
          uiScreen: row.uiScreen,
          uiPriority: row.uiPriority,
          action: {
            kind: "player",
            playerAction: {
              actionType: "choose_dialogue",
              payload: { optionId: option.optionId },
            },
          },
        });
      }
      continue;
    }

    const payload = { ...row.payload };
    if (row.actionType === "speak") {
      payload.intentText = getSpeakIntentText();
    }

    pushItem(groups, meta.id, meta.title, {
      id: actionId(row, String(payload.direction ?? payload.skillId ?? "")),
      label: row.label,
      available: row.available,
      blockedReasons: [...row.blockedReasons],
      uiIntent: row.uiIntent,
      uiScreen: row.uiScreen,
      uiPriority: row.uiPriority,
      action: {
        kind: "player",
        playerAction: {
          actionType: row.actionType,
          payload,
        },
      },
    });
  }

  const sortedGroups = [...groups.values()];
  for (const group of sortedGroups) {
    group.items.sort((a, b) => {
      const pA = Number(a.uiPriority ?? 999);
      const pB = Number(b.uiPriority ?? 999);
      if (pA !== pB) {
        return pA - pB;
      }
      return a.label.localeCompare(b.label);
    });
  }
  return sortedGroups;
};

const eventToMessage = (event: GameEvent): FeedMessage => ({
  id: `event-${event.turnIndex}-${slug(event.actorId)}-${slug(event.actionType)}`,
  tone: feedToneForEvent(event),
  turnIndex: event.turnIndex,
  text: formatEventFeedText(event),
});

const warningToMessage = (event: GameEvent, index: number): FeedMessage => ({
  id: `event-${event.turnIndex}-${slug(event.actorId)}-warning-${index}`,
  tone: "warning",
  turnIndex: event.turnIndex,
  text: formatWarningFeedText(event, event.warnings[index]),
});

export const buildActionGroups = (engine: GameEngine): ActionGroup[] => {
  const rows = engine.availableActions();
  return mapActionRows(rows);
};

export const initialFeed = (engine: GameEngine): FeedMessage[] => {
  return buildInitialFeedLines(engine.look()).map((text, index) => ({
    id: `boot-${index + 1}`,
    tone: "system",
    text,
  }));
};

export const toFeedMessages = (turn: TurnResult): FeedMessage[] => {
  const messages: FeedMessage[] = [];
  for (const event of turn.events) {
    messages.push(eventToMessage(event));
    for (let index = 0; index < event.warnings.length; index += 1) {
      messages.push(warningToMessage(event, index));
    }
  }
  return messages;
};

export const extractCutsceneQueue = (turn: TurnResult): CutsceneMessage[] => {
  const queue: CutsceneMessage[] = [];
  for (const event of turn.events) {
    if (event.actionType !== "cutscene") {
      continue;
    }
    const marker = event.message.indexOf(":");
    const title =
      marker > -1
        ? event.message.slice(0, marker).trim()
        : defaultCutsceneTitle();
    const text =
      marker > -1 ? event.message.slice(marker + 1).trim() : event.message;
    queue.push({
      id: `cutscene-${event.turnIndex}-${slug(title)}`,
      title,
      text,
      turnIndex: event.turnIndex,
    });
  }
  return queue;
};
