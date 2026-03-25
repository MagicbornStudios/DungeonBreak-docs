import { ACTION_TYPE, type ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { actionGlyphFor } from "./action-renderer";
import { escapeKaplayStyledText } from "./escape-kaplay-tags";
import { gameplayFeedSnapshot } from "./feed-lines";
import { roomFeatureLabel } from "./navigation-panels";
import {
  NAV_ACTIONS_BUTTON_TAG,
  NAV_ROOMFIND_TAG,
  NAV_ROOMINFO_BUTTON_TAG,
  NAV_ROOMINFO_TEXT_TAG,
  VISIBLE_GLOBAL_ACTION_LIMIT,
  VISIBLE_ROOM_ACTION_LIMIT,
} from "./navigation-scene-constants";
import {
  applyRoomInfoBadge,
  createActionPanelTextNodes,
  createPersistentButtonSlot,
  createRoomInfoTextNodes,
  renderRoomFindOverlay,
  updatePersistentButtonSlot,
} from "./navigation-scene-rendering";
import type {
  ActionPanelTextNodes,
  PersistentButtonSlot,
  RoomInfoTextNodes,
  RoomPresenceSummary,
} from "./navigation-scene-types";
import {
  resolvePortraitStyle,
  resolvePresenceVisualKind,
} from "./navigation-visual-language";
import { clearUiTag } from "./shared";
import { drawMutedTextAtom, drawTextAtom } from "./ui/atoms";

function actionBadgeLabel(item: ActionItem): string {
  return actionGlyphFor(item).replace("[", "").replace("]", "");
}

function playerActionType(item: ActionItem): string | null {
  if (item.action.kind !== "player") {
    return null;
  }
  return item.action.playerAction.actionType;
}

function titleCaseWords(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function navigationActionBadgeLabel(item: ActionItem): string {
  const actionType = playerActionType(item);
  if (actionType === "whistle") {
    return "V";
  }
  if (actionType === "live_stream") {
    return "X";
  }
  return actionBadgeLabel(item);
}

function navigationActionLabel(item: ActionItem): string {
  const actionType = playerActionType(item);
  if (actionType === "whistle") {
    return titleCaseWords(item.label);
  }
  if (actionType === "live_stream") {
    return titleCaseWords(item.label);
  }
  return titleCaseWords(item.label);
}

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
    onConfirmMove: () => void;
    onOpenMore: () => void;
    selectedExit: {
      direction: "north" | "south" | "west" | "east";
      feature: string;
      roomId: string;
    } | null;
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
      : Array.from({ length: VISIBLE_GLOBAL_ACTION_LIMIT + 2 }, (_, index) => {
          return createPersistentButtonSlot(
            k,
            options.x + 12,
            options.y + 28 + index * 24,
            options.width - 16,
            NAV_ACTIONS_BUTTON_TAG
          );
        });

  actionPanelTextNodes.title.text = escapeKaplayStyledText("Navigation");
  actionPanelTextNodes.emptyLabel.text = escapeKaplayStyledText(
    options.selectedExit || options.globalActions.length > 0
      ? ""
      : "No route or global action is available here."
  );
  actionPanelTextNodes.emptyLabel.opacity =
    options.selectedExit || options.globalActions.length > 0 ? 0 : 1;

  if (options.actionKey === state.lastActionRenderKey) {
    return {
      actionPanelTextNodes,
      globalActionSlots,
      lastActionRenderKey: state.lastActionRenderKey,
    };
  }

  for (const [index, slot] of globalActionSlots.entries()) {
    if (options.selectedExit && index === 0) {
      updatePersistentButtonSlot(k, slot, {
        badgeLabel: "SPACE",
        label: `Move To ${roomFeatureLabel(options.selectedExit.feature)}`,
        enabled: true,
        tone: "accent",
        visible: true,
        onClick: options.onConfirmMove,
      });
      continue;
    }
    const actionIndex = options.selectedExit ? index - 1 : index;
    const item = options.globalActions[actionIndex] ?? null;
    const isMoreSlot =
      actionIndex === options.globalActions.length &&
      options.hasMoreGlobalActions;
    if (item) {
      updatePersistentButtonSlot(k, slot, {
        badgeLabel: navigationActionBadgeLabel(item),
        label: navigationActionLabel(item),
        enabled: item.available,
        tone: "neutral",
        visible: true,
        onClick: () => options.onAction(item),
      });
      continue;
    }
    if (isMoreSlot) {
      updatePersistentButtonSlot(k, slot, {
        badgeLabel: "MORE",
        label: "More",
        enabled: true,
        tone: "neutral",
        visible: true,
        onClick: options.onOpenMore,
      });
      continue;
    }
    updatePersistentButtonSlot(k, slot, {
      badgeLabel: null,
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

export function renderGameplayFeedPanel(
  k: KAPLAYCtx,
  options: {
    feedLines: string[];
    roomInfoKey: string;
    width: number;
    x: number;
    y: number;
  }
): string {
  clearUiTag(k, NAV_ROOMINFO_TEXT_TAG);
  const formattedLines = gameplayFeedSnapshot(options.feedLines, 6);

  drawTextAtom(k, {
    x: options.x + 14,
    y: options.y + 10,
    text: "Live Feed",
    size: 12,
    tag: NAV_ROOMINFO_TEXT_TAG,
  });
  drawMutedTextAtom(k, {
    x: options.x + 14,
    y: options.y + 26,
    text: "System, live, player, boss, and entity events",
    size: 10,
    width: options.width - 28,
    tag: NAV_ROOMINFO_TEXT_TAG,
  });

  if (formattedLines.length === 0) {
    drawMutedTextAtom(k, {
      x: options.x + 14,
      y: options.y + 52,
      text: "No gameplay events yet.",
      size: 11,
      width: options.width - 28,
      tag: NAV_ROOMINFO_TEXT_TAG,
    });
    return options.roomInfoKey;
  }

  let lineY = options.y + 50;
  for (const line of formattedLines) {
    drawTextAtom(k, {
      x: options.x + 14,
      y: lineY,
      text: line.displayText,
      size: 11,
      width: options.width - 28,
      color: line.color,
      tag: NAV_ROOMINFO_TEXT_TAG,
    });
    lineY += 19;
  }
  return options.roomInfoKey;
}

export function renderRoomInfoPanel(
  k: KAPLAYCtx,
  state: RoomInfoPanelState,
  options: {
    allowRuneForgeShortcut: boolean;
    hasMoreRoomActions: boolean;
    isBossRoom: boolean;
    isExitTarget: boolean;
    onAction: (item: ActionItem) => void;
    onOpenMore: () => void;
    onOpenRuneCodex: () => void;
    roomFeature: string;
    roomInfoKey: string;
    roomInfoLines: string[];
    roomPresence: RoomPresenceSummary | null;
    roomTitle: string;
    visibleRoomActions: ActionItem[];
    width: number;
    x: number;
    y: number;
  }
): RoomInfoPanelState {
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
          let actionY = options.y + 138;
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

  if (
    options.roomInfoKey === state.lastRoomInfoRenderKey &&
    state.roomInfoTextNodes
  ) {
    return {
      lastRoomInfoRenderKey: state.lastRoomInfoRenderKey,
      roomActionSlots,
      roomInfoTextNodes: state.roomInfoTextNodes,
    };
  }

  clearUiTag(k, NAV_ROOMINFO_TEXT_TAG);
  const portraitSpriteName =
    options.roomPresence?.bossSprite ??
    options.roomPresence?.hostileSprite ??
    options.roomPresence?.dungeoneerSprite ??
    null;
  const portraitKind = resolvePresenceVisualKind({
    bossCount: options.roomPresence?.bossCount ?? 0,
    hostileCount: options.roomPresence?.hostileCount ?? 0,
    dungeoneerCount: options.roomPresence?.dungeoneerCount ?? 0,
  });
  const portraitStyle = resolvePortraitStyle(portraitKind);
  const roomInfoTextNodes = createRoomInfoTextNodes(
    k,
    options.x,
    options.y,
    options.width,
    {
      portraitSpriteName,
      portraitFallbackFeature: options.roomFeature,
      isBossRoom: options.isBossRoom,
      isExitTarget: options.isExitTarget,
      portraitEyebrow: portraitStyle.eyebrow,
      portraitFrameColor: portraitStyle.frameColor,
      portraitPlateColor: portraitStyle.plateColor,
      portraitShadowColor: portraitStyle.shadowColor,
      portraitScale: portraitStyle.portraitScale,
      portraitOffsetX: portraitStyle.portraitOffsetX,
      portraitOffsetY: portraitStyle.portraitOffsetY,
      sceneBackplateOpacity: portraitStyle.sceneBackplateOpacity,
    }
  );

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

  for (const [index, slot] of roomActionSlots.entries()) {
    if (options.allowRuneForgeShortcut && index === 0) {
      updatePersistentButtonSlot(k, slot, {
        badgeLabel: "R",
        label: "Rune Codex",
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
        badgeLabel: actionBadgeLabel(item),
        label: item.label,
        enabled: item.available,
        tone: "neutral",
        visible: true,
        onClick: () => options.onAction(item),
      });
      continue;
    }
    if (isMoreSlot) {
      updatePersistentButtonSlot(k, slot, {
        badgeLabel: "MORE",
        label: "More",
        enabled: true,
        tone: "neutral",
        visible: true,
        onClick: options.onOpenMore,
      });
      continue;
    }
    updatePersistentButtonSlot(k, slot, {
      badgeLabel: null,
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

export function shouldRuneForgeSceneJump(_item: ActionItem): boolean {
  return false;
}

export function isTalkAction(item: ActionItem): boolean {
  return (
    item.action.kind === "player" &&
    item.action.playerAction.actionType === ACTION_TYPE.TALK
  );
}
