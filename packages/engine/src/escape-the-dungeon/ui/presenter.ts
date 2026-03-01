import type { ActionAvailability, GameEvent, TurnResult } from "../core/types";
import type { GameEngine } from "../engine/game";
import type { ActionGroup, ActionItem, CutsceneMessage, FeedMessage } from "../ui/types";

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const pushItem = (
  groups: Map<string, ActionGroup>,
  groupId: string,
  title: string,
  item: ActionItem,
): void => {
  const existing = groups.get(groupId);
  if (existing) {
    existing.items.push(item);
    return;
  }
  groups.set(groupId, { id: groupId, title, items: [item] });
};

const groupMetaForActionType = (actionType: ActionAvailability["actionType"]): { id: string; title: string } => {
  if (actionType === "move") {
    return { id: "movement", title: "Movement" };
  }
  if (["train", "rest", "search"].includes(actionType)) {
    return { id: "room", title: "Room Actions" };
  }
  if (["talk", "choose_dialogue"].includes(actionType)) {
    return { id: "dialogue", title: "Dialogue" };
  }
  if (["fight", "flee", "steal", "recruit", "murder"].includes(actionType)) {
    return { id: "conflict", title: "Social and Combat" };
  }
  if (["use_item", "equip_item", "drop_item"].includes(actionType)) {
    return { id: "inventory", title: "Inventory" };
  }
  return { id: "special", title: "Special" };
};

const actionId = (row: ActionAvailability, suffix = ""): string => {
  const parts = [row.actionType, slug(row.label), suffix].filter(Boolean);
  return `action-${parts.join("-")}`;
};

const mapActionRows = (rows: ActionAvailability[]): ActionGroup[] => {
  const groups = new Map<string, ActionGroup>();

  pushItem(groups, "utility", "Quick View", {
    id: "action-look-around",
    label: "Look Around",
    available: true,
    blockedReasons: [],
    action: { kind: "system", systemAction: "look" },
  });

  pushItem(groups, "utility", "Quick View", {
    id: "action-refresh-status",
    label: "Refresh Status",
    available: true,
    blockedReasons: [],
    action: { kind: "system", systemAction: "status" },
  });

  pushItem(groups, "utility", "Quick View", {
    id: "action-save-slot-a",
    label: "Save Slot A",
    available: true,
    blockedReasons: [],
    action: { kind: "system", systemAction: "save_slot" },
  });

  pushItem(groups, "utility", "Quick View", {
    id: "action-load-slot-a",
    label: "Load Slot A",
    available: true,
    blockedReasons: [],
    action: { kind: "system", systemAction: "load_slot" },
  });

  for (const row of rows) {
    const meta = groupMetaForActionType(row.actionType);

    if (row.actionType === "choose_dialogue") {
      const options =
        ((row.payload.options as Array<{ optionId: string; label: string }> | undefined) ?? []).filter(
          (option) => option.optionId,
        );
      for (const option of options) {
        pushItem(groups, meta.id, meta.title, {
          id: `action-dialogue-${slug(option.optionId)}`,
          label: `Choose: ${option.label}`,
          available: row.available,
          blockedReasons: [...row.blockedReasons],
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
      payload.intentText = "I will survive this floor.";
    }

    pushItem(groups, meta.id, meta.title, {
      id: actionId(row, String(payload.direction ?? payload.skillId ?? "")),
      label: row.label,
      available: row.available,
      blockedReasons: [...row.blockedReasons],
      action: {
        kind: "player",
        playerAction: {
          actionType: row.actionType,
          payload,
        },
      },
    });
  }

  return [...groups.values()];
};

const toFeedTone = (event: GameEvent): FeedMessage["tone"] => {
  if (event.actionType === "cutscene") {
    return "cutscene";
  }
  if (event.warnings.length > 0) {
    return "warning";
  }
  return event.actorId === "kael" ? "player" : "event";
};

const eventToMessage = (event: GameEvent): FeedMessage => ({
  id: `event-${event.turnIndex}-${slug(event.actorId)}-${slug(event.actionType)}`,
  tone: toFeedTone(event),
  turnIndex: event.turnIndex,
  text: `[t${event.turnIndex}] ${event.actorName} ${event.actionType}@${event.roomId}: ${event.message}`,
});

const warningToMessage = (event: GameEvent, index: number): FeedMessage => ({
  id: `event-${event.turnIndex}-${slug(event.actorId)}-warning-${index}`,
  tone: "warning",
  turnIndex: event.turnIndex,
  text: `[t${event.turnIndex}] warning: ${event.warnings[index]}`,
});

export const buildActionGroups = (engine: GameEngine): ActionGroup[] => {
  const rows = engine.availableActions();
  return mapActionRows(rows);
};

export const initialFeed = (engine: GameEngine): FeedMessage[] => {
  return [
    {
      id: "boot-1",
      tone: "system",
      text: "Escape the Dungeon loaded. Click actions in the left column to take turns.",
    },
    {
      id: "boot-2",
      tone: "system",
      text: engine.look(),
    },
  ];
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
    const title = marker > -1 ? event.message.slice(0, marker).trim() : "Cutscene";
    const text = marker > -1 ? event.message.slice(marker + 1).trim() : event.message;
    queue.push({
      id: `cutscene-${event.turnIndex}-${slug(title)}`,
      title,
      text,
      turnIndex: event.turnIndex,
    });
  }
  return queue;
};
