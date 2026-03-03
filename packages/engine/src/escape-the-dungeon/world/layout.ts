import type { Dungeon, EntityState, MoveDirection, RoomNode, Vec3, Transform3d } from "../core/types";

export type LayoutExit = {
  direction: MoveDirection;
  depth: number;
  roomId: string;
};

export type LayoutRoomItem = {
  itemId: string;
  name: string;
  tags: string[];
  isPresent: boolean;
  transform: Transform3d | null;
};

export type LayoutRoom = {
  roomId: string;
  depth: number;
  row: number;
  column: number;
  index: number;
  feature: string;
  size: Vec3;
  transform: Transform3d;
  exits: LayoutExit[];
  items: LayoutRoomItem[];
};

export type LayoutLevel = {
  depth: number;
  rows: number;
  columns: number;
  size: Vec3;
  transform: Transform3d;
  rooms: LayoutRoom[];
};

export type LayoutDungeon = {
  title: string;
  size: Vec3;
  transform: Transform3d;
  totalLevels: number;
  startDepth: number;
  startRoomId: string;
  escapeDepth: number;
  escapeRoomId: string;
  levels: LayoutLevel[];
};

export type LayoutEntity = {
  entityId: string;
  name: string;
  entityKind: EntityState["entityKind"];
  isPlayer: boolean;
  depth: number;
  roomId: string;
  transform: Transform3d;
};

export type DungeonLayoutSnapshot = {
  dungeon: LayoutDungeon;
  entities: LayoutEntity[];
};

const mapExits = (room: RoomNode): LayoutExit[] => {
  const exits: LayoutExit[] = [];
  for (const [direction, target] of Object.entries(room.exits)) {
    if (!target) continue;
    exits.push({
      direction: direction as MoveDirection,
      depth: target.depth,
      roomId: target.roomId,
    });
  }
  return exits;
};

export const buildDungeonLayoutSnapshot = (
  dungeon: Dungeon,
  entities: Record<string, EntityState> = {},
): DungeonLayoutSnapshot => {
  const levels = Object.values(dungeon.levels)
    .sort((a, b) => b.depth - a.depth)
    .map((level) => ({
      depth: level.depth,
      rows: level.rows,
      columns: level.columns,
      size: level.size,
      transform: level.transform,
      rooms: Object.values(level.rooms).map((room) => ({
        roomId: room.roomId,
        depth: room.depth,
        row: room.row,
        column: room.column,
        index: room.index,
        feature: room.feature,
        size: room.size,
        transform: room.transform,
        exits: mapExits(room),
        items: room.items.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          tags: [...item.tags],
          isPresent: item.isPresent,
          transform: item.transform ?? null,
        })),
      })),
    }));

  const entityList = Object.values(entities).map((entity) => ({
    entityId: entity.entityId,
    name: entity.name,
    entityKind: entity.entityKind,
    isPlayer: entity.isPlayer,
    depth: entity.depth,
    roomId: entity.roomId,
    transform: entity.transform,
  }));

  return {
    dungeon: {
      title: dungeon.title,
      size: dungeon.size,
      transform: dungeon.transform,
      totalLevels: dungeon.totalLevels,
      startDepth: dungeon.startDepth,
      startRoomId: dungeon.startRoomId,
      escapeDepth: dungeon.escapeDepth,
      escapeRoomId: dungeon.escapeRoomId,
      levels,
    },
    entities: entityList,
  };
};
