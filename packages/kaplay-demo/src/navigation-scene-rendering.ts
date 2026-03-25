import type { KAPLAYCtx } from "kaplay";
import { escapeKaplayStyledText } from "./escape-kaplay-tags";
import { resolveKaplayStaticIconSprite } from "./kaplay-static-icons";
import {
  FLOOR_TILE_H,
  FLOOR_TILE_W,
  NAV_ACTIONS_TEXT_TAG,
  NAV_ROOMINFO_TEXT_TAG,
} from "./navigation-scene-constants";
import { featureBadge, roomTilePosition } from "./navigation-scene-helpers";
import type {
  ActionPanelTextNodes,
  BoardRenderOptions,
  ColorableNode,
  DrawEmbeddedAreaOptions,
  FloatingMarkerNodes,
  PersistentButtonSlot,
  PersistentButtonSlotState,
  PositionableNode,
  RoomDecorationNodes,
  RoomDecorationOptions,
  RoomFindOverlayOptions,
  RoomInfoTextNodes,
  RoomPortraitOptions,
  TextDecorationNode,
} from "./navigation-scene-types";
import { resolveRoomTileIconId } from "./navigation-visual-language";
import { tonePalette, UI_FONT_FAMILY } from "./theme-tokens";
import {
  drawButtonSurfaceAtom,
  drawMutedTextAtom,
  drawSurfaceAtom,
  drawTextAtom,
} from "./ui/atoms";

export function drawEmbeddedArea(
  k: KAPLAYCtx,
  options: DrawEmbeddedAreaOptions
): void {
  k.add([
    k.rect(options.width, options.height, { radius: 6 }),
    k.pos(options.x, options.y),
    k.color(options.color[0], options.color[1], options.color[2]),
    k.opacity(options.opacity ?? 1),
    options.tag,
  ]);
}

export function renderFloorMapBase(
  k: KAPLAYCtx,
  options: BoardRenderOptions
): void {
  for (const room of options.rooms) {
    const { x: tileX, y: tileY } = roomTilePosition(options.x, options.y, room);

    k.add([
      k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
      k.pos(tileX + 3, tileY + 8),
      k.color(22, 16, 18),
      options.tag,
    ]);
    k.add([
      k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
      k.pos(tileX, tileY),
      k.color(42, 31, 34),
      options.tag,
    ]);
  }
}

export function createRoomDecorationNodes(
  k: KAPLAYCtx,
  options: RoomDecorationOptions
): RoomDecorationNodes {
  const createFloatingMarkerNodes = (
    spriteName: string | null,
    fallbackText: string,
    x: number,
    y: number,
    color: [number, number, number]
  ): FloatingMarkerNodes => {
    const motion = { x, baseY: y };
    const shadow = k.add([
      k.rect(14, 5, { radius: 2 }),
      k.pos(x - 7, y + 10),
      k.color(18, 12, 14),
      k.opacity(0),
      options.tag,
    ]) as FloatingMarkerNodes["shadow"];
    const icon = spriteName
      ? (k.add([
          k.sprite(spriteName),
          k.pos(x, y),
          k.anchor("center"),
          k.scale(0.48),
          k.opacity(0),
          options.tag,
        ]) as FloatingMarkerNodes["icon"])
      : (k.add([
          k.text(fallbackText, { font: UI_FONT_FAMILY, size: 8 }),
          k.pos(x, y),
          k.color(color[0], color[1], color[2]),
          k.anchor("center"),
          k.opacity(0),
          options.tag,
        ]) as FloatingMarkerNodes["icon"]);
    icon.onUpdate(() => {
      icon.pos = k.vec2(
        motion.x,
        motion.baseY + Math.sin(k.time() * 4.2) * 1.2
      );
    });
    const label = k.add([
      k.text("", { font: UI_FONT_FAMILY, size: 7 }),
      k.pos(x + 11, y - 6),
      k.color(color[0], color[1], color[2]),
      k.opacity(0),
      k.anchor("center"),
      options.tag,
    ]) as TextDecorationNode;
    return { shadow, icon, label, motion };
  };

  const fill = k.add([
    k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
    k.pos(options.tileX, options.tileY),
    k.color(82, 58, 44),
    k.opacity(0),
    options.tag,
  ]) as ColorableNode;
  const stripe = k.add([
    k.rect(FLOOR_TILE_W - 12, 2, { radius: 1 }),
    k.pos(options.tileX + 6, options.tileY + 5),
    k.color(170, 138, 74),
    k.opacity(0),
    options.tag,
  ]) as ColorableNode;
  const hostileBorder = k.add([
    k.rect(FLOOR_TILE_W + 4, FLOOR_TILE_H + 4, { radius: 8 }),
    k.pos(options.tileX - 2, options.tileY - 2),
    k.color(28, 18, 19),
    k.opacity(0),
    k.outline(2, k.rgb(184, 66, 58)),
    options.tag,
  ]) as ColorableNode;
  const badgeRect = k.add([
    k.rect(12, 12, { radius: 3 }),
    k.pos(options.tileX + FLOOR_TILE_W - 16, options.tileY + 4),
    k.color(116, 99, 92),
    k.opacity(0),
    options.tag,
  ]) as ColorableNode;
  const badgeText = k.add([
    k.text("", { font: UI_FONT_FAMILY, size: 7 }),
    k.pos(options.tileX + FLOOR_TILE_W - 13, options.tileY + 6),
    k.color(248, 237, 214),
    k.opacity(0),
    k.anchor("topleft"),
    options.tag,
  ]) as TextDecorationNode;
  const tileIcon =
    options.tileIconSprite === null
      ? (k.add([
          k.text(featureBadge(options.roomFeature).label, {
            font: UI_FONT_FAMILY,
            size: 22,
          }),
          k.pos(
            options.tileX + FLOOR_TILE_W / 2,
            options.tileY + FLOOR_TILE_H / 2
          ),
          k.anchor("center"),
          k.color(248, 237, 214),
          k.opacity(0),
          options.tag,
        ]) as PositionableNode & { opacity: number })
      : (k.add([
          k.sprite(options.tileIconSprite),
          k.pos(
            options.tileX + FLOOR_TILE_W / 2,
            options.tileY + FLOOR_TILE_H / 2
          ),
          k.anchor("center"),
          k.scale(1.38),
          k.opacity(0),
          options.tag,
        ]) as PositionableNode & { opacity: number });
  const intentText = k.add([
    k.text("", { font: UI_FONT_FAMILY, size: 10 }),
    k.pos(options.tileX + FLOOR_TILE_W - 16, options.tileY + 4),
    k.color(230, 146, 136),
    k.opacity(0),
    k.anchor("topleft"),
    options.tag,
  ]) as TextDecorationNode;
  const hoverArea = k.add([
    k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
    k.pos(options.tileX, options.tileY),
    k.area(),
    k.opacity(0),
    options.tag,
  ]);
  hoverArea.onHover(options.onHoverStart);
  hoverArea.onHoverEnd(options.onHoverEnd);
  hoverArea.onClick(options.onClick);
  const hostileMarker = createFloatingMarkerNodes(
    options.hostileSprite,
    "!",
    options.tileX + 15,
    options.tileY + FLOOR_TILE_H / 2 + 1,
    [230, 146, 136]
  );
  const bossMarker = createFloatingMarkerNodes(
    options.bossSprite,
    "B",
    options.tileX + FLOOR_TILE_W / 2,
    options.tileY + 12,
    [246, 214, 132]
  );
  (
    bossMarker.icon as typeof bossMarker.icon & {
      scale: ReturnType<KAPLAYCtx["vec2"]>;
    }
  ).scale = k.vec2(0.62, 0.62);
  const dungeoneerMarker = createFloatingMarkerNodes(
    options.dungeoneerSprite,
    "+",
    options.tileX + FLOOR_TILE_W - 15,
    options.tileY + FLOOR_TILE_H / 2 + 1,
    [136, 220, 180]
  );

  return {
    fill,
    stripe,
    hostileBorder,
    badgeRect,
    badgeText,
    tileIcon,
    intentText,
    hoverArea,
    bossMarker,
    hostileMarker,
    dungeoneerMarker,
  };
}

export function createActionPanelTextNodes(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number
): ActionPanelTextNodes {
  return {
    title: k.add([
      k.text("Global Actions", { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(x + 12, y + 10),
      k.color(220, 204, 186),
      k.opacity(1),
      k.anchor("topleft"),
      NAV_ACTIONS_TEXT_TAG,
    ]) as TextDecorationNode,
    emptyLabel: k.add([
      k.text("", {
        font: UI_FONT_FAMILY,
        size: 9,
        width: width - 24,
      }),
      k.pos(x + 12, y + 30),
      k.color(167, 149, 132),
      k.anchor("topleft"),
      k.opacity(0),
      NAV_ACTIONS_TEXT_TAG,
    ]) as TextDecorationNode,
  };
}

export function createRoomInfoTextNodes(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  options: RoomPortraitOptions
): RoomInfoTextNodes {
  const portraitSpriteName =
    options.portraitSpriteName ??
    resolveKaplayStaticIconSprite(
      resolveRoomTileIconId({
        feature: options.portraitFallbackFeature,
        isBossRoom: options.isBossRoom,
        isExitTarget: options.isExitTarget,
      })
    );
  return {
    badgeRect: k.add([
      k.rect(18, 18, { radius: 4 }),
      k.pos(x + 82, y + 10),
      k.color(116, 99, 92),
      k.opacity(1),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as ColorableNode,
    badgeText: k.add([
      k.text("", { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(x + 91, y + 19),
      k.color(248, 237, 214),
      k.opacity(1),
      k.anchor("center"),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
    portraitShadow: k.add([
      k.rect(58, 58, { radius: 10 }),
      k.pos(x + 13, y + 12),
      k.color(
        options.portraitShadowColor[0],
        options.portraitShadowColor[1],
        options.portraitShadowColor[2]
      ),
      k.opacity(0.94),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as ColorableNode,
    portraitFrame: k.add([
      k.rect(58, 58, { radius: 10 }),
      k.pos(x + 10, y + 8),
      k.color(
        options.portraitFrameColor[0],
        options.portraitFrameColor[1],
        options.portraitFrameColor[2]
      ),
      k.opacity(1),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as ColorableNode,
    portraitPlate: k.add([
      k.rect(50, 50, { radius: 8 }),
      k.pos(x + 14, y + 12),
      k.color(
        options.portraitPlateColor[0],
        options.portraitPlateColor[1],
        options.portraitPlateColor[2]
      ),
      k.opacity(1),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as ColorableNode,
    portraitEyebrow: k.add([
      k.text(options.portraitEyebrow, { font: UI_FONT_FAMILY, size: 7 }),
      k.pos(x + 18, y + 16),
      k.color(214, 171, 104),
      k.opacity(1),
      k.anchor("topleft"),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
    portraitSceneBackplate: k.add([
      k.sprite(
        resolveKaplayStaticIconSprite(
          resolveRoomTileIconId({
            feature: options.portraitFallbackFeature,
            isBossRoom: options.isBossRoom,
            isExitTarget: options.isExitTarget,
          })
        )
      ),
      k.pos(x + 39, y + 40),
      k.anchor("center"),
      k.scale(1.26),
      k.opacity(options.sceneBackplateOpacity),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as PositionableNode & { opacity: number },
    portraitVisual: k.add([
      k.sprite(portraitSpriteName),
      k.pos(x + 39 + options.portraitOffsetX, y + options.portraitOffsetY),
      k.anchor("center"),
      k.scale(options.portraitScale),
      k.opacity(1),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as PositionableNode & { opacity: number },
    title: k.add([
      k.text("", { font: UI_FONT_FAMILY, size: 12 }),
      k.pos(x + 108, y + 10),
      k.color(220, 204, 186),
      k.opacity(1),
      k.anchor("topleft"),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
    subtitle: k.add([
      k.text("", { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(x + 108, y + 26),
      k.color(167, 149, 132),
      k.opacity(1),
      k.anchor("topleft"),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
    lines: [0, 1, 2].map((index) => {
      return k.add([
        k.text("", {
          font: UI_FONT_FAMILY,
          size: 10,
          width: width - 28,
        }),
        k.pos(x + 14, y + 72 + index * 16),
        k.color(220, 204, 186),
        k.opacity(1),
        k.anchor("topleft"),
        NAV_ROOMINFO_TEXT_TAG,
      ]) as TextDecorationNode;
    }),
    actionsLabel: k.add([
      k.text("Room Actions", { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(x + 14, y + 122),
      k.color(167, 149, 132),
      k.anchor("topleft"),
      k.opacity(0),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
  };
}

export function createPersistentButtonSlot(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  tag: string
): PersistentButtonSlot {
  const state: PersistentButtonSlotState = {
    badgeLabel: null,
    label: "",
    enabled: false,
    tone: "neutral",
    visible: false,
    onClick: null,
  };
  const shadow = k.add([
    k.rect(width, 20, { radius: 4 }),
    k.pos(x, y),
    k.color(18, 12, 14),
    k.opacity(0),
    tag,
  ]) as ColorableNode;
  const badgeRect = k.add([
    k.rect(24, 12, { radius: 3 }),
    k.pos(x + 4, y + 4),
    k.color(88, 69, 49),
    k.opacity(0),
    tag,
  ]) as ColorableNode;
  const badgeText = k.add([
    k.text("", { font: UI_FONT_FAMILY, size: 7 }),
    k.pos(x + 16, y + 10),
    k.color(248, 237, 214),
    k.opacity(0),
    k.anchor("center"),
    tag,
  ]) as TextDecorationNode;
  const button = drawButtonSurfaceAtom(k, {
    x,
    y,
    width,
    height: 20,
    tone: "neutral",
    enabled: true,
    tag,
  });
  button.opacity = 0;
  const labelNode = k.add([
    k.text("", { font: UI_FONT_FAMILY, size: 10, width: width - 34 }),
    k.pos(x + 32, y + 4),
    k.color(220, 204, 186),
    k.opacity(0),
    k.anchor("topleft"),
    tag,
  ]) as TextDecorationNode;

  button.onHover(() => {
    if (!(state.visible && state.enabled)) {
      return;
    }
    const base = tonePalette[state.tone];
    button.color = k.rgb(
      Math.min(255, base.bg[0] + 20),
      Math.min(255, base.bg[1] + 20),
      Math.min(255, base.bg[2] + 20)
    );
  });
  button.onHoverEnd(() => {
    if (!(state.visible && state.enabled)) {
      return;
    }
    const base = tonePalette[state.tone];
    button.color = k.rgb(base.bg[0], base.bg[1], base.bg[2]);
  });
  button.onClick(() => {
    if (!(state.visible && state.enabled && state.onClick)) {
      return;
    }
    state.onClick();
  });

  return { state, badgeRect, badgeText, shadow, button, labelNode };
}

export function updatePersistentButtonSlot(
  k: KAPLAYCtx,
  slot: PersistentButtonSlot,
  nextState: PersistentButtonSlotState
): void {
  slot.state.badgeLabel = nextState.badgeLabel;
  slot.state.label = nextState.label;
  slot.state.enabled = nextState.enabled;
  slot.state.tone = nextState.tone;
  slot.state.visible = nextState.visible;
  slot.state.onClick = nextState.onClick;

  if (!nextState.visible) {
    slot.badgeRect.opacity = 0;
    slot.badgeText.opacity = 0;
    slot.badgeText.text = "";
    slot.shadow.opacity = 0;
    slot.button.shadowNode.opacity = 0;
    slot.button.opacity = 0;
    slot.labelNode.opacity = 0;
    slot.labelNode.text = "";
    return;
  }

  const base = tonePalette[nextState.tone];
  const buttonBg = nextState.enabled ? base.bg : ([45, 45, 45] as const);
  const showBadge = Boolean(nextState.badgeLabel);
  const badgeBg = nextState.enabled
    ? ([
        Math.max(26, buttonBg[0] - 18),
        Math.max(20, buttonBg[1] - 18),
        Math.max(18, buttonBg[2] - 18),
      ] as const)
    : ([58, 52, 49] as const);
  slot.badgeRect.opacity = showBadge ? 1 : 0;
  slot.badgeRect.color = k.rgb(badgeBg[0], badgeBg[1], badgeBg[2]);
  slot.badgeText.opacity = showBadge ? 1 : 0;
  slot.badgeText.text = nextState.badgeLabel ?? "";
  slot.badgeText.color = k.rgb(
    nextState.enabled ? base.fg[0] : 138,
    nextState.enabled ? base.fg[1] : 138,
    nextState.enabled ? base.fg[2] : 138
  );
  slot.shadow.opacity = 1;
  slot.button.shadowNode.opacity = 1;
  slot.button.opacity = 1;
  slot.button.color = k.rgb(buttonBg[0], buttonBg[1], buttonBg[2]);
  slot.labelNode.opacity = 1;
  slot.labelNode.text = escapeKaplayStyledText(nextState.label);
  slot.labelNode.color = k.rgb(
    nextState.enabled ? base.fg[0] : 138,
    nextState.enabled ? base.fg[1] : 138,
    nextState.enabled ? base.fg[2] : 138
  );
}

export function renderRoomFindOverlay(
  k: KAPLAYCtx,
  options: RoomFindOverlayOptions
): void {
  const overlayW = Math.min(300, options.width - 40);
  const overlayX = options.x + options.width / 2 - overlayW / 2;
  const overlayY = options.y + 92;
  drawSurfaceAtom(k, overlayX, overlayY, overlayW, 70, options.tag);
  drawMutedTextAtom(k, {
    x: overlayX + 14,
    y: overlayY + 14,
    text: options.text.toLowerCase().includes("finds") ? "Found" : "Search",
    size: 10,
    tag: options.tag,
  });
  drawTextAtom(k, {
    x: overlayX + 14,
    y: overlayY + 30,
    text: options.text,
    size: 10,
    width: overlayW - 28,
    tag: options.tag,
  });
}

export function applyRoomInfoBadge(
  k: KAPLAYCtx,
  nodes: RoomInfoTextNodes,
  roomFeature: string
): void {
  const badge = featureBadge(roomFeature);
  nodes.badgeRect.color = k.rgb(badge.color[0], badge.color[1], badge.color[2]);
  nodes.badgeText.text = badge.label;
}
