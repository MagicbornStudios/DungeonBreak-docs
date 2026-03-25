import type { ActionItem, GameSnapshot } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import type { Direction, FloorRoomVisual } from "./navigation-floor-model";
import type { preparedSpellSlots, spellPoolRows } from "./navigation-helpers";
import type { SceneCallbacks } from "./scene-contracts";
import type { UiTone } from "./shared";
import type { drawButtonSurfaceAtom } from "./ui/atoms";

export type AddedNode = ReturnType<KAPLAYCtx["add"]>;

export interface OverlayViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayRenderContext {
  sceneState: ReturnType<SceneCallbacks["getState"]>;
  snapshot: GameSnapshot;
  viewport: OverlayViewport;
  preparedSlots: ReturnType<typeof preparedSpellSlots>;
  spellPool: ReturnType<typeof spellPoolRows>;
}

export interface SelectionOverlayNodes {
  halo: PositionableNode & ColorableNode;
  fill: AddedNode;
  stripe: AddedNode;
  border: AddedNode;
  label: TextDecorationNode;
}

export type PositionableNode = AddedNode & {
  pos: ReturnType<KAPLAYCtx["vec2"]>;
};
export type ColorableNode = AddedNode & {
  color: ReturnType<KAPLAYCtx["rgb"]>;
  opacity: number;
};
export type ButtonNode = ReturnType<typeof drawButtonSurfaceAtom> & {
  color: ReturnType<KAPLAYCtx["rgb"]>;
  opacity: number;
  shadowNode: ColorableNode;
};
export type TextDecorationNode = PositionableNode &
  ColorableNode & {
    text: string;
  };

export interface FloatingMarkerNodes {
  shadow: PositionableNode & ColorableNode;
  icon: PositionableNode & { opacity: number };
  label: TextDecorationNode;
  motion: { x: number; baseY: number };
}

export interface RoomDecorationNodes {
  fill: ColorableNode;
  stripe: ColorableNode;
  hostileBorder: ColorableNode;
  badgeRect: ColorableNode;
  badgeText: TextDecorationNode;
  tileIcon: PositionableNode & { opacity: number };
  intentText: TextDecorationNode;
  hoverArea: AddedNode;
  bossMarker: FloatingMarkerNodes | null;
  hostileMarker: FloatingMarkerNodes | null;
  dungeoneerMarker: FloatingMarkerNodes | null;
}

export interface PlayerDecorationNodes {
  shadow: PositionableNode & ColorableNode;
  sprite: PositionableNode & { opacity: number };
  motion: { x: number; baseY: number };
}

export interface RoomPresenceSummary {
  hostileCount: number;
  hostileName: string | null;
  hostileSprite: string | null;
  hostileMarkerSprite: string | null;
  bossCount: number;
  bossName: string | null;
  bossSprite: string | null;
  bossMarkerSprite: string | null;
  dungeoneerCount: number;
  dungeoneerName: string | null;
  dungeoneerSprite: string | null;
  dungeoneerMarkerSprite: string | null;
}

export interface ActionPanelTextNodes {
  title: TextDecorationNode;
  emptyLabel: TextDecorationNode;
}

export interface RoomInfoTextNodes {
  badgeRect: ColorableNode;
  badgeText: TextDecorationNode;
  portraitShadow: ColorableNode;
  portraitFrame: ColorableNode;
  portraitPlate: ColorableNode;
  portraitEyebrow: TextDecorationNode;
  portraitSceneBackplate: PositionableNode & { opacity: number };
  portraitVisual: PositionableNode & { opacity: number };
  title: TextDecorationNode;
  subtitle: TextDecorationNode;
  lines: TextDecorationNode[];
  actionsLabel: TextDecorationNode;
}

export interface PersistentButtonSlotState {
  badgeLabel: string | null;
  label: string;
  enabled: boolean;
  tone: UiTone;
  visible: boolean;
  onClick: (() => void) | null;
}

export interface PersistentButtonSlot {
  state: PersistentButtonSlotState;
  badgeRect: ColorableNode;
  badgeText: TextDecorationNode;
  shadow: ColorableNode;
  button: ButtonNode;
  labelNode: TextDecorationNode;
}

export interface ShellLayout {
  leftX: number;
  centerX: number;
  rightX: number;
  innerY: number;
  centerWidth: number;
}

export interface BagOverlayEntry {
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

export interface NavigationRoomInfoArgs {
  roomDescription: string;
  roomTitle: string;
  roomFeature: string;
  narrativeLines: string[];
  pressureLines: string[];
  roomId: string;
  depth: number;
  roomStateLabel: string;
  hostileCount: number;
  hostileName?: string | null;
  bossCount?: number;
  bossName?: string | null;
  dungeoneerCount: number;
  dungeoneerName?: string | null;
}

export interface RoomFeatureBadge {
  label: string;
  color: [number, number, number];
}

export interface RoomFeaturePalette {
  discovered: [number, number, number];
  current: [number, number, number];
  hidden: [number, number, number];
}

export interface BoardRoomPosition {
  x: number;
  y: number;
}

export interface DrawEmbeddedAreaOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  color: [number, number, number];
  opacity?: number;
  tag?: string;
}

export interface RoomDecorationOptions {
  tileX: number;
  tileY: number;
  roomFeature: string;
  tileIconSprite: string | null;
  bossSprite: string | null;
  hostileSprite: string | null;
  dungeoneerSprite: string | null;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  tag: string;
}

export interface RoomPortraitOptions {
  portraitSpriteName: string | null;
  portraitFallbackFeature: string;
  isBossRoom: boolean;
  isExitTarget: boolean;
  portraitEyebrow: string;
  portraitFrameColor: [number, number, number];
  portraitPlateColor: [number, number, number];
  portraitShadowColor: [number, number, number];
  portraitScale: number;
  portraitOffsetX: number;
  portraitOffsetY: number;
  sceneBackplateOpacity: number;
}

export interface BoardRenderOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  rooms: FloorRoomVisual[];
  tag?: string;
}

export interface RoomFindOverlayOptions {
  x: number;
  y: number;
  width: number;
  text: string;
  tag?: string;
}

export type NavigationDirection = Direction;
