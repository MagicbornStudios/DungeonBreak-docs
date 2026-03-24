import { ACTION_TYPE, type ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { formatActionButtonLabel } from "./action-renderer";
import { escapeKaplayStyledText } from "./escape-kaplay-tags";
import { roomFeatureLabel } from "./navigation-panels";
import {
  createActionPanelTextNodes,
  createPersistentButtonSlot,
  createRoomInfoTextNodes,
  renderRoomFindOverlay,
  updatePersistentButtonSlot,
  applyRoomInfoBadge,
} from "./navigation-scene-rendering";
import {
  NAV_ACTIONS_BUTTON_TAG,
  NAV_ROOMFIND_TAG,
  NAV_ROOMINFO_BUTTON_TAG,
  VISIBLE_GLOBAL_ACTION_LIMIT,
  VISIBLE_ROOM_ACTION_LIMIT,
} from "./navigation-scene-constants";
import type {
  ActionPanelTextNodes,
  PersistentButtonSlot,
  RoomInfoTextNodes,
} from "./navigation-scene-types";

export interface ActionPanelState {
  actionPanelTextNodes: ActionPanelTextNodes | null;
  globalActionSlots: PersistentButtonSlot[];
  lastActionRenderKey: string;
}

export interface RoomInfoPanelState {
  lastRoomInfoRenderKey: string;
  roomActionSlots: PersistentButtonSlot[];
  roomInfoTextNodes: RoomInfoTextNodes | null;
}

export function renderActionsPanel(
  k: KAPLAYCtx,
  state: ActionPanelState,
  options: {
    actionKey: string;
    globalActions: ActionItem[];
    hasMoreGlobalActions: boolean;
    onAction: (item: ActionItem) => void;
    onOpenMore: () => void;
    width: number;
    x: number;
    y: number;
  }
): ActionPanelState {
  const actionPanelTextNodes =
    state.actionPanelTextNodes ??
    createActionPanelTextNodes(k, options.x, options.y, options.width);
  const globalActionSlots =
    state.globalActionSlots.length > 0
      ? state.globalActionSlots
      : Array.from({ length: VISIBLE_GLOBAL_ACTION_LIMIT + 1 }, (_, index) => {
          return createPersistentButtonSlot(
            k,
            options.x + 12,
            options.y + 28 + index * 24,
            options.width - 16,
            NAV_ACTIONS_BUTTON_TAG
          );
        });

  actionPanelTextNodes.emptyLabel.text = escapeKaplayStyledText(
    options.globalActions.length > 0 ? "" : "No global actions here."
  );
  actionPanelTextNodes.emptyLabel.opacity =
    options.globalActions.length > 0 ? 0 : 1;

  if (options.actionKey === state.lastActionRenderKey) {
    return {
      actionPanelTextNodes,
      globalActionSlots,
      lastActionRenderKey: state.lastActionRenderKey,
    };
  }

  for (const [index, slot] of globalActionSlots.entries()) {
    const item = options.globalActions[index] ?? null;
    const isMoreSlot =
      index === options.globalActions.length && options.hasMoreGlobalActions;
    if (item) {
      updatePersistentButtonSlot(k, slot, {
        label: formatActionButtonLabel(item),
        enabled: item.available,
        tone: "neutral",
        visible: true,
        onClick: () => options.onAction(item),
      });
      continue;
    }
    if (isMoreSlot) {
      updatePersistentButtonSlot(k, slot, {
        label: "[MORE] More",
        enabled: true,
        tone: "neutral",
        visible: true,
        onClick: options.onOpenMore,
      });
      continue;
    }
    updatePersistentButtonSlot(k, slot, {
      label: "",
      enabled: false,
      tone: "neutral",
      visible: false,
      onClick: null,
    });
  }

  return {
    actionPanelTextNodes,
    globalActionSlots,
    lastActionRenderKey: options.actionKey,
  };
}

export function renderRoomInfoPanel(
  k: KAPLAYCtx,
  state: RoomInfoPanelState,
  options: {
    allowRuneForgeShortcut: boolean;
    hasMoreRoomActions: boolean;
    onAction: (item: ActionItem) => void;
    onOpenMore: () => void;
    onOpenRuneCodex: () => void;
    roomFeature: string;
    roomInfoKey: string;
    roomInfoLines: string[];
    roomTitle: string;
    visibleRoomActions: ActionItem[];
    width: number;
    x: number;
    y: number;
  }
): RoomInfoPanelState {
  const roomInfoTextNodes =
    state.roomInfoTextNodes ??
    createRoomInfoTextNodes(k, options.x, options.y, options.width);

  const roomActionSlots =
    state.roomActionSlots.length > 0
      ? state.roomActionSlots
      : (() => {
          const slotWidth = Math.max(
            112,
            Math.min(
              136,
              Math.floor(
                (options.width - 28 - (VISIBLE_ROOM_ACTION_LIMIT - 1) * 10) /
                  VISIBLE_ROOM_ACTION_LIMIT
              )
            )
          );
          let actionX = options.x + 14;
          let actionY = options.y + 112;
          return Array.from({ length: VISIBLE_ROOM_ACTION_LIMIT + 1 }, () => {
            const slot = createPersistentButtonSlot(
              k,
              actionX,
              actionY,
              slotWidth,
              NAV_ROOMINFO_BUTTON_TAG
            );
            actionX += slotWidth + 10;
            if (actionX + slotWidth > options.x + options.width - 14) {
              actionX = options.x + 14;
              actionY += 44;
            }
            return slot;
          });
        })();

  applyRoomInfoBadge(k, roomInfoTextNodes, options.roomFeature);
  roomInfoTextNodes.title.text = escapeKaplayStyledText(options.roomTitle);
  roomInfoTextNodes.subtitle.text = escapeKaplayStyledText(
    roomFeatureLabel(options.roomFeature)
  );
  for (const [index, lineNode] of roomInfoTextNodes.lines.entries()) {
    lineNode.text = escapeKaplayStyledText(options.roomInfoLines[index] ?? "");
  }
  roomInfoTextNodes.actionsLabel.opacity =
    options.allowRuneForgeShortcut || options.visibleRoomActions.length > 0
      ? 1
      : 0;

  if (options.roomInfoKey === state.lastRoomInfoRenderKey) {
    return {
      lastRoomInfoRenderKey: state.lastRoomInfoRenderKey,
      roomActionSlots,
      roomInfoTextNodes,
    };
  }

  for (const [index, slot] of roomActionSlots.entries()) {
    if (options.allowRuneForgeShortcut && index === 0) {
      updatePersistentButtonSlot(k, slot, {
        label: "[R] Rune Codex",
        enabled: true,
        tone: "accent",
        visible: true,
        onClick: options.onOpenRuneCodex,
      });
      continue;
    }
    const actionIndex = options.allowRuneForgeShortcut ? index - 1 : index;
    const item = options.visibleRoomActions[actionIndex] ?? null;
    const isMoreSlot =
      actionIndex === options.visibleRoomActions.length &&
      options.hasMoreRoomActions;
    if (item) {
      updatePersistentButtonSlot(k, slot, {
        label: formatActionButtonLabel(item),
        enabled: item.available,
        tone: "neutral",
        visible: true,
        onClick: () => options.onAction(item),
      });
      continue;
    }
    if (isMoreSlot) {
      updatePersistentButtonSlot(k, slot, {
        label: "[MORE] More",
        enabled: true,
        tone: "neutral",
        visible: true,
        onClick: options.onOpenMore,
      });
      continue;
    }
    updatePersistentButtonSlot(k, slot, {
      label: "",
      enabled: false,
      tone: "neutral",
      visible: false,
      onClick: null,
    });
  }

  return {
    lastRoomInfoRenderKey: options.roomInfoKey,
    roomActionSlots,
    roomInfoTextNodes,
  };
}

export function renderRoomFindPanel(
  k: KAPLAYCtx,
  options: {
    centerPanelW: number;
    centerPanelX: number;
    centerPanelY: number;
    lastRoomFindRenderKey: string | null;
    roomFindText: string | null;
  }
): string | null {
  const nextKey = options.roomFindText ?? null;
  if (nextKey === options.lastRoomFindRenderKey) {
    return options.lastRoomFindRenderKey;
  }
  if (options.roomFindText) {
    renderRoomFindOverlay(k, {
      x: options.centerPanelX,
      y: options.centerPanelY,
      width: options.centerPanelW,
      text: options.roomFindText,
      tag: NAV_ROOMFIND_TAG,
    });
  }
  return nextKey;
}

export function shouldRuneForgeSceneJump(item: ActionItem): boolean {
  if (item.action.kind !== "player") {
    return false;
  }
  const actionType = item.action.playerAction.actionType;
  return (
    actionType === ACTION_TYPE.EVOLVE_SKILL ||
    actionType === "purchase" ||
    actionType === "re_equip"
  );
}

export function isTalkAction(item: ActionItem): boolean {
  return (
    item.action.kind === "player" &&
    item.action.playerAction.actionType === ACTION_TYPE.TALK
  );
}
