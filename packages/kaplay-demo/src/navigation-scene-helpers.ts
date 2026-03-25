import {
  ACTION_TYPE,
  type ActionItem,
  currentHp,
  type EntityState,
} from "@dungeonbreak/engine";
import {
  resolveEntityPortraitSprite,
  resolvePresenceMarkerSprite,
} from "./content-visuals";
import type { Direction, FloorRoomVisual } from "./navigation-floor-model";
import { roomFeatureLabel } from "./navigation-panels";
import {
  FLOOR_MAP_LEFT_INSET,
  FLOOR_MAP_TOP_INSET,
  FLOOR_TILE_GAP_X,
  FLOOR_TILE_GAP_Y,
  FLOOR_TILE_H,
  FLOOR_TILE_W,
} from "./navigation-scene-constants";
import type {
  BoardRoomPosition,
  NavigationRoomInfoArgs,
  RoomFeatureBadge,
  RoomFeaturePalette,
  RoomPresenceSummary,
  ShellLayout,
} from "./navigation-scene-types";

const ROOM_ID_REGEX = /^L\d+_R\d+$/;

/** Matches engine copy from `performInventoryAction` when loot/crystals were taken, not "but finds nothing new". */
export function isSearchSuccessFeedLine(line: string): boolean {
  return line.toLowerCase().includes("searches the room and finds");
}

export function lightenColor(
  color: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    Math.min(255, color[0] + amount),
    Math.min(255, color[1] + amount),
    Math.min(255, color[2] + amount),
  ];
}

export function computeShellLayout(
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

export function directionGlyph(direction: Direction | null): string {
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

export function roomTitleFromLook(
  look: string,
  fallbackRoomId: string
): string {
  const firstLine = look
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !ROOM_ID_REGEX.test(line));
  return firstLine ?? fallbackRoomId;
}

export function buildNavigationRoomInfoLines(
  args: NavigationRoomInfoArgs
): string[] {
  const featureLine = roomFeatureLabel(args.roomFeature).toLowerCase();
  const descriptionLines = args.roomDescription
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
  const presenceParts: string[] = [];
  if ((args.bossCount ?? 0) > 0) {
    presenceParts.push(
      args.bossCount === 1
        ? `boss${args.bossName ? ` ${args.bossName}` : ""}`
        : `${String(args.bossCount)} bosses`
    );
  }
  if (args.hostileCount > 0) {
    presenceParts.push(
      args.hostileCount === 1
        ? `1 hostile${args.hostileName ? ` (${args.hostileName})` : ""}`
        : `${String(args.hostileCount)} hostiles`
    );
  }
  if (args.dungeoneerCount > 0) {
    presenceParts.push(
      args.dungeoneerCount === 1
        ? `1 dungeoneer${args.dungeoneerName ? ` (${args.dungeoneerName})` : ""}`
        : `${String(args.dungeoneerCount)} dungeoneers`
    );
  }
  const defaultLine =
    args.pressureLines[0] ??
    args.narrativeLines[0] ??
    descriptionLines[0] ??
    "No immediate details.";
  return [
    `${args.roomId} | Depth ${String(args.depth)} | ${args.roomStateLabel}`,
    presenceParts.length > 0
      ? `Presence: ${presenceParts.join(" | ")}`
      : "Presence: clear",
    defaultLine,
  ];
}

export function filterNavigationRoomActions(
  roomFeature: string,
  roomActions: ActionItem[]
): ActionItem[] {
  return roomActions.filter((item) => {
    if (!item.available || item.action.kind !== "player") {
      return false;
    }
    const actionType = item.action.playerAction.actionType;
    if (actionType === ACTION_TYPE.SEARCH) {
      return true;
    }
    if (actionType === ACTION_TYPE.TALK) {
      return roomFeature === "dialogue";
    }
    if (actionType === "train") {
      return roomFeature === "training";
    }
    if (actionType === ACTION_TYPE.REST) {
      return roomFeature === "rest";
    }
    if (actionType === "buy_item") {
      return true;
    }
    if (
      actionType === ACTION_TYPE.EVOLVE_SKILL ||
      actionType === "purchase" ||
      actionType === "re_equip"
    ) {
      return roomFeature === "rune_forge";
    }
    return false;
  });
}

export function featureBadge(feature: string): RoomFeatureBadge {
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

export function featureSurfacePalette(feature: string): RoomFeaturePalette {
  const badge = featureBadge(feature);
  return {
    discovered: [
      Math.max(46, Math.min(196, badge.color[0] - 18)),
      Math.max(38, Math.min(176, badge.color[1] - 18)),
      Math.max(34, Math.min(166, badge.color[2] - 18)),
    ],
    current: [
      Math.max(72, Math.min(224, badge.color[0] + 12)),
      Math.max(64, Math.min(210, badge.color[1] + 12)),
      Math.max(54, Math.min(198, badge.color[2] + 12)),
    ],
    hidden: [42, 31, 34],
  };
}

export function roomStateLabel(room: FloorRoomVisual): string {
  if (room.isCurrent) {
    return "current";
  }
  if (room.isBossRoom) {
    return "boss wing";
  }
  if (room.isSelected) {
    return "selected route";
  }
  if (room.isDiscovered) {
    return "discovered";
  }
  return "undiscovered";
}

export function buildRoomPresenceByRoomId(
  entities: Record<string, EntityState>,
  depth: number
): Map<string, RoomPresenceSummary> {
  const byRoomId = new Map<string, RoomPresenceSummary>();

  const ensureRoomSummary = (roomId: string): RoomPresenceSummary => {
    const existing = byRoomId.get(roomId);
    if (existing) {
      return existing;
    }
    const created: RoomPresenceSummary = {
      hostileCount: 0,
      hostileName: null,
      hostileSprite: null,
      hostileMarkerSprite: null,
      bossCount: 0,
      bossName: null,
      bossSprite: null,
      bossMarkerSprite: null,
      dungeoneerCount: 0,
      dungeoneerName: null,
      dungeoneerSprite: null,
      dungeoneerMarkerSprite: null,
    };
    byRoomId.set(roomId, created);
    return created;
  };

  for (const entity of Object.values(entities)) {
    if (entity.depth !== depth || currentHp(entity) <= 0 || entity.isPlayer) {
      continue;
    }
    const roomSummary = ensureRoomSummary(entity.roomId);
    const portraitSprite = resolveEntityPortraitSprite(
      entity.entityTypeId,
      entity.entityKind,
      entity.archetypeHeading
    );
    if (entity.entityKind === "boss") {
      roomSummary.bossCount += 1;
      roomSummary.bossName ??= entity.name;
      roomSummary.bossSprite ??= portraitSprite;
      roomSummary.bossMarkerSprite ??= portraitSprite;
      roomSummary.hostileCount += 1;
      roomSummary.hostileName ??= entity.name;
      roomSummary.hostileSprite = portraitSprite ?? roomSummary.hostileSprite;
      roomSummary.hostileMarkerSprite = resolvePresenceMarkerSprite("boss");
      continue;
    }
    if (entity.entityKind === "hostile") {
      roomSummary.hostileCount += 1;
      roomSummary.hostileName ??= entity.name;
      roomSummary.hostileSprite ??= portraitSprite;
      roomSummary.hostileMarkerSprite ??=
        resolvePresenceMarkerSprite("hostile");
      continue;
    }
    if (entity.entityKind === "dungeoneer") {
      roomSummary.dungeoneerCount += 1;
      roomSummary.dungeoneerName ??= entity.name;
      roomSummary.dungeoneerSprite ??= portraitSprite;
      roomSummary.dungeoneerMarkerSprite ??=
        resolvePresenceMarkerSprite("dungeoneer");
    }
  }

  return byRoomId;
}

export function roomTilePosition(
  x: number,
  y: number,
  room: { row: number; column: number }
): BoardRoomPosition {
  const tileOriginX = x + FLOOR_MAP_LEFT_INSET;
  const tileOriginY = y + FLOOR_MAP_TOP_INSET;
  return {
    x: tileOriginX + room.column * (FLOOR_TILE_W + FLOOR_TILE_GAP_X),
    y: tileOriginY + room.row * (FLOOR_TILE_H + FLOOR_TILE_GAP_Y),
  };
}

export function previewRoomTilePosition(
  rooms: FloorRoomVisual[],
  previewRoomId: string | null,
  activeRoomId: string,
  x: number,
  y: number
): BoardRoomPosition | null {
  const selectedRoom = previewRoomId
    ? (rooms.find(
        (room) => room.roomId === previewRoomId && room.roomId !== activeRoomId
      ) ?? null)
    : null;
  if (!selectedRoom) {
    return null;
  }
  return roomTilePosition(x, y, selectedRoom);
}

export function directionFallbackOrder(direction: Direction): Direction[] {
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
