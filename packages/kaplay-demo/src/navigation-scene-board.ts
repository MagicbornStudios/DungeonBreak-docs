import type { KAPLAYCtx } from "kaplay";
import { resolveEntityCombatSprite } from "./content-visuals";
import {
  FLOOR_TILE_H,
  FLOOR_TILE_W,
  NAV_BOARD_BASE_TAG,
  NAV_BOARD_DECOR_TAG,
} from "./navigation-scene-constants";
import {
  directionGlyph,
  featureBadge,
  featureSurfacePalette,
  lightenColor,
  roomTilePosition,
} from "./navigation-scene-helpers";
import {
  createRoomDecorationNodes,
  renderFloorMapBase,
} from "./navigation-scene-rendering";
import type {
  BoardRoomPosition,
  ColorableNode,
  PlayerDecorationNodes,
  PositionableNode,
  RoomDecorationNodes,
  RoomPresenceSummary,
} from "./navigation-scene-types";
import type { FloorRoomVisual } from "./navigation-floor-model";

export interface BoardDecorationState {
  playerDecorationNodes: PlayerDecorationNodes | null;
  roomDecorationNodes: Map<string, RoomDecorationNodes>;
}

export interface RebuildBoardDecorationsOptions {
  centerPanelX: number;
  centerPanelY: number;
  floorRooms: FloorRoomVisual[];
  hoveredRoomId: string | null;
  onHoverRoom: (roomId: string | null) => void;
  onSelectRoom: (roomId: string) => void;
  roomPresenceByRoomId: ReadonlyMap<string, RoomPresenceSummary>;
}

export interface RenderBoardLayerOptions {
  activeRoomId: string;
  boardKey: string;
  boardRenderKey: string;
  centerPanelH: number;
  centerPanelW: number;
  centerPanelX: number;
  centerPanelY: number;
  decorationState: BoardDecorationState;
  floorRooms: FloorRoomVisual[];
  roomPresenceByRoomId: ReadonlyMap<string, RoomPresenceSummary>;
  structureKey: string;
  lastBoardStructureKey: string;
}

export interface RenderBoardLayerResult {
  boardRenderKey: string;
  boardStructureKey: string;
  decorationState: BoardDecorationState;
}

function createPlayerDecorationNodes(
  k: KAPLAYCtx
): PlayerDecorationNodes | null {
  const playerSprite = resolveEntityCombatSprite(
    "human",
    "player",
    undefined,
    false
  );
  if (!playerSprite) {
    return null;
  }
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
  return { shadow, sprite, motion };
}

export function rebuildBoardDecorationNodes(
  k: KAPLAYCtx,
  options: RebuildBoardDecorationsOptions
): BoardDecorationState {
  const roomDecorationNodes = new Map(
    options.floorRooms.map((room) => {
      const position = roomTilePosition(
        options.centerPanelX,
        options.centerPanelY,
        room
      );
      const presence = options.roomPresenceByRoomId.get(room.roomId);
      return [
        room.roomId,
        createRoomDecorationNodes(k, {
          tileX: position.x,
          tileY: position.y,
          hostileSprite: presence?.hostileSprite ?? null,
          dungeoneerSprite: presence?.dungeoneerSprite ?? null,
          onHoverStart: () => {
            if (options.hoveredRoomId !== room.roomId) {
              options.onHoverRoom(room.roomId);
            }
          },
          onHoverEnd: () => {
            if (options.hoveredRoomId === room.roomId) {
              options.onHoverRoom(null);
            }
          },
          onClick: () => {
            options.onSelectRoom(room.roomId);
            options.onHoverRoom(room.roomId);
          },
          tag: NAV_BOARD_DECOR_TAG,
        }),
      ] as const;
    })
  );

  return {
    playerDecorationNodes: createPlayerDecorationNodes(k),
    roomDecorationNodes,
  };
}

export function updateBoardDecorations(
  k: KAPLAYCtx,
  options: {
    activeRoomId: string;
    centerPanelX: number;
    centerPanelY: number;
    decorationState: BoardDecorationState;
    floorRooms: FloorRoomVisual[];
  }
): void {
  for (const room of options.floorRooms) {
    const nodes = options.decorationState.roomDecorationNodes.get(room.roomId);
    if (!nodes) {
      continue;
    }
    const position = roomTilePosition(
      options.centerPanelX,
      options.centerPanelY,
      room
    );
    const palette = featureSurfacePalette(room.feature);
    let baseFill: [number, number, number] = palette.hidden;
    if (room.isCurrent) {
      baseFill = palette.current;
    } else if (room.isDiscovered || room.isSelected) {
      baseFill = palette.discovered;
    } else if (room.isExitTarget) {
      baseFill = lightenColor(palette.hidden, 12);
    }
    if (room.isExitTarget && !room.isCurrent) {
      baseFill = lightenColor(baseFill, 10);
    }
    const showFill = room.isCurrent || room.isExitTarget || room.isDiscovered;
    nodes.fill.color = k.rgb(baseFill[0], baseFill[1], baseFill[2]);
    nodes.fill.opacity = showFill ? 1 : 0;
    nodes.stripe.color = k.rgb(
      palette.current[0],
      palette.current[1],
      palette.current[2]
    );
    nodes.stripe.opacity = room.isCurrent ? 1 : 0;
    nodes.hostileBorder.opacity = room.hasHostile ? 1 : 0;

    const showBadge = room.isDiscovered || room.isCurrent || room.isSelected;
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

    const hostileMarker = nodes.hostileMarker;
    if (hostileMarker) {
      hostileMarker.shadow.pos = k.vec2(position.x + 8, position.y + 22);
      hostileMarker.motion.x = position.x + 15;
      hostileMarker.motion.baseY = position.y + FLOOR_TILE_H / 2 + 1;
      hostileMarker.shadow.opacity = room.hasHostile ? 0.52 : 0;
      hostileMarker.icon.opacity = room.hasHostile ? 1 : 0;
      hostileMarker.label.text =
        room.hostileCount > 1 ? String(room.hostileCount) : "";
      hostileMarker.label.pos = k.vec2(position.x + 24, position.y + 8);
      hostileMarker.label.opacity = room.hostileCount > 1 ? 1 : 0;
    }

    const dungeoneerMarker = nodes.dungeoneerMarker;
    if (dungeoneerMarker) {
      dungeoneerMarker.shadow.pos = k.vec2(
        position.x + FLOOR_TILE_W - 22,
        position.y + 22
      );
      dungeoneerMarker.motion.x = position.x + FLOOR_TILE_W - 15;
      dungeoneerMarker.motion.baseY = position.y + FLOOR_TILE_H / 2 + 1;
      dungeoneerMarker.shadow.opacity = room.hasDungeoneer ? 0.46 : 0;
      dungeoneerMarker.icon.opacity = room.hasDungeoneer ? 1 : 0;
      dungeoneerMarker.label.text =
        room.dungeoneerCount > 1 ? String(room.dungeoneerCount) : "";
      dungeoneerMarker.label.pos = k.vec2(
        position.x + FLOOR_TILE_W - 6,
        position.y + 8
      );
      dungeoneerMarker.label.opacity = room.dungeoneerCount > 1 ? 1 : 0;
    }

    if (room.hasHostile && room.hostileIntent) {
      nodes.intentText.text = directionGlyph(room.hostileIntent);
      nodes.intentText.opacity = 1;
    } else {
      nodes.intentText.text = "";
      nodes.intentText.opacity = 0;
    }
    nodes.intentText.pos = k.vec2(
      position.x + FLOOR_TILE_W - 16,
      position.y + 4
    );
  }

  const playerDecorationNodes = options.decorationState.playerDecorationNodes;
  if (!playerDecorationNodes) {
    return;
  }
  const currentRoom =
    options.floorRooms.find((room) => room.roomId === options.activeRoomId) ??
    null;
  if (!currentRoom) {
    playerDecorationNodes.shadow.opacity = 0;
    playerDecorationNodes.sprite.opacity = 0;
    playerDecorationNodes.motion.x = -1000;
    playerDecorationNodes.motion.baseY = -1000;
    return;
  }
  const playerTile = roomTilePosition(
    options.centerPanelX,
    options.centerPanelY,
    currentRoom
  );
  const playerX = playerTile.x + FLOOR_TILE_W / 2;
  const playerY = playerTile.y + FLOOR_TILE_H / 2 + 2;
  playerDecorationNodes.shadow.pos = k.vec2(playerX - 9, playerY + 8);
  playerDecorationNodes.shadow.opacity = 0.65;
  playerDecorationNodes.sprite.opacity = 1;
  playerDecorationNodes.motion.x = playerX;
  playerDecorationNodes.motion.baseY = playerY - 3;
}

export function renderBoardLayer(
  k: KAPLAYCtx,
  options: RenderBoardLayerOptions
): RenderBoardLayerResult {
  let nextDecorationState = options.decorationState;
  let nextBoardStructureKey = options.lastBoardStructureKey;
  let nextBoardRenderKey = options.boardRenderKey;

  if (options.structureKey !== options.lastBoardStructureKey) {
    renderFloorMapBase(k, {
      x: options.centerPanelX,
      y: options.centerPanelY,
      width: options.centerPanelW,
      height: options.centerPanelH,
      rooms: options.floorRooms,
      tag: NAV_BOARD_BASE_TAG,
    });
    nextDecorationState = rebuildBoardDecorationNodes(k, {
      centerPanelX: options.centerPanelX,
      centerPanelY: options.centerPanelY,
      floorRooms: options.floorRooms,
      hoveredRoomId: null,
      onHoverRoom: () => undefined,
      onSelectRoom: () => undefined,
      roomPresenceByRoomId: options.roomPresenceByRoomId,
    });
    nextBoardStructureKey = options.structureKey;
    nextBoardRenderKey = "";
  }

  if (options.boardKey !== nextBoardRenderKey) {
    updateBoardDecorations(k, {
      activeRoomId: options.activeRoomId,
      centerPanelX: options.centerPanelX,
      centerPanelY: options.centerPanelY,
      decorationState: nextDecorationState,
      floorRooms: options.floorRooms,
    });
    nextBoardRenderKey = options.boardKey;
  }

  return {
    boardRenderKey: nextBoardRenderKey,
    boardStructureKey: nextBoardStructureKey,
    decorationState: nextDecorationState,
  };
}
