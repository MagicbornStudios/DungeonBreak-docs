import { DIALOGUE_PRESENTER_STRINGS } from "../contracts";
import type { ActionAvailability, GameEvent } from "../core/types";
import type { FeedMessage, SystemAction } from "./types";

interface ActionGroupMeta {
  id: string;
  title: string;
}

const ACTION_GROUP_FALLBACKS: Record<string, string> = {
  movement: "Movement",
  room: "Room Actions",
  dialogue: "Dialogue",
  conflict: "Social and Combat",
  inventory: "Inventory",
  "rune-forge": "Rune Forge",
  special: "Special",
  utility: "Utility",
};

const ACTION_TYPE_TO_GROUP_ID: Partial<
  Record<ActionAvailability["actionType"], string>
> = {
  move: "movement",
  whistle: "utility",
  train: "room",
  rest: "room",
  search: "room",
  talk: "dialogue",
  choose_dialogue: "dialogue",
  fight: "conflict",
  flee: "conflict",
  steal: "conflict",
  recruit: "conflict",
  murder: "conflict",
  use_item: "inventory",
  equip_item: "inventory",
  drop_item: "inventory",
  buy_item: "inventory",
  sell_item: "inventory",
  purchase: "rune-forge",
  re_equip: "rune-forge",
};

const SYSTEM_ACTION_ORDER: SystemAction[] = [
  "look",
  "status",
  "save_slot",
  "load_slot",
];

const formatTemplate = (
  template: string,
  values: Record<string, string | number | undefined>
): string => {
  return template.replaceAll(/\{([^}]+)\}/g, (_match, key: string) => {
    const value = values[key];
    return value === undefined ? "" : String(value);
  });
};

const resolveActionGroupTitle = (groupId: string): string => {
  return (
    DIALOGUE_PRESENTER_STRINGS.actionGroupTitles[groupId] ??
    ACTION_GROUP_FALLBACKS[groupId] ??
    groupId
  );
};

export const getActionGroupMeta = (
  actionType: ActionAvailability["actionType"]
): ActionGroupMeta => {
  const groupId = ACTION_TYPE_TO_GROUP_ID[actionType] ?? "special";
  return {
    id: groupId,
    title: resolveActionGroupTitle(groupId),
  };
};

export const getUtilityGroupMeta = (): ActionGroupMeta => ({
  id: "utility",
  title: resolveActionGroupTitle("utility"),
});

export const getSystemActionDefinitions = (): Array<{
  action: SystemAction;
  label: string;
}> => {
  return SYSTEM_ACTION_ORDER.map((action) => ({
    action,
    label: DIALOGUE_PRESENTER_STRINGS.systemActionLabels[action] ?? action,
  }));
};

export const formatDialogueChoiceLabel = (label: string): string => {
  return formatTemplate(DIALOGUE_PRESENTER_STRINGS.templates.dialogueChoose, {
    label,
  });
};

export const getSpeakIntentText = (): string => {
  return DIALOGUE_PRESENTER_STRINGS.defaults.speakIntentText;
};

export const buildInitialFeedLines = (look: string): string[] => {
  const lines = [
    DIALOGUE_PRESENTER_STRINGS.initialFeed["boot-1"],
    DIALOGUE_PRESENTER_STRINGS.initialFeed["boot-2"],
  ].filter((line) => line.length > 0);
  const prefix = DIALOGUE_PRESENTER_STRINGS.initialFeed["boot-3Prefix"].trim();
  const suffix = DIALOGUE_PRESENTER_STRINGS.initialFeed["boot-3Suffix"].trim();
  const lookLine = [prefix, look, suffix]
    .filter((part) => part.length > 0)
    .join(" ")
    .trim();
  if (lookLine.length > 0) {
    lines.push(lookLine);
  }
  return lines;
};

export const formatEventFeedText = (event: GameEvent): string => {
  return formatTemplate(DIALOGUE_PRESENTER_STRINGS.templates.eventLine, {
    turnIndex: event.turnIndex,
    actorName: event.actorName,
    actionType: event.actionType,
    roomId: event.roomId,
    message: event.message,
  });
};

export const formatWarningFeedText = (
  event: GameEvent,
  warning: string
): string => {
  return formatTemplate(DIALOGUE_PRESENTER_STRINGS.templates.warningLine, {
    turnIndex: event.turnIndex,
    warning,
  });
};

export const defaultCutsceneTitle = (): string => {
  return DIALOGUE_PRESENTER_STRINGS.defaults.cutsceneTitle;
};

export const feedToneForEvent = (event: GameEvent): FeedMessage["tone"] => {
  if (event.actionType === "cutscene") {
    return "cutscene";
  }
  if (event.warnings.length > 0) {
    return "warning";
  }
  return event.actorId === "kael" ? "player" : "event";
};
