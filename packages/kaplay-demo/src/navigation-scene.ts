import {
  ACTION_TYPE,
  type ActionItem,
  type GameSnapshot,
  type PlayUiAction,
} from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { formatActionButtonLabel } from "./action-renderer";
import { resolveEntityCombatSprite } from "./content-visuals";
import {
  logKaplayDebug,
  logKaplayDebugError,
  recordKaplayDebug,
} from "./kaplay-debug";
import { H, PANEL_INSET, W } from "./layout-constants";
import {
  buildFloorRoomVisuals,
  type Direction,
  type FloorRoomVisual,
  floorRoomVisualCacheKey,
} from "./navigation-floor-model";
import {
  currentRoom,
  discoveredRoomIndices,
  exitRows,
  getWorldSnapshot,
  globalNavigationActionItems,
  preparedSpellSlots,
  roomActionItems,
  spellPoolRows,
} from "./navigation-helpers";
import {
  NAVIGATION_MENU_ENTRIES,
  consumePendingNavigationOverlay,
  createNavigationOverlayState,
  renderNavigationOverlay,
  type NavigationMenuEntry,
  type NavigationOverlayKind,
} from "./navigation-overlay";
import { roomFeatureLabel } from "./navigation-panels";
import { hasEncounter, inRuneForgeContext } from "./scene-blocks";
import type { SceneCallbacks } from "./scene-contracts";
import { escapeKaplayStyledText } from "./escape-kaplay-tags";
import {
  addButton,
  clearUi,
  clearUiTag,
  PAD,
  UI_TAG,
  type UiTone,
} from "./shared";
import { tonePalette, UI_FONT_FAMILY } from "./theme-tokens";
import {
  drawButtonSurfaceAtom,
  drawMutedTextAtom,
  drawSurfaceAtom,
  drawTextAtom,
} from "./ui/atoms";

const NAV_RIGHT_W = 188;
const NAV_COLUMN_GAP = 10;
const FRAME_Y = 8;
const FRAME_H = H - FRAME_Y - PAD;
const FRAME_W = W - PAD * 2;
const HEADER_BAR_H = 52;
const TOP_PANEL_Y = FRAME_Y + HEADER_BAR_H + 8;
const SHELL_INNER_PADDING = 8;
const INFO_PANEL_GAP = 10;
const INFO_PANEL_H = 186;
const FLOOR_TILE_W = 54;
const FLOOR_TILE_H = 32;
const FLOOR_TILE_GAP_X = 8;
const FLOOR_TILE_GAP_Y = 12;
const FLOOR_MAP_TOP_INSET = 34;
const FLOOR_MAP_LEFT_INSET = 18;
const FLOOR_MAP_BOTTOM_PADDING = 18;
const ROOM_ID_REGEX = /^L\d+_R\d+$/;
const SEARCH_FOUND_REGEX = /finds\s+/i;
const NAV_DYNAMIC_TAG = "ui-nav-dynamic";
const NAV_HEADER_TAG = "ui-nav-header";
const NAV_OVERLAY_TAG = "ui-nav-overlay";
const NAV_STATIC_TAG = "ui-nav-static";
const NAV_BOARD_BASE_TAG = "ui-nav-board-base";
const NAV_BOARD_DECOR_TAG = "ui-nav-board-decor";
const NAV_ACTIONS_TAG = "ui-nav-actions";
const NAV_ACTIONS_TEXT_TAG = "ui-nav-actions-text";
const NAV_ACTIONS_BUTTON_TAG = "ui-nav-actions-buttons";
const NAV_ROOMINFO_TAG = "ui-nav-roominfo";
const NAV_ROOMINFO_TEXT_TAG = "ui-nav-roominfo-text";
const NAV_ROOMINFO_BUTTON_TAG = "ui-nav-roominfo-buttons";
const NAV_ROOMFIND_TAG = "ui-nav-roomfind";
const NAV_OVERLAY_INSET = 14;
const VISIBLE_GLOBAL_ACTION_LIMIT = 2;
const VISIBLE_ROOM_ACTION_LIMIT = 4;

type AddedNode = ReturnType<KAPLAYCtx["add"]>;

interface OverlayViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayRenderContext {
  sceneState: ReturnType<SceneCallbacks["getState"]>;
  snapshot: GameSnapshot;
  viewport: OverlayViewport;
  preparedSlots: ReturnType<typeof preparedSpellSlots>;
  spellPool: ReturnType<typeof spellPoolRows>;
}

interface SelectionOverlayNodes {
  fill: AddedNode;
  stripe: AddedNode;
  border: AddedNode;
  label: TextDecorationNode;
}

type PositionableNode = AddedNode & { pos: ReturnType<KAPLAYCtx["vec2"]> };
type ColorableNode = AddedNode & {
  color: ReturnType<KAPLAYCtx["rgb"]>;
  opacity: number;
};
type ButtonNode = ReturnType<typeof drawButtonSurfaceAtom> & {
  color: ReturnType<KAPLAYCtx["rgb"]>;
  opacity: number;
};
type TextDecorationNode = PositionableNode &
  ColorableNode & {
    text: string;
  };

interface RoomDecorationNodes {
  fill: ColorableNode;
  stripe: ColorableNode;
  hostileBorder: ColorableNode;
  badgeRect: ColorableNode;
  badgeText: TextDecorationNode;
  intentText: TextDecorationNode;
}

interface PlayerDecorationNodes {
  shadow: PositionableNode & ColorableNode;
  sprite: PositionableNode & { opacity: number };
  motion: { x: number; baseY: number };
}

interface ActionPanelTextNodes {
  title: TextDecorationNode;
  emptyLabel: TextDecorationNode;
}

interface RoomInfoTextNodes {
  badgeRect: ColorableNode;
  badgeText: TextDecorationNode;
  title: TextDecorationNode;
  subtitle: TextDecorationNode;
  lines: TextDecorationNode[];
  actionsLabel: TextDecorationNode;
}

interface PersistentButtonSlotState {
  label: string;
  enabled: boolean;
  tone: UiTone;
  visible: boolean;
  onClick: (() => void) | null;
}

interface PersistentButtonSlot {
  state: PersistentButtonSlotState;
  shadow: ColorableNode;
  button: ButtonNode;
  labelNode: TextDecorationNode;
}

interface ShellLayout {
  leftX: number;
  centerX: number;
  rightX: number;
  innerY: number;
  centerWidth: number;
}

interface BagOverlayEntry {
  id: string;
  itemId: string;
  title: string;
  subtitle: string;
  detailLines: string[];
  tone: "neutral" | "good" | "warn" | "danger" | "accent";
  canUse: boolean;
  canEquip: boolean;
  canDrop: boolean;
  useAction: ActionItem | null;
  equipAction: ActionItem | null;
  dropAction: ActionItem | null;
}

function drawEmbeddedArea(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
  opacity = 1,
  tag = UI_TAG
): void {
  k.add([
    k.rect(width, height, { radius: 6 }),
    k.pos(x, y),
    k.color(color[0], color[1], color[2]),
    k.opacity(opacity),
    tag,
  ]);
}

function lightenColor(
  color: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    Math.min(255, color[0] + amount),
    Math.min(255, color[1] + amount),
    Math.min(255, color[2] + amount),
  ];
}

function computeShellLayout(
  x: number,
  y: number,
  width: number,
  leftWidth: number,
  rightWidth: number,
  inset: number,
  columnGap: number
): ShellLayout {
  const leftX = x + inset;
  const innerY = y + inset;
  const innerWidth = width - inset * 2;
  const centerWidth = innerWidth - leftWidth - rightWidth - columnGap * 2;
  const centerX = leftX + leftWidth + columnGap;
  const rightX = centerX + centerWidth + columnGap;
  return { leftX, centerX, rightX, innerY, centerWidth };
}

function directionGlyph(direction: Direction | null): string {
  switch (direction) {
    case "north":
      return "^";
    case "south":
      return "v";
    case "west":
      return "<";
    case "east":
      return ">";
    default:
      return "";
  }
}

function roomTitleFromLook(look: string, fallbackRoomId: string): string {
  const firstLine = look
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !ROOM_ID_REGEX.test(line));
  return firstLine ?? fallbackRoomId;
}

function buildNavigationRoomInfoLines(args: {
  roomDescription: string;
  roomTitle: string;
  roomFeature: string;
}): string[] {
  const featureLine = roomFeatureLabel(args.roomFeature).toLowerCase();
  return args.roomDescription
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => {
      const lower = line.toLowerCase();
      return (
        lower !== args.roomTitle.toLowerCase() &&
        lower !== `${args.roomTitle.toLowerCase()}.` &&
        lower !== featureLine
      );
    });
}

function filterNavigationRoomActions(
  roomFeature: string,
  roomActions: ActionItem[]
): ActionItem[] {
  return roomActions.filter((item) => {
    if (!item.available || item.action.kind !== "player") {
      return false;
    }
    const actionType = item.action.playerAction.actionType;
    if (actionType === ACTION_TYPE.SEARCH) {
      return false;
    }
    if (actionType === ACTION_TYPE.TALK) {
      return roomFeature === "dialogue";
    }
    if (
      actionType === "train" ||
      actionType === ACTION_TYPE.REST ||
      actionType === ACTION_TYPE.EVOLVE_SKILL ||
      actionType === "purchase" ||
      actionType === "re_equip"
    ) {
      return roomFeature === "rune_forge";
    }
    return false;
  });
}

function featureBadge(feature: string): {
  label: string;
  color: [number, number, number];
} {
  switch (feature) {
    case "combat":
      return { label: "C", color: [168, 70, 58] };
    case "dialogue":
      return { label: "D", color: [87, 133, 118] };
    case "rest":
      return { label: "R", color: [76, 125, 101] };
    case "rune_forge":
      return { label: "F", color: [175, 120, 54] };
    case "training":
      return { label: "T", color: [88, 111, 165] };
    case "treasure":
      return { label: "$", color: [185, 154, 71] };
    default:
      return { label: "?", color: [116, 99, 92] };
  }
}

function roomTilePosition(
  x: number,
  y: number,
  room: { row: number; column: number }
): { x: number; y: number } {
  const tileOriginX = x + FLOOR_MAP_LEFT_INSET;
  const tileOriginY = y + FLOOR_MAP_TOP_INSET;
  return {
    x: tileOriginX + room.column * (FLOOR_TILE_W + FLOOR_TILE_GAP_X),
    y: tileOriginY + room.row * (FLOOR_TILE_H + FLOOR_TILE_GAP_Y),
  };
}

function renderFloorMapBase(
  k: KAPLAYCtx,
  x: number,
  y: number,
  _width: number,
  _height: number,
  rooms: FloorRoomVisual[],
  tag = UI_TAG
): void {
  for (const room of rooms) {
    const { x: tileX, y: tileY } = roomTilePosition(x, y, room);

    k.add([
      k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
      k.pos(tileX + 3, tileY + 8),
      k.color(22, 16, 18),
      tag,
    ]);
    k.add([
      k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
      k.pos(tileX, tileY),
      k.color(42, 31, 34),
      tag,
    ]);
  }
}

function createRoomDecorationNodes(
  k: KAPLAYCtx,
  tileX: number,
  tileY: number,
  tag: string
): RoomDecorationNodes {
  const fill = k.add([
    k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
    k.pos(tileX, tileY),
    k.color(82, 58, 44),
    k.opacity(0),
    tag,
  ]) as ColorableNode;
  const stripe = k.add([
    k.rect(FLOOR_TILE_W - 12, 2, { radius: 1 }),
    k.pos(tileX + 6, tileY + 5),
    k.color(170, 138, 74),
    k.opacity(0),
    tag,
  ]) as ColorableNode;
  const hostileBorder = k.add([
    k.rect(FLOOR_TILE_W + 4, FLOOR_TILE_H + 4, { radius: 8 }),
    k.pos(tileX - 2, tileY - 2),
    k.color(28, 18, 19),
    k.opacity(0),
    k.outline(2, k.rgb(184, 66, 58)),
    tag,
  ]) as ColorableNode;
  const badgeRect = k.add([
    k.rect(12, 12, { radius: 3 }),
    k.pos(tileX + FLOOR_TILE_W - 16, tileY + 4),
    k.color(116, 99, 92),
    k.opacity(0),
    tag,
  ]) as ColorableNode;
  const badgeText = k.add([
    k.text("", { font: UI_FONT_FAMILY, size: 7 }),
    k.pos(tileX + FLOOR_TILE_W - 13, tileY + 6),
    k.color(248, 237, 214),
    k.opacity(0),
    k.anchor("topleft"),
    tag,
  ]) as TextDecorationNode;
  const intentText = k.add([
    k.text("", { font: UI_FONT_FAMILY, size: 10 }),
    k.pos(tileX + FLOOR_TILE_W - 16, tileY + 4),
    k.color(230, 146, 136),
    k.opacity(0),
    k.anchor("topleft"),
    tag,
  ]) as TextDecorationNode;
  return { fill, stripe, hostileBorder, badgeRect, badgeText, intentText };
}

function createActionPanelTextNodes(
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

function createRoomInfoTextNodes(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number
): RoomInfoTextNodes {
  return {
    badgeRect: k.add([
      k.rect(18, 18, { radius: 4 }),
      k.pos(x + 14, y + 10),
      k.color(116, 99, 92),
      k.opacity(1),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as ColorableNode,
    badgeText: k.add([
      k.text("", { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(x + 23, y + 19),
      k.color(248, 237, 214),
      k.opacity(1),
      k.anchor("center"),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
    title: k.add([
      k.text("", { font: UI_FONT_FAMILY, size: 12 }),
      k.pos(x + 40, y + 10),
      k.color(220, 204, 186),
      k.opacity(1),
      k.anchor("topleft"),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
    subtitle: k.add([
      k.text("", { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(x + 40, y + 26),
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
        k.pos(x + 14, y + 48 + index * 16),
        k.color(220, 204, 186),
        k.opacity(1),
        k.anchor("topleft"),
        NAV_ROOMINFO_TEXT_TAG,
      ]) as TextDecorationNode;
    }),
    actionsLabel: k.add([
      k.text("Room Actions", { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(x + 14, y + 98),
      k.color(167, 149, 132),
      k.anchor("topleft"),
      k.opacity(0),
      NAV_ROOMINFO_TEXT_TAG,
    ]) as TextDecorationNode,
  };
}

function createPersistentButtonSlot(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  tag: string
): PersistentButtonSlot {
  const state: PersistentButtonSlotState = {
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
  const button = drawButtonSurfaceAtom(k, {
    x,
    y,
    width,
    height: 20,
    tone: "neutral",
    enabled: true,
    tag,
  }) as ButtonNode;
  button.opacity = 0;
  const labelNode = k.add([
    k.text("", { font: UI_FONT_FAMILY, size: 10, width: width - 8 }),
    k.pos(x + 4, y + 4),
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

  return { state, shadow, button, labelNode };
}

function updatePersistentButtonSlot(
  k: KAPLAYCtx,
  slot: PersistentButtonSlot,
  nextState: PersistentButtonSlotState
): void {
  slot.state.label = nextState.label;
  slot.state.enabled = nextState.enabled;
  slot.state.tone = nextState.tone;
  slot.state.visible = nextState.visible;
  slot.state.onClick = nextState.onClick;

  if (!nextState.visible) {
    slot.shadow.opacity = 0;
    slot.button.opacity = 0;
    slot.labelNode.opacity = 0;
    slot.labelNode.text = "";
    return;
  }

  const base = tonePalette[nextState.tone];
  const buttonBg = nextState.enabled ? base.bg : ([45, 45, 45] as const);
  slot.shadow.opacity = 1;
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

function selectedRoomTilePosition(
  rooms: FloorRoomVisual[],
  selectedRoomId: string | null,
  activeRoomId: string,
  x: number,
  y: number
): { x: number; y: number } | null {
  const selectedRoom = selectedRoomId
    ? (rooms.find(
        (room) => room.roomId === selectedRoomId && room.roomId !== activeRoomId
      ) ?? null)
    : null;
  if (!selectedRoom) {
    return null;
  }
  return roomTilePosition(x, y, selectedRoom);
}

function directionFallbackOrder(direction: Direction): Direction[] {
  switch (direction) {
    case "north":
      return ["north", "west", "east", "south"];
    case "south":
      return ["south", "west", "east", "north"];
    case "west":
      return ["west", "north", "south", "east"];
    case "east":
      return ["east", "north", "south", "west"];
    default:
      return ["north", "west", "east", "south"];
  }
}

function renderRoomFindOverlay(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  text: string,
  tag = UI_TAG
): void {
  const overlayW = Math.min(300, width - 40);
  const overlayX = x + width / 2 - overlayW / 2;
  const overlayY = y + 92;
  drawSurfaceAtom(k, overlayX, overlayY, overlayW, 70, tag);
  drawMutedTextAtom(k, {
    x: overlayX + 14,
    y: overlayY + 14,
    text: text.toLowerCase().includes("finds") ? "Found" : "Search",
    size: 10,
    tag,
  });
  drawTextAtom(k, {
    x: overlayX + 14,
    y: overlayY + 30,
    text,
    size: 10,
    width: overlayW - 28,
    tag,
  });
}

export function registerNavigationScene(
  k: KAPLAYCtx,
  cb: SceneCallbacks
): void {
  let lastVisitedRoomId: string | null = null;
  let lastAutoSearchRoomId: string | null = null;
  let roomOverlayText: string | null = null;

  k.scene("gridNavigation", () => {
    let selectedExitIndex = 0;
    let renderQueued = false;
    let overlayRenderQueued = false;
    const overlayState = createNavigationOverlayState();
    const pendingOverlay = consumePendingNavigationOverlay();
    if (pendingOverlay) {
      overlayState.activeOverlay = pendingOverlay;
    }
    let lastFloorRooms: FloorRoomVisual[] = [];
    let lastFloorRoomCacheKey = "";
    let lastActiveRoomId = "";
    let lastBoardOrigin: { x: number; y: number } | null = null;
    let lastCenterViewport: {
      x: number;
      y: number;
      width: number;
      height: number;
    } | null = null;
    let lastHeaderFrame: { x: number; y: number; width: number } | null = null;
    let lastOverlayContext: OverlayRenderContext | null = null;
    let lastExitRows: ReturnType<typeof exitRows> = [];
    let lastGlobalActions: ActionItem[] = [];
    let lastRoomActions: ActionItem[] = [];
    let staticShellRendered = false;
    let lastBoardRenderKey = "";
    let lastBoardStructureKey = "";
    let lastActionRenderKey = "";
    let lastRoomInfoRenderKey = "";
    let lastRoomFindRenderKey: string | null = null;
    let selectionOverlayNodes: SelectionOverlayNodes | null = null;
    let roomDecorationNodes = new Map<string, RoomDecorationNodes>();
    let playerDecorationNodes: PlayerDecorationNodes | null = null;
    let actionPanelTextNodes: ActionPanelTextNodes | null = null;
    let roomInfoTextNodes: RoomInfoTextNodes | null = null;
    let globalActionSlots: PersistentButtonSlot[] = [];
    let roomActionSlots: PersistentButtonSlot[] = [];
    const destroySelectionOverlayNodes = () => {
      if (!selectionOverlayNodes) {
        return;
      }
      selectionOverlayNodes.fill.destroy();
      selectionOverlayNodes.stripe.destroy();
      selectionOverlayNodes.border.destroy();
      selectionOverlayNodes.label.destroy();
      selectionOverlayNodes = null;
    };
    const ensureSelectionOverlayNodes = () => {
      if (selectionOverlayNodes) {
        return selectionOverlayNodes;
      }
      selectionOverlayNodes = {
        fill: k.add([
          k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
          k.pos(-1000, -1000),
          k.color(152, 114, 42),
          NAV_DYNAMIC_TAG,
        ]),
        stripe: k.add([
          k.rect(FLOOR_TILE_W - 12, 2, { radius: 1 }),
          k.pos(-1000, -1000),
          k.color(208, 182, 88),
          NAV_DYNAMIC_TAG,
        ]),
        border: k.add([
          k.rect(FLOOR_TILE_W + 4, FLOOR_TILE_H + 4, { radius: 8 }),
          k.pos(-1000, -1000),
          k.color(28, 18, 19),
          k.outline(2, k.rgb(82, 146, 92)),
          NAV_DYNAMIC_TAG,
        ]),
        label: k.add([
          k.text("Move?", { font: UI_FONT_FAMILY, size: 8 }),
          k.pos(-1000, -1000),
          k.color(244, 231, 194),
          k.opacity(1),
          k.anchor("center"),
          NAV_DYNAMIC_TAG,
        ]) as TextDecorationNode,
      };
      return selectionOverlayNodes;
    };
    const rebuildBoardDecorationNodes = (
      centerPanelX: number,
      centerPanelY: number,
      floorRooms: FloorRoomVisual[]
    ) => {
      clearUiTag(k, NAV_BOARD_DECOR_TAG);
      roomDecorationNodes = new Map(
        floorRooms.map((room) => {
          const position = roomTilePosition(centerPanelX, centerPanelY, room);
          return [
            room.roomId,
            createRoomDecorationNodes(
              k,
              position.x,
              position.y,
              NAV_BOARD_DECOR_TAG
            ),
          ] as const;
        })
      );
      const playerSprite = resolveEntityCombatSprite(
        "player",
        undefined,
        false
      );
      if (playerSprite) {
        const motion = { x: -1000, baseY: -1000 };
        const shadow = k.add([
          k.rect(18, 6, { radius: 3 }),
          k.pos(-1000, -1000),
          k.color(20, 16, 18),
          k.opacity(0),
          NAV_BOARD_DECOR_TAG,
        ]) as PositionableNode & ColorableNode;
        const sprite = k.add([
          k.sprite(playerSprite),
          k.pos(-1000, -1000),
          k.anchor("center"),
          k.scale(0.78),
          k.opacity(0),
          NAV_BOARD_DECOR_TAG,
        ]) as PositionableNode & { opacity: number };
        sprite.onUpdate(() => {
          sprite.pos = k.vec2(
            motion.x,
            motion.baseY + Math.sin(k.time() * 5.2) * 1.6
          );
        });
        playerDecorationNodes = { shadow, sprite, motion };
      } else {
        playerDecorationNodes = null;
      }
    };
    const updateBoardDecorations = (
      centerPanelX: number,
      centerPanelY: number,
      floorRooms: FloorRoomVisual[],
      activeRoomId: string
    ) => {
      for (const room of floorRooms) {
        const nodes = roomDecorationNodes.get(room.roomId);
        if (!nodes) {
          continue;
        }
        let baseFill: [number, number, number] = [82, 58, 44];
        if (room.isCurrent) {
          baseFill = [118, 78, 36];
        } else if (room.isExitTarget) {
          baseFill = room.isDiscovered
            ? lightenColor([82, 58, 44], 8)
            : lightenColor([42, 31, 34], 8);
        }
        const showFill =
          room.isCurrent || room.isExitTarget || room.isDiscovered;
        nodes.fill.color = k.rgb(baseFill[0], baseFill[1], baseFill[2]);
        nodes.fill.opacity = showFill && !room.hasHostile ? 1 : 0;
        nodes.stripe.opacity = room.isCurrent ? 1 : 0;
        nodes.hostileBorder.opacity = room.hasHostile ? 1 : 0;

        const showBadge =
          (room.isDiscovered || room.isCurrent) && !room.hasHostile;
        if (showBadge) {
          const badge = featureBadge(room.feature);
          nodes.badgeRect.color = k.rgb(
            badge.color[0],
            badge.color[1],
            badge.color[2]
          );
          nodes.badgeRect.opacity = 1;
          nodes.badgeText.text = badge.label;
          nodes.badgeText.opacity = 1;
        } else {
          nodes.badgeRect.opacity = 0;
          nodes.badgeText.text = "";
          nodes.badgeText.opacity = 0;
        }

        if (room.hasHostile && room.hostileIntent) {
          nodes.intentText.text = directionGlyph(room.hostileIntent);
          nodes.intentText.opacity = 1;
        } else {
          nodes.intentText.text = "";
          nodes.intentText.opacity = 0;
        }
      }

      if (!playerDecorationNodes) {
        return;
      }
      const currentRoom = floorRooms.find(
        (room) => room.roomId === activeRoomId
      );
      if (!currentRoom) {
        playerDecorationNodes.shadow.opacity = 0;
        playerDecorationNodes.sprite.opacity = 0;
        playerDecorationNodes.motion.x = -1000;
        playerDecorationNodes.motion.baseY = -1000;
        return;
      }
      const playerTile = roomTilePosition(
        centerPanelX,
        centerPanelY,
        currentRoom
      );
      const playerX = playerTile.x + FLOOR_TILE_W / 2;
      const playerY = playerTile.y + FLOOR_TILE_H / 2 + 2;
      playerDecorationNodes.shadow.pos = k.vec2(playerX - 9, playerY + 8);
      playerDecorationNodes.shadow.opacity = 0.65;
      playerDecorationNodes.sprite.opacity = 1;
      playerDecorationNodes.motion.x = playerX;
      playerDecorationNodes.motion.baseY = playerY - 3;
    };
    const hideSelectionOverlay = () => {
      const overlay = ensureSelectionOverlayNodes();
      (overlay.fill as PositionableNode).pos = k.vec2(-1000, -1000);
      (overlay.stripe as PositionableNode).pos = k.vec2(-1000, -1000);
      (overlay.border as PositionableNode).pos = k.vec2(-1000, -1000);
      overlay.label.pos = k.vec2(-1000, -1000);
    };
    const scheduleRender = () => {
      if (renderQueued) {
        return;
      }
      renderQueued = true;
      queueMicrotask(() => {
        renderQueued = false;
        render();
      });
    };
    const scheduleOverlayRefresh = (includeHeader = false) => {
      if (overlayRenderQueued) {
        return;
      }
      overlayRenderQueued = true;
      queueMicrotask(() => {
        overlayRenderQueued = false;
        if (includeHeader) {
          renderHeaderLayer();
        }
        renderOverlayLayer();
      });
    };

    const renderHeaderLayer = () => {
      if (!lastHeaderFrame) {
        return;
      }
      clearUiTag(k, NAV_HEADER_TAG);
      addButton(
        k,
        lastHeaderFrame.x + 12,
        lastHeaderFrame.y + 12,
        152,
        "[Tab/Start] Menus",
        () => openCommandMenu(),
        true,
        {
          tone:
            overlayState.activeOverlay === "menu_hub" ? "accent" : "neutral",
          compact: true,
          tag: NAV_HEADER_TAG,
        }
      );
      drawMutedTextAtom(k, {
        x: lastHeaderFrame.x + 176,
        y: lastHeaderFrame.y + 17,
        text: "Arrow keys move  |  Enter confirms  |  Esc closes",
        size: 10,
        width: lastHeaderFrame.width - 200,
        tag: NAV_HEADER_TAG,
      });
      k.add([
        k.rect(lastHeaderFrame.width - 24, 2, { radius: 1 }),
        k.pos(lastHeaderFrame.x + 12, lastHeaderFrame.y + HEADER_BAR_H + 4),
        k.color(184, 140, 76),
        NAV_HEADER_TAG,
      ]);
    };

    const renderStaticShell = () => {
      if (!lastHeaderFrame) {
        return;
      }
      const frameX = lastHeaderFrame.x;
      const frameY = lastHeaderFrame.y;
      const frameW = lastHeaderFrame.width;
      const frameH = FRAME_H;
      const shellHeight = frameH - (TOP_PANEL_Y - frameY) - 10;
      drawSurfaceAtom(k, frameX, frameY, frameW, frameH, NAV_STATIC_TAG);
      const shell = computeShellLayout(
        frameX + 10,
        TOP_PANEL_Y,
        frameW - 20,
        0,
        NAV_RIGHT_W,
        PANEL_INSET,
        NAV_COLUMN_GAP
      );
      const centerPanelY = shell.innerY + SHELL_INNER_PADDING;
      const shellInnerHeight = shellHeight - PANEL_INSET * 2;
      const integratedPanelW = shell.centerWidth + NAV_COLUMN_GAP + NAV_RIGHT_W;
      const roomInfoPanelW = integratedPanelW - NAV_RIGHT_W - NAV_COLUMN_GAP;
      const centerPanelH =
        shellInnerHeight -
        INFO_PANEL_H -
        INFO_PANEL_GAP -
        SHELL_INNER_PADDING * 2;
      drawEmbeddedArea(
        k,
        shell.centerX,
        shell.innerY,
        integratedPanelW,
        shellInnerHeight,
        [28, 18, 19],
        0.82,
        NAV_STATIC_TAG
      );
      k.add([
        k.rect(integratedPanelW, 1),
        k.pos(shell.centerX, centerPanelY + centerPanelH + 2),
        k.color(84, 58, 34),
        NAV_STATIC_TAG,
      ]);
      k.add([
        k.rect(1, INFO_PANEL_H - 24),
        k.pos(
          shell.centerX + roomInfoPanelW + NAV_COLUMN_GAP / 2,
          centerPanelY + centerPanelH + INFO_PANEL_GAP + 12
        ),
        k.color(84, 58, 34),
        NAV_STATIC_TAG,
      ]);
    };

    const renderOverlayLayer = () => {
      clearUiTag(k, NAV_OVERLAY_TAG);
      if (!(overlayState.activeOverlay && lastOverlayContext)) {
        return;
      }
      const { sceneState, snapshot, viewport, preparedSlots, spellPool } =
        lastOverlayContext;
      try {
        renderNavigationOverlay({
          k,
          overlayState,
          sceneState,
          snapshot,
          x: viewport.x,
          y: viewport.y,
          width: viewport.width,
          height: viewport.height,
          preparedSlots,
          spellPool,
          onPrepareSpellSlot: (slotIndex, skillId) => {
            cb.prepareSpellSlot(slotIndex, skillId);
          },
          onRender: () => scheduleOverlayRefresh(false),
          onClose: () => closeOverlay(),
          onOpenNavigationMenuEntry: (entry) => {
            activateNavigationMenuEntry(entry);
          },
          onDoAction: (item) => {
            logKaplayDebug("nav", "overlay-action", {
              overlay: overlayState.activeOverlay,
              label: formatActionButtonLabel(item),
            });
            if (
              item.action.kind === "player" &&
              item.action.playerAction.actionType === ACTION_TYPE.TALK
            ) {
              openTalk(item);
              return;
            }
            cb.doAction(item.action);
            scheduleRender();
          },
          globalActions: lastGlobalActions,
          roomActions: lastRoomActions,
          tag: NAV_OVERLAY_TAG,
        });
      } catch (error) {
        logKaplayDebugError("nav", "overlay-render-failed", error, {
          overlay: overlayState.activeOverlay,
        });
        overlayState.activeOverlay = null;
        clearUiTag(k, NAV_OVERLAY_TAG);
      }
    };

    const renderBoardLayer = (
      centerPanelX: number,
      centerPanelY: number,
      centerPanelW: number,
      centerPanelH: number,
      floorRooms: FloorRoomVisual[],
      activeRoomId: string,
      structureKey: string,
      boardKey: string
    ) => {
      if (structureKey !== lastBoardStructureKey) {
        destroySelectionOverlayNodes();
        clearUiTag(k, NAV_BOARD_BASE_TAG);
        renderFloorMapBase(
          k,
          centerPanelX,
          centerPanelY,
          centerPanelW,
          centerPanelH,
          floorRooms,
          NAV_BOARD_BASE_TAG
        );
        rebuildBoardDecorationNodes(centerPanelX, centerPanelY, floorRooms);
        lastBoardStructureKey = structureKey;
        lastBoardRenderKey = "";
      }
      if (boardKey === lastBoardRenderKey) {
        return;
      }
      updateBoardDecorations(
        centerPanelX,
        centerPanelY,
        floorRooms,
        activeRoomId
      );
      lastBoardRenderKey = boardKey;
    };

    const ensureActionButtonSlots = (x: number, y: number, width: number) => {
      if (globalActionSlots.length === 0) {
        let slotY = y + 28;
        const slotWidth = width - 16;
        globalActionSlots = Array.from(
          { length: VISIBLE_GLOBAL_ACTION_LIMIT + 1 },
          () => {
            const slot = createPersistentButtonSlot(
              k,
              x + 12,
              slotY,
              slotWidth,
              NAV_ACTIONS_BUTTON_TAG
            );
            slotY += 24;
            return slot;
          }
        );
      }
    };

    const ensureRoomActionSlots = (x: number, y: number, width: number) => {
      if (roomActionSlots.length > 0) {
        return;
      }
      const slotWidth = Math.max(
        112,
        Math.min(
          136,
          Math.floor(
            (width - 28 - (VISIBLE_ROOM_ACTION_LIMIT - 1) * 10) /
              VISIBLE_ROOM_ACTION_LIMIT
          )
        )
      );
      let actionX = x + 14;
      let actionY = y + 112;
      roomActionSlots = Array.from(
        { length: VISIBLE_ROOM_ACTION_LIMIT + 1 },
        () => {
          const slot = createPersistentButtonSlot(
            k,
            actionX,
            actionY,
            slotWidth,
            NAV_ROOMINFO_BUTTON_TAG
          );
          actionX += slotWidth + 10;
          if (actionX + slotWidth > x + width - 14) {
            actionX = x + 14;
            actionY += 44;
          }
          return slot;
        }
      );
    };

    const renderActionsLayer = (
      x: number,
      y: number,
      width: number,
      globalActions: ActionItem[],
      actionKey: string,
      hasMoreGlobalActions: boolean
    ) => {
      if (!actionPanelTextNodes) {
        actionPanelTextNodes = createActionPanelTextNodes(k, x, y, width);
      }
      ensureActionButtonSlots(x, y, width);
      actionPanelTextNodes.emptyLabel.text = escapeKaplayStyledText(
        globalActions.length > 0 ? "" : "No global actions here."
      );
      actionPanelTextNodes.emptyLabel.opacity =
        globalActions.length > 0 ? 0 : 1;
      if (actionKey === lastActionRenderKey) {
        return;
      }
      for (const [index, slot] of globalActionSlots.entries()) {
        const item = globalActions[index] ?? null;
        const isMoreSlot =
          index === globalActions.length && hasMoreGlobalActions;
        if (item) {
          updatePersistentButtonSlot(k, slot, {
            label: formatActionButtonLabel(item),
            enabled: item.available,
            tone: item.available ? "neutral" : "neutral",
            visible: true,
            onClick: () => {
              cb.doAction(item.action);
              scheduleRender();
            },
          });
          continue;
        }
        if (isMoreSlot) {
          updatePersistentButtonSlot(k, slot, {
            label: "[MORE] More",
            enabled: true,
            tone: "neutral",
            visible: true,
            onClick: openGlobalActionsOverlay,
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
      lastActionRenderKey = actionKey;
    };

    const renderRoomInfoLayer = (
      x: number,
      y: number,
      width: number,
      roomTitle: string,
      roomFeature: string,
      roomInfoLines: string[],
      visibleRoomActions: ActionItem[],
      roomInfoKey: string,
      hasMoreRoomActions: boolean
    ) => {
      if (!roomInfoTextNodes) {
        roomInfoTextNodes = createRoomInfoTextNodes(k, x, y, width);
      }
      const badge = featureBadge(roomFeature);
      roomInfoTextNodes.badgeRect.color = k.rgb(
        badge.color[0],
        badge.color[1],
        badge.color[2]
      );
      roomInfoTextNodes.badgeText.text = badge.label;
      ensureRoomActionSlots(x, y, width);
      roomInfoTextNodes.title.text = escapeKaplayStyledText(roomTitle);
      roomInfoTextNodes.subtitle.text = escapeKaplayStyledText(
        roomFeatureLabel(roomFeature)
      );
      for (const [index, lineNode] of roomInfoTextNodes.lines.entries()) {
        lineNode.text = escapeKaplayStyledText(roomInfoLines[index] ?? "");
      }
      roomInfoTextNodes.actionsLabel.opacity =
        roomFeature === "rune_forge" || visibleRoomActions.length > 0 ? 1 : 0;
      if (roomInfoKey === lastRoomInfoRenderKey) {
        return;
      }
      for (const [index, slot] of roomActionSlots.entries()) {
        const hasRuneForgeShortcut = roomFeature === "rune_forge";
        if (hasRuneForgeShortcut && index === 0) {
          updatePersistentButtonSlot(k, slot, {
            label: "[R] Rune Codex",
            enabled: true,
            tone: "accent",
            visible: true,
            onClick: openRuneForgeCodexOverlay,
          });
          continue;
        }
        const actionIndex = hasRuneForgeShortcut ? index - 1 : index;
        const item = visibleRoomActions[actionIndex] ?? null;
        const isMoreSlot =
          actionIndex === visibleRoomActions.length && hasMoreRoomActions;
        if (item) {
          updatePersistentButtonSlot(k, slot, {
            label: formatActionButtonLabel(item),
            enabled: item.available,
            tone: "neutral",
            visible: true,
            onClick: () => {
              if (item.action.kind !== "player") {
                cb.doAction(item.action);
                scheduleRender();
                return;
              }
              const actionType = item.action.playerAction.actionType;
              if (actionType === ACTION_TYPE.TALK) {
                openTalk(item);
                return;
              }
              if (
                actionType === ACTION_TYPE.EVOLVE_SKILL ||
                actionType === "purchase" ||
                actionType === "re_equip"
              ) {
                cb.doAction(item.action);
                k.go("gridRuneForge");
                return;
              }
              cb.doAction(item.action);
              scheduleRender();
            },
          });
          continue;
        }
        if (isMoreSlot) {
          updatePersistentButtonSlot(k, slot, {
            label: "[MORE] More",
            enabled: true,
            tone: "neutral",
            visible: true,
            onClick: openRoomActionsOverlay,
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
      lastRoomInfoRenderKey = roomInfoKey;
    };

    const renderRoomFindLayer = (
      centerPanelX: number,
      centerPanelY: number,
      centerPanelW: number,
      roomFindText: string | null
    ) => {
      const nextKey = roomFindText ?? null;
      if (nextKey === lastRoomFindRenderKey) {
        return;
      }
      clearUiTag(k, NAV_ROOMFIND_TAG);
      if (roomFindText) {
        renderRoomFindOverlay(
          k,
          centerPanelX,
          centerPanelY,
          centerPanelW,
          roomFindText,
          NAV_ROOMFIND_TAG
        );
      }
      lastRoomFindRenderKey = nextKey;
    };

    const openOverlay = (kind: NavigationOverlayKind | null) => {
      logKaplayDebug("nav", "overlay-toggle", {
        from: overlayState.activeOverlay ?? "navigation",
        to: kind ?? "navigation",
      });
      overlayState.activeOverlay = kind;
      scheduleOverlayRefresh(true);
    };
    const closeOverlay = () => {
      if (!overlayState.activeOverlay) {
        return;
      }
      openOverlay(null);
    };
    const openSpellbookOverlay = () => {
      overlayState.spellbookAllowCodex = false;
      if (overlayState.spellbookTab === "codex") {
        overlayState.spellbookTab = "loadout";
      }
      openOverlay("spellbook");
    };
    const openRuneForgeCodexOverlay = () => {
      if (!inRuneForgeContext(cb.getState())) {
        return;
      }
      overlayState.spellbookAllowCodex = true;
      overlayState.spellbookTab = "codex";
      overlayState.spellbookPageIndex = 0;
      overlayState.spellbookSelectedEntryId = null;
      openOverlay("spellbook");
    };
    const openCommandMenu = () => {
      if (!overlayState.menuHubSelectedEntryId) {
        overlayState.menuHubSelectedEntryId =
          NAVIGATION_MENU_ENTRIES[0]?.id ?? null;
      }
      openOverlay("menu_hub");
    };
    const activateNavigationMenuEntry = (entry: NavigationMenuEntry) => {
      if (entry.targetScene === "gridWorldMap") {
        k.go("gridWorldMap");
        return;
      }
      if (entry.targetOverlay === "spellbook") {
        openSpellbookOverlay();
        return;
      }
      openOverlay(entry.targetOverlay);
    };
    const moveNavigationMenuSelection = (step: -1 | 1) => {
      const entryCount = NAVIGATION_MENU_ENTRIES.length;
      if (entryCount === 0) {
        return;
      }
      const currentIndex = Math.max(
        0,
        NAVIGATION_MENU_ENTRIES.findIndex((entry) => {
          return entry.id === overlayState.menuHubSelectedEntryId;
        })
      );
      const nextIndex = Math.max(
        0,
        Math.min(entryCount - 1, currentIndex + step)
      );
      overlayState.menuHubSelectedEntryId =
        NAVIGATION_MENU_ENTRIES[nextIndex]?.id ?? null;
      scheduleOverlayRefresh(false);
    };
    const activateSelectedNavigationMenuEntry = () => {
      const selectedEntry =
        NAVIGATION_MENU_ENTRIES.find((entry) => {
          return entry.id === overlayState.menuHubSelectedEntryId;
        }) ??
        NAVIGATION_MENU_ENTRIES[0] ??
        null;
      if (!selectedEntry) {
        return;
      }
      activateNavigationMenuEntry(selectedEntry);
    };
    const openGlobalActionsOverlay = () => {
      openOverlay("global_actions");
    };
    const openRoomActionsOverlay = () => {
      openOverlay("room_actions");
    };

    const renderDynamicSelection = () => {
      const startedAt = performance.now();
      if (lastFloorRooms.length === 0) {
        return;
      }
      const selectedExit =
        lastExitRows[selectedExitIndex] ?? lastExitRows[0] ?? null;
      const position = selectedRoomTilePosition(
        lastFloorRooms,
        selectedExit?.roomId ?? null,
        lastActiveRoomId,
        lastBoardOrigin?.x ?? 0,
        lastBoardOrigin?.y ?? 0
      );
      if (position) {
        const overlay = ensureSelectionOverlayNodes();
        (overlay.fill as PositionableNode).pos = k.vec2(position.x, position.y);
        (overlay.stripe as PositionableNode).pos = k.vec2(
          position.x + 6,
          position.y + 5
        );
        (overlay.border as PositionableNode).pos = k.vec2(
          position.x - 2,
          position.y - 2
        );
        overlay.label.text = "Move?";
        overlay.label.pos = k.vec2(
          position.x + FLOOR_TILE_W / 2,
          position.y + FLOOR_TILE_H / 2
        );
      } else {
        hideSelectionOverlay();
      }
      const durationMs =
        Math.round((performance.now() - startedAt) * 100) / 100;
      if (durationMs >= 8) {
        recordKaplayDebug("nav", "selection-redraw", {
          durationMs,
          selectedRoomId: selectedExit?.roomId ?? null,
        });
      }
    };

    const movePlayer = (direction: Direction) => {
      const action: PlayUiAction = {
        kind: "player",
        playerAction: { actionType: "move", payload: { direction } },
      };
      cb.doAction(action);
      const nextState = cb.getState();
      if (hasEncounter(nextState)) {
        k.go("gridCombat");
        return;
      }
      const roomId = String(nextState.status.roomId ?? "");
      const searchAction = roomActionItems(nextState).find((item) => {
        return (
          item.action.kind === "player" &&
          item.available &&
          item.action.playerAction.actionType === ACTION_TYPE.SEARCH
        );
      });
      if (!searchAction) {
        roomOverlayText = null;
        return;
      }
      lastAutoSearchRoomId = roomId;
      const feedCount = cb.feedLines.length;
      cb.doAction(searchAction.action);
      const latestFeed = cb.feedLines.at(-1) ?? null;
      roomOverlayText =
        cb.feedLines.length > feedCount &&
        latestFeed &&
        SEARCH_FOUND_REGEX.test(latestFeed)
          ? latestFeed
          : null;
      scheduleRender();
    };

    const selectExitDirection = (direction: Direction) => {
      const priorities = directionFallbackOrder(direction);
      const fallbackIndex = priorities
        .map((candidate) => {
          return lastExitRows.findIndex((exit) => exit.direction === candidate);
        })
        .find((candidateIndex) => candidateIndex >= 0);
      if (fallbackIndex === undefined || fallbackIndex < 0) {
        return;
      }
      if (fallbackIndex === selectedExitIndex) {
        return;
      }
      selectedExitIndex = fallbackIndex;
      renderDynamicSelection();
    };

    const confirmSelectedMove = () => {
      const selectedExit =
        lastExitRows[selectedExitIndex] ?? lastExitRows[0] ?? null;
      if (!selectedExit) {
        return;
      }
      logKaplayDebug("nav", "move-confirm", {
        direction: selectedExit.direction,
        roomId: selectedExit.roomId,
        feature: selectedExit.feature,
      });
      movePlayer(selectedExit.direction);
    };

    const openTalk = (item: ActionItem) => {
      cb.doAction(item.action);
      k.go("gridDialogue");
    };

    const render = () => {
      const startedAt = performance.now();
      const state = cb.getState();
      const depth = Number(state.status.depth ?? 0);
      const snapshot = state.engine.snapshot() as GameSnapshot;

      const worldSnapshot = getWorldSnapshot(state);
      const level = worldSnapshot.dungeon.levels[depth];
      const room = currentRoom(state);
      const exits = exitRows(state);
      lastExitRows = exits;
      const globalActions = globalNavigationActionItems(state).filter(
        (item) => {
          return item.available;
        }
      );
      const discovered = discoveredRoomIndices(state);
      const hostileRoomIds = new Set(
        Object.values(worldSnapshot.entities)
          .filter((entity) => {
            return (
              entity.depth === depth &&
              entity.health > 0 &&
              (entity.entityKind === "hostile" || entity.entityKind === "boss")
            );
          })
          .map((entity) => entity.roomId)
      );
      const roomActions = roomActionItems(state);
      const roomFeature = String(state.status.roomFeature ?? room.feature);
      const visibleRoomActions = filterNavigationRoomActions(
        roomFeature,
        roomActions
      );
      lastGlobalActions = globalActions;
      lastRoomActions = visibleRoomActions;
      const visibleGlobalActions = globalActions.slice(
        0,
        VISIBLE_GLOBAL_ACTION_LIMIT
      );
      const hasMoreGlobalActions =
        globalActions.length > VISIBLE_GLOBAL_ACTION_LIMIT;
      const visibleRoomActionsSlice = visibleRoomActions.slice(
        0,
        VISIBLE_ROOM_ACTION_LIMIT
      );
      const hasMoreRoomActions =
        visibleRoomActions.length > VISIBLE_ROOM_ACTION_LIMIT;
      const roomTitle = roomTitleFromLook(
        state.look,
        String(state.status.roomId ?? room.roomId)
      );
      const activeRoomId = String(state.status.roomId ?? room.roomId);
      const roomChanged = activeRoomId !== lastVisitedRoomId;
      if (roomChanged) {
        roomOverlayText = null;
        selectedExitIndex = 0;
      }
      if (selectedExitIndex >= exits.length) {
        selectedExitIndex = 0;
      }
      const selectedExit = exits[selectedExitIndex] ?? exits[0] ?? null;
      const frameX = PAD;
      const frameY = FRAME_Y;
      const frameW = FRAME_W;
      const frameH = FRAME_H;
      lastHeaderFrame = { x: frameX, y: frameY, width: frameW };
      if (!staticShellRendered) {
        clearUi(k);
        renderStaticShell();
        renderHeaderLayer();
        staticShellRendered = true;
      }

      const shellHeight = frameH - (TOP_PANEL_Y - frameY) - 10;

      const shell = computeShellLayout(
        frameX + 10,
        TOP_PANEL_Y,
        frameW - 20,
        0,
        NAV_RIGHT_W,
        PANEL_INSET,
        NAV_COLUMN_GAP
      );

      const centerPanelX = shell.centerX;
      const centerPanelY = shell.innerY + SHELL_INNER_PADDING;
      const centerPanelW = shell.centerWidth;
      const shellInnerHeight = shellHeight - PANEL_INSET * 2;
      const integratedPanelW = shell.centerWidth + NAV_COLUMN_GAP + NAV_RIGHT_W;
      const centerPanelH =
        shellInnerHeight -
        INFO_PANEL_H -
        INFO_PANEL_GAP -
        SHELL_INNER_PADDING * 2;
      const roomInfoPanelW = integratedPanelW - NAV_RIGHT_W - NAV_COLUMN_GAP;
      const infoPanelY = centerPanelY + centerPanelH + INFO_PANEL_GAP;
      const actionPanelX = shell.centerX + roomInfoPanelW + NAV_COLUMN_GAP;
      const exitRoomIds = new Set(
        exits.map((exit) => {
          return exit.roomId;
        })
      );
      const nextFloorRoomCacheKey = level
        ? floorRoomVisualCacheKey({
            rooms: Object.values(level.rooms),
            activeRoomId,
            selectedRoomId: selectedExit?.roomId ?? null,
            exitRoomIds,
            discoveredIndices: discovered,
            hostileRoomIds,
          })
        : "";
      const nextFloorRoomStructureKey = level
        ? JSON.stringify(
            Object.values(level.rooms)
              .map((levelRoom) => {
                return {
                  roomId: levelRoom.roomId,
                  row: levelRoom.row,
                  column: levelRoom.column,
                  feature: levelRoom.feature,
                };
              })
              .sort((left, right) => {
                if (left.row !== right.row) {
                  return left.row - right.row;
                }
                if (left.column !== right.column) {
                  return left.column - right.column;
                }
                return left.roomId.localeCompare(right.roomId);
              })
          )
        : "";
      let floorRooms: FloorRoomVisual[] = [];
      if (level) {
        if (nextFloorRoomCacheKey === lastFloorRoomCacheKey) {
          floorRooms = lastFloorRooms;
        } else {
          floorRooms = buildFloorRoomVisuals({
            rooms: Object.values(level.rooms),
            activeRoomId,
            selectedRoomId: selectedExit?.roomId ?? null,
            exitRoomIds,
            discoveredIndices: discovered,
            hostileRoomIds,
          });
        }
      }
      lastFloorRoomCacheKey = nextFloorRoomCacheKey;
      lastFloorRooms = floorRooms;
      lastActiveRoomId = activeRoomId;
      lastBoardOrigin = { x: centerPanelX, y: centerPanelY };
      lastCenterViewport = {
        x: centerPanelX,
        y: centerPanelY,
        width: centerPanelW,
        height: centerPanelH,
      };
      lastOverlayContext = {
        sceneState: state,
        snapshot,
        viewport: {
          x: frameX + NAV_OVERLAY_INSET,
          y: frameY + NAV_OVERLAY_INSET,
          width: frameW - NAV_OVERLAY_INSET * 2,
          height: frameH - NAV_OVERLAY_INSET * 2,
        },
        preparedSlots: preparedSpellSlots(state),
        spellPool: spellPoolRows(state),
      };

      const boardKey = `${nextFloorRoomCacheKey}|${activeRoomId}`;
      renderBoardLayer(
        centerPanelX,
        centerPanelY,
        centerPanelW,
        centerPanelH,
        floorRooms,
        activeRoomId,
        nextFloorRoomStructureKey,
        boardKey
      );
      renderDynamicSelection();

      renderOverlayLayer();

      const roomInfoLines = buildNavigationRoomInfoLines({
        roomDescription: room.description,
        roomTitle,
        roomFeature,
      });
      const actionKey = `${JSON.stringify(
        visibleGlobalActions.map((item) => ({
          label: formatActionButtonLabel(item),
          available: item.available,
        }))
      )}|more:${String(hasMoreGlobalActions)}`;
      renderActionsLayer(
        actionPanelX,
        infoPanelY,
        NAV_RIGHT_W,
        visibleGlobalActions,
        actionKey,
        hasMoreGlobalActions
      );
      const roomInfoKey = `${JSON.stringify(
        visibleRoomActionsSlice.map((item) => ({
          label: formatActionButtonLabel(item),
          available: item.available,
        }))
      )}|more:${String(hasMoreRoomActions)}`;
      renderRoomInfoLayer(
        shell.centerX,
        infoPanelY,
        roomInfoPanelW,
        roomTitle,
        roomFeature,
        roomInfoLines,
        visibleRoomActionsSlice,
        roomInfoKey,
        hasMoreRoomActions
      );
      renderRoomFindLayer(
        centerPanelX,
        centerPanelY,
        centerPanelW,
        roomOverlayText
      );

      if (roomChanged && activeRoomId !== lastAutoSearchRoomId) {
        const autoSearch = roomActions.find((item) => {
          return (
            item.action.kind === "player" &&
            item.available &&
            item.action.playerAction.actionType === ACTION_TYPE.SEARCH
          );
        });
        if (autoSearch) {
          lastAutoSearchRoomId = activeRoomId;
          queueMicrotask(() => {
            const feedCount = cb.feedLines.length;
            cb.doAction(autoSearch.action);
            const latestFeed = cb.feedLines.at(-1) ?? null;
            roomOverlayText =
              cb.feedLines.length > feedCount &&
              latestFeed &&
              SEARCH_FOUND_REGEX.test(latestFeed)
                ? latestFeed
                : null;
            scheduleRender();
          });
        }
      }
      lastVisitedRoomId = activeRoomId;
      const durationMs =
        Math.round((performance.now() - startedAt) * 100) / 100;
      if (durationMs >= 16) {
        recordKaplayDebug("nav", "render", {
          durationMs,
          overlay: overlayState.activeOverlay ?? "navigation",
          roomId: activeRoomId,
        });
      }
    };

    const moveKeys: Record<string, Direction> = {
      w: "north",
      a: "west",
      s: "south",
      d: "east",
      up: "north",
      left: "west",
      down: "south",
      right: "east",
    };

    for (const [key, direction] of Object.entries(moveKeys)) {
      k.onKeyPress(key as "w", () => {
        if (overlayState.activeOverlay === "menu_hub") {
          moveNavigationMenuSelection(
            direction === "north" || direction === "west" ? -1 : 1
          );
          return;
        }
        if (overlayState.activeOverlay) {
          return;
        }
        selectExitDirection(direction);
      });
    }
    k.onKeyPress("enter", () => {
      if (overlayState.activeOverlay === "menu_hub") {
        activateSelectedNavigationMenuEntry();
        return;
      }
      if (overlayState.activeOverlay) {
        return;
      }
      confirmSelectedMove();
    });
    k.onKeyPress("space", () => {
      if (overlayState.activeOverlay === "menu_hub") {
        activateSelectedNavigationMenuEntry();
        return;
      }
      if (overlayState.activeOverlay) {
        return;
      }
      confirmSelectedMove();
    });
    k.onKeyPress("tab", () => {
      openCommandMenu();
    });
    k.onButtonPress("start", () => {
      openCommandMenu();
    });

    k.onKeyPress("v", () => {
      openOverlay("stats");
    });
    k.onKeyPress("escape", () => {
      if (overlayState.activeOverlay) {
        closeOverlay();
      }
    });
    k.onKeyPress("m", () => openOverlay(null));
    k.onKeyPress("o", () => k.go("gridWorldMap"));
    k.onKeyPress("b", () => openOverlay("bag"));
    k.onKeyPress("j", () => openOverlay("journal"));
    k.onKeyPress("p", () => openSpellbookOverlay());
    k.onKeyPress("r", () => {
      openRuneForgeCodexOverlay();
    });
    k.onKeyPress("q", () => openOverlay("equipped"));
    k.onKeyPress("f", () => {
      if (hasEncounter(cb.getState())) {
        k.go("gridCombat");
      }
    });
    k.onKeyPress("t", () => k.go("gridDialogue"));
    k.onKeyPress("r", () => {
      if (inRuneForgeContext(cb.getState())) {
        k.go("gridRuneForge");
      }
    });

    cb.setRefresh(render);
    render();
  });
}
