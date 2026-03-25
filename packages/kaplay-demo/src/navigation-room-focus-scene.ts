import type { ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { actionToneFor } from "./action-renderer";
import { resolveKaplayStaticIconSprite } from "./kaplay-static-icons";
import { roomFeatureLabel } from "./navigation-panels";
import { NAV_CENTER_VIEW_TAG } from "./navigation-scene-constants";
import type { RoomPresenceSummary } from "./navigation-scene-types";
import { resolveRoomTileIconId } from "./navigation-visual-language";
import { resolveRoomSceneTheme } from "./theme-tokens";
import {
  drawButtonSurfaceAtom,
  drawKeycapAtom,
  drawMutedTextAtom,
  drawSurfaceAtom,
  drawTextAtom,
} from "./ui/atoms";

export type NavigationCenterViewMode = "map" | "room";

const MAX_FOCUS_ACTIONS = 4;

function drawViewTab(
  k: KAPLAYCtx,
  options: {
    x: number;
    y: number;
    label: string;
    keycap: string;
    selected: boolean;
    onClick: () => void;
  }
): number {
  const width = options.label.length * 7 + 42;
  const button = drawButtonSurfaceAtom(k, {
    x: options.x,
    y: options.y,
    width,
    height: 20,
    tone: options.selected ? "accent" : "neutral",
    enabled: true,
    tag: NAV_CENTER_VIEW_TAG,
  });
  button.onClick(options.onClick);
  drawKeycapAtom(k, {
    x: options.x + 4,
    y: options.y + 2,
    text: options.keycap,
    tone: options.selected ? "accent" : "neutral",
    tag: NAV_CENTER_VIEW_TAG,
  });
  drawTextAtom(k, {
    x: options.x + 28,
    y: options.y + 5,
    text: options.label,
    size: 10,
    tag: NAV_CENTER_VIEW_TAG,
  });
  return width;
}

function resolveRoomSceneSprite(
  roomFeature: string,
  roomPresence: RoomPresenceSummary | null
): string {
  return (
    roomPresence?.bossSprite ??
    roomPresence?.hostileSprite ??
    roomPresence?.dungeoneerSprite ??
    resolveKaplayStaticIconSprite(
      resolveRoomTileIconId({
        feature: roomFeature,
        isBossRoom: (roomPresence?.bossCount ?? 0) > 0,
        isExitTarget: false,
      })
    )
  );
}

export function renderCenterViewTabs(
  k: KAPLAYCtx,
  options: {
    canShowRoomView: boolean;
    onSelectView: (view: NavigationCenterViewMode) => void;
    viewMode: NavigationCenterViewMode;
    x: number;
    y: number;
  }
): void {
  if (!options.canShowRoomView) {
    return;
  }

  let cursorX = options.x + 14;
  cursorX += drawViewTab(k, {
    x: cursorX,
    y: options.y + 10,
    label: "Map",
    keycap: "M",
    selected: options.viewMode === "map",
    onClick: () => options.onSelectView("map"),
  });
  cursorX += 8;
  drawViewTab(k, {
    x: cursorX,
    y: options.y + 10,
    label: "Room",
    keycap: "R",
    selected: options.viewMode === "room",
    onClick: () => options.onSelectView("room"),
  });
}

export function renderRoomFocusScene(
  k: KAPLAYCtx,
  options: {
    feature: string;
    hasMoreRoomActions: boolean;
    height: number;
    onAction: (item: ActionItem) => void;
    onOpenMore: () => void;
    roomActions: ActionItem[];
    roomInfoLines: string[];
    roomPresence: RoomPresenceSummary | null;
    roomTitle: string;
    width: number;
    x: number;
    y: number;
  }
): void {
  const theme = resolveRoomSceneTheme(options.feature);
  const bodyY = options.y + 40;
  const bodyHeight = options.height - 48;
  const visualWellWidth = Math.max(180, Math.floor(options.width * 0.42));
  const visualX = options.x + 16;
  const visualY = bodyY + 18;
  const visualW = visualWellWidth;
  const visualH = Math.max(140, bodyHeight - 36);
  const contentX = visualX + visualW + 18;
  const contentWidth = Math.max(
    160,
    options.width - (contentX - options.x) - 18
  );

  drawSurfaceAtom(
    k,
    options.x,
    bodyY,
    options.width,
    bodyHeight,
    NAV_CENTER_VIEW_TAG,
    {
      bg: theme.embeddedSurface,
      border: theme.divider,
      highlight: theme.frameHighlight,
      shadow: theme.frameShadow,
    }
  );

  drawSurfaceAtom(k, visualX, visualY, visualW, visualH, NAV_CENTER_VIEW_TAG, {
    bg: theme.frameSurface,
    border: theme.divider,
    highlight: theme.frameHighlight,
    shadow: theme.frameShadow,
  });

  const backplateSprite = resolveKaplayStaticIconSprite(
    resolveRoomTileIconId({
      feature: options.feature,
      isBossRoom: (options.roomPresence?.bossCount ?? 0) > 0,
      isExitTarget: false,
    })
  );
  const portraitSprite = resolveRoomSceneSprite(
    options.feature,
    options.roomPresence
  );

  k.add([
    k.sprite(backplateSprite),
    k.pos(visualX + visualW / 2, visualY + visualH / 2),
    k.anchor("center"),
    k.scale(2.4),
    k.opacity(0.14),
    NAV_CENTER_VIEW_TAG,
  ]);

  const portrait = k.add([
    k.sprite(portraitSprite),
    k.pos(visualX + visualW / 2, visualY + visualH / 2 + 8),
    k.anchor("center"),
    k.scale(1.4),
    k.opacity(1),
    NAV_CENTER_VIEW_TAG,
  ]);
  portrait.onUpdate(() => {
    portrait.pos = k.vec2(
      visualX + visualW / 2,
      visualY + visualH / 2 + 8 + Math.sin(k.time() * 3.1) * 2
    );
  });

  drawMutedTextAtom(k, {
    x: contentX,
    y: visualY,
    text: roomFeatureLabel(options.feature),
    size: 10,
    tag: NAV_CENTER_VIEW_TAG,
  });
  drawTextAtom(k, {
    x: contentX,
    y: visualY + 18,
    text: options.roomTitle,
    size: 14,
    width: contentWidth,
    tag: NAV_CENTER_VIEW_TAG,
  });

  let lineY = visualY + 46;
  for (const line of options.roomInfoLines) {
    drawTextAtom(k, {
      x: contentX,
      y: lineY,
      text: line,
      size: 10,
      width: contentWidth,
      tag: NAV_CENTER_VIEW_TAG,
    });
    lineY += 18;
  }

  drawMutedTextAtom(k, {
    x: contentX,
    y: visualY + 110,
    text: "Room Actions",
    size: 10,
    tag: NAV_CENTER_VIEW_TAG,
  });

  const visibleActions = options.roomActions.slice(0, MAX_FOCUS_ACTIONS);
  let buttonY = visualY + 130;
  for (const [index, item] of visibleActions.entries()) {
    const button = drawButtonSurfaceAtom(k, {
      x: contentX,
      y: buttonY,
      width: contentWidth,
      height: 24,
      tone: actionToneFor(item),
      enabled: item.available,
      tag: NAV_CENTER_VIEW_TAG,
    });
    button.onClick(() => options.onAction(item));
    drawKeycapAtom(k, {
      x: contentX + 5,
      y: buttonY + 3,
      text: String(index + 1),
      tone: actionToneFor(item),
      tag: NAV_CENTER_VIEW_TAG,
    });
    drawTextAtom(k, {
      x: contentX + 36,
      y: buttonY + 6,
      text: item.label,
      size: 10,
      width: contentWidth - 42,
      tag: NAV_CENTER_VIEW_TAG,
    });
    buttonY += 28;
  }

  if (visibleActions.length === 0) {
    drawMutedTextAtom(k, {
      x: contentX,
      y: buttonY,
      text: "No room action is available here right now.",
      size: 10,
      width: contentWidth,
      tag: NAV_CENTER_VIEW_TAG,
    });
  } else if (options.hasMoreRoomActions) {
    const moreButton = drawButtonSurfaceAtom(k, {
      x: contentX,
      y: buttonY,
      width: contentWidth,
      height: 22,
      tone: "neutral",
      enabled: true,
      tag: NAV_CENTER_VIEW_TAG,
    });
    moreButton.onClick(options.onOpenMore);
    drawKeycapAtom(k, {
      x: contentX + 5,
      y: buttonY + 2,
      text: "0",
      tone: "neutral",
      tag: NAV_CENTER_VIEW_TAG,
    });
    drawTextAtom(k, {
      x: contentX + 36,
      y: buttonY + 5,
      text: "More room actions",
      size: 10,
      width: contentWidth - 42,
      tag: NAV_CENTER_VIEW_TAG,
    });
  }
}
