import { DeterministicRng } from "../core/rng";
import { DUNGEON_LAYOUT_PACK, ROOM_TEMPLATES } from "../contracts";
import {
  type Dungeon,
  type GameConfig,
  type Level,
  type MoveDirection,
  type RoomFeature,
  type RoomItemState,
  type RoomNode,
  createTransform,
  createVec3,
  TRAIT_NAMES,
  type TraitName,
  type TraitVector,
} from "../core/types";

export const ROOM_FEATURE_CORRIDOR = "corridor" as const;
export const ROOM_FEATURE_START = "start" as const;
export const ROOM_FEATURE_EXIT = "exit" as const;
export const ROOM_FEATURE_STAIRS_UP = "stairs_up" as const;
export const ROOM_FEATURE_STAIRS_DOWN = "stairs_down" as const;
export const ROOM_FEATURE_ESCAPE_GATE = "escape_gate" as const;
export const ROOM_FEATURE_TRAINING = "training" as const;
export const ROOM_FEATURE_DIALOGUE = "dialogue" as const;
export const ROOM_FEATURE_REST = "rest" as const;
export const ROOM_FEATURE_TREASURE = "treasure" as const;
export const ROOM_FEATURE_RUNE_FORGE = "rune_forge" as const;
export const ROOM_FEATURE_COMBAT = "combat" as const;

const EXTRA_FEATURES: RoomFeature[] = [
  ROOM_FEATURE_TRAINING,
  ROOM_FEATURE_DIALOGUE,
  ROOM_FEATURE_REST,
  ROOM_FEATURE_COMBAT,
];

const createVector = (overrides: Partial<TraitVector> = {}): TraitVector => {
  const vector = {} as TraitVector;
  for (const trait of TRAIT_NAMES) {
    vector[trait] = overrides[trait] ?? 0;
  }
  return vector;
};

const roomIdFor = (depth: number, index: number): string => {
  return `L${depth.toString().padStart(2, "0")}_R${index.toString().padStart(3, "0")}`;
};

const indexToRowCol = (index: number, columns: number): { row: number; column: number } => {
  return {
    row: Math.floor(index / columns),
    column: index % columns,
  };
};

const baseVectorForFeature = (feature: RoomFeature): TraitVector => {
  const match = ROOM_TEMPLATES.templates.find((template) => template.feature === feature);
  if (!match) {
    return createVector();
  }
  return createVector(match.baseVector as Partial<TraitVector>);
};

const itemsForRoom = (feature: RoomFeature, depth: number, index: number): RoomItemState[] => {
  const vector = (values: Partial<TraitVector>): Record<string, number> => {
    const next: Record<string, number> = {};
    for (const [key, value] of Object.entries(values)) {
      next[key] = Number(value);
    }
    return next;
  };

  if (feature === ROOM_FEATURE_TREASURE) {
    const weaponTiers = ["common", "rare", "epic", "legendary"] as const;
    const tierIndex = Math.min(Math.floor((depth + index) / 12), weaponTiers.length - 1);
    const tier = weaponTiers[tierIndex] as "common" | "rare" | "epic" | "legendary";
    const tierDelta: Record<typeof tier, Record<string, number>> = {
      common: vector({ Direction: 0.05, Survival: 0.05 }),
      rare: vector({ Direction: 0.1, Survival: 0.1 }),
      epic: vector({ Direction: 0.16, Survival: 0.14 }),
      legendary: vector({ Direction: 0.24, Survival: 0.22, Projection: 0.08 }),
    };
    return [
      {
        itemId: `treasure_cache_${depth}_${index}`,
        name: "Treasure Cache",
        rarity: "rare",
        description: "A sealed chest filled with useful salvage.",
        tags: ["treasure", "loot"],
        vectorDelta: vector({ Projection: 0.4, Survival: 0.2 }),
        isPresent: true,
        transform: createTransform(),
      },
      {
        itemId: `weapon_${tier}_${depth}_${index}`,
        name: `${tier.charAt(0).toUpperCase()}${tier.slice(1)} Weapon`,
        rarity: tier,
        description: `A ${tier} weapon recovered from the dungeon.`,
        tags: ["weapon", "loot", tier],
        vectorDelta: tierDelta[tier],
        isPresent: true,
        transform: createTransform(),
      },
    ];
  }

  if (feature === ROOM_FEATURE_COMBAT) {
    return [
      {
        itemId: `worn_blade_${depth}_${index}`,
        name: "Worn Blade",
        rarity: "common",
        description: "Old steel, but still sharp enough to matter.",
        tags: ["weapon"],
        vectorDelta: vector({ Direction: 0.15, Survival: 0.15 }),
        isPresent: true,
        transform: createTransform(),
      },
    ];
  }

  return [];
};

const assignSpecialFeatures = (
  roomCount: number,
  startIdx: number,
  exitIdx: number,
  rng: DeterministicRng,
  treasureCount: number,
  runeForgeCount: number,
): Record<number, RoomFeature> => {
  const pool: number[] = [];
  for (let i = 0; i < roomCount; i += 1) {
    if (i !== startIdx && i !== exitIdx) {
      pool.push(i);
    }
  }

  const shuffled = rng.shuffle(pool);
  const result: Record<number, RoomFeature> = {};
  let cursor = 0;

  const safeTreasureCount = Math.max(0, Math.min(treasureCount, shuffled.length));
  for (let i = 0; i < safeTreasureCount; i += 1) {
    result[shuffled[cursor] as number] = ROOM_FEATURE_TREASURE;
    cursor += 1;
  }

  const safeRuneCount = Math.max(0, Math.min(runeForgeCount, shuffled.length - cursor));
  for (let i = 0; i < safeRuneCount; i += 1) {
    result[shuffled[cursor] as number] = ROOM_FEATURE_RUNE_FORGE;
    cursor += 1;
  }

  for (const feature of EXTRA_FEATURES) {
    if (cursor >= shuffled.length) {
      break;
    }
    result[shuffled[cursor] as number] = feature;
    cursor += 1;
  }

  return result;
};

const buildDungeonWorldFromPack = (config: GameConfig): Dungeon | null => {
  const packed = DUNGEON_LAYOUT_PACK.dungeons[0];
  if (!packed) return null;

  const vec3FromPack = (value: { x: number; y: number; z: number }) =>
    createVec3(value.x, value.y, value.z);
  const transformFromPack = (value?: {
    position: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
  }) =>
    createTransform({
      position: value?.position ? vec3FromPack(value.position) : undefined,
      rotation: value?.rotation ? vec3FromPack(value.rotation) : undefined,
      scale: value?.scale ? vec3FromPack(value.scale) : undefined,
    });

  const sortedLevels = [...packed.levels].sort((a, b) => b.depth - a.depth);
  const maxDepth = sortedLevels[0]?.depth ?? 1;
  const levels: Record<number, Level> = {};
  const roomSize = createVec3(packed.roomSize.x, packed.roomSize.y, packed.roomSize.z);
  const levelSpacing = packed.levelSpacing;
  const origin = createVec3(packed.dungeonOrigin.x, packed.dungeonOrigin.y, packed.dungeonOrigin.z);
  let zCursor = origin.z;

  for (const levelPack of sortedLevels) {
    const chapterNumber = maxDepth - levelPack.depth + 1;
    const levelHeightScale = levelPack.heightScale ?? levelPack.transform?.scale?.y ?? 1;
    const scaledRoomSize = createVec3(roomSize.x, roomSize.y * levelHeightScale, roomSize.z);
    const levelOrigin = levelPack.transform?.position
      ? vec3FromPack(levelPack.transform.position)
      : createVec3(origin.x, origin.y, zCursor);
    const rooms: Record<string, RoomNode> = {};
    for (const roomPack of levelPack.rooms) {
      const feature = roomPack.feature as RoomFeature;
      const roomId = roomPack.roomId;
      const baseVector = roomPack.baseVector
        ? createVector(roomPack.baseVector as Partial<TraitVector>)
        : baseVectorForFeature(feature);
      rooms[roomId] = {
        roomId,
        depth: levelPack.depth,
        chapterNumber,
        row: roomPack.row,
        column: roomPack.column,
        index: roomPack.index,
        feature,
        description:
          roomPack.description ??
          (roomPack.name ? `${roomPack.name}.` : undefined) ??
          `Depth ${levelPack.depth}, room ${roomPack.index + 1}/${levelPack.rooms.length}. Feature: ${feature.replaceAll("_", " ")}.`,
        baseVector,
        items: roomPack.items.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          rarity: item.rarity,
          description: item.description,
          tags: [...item.tags],
          vectorDelta: { ...item.vectorDelta },
          isPresent: item.isPresent,
          transform: transformFromPack(item.transform),
        })),
        exits: {},
        size: scaledRoomSize,
        transform:
          roomPack.transform != null
            ? transformFromPack(roomPack.transform)
            : createTransform({
                position: createVec3(
                  levelOrigin.x + roomPack.column * scaledRoomSize.x,
                  levelOrigin.y + roomPack.row * scaledRoomSize.y,
                  levelOrigin.z,
                ),
                scale: createVec3(1, levelHeightScale, 1),
              }),
      };
    }

    for (const roomPack of levelPack.rooms) {
      const room = rooms[roomPack.roomId];
      if (!room) continue;
      for (const exit of roomPack.exits) {
        room.exits[exit.direction as MoveDirection] = {
          depth: exit.depth,
          roomId: exit.roomId,
        };
      }
    }

    levels[levelPack.depth] = {
      depth: levelPack.depth,
      chapterNumber,
      rows: levelPack.rows,
      columns: levelPack.columns,
      rooms,
      startRoomId:
        levelPack.depth === packed.startDepth
          ? packed.startRoomId
          : roomIdFor(levelPack.depth, 0),
      exitRoomId:
        levelPack.depth === packed.escapeDepth
          ? packed.escapeRoomId
          : roomIdFor(levelPack.depth, levelPack.rooms.length - 1),
      size: createVec3(
        levelPack.columns * scaledRoomSize.x,
        levelPack.rows * scaledRoomSize.y,
        scaledRoomSize.z,
      ),
      transform:
        levelPack.transform != null
          ? transformFromPack(levelPack.transform)
          : createTransform({
              position: levelOrigin,
              scale: createVec3(1, levelHeightScale, 1),
            }),
    };
    zCursor += scaledRoomSize.z + levelSpacing;
  }

  const totalLevels = sortedLevels.length;
  const minDepth = Math.min(...sortedLevels.map((l) => l.depth));
  return {
    title: packed.title,
    totalLevels,
    chaptersPerAct: config.chaptersPerAct,
    levels,
    startDepth: packed.startDepth,
    startRoomId: packed.startRoomId,
    escapeDepth: packed.escapeDepth,
    escapeRoomId: packed.escapeRoomId,
    size: createVec3(
      (sortedLevels[0]?.columns ?? config.levelColumns) * roomSize.x,
      (sortedLevels[0]?.rows ?? config.levelRows) * roomSize.y,
      zCursor - origin.z,
    ),
    transform: createTransform({ position: origin }),
  };
};

export const buildDungeonWorld = (
  config: GameConfig,
  rng = new DeterministicRng(config.randomSeed),
): Dungeon => {
  const packed = buildDungeonWorldFromPack(config);
  if (packed) return packed;

  const levels: Record<number, Level> = {};

  const rows = config.levelRows;
  const columns = config.levelColumns;
  const roomSize = config.roomSize ?? createVec3(14, 10, 6);
  const levelSpacing = config.levelSpacing ?? 12;
  const dungeonOrigin = config.dungeonOrigin ?? createVec3(0, 0, 0);
  const roomCount = config.roomsPerLevel;
  if (rows * columns !== roomCount) {
    throw new Error(`Invalid room grid: ${rows}x${columns} != ${roomCount}`);
  }

  for (let depth = config.totalLevels; depth >= 1; depth -= 1) {
    const chapterNumber = config.totalLevels - depth + 1;
    const startIdx = 0;
    const exitIdx = roomCount - 1;
    const levelIndex = config.totalLevels - depth;
    const levelOrigin = createVec3(
      dungeonOrigin.x,
      dungeonOrigin.y,
      dungeonOrigin.z + levelIndex * levelSpacing,
    );
    const specialFeatures = assignSpecialFeatures(
      roomCount,
      startIdx,
      exitIdx,
      rng,
      config.treasureRoomsPerLevel,
      config.runeForgeRoomsPerLevel,
    );

    const rooms: Record<string, RoomNode> = {};

    for (let index = 0; index < roomCount; index += 1) {
      const { row, column } = indexToRowCol(index, columns);
      const roomId = roomIdFor(depth, index);

      let feature: RoomFeature = ROOM_FEATURE_CORRIDOR;
      if (index === startIdx) {
        feature = depth === config.totalLevels ? ROOM_FEATURE_START : ROOM_FEATURE_STAIRS_DOWN;
      } else if (index === exitIdx) {
        feature = depth === 1 ? ROOM_FEATURE_ESCAPE_GATE : ROOM_FEATURE_STAIRS_UP;
      } else if (specialFeatures[index]) {
        feature = specialFeatures[index] as RoomFeature;
      }

      rooms[roomId] = {
        roomId,
        depth,
        chapterNumber,
        row,
        column,
        index,
        feature,
        description: `Depth ${depth}, room ${index + 1}/${roomCount}. Feature: ${feature.replaceAll("_", " ")}.`,
        baseVector: baseVectorForFeature(feature),
        items: itemsForRoom(feature, depth, index),
        exits: {},
        size: roomSize,
        transform: createTransform({
          position: createVec3(
            levelOrigin.x + column * roomSize.x,
            levelOrigin.y + row * roomSize.y,
            levelOrigin.z,
          ),
        }),
      };
    }

    for (let index = 0; index < roomCount; index += 1) {
      const { row, column } = indexToRowCol(index, columns);
      const roomId = roomIdFor(depth, index);
      const room = rooms[roomId] as RoomNode;

      if (row > 0) {
        room.exits.north = { depth, roomId: roomIdFor(depth, index - columns) };
      }
      if (row < rows - 1) {
        room.exits.south = { depth, roomId: roomIdFor(depth, index + columns) };
      }
      if (column > 0) {
        room.exits.west = { depth, roomId: roomIdFor(depth, index - 1) };
      }
      if (column < columns - 1) {
        room.exits.east = { depth, roomId: roomIdFor(depth, index + 1) };
      }

      const center = createVec3(
        room.transform.position.x + room.size.x / 2,
        room.transform.position.y + room.size.y / 2,
        room.transform.position.z + room.size.z / 2,
      );
      room.items.forEach((item, itemIndex) => {
        const offset = createVec3((itemIndex - 0.5) * 2, 0, 0);
        item.transform = createTransform({
          position: createVec3(center.x + offset.x, center.y + offset.y, center.z),
        });
      });
    }

    levels[depth] = {
      depth,
      chapterNumber,
      rows,
      columns,
      rooms,
      startRoomId: roomIdFor(depth, startIdx),
      exitRoomId: roomIdFor(depth, exitIdx),
      size: createVec3(columns * roomSize.x, rows * roomSize.y, roomSize.z),
      transform: createTransform({ position: levelOrigin }),
    };
  }

  for (let depth = config.totalLevels; depth > 1; depth -= 1) {
    const level = levels[depth] as Level;
    const upper = levels[depth - 1] as Level;
    const exitRoom = level.rooms[level.exitRoomId] as RoomNode;
    const upperStart = upper.rooms[upper.startRoomId] as RoomNode;
    exitRoom.exits.up = { depth: depth - 1, roomId: upper.startRoomId };
    upperStart.exits.down = { depth, roomId: level.exitRoomId };
  }

  return {
    title: config.gameTitle,
    totalLevels: config.totalLevels,
    chaptersPerAct: config.chaptersPerAct,
    levels,
    startDepth: config.totalLevels,
    startRoomId: levels[config.totalLevels]?.startRoomId ?? roomIdFor(config.totalLevels, 0),
    escapeDepth: 1,
    escapeRoomId: levels[1]?.exitRoomId ?? roomIdFor(1, roomCount - 1),
    size: createVec3(columns * roomSize.x, rows * roomSize.y, config.totalLevels * levelSpacing),
    transform: createTransform({ position: dungeonOrigin }),
  };
};

export const roomCenterPosition = (room: RoomNode): { x: number; y: number; z: number } => ({
  x: room.transform.position.x + room.size.x / 2,
  y: room.transform.position.y + room.size.y / 2,
  z: room.transform.position.z + room.size.z / 2,
});

export const chapterForDepth = (dungeon: Dungeon, depth: number): number => {
  return dungeon.totalLevels - depth + 1;
};

export const actForDepth = (dungeon: Dungeon, depth: number): number => {
  const chapter = chapterForDepth(dungeon, depth);
  return Math.floor((chapter - 1) / dungeon.chaptersPerAct) + 1;
};

export const getLevel = (dungeon: Dungeon, depth: number): Level => {
  const level = dungeon.levels[depth];
  if (!level) {
    throw new Error(`Unknown level depth: ${depth}`);
  }
  return level;
};

export const getRoom = (dungeon: Dungeon, depth: number, roomId: string): RoomNode => {
  const level = getLevel(dungeon, depth);
  const room = level.rooms[roomId];
  if (!room) {
    throw new Error(`Unknown room ${roomId} at depth ${depth}`);
  }
  return room;
};

export const hasRoomItemTag = (room: RoomNode, tag: string): boolean => {
  return room.items.some((item) => item.isPresent && item.tags.includes(tag));
};

export const takeFirstPresentItem = (room: RoomNode): RoomItemState | null => {
  const found = room.items.find((item) => item.isPresent);
  if (!found) {
    return null;
  }
  found.isPresent = false;
  return found;
};

export const takeFirstItemWithTag = (room: RoomNode, tag: string): RoomItemState | null => {
  const found = room.items.find((item) => item.isPresent && item.tags.includes(tag));
  if (!found) {
    return null;
  }
  found.isPresent = false;
  return found;
};

export const effectiveRoomVector = (room: RoomNode): TraitVector => {
  const next = createVector(room.baseVector);
  for (const item of room.items) {
    if (!item.isPresent) {
      continue;
    }
    for (const trait of TRAIT_NAMES) {
      next[trait] += item.vectorDelta[trait] ?? 0;
    }
  }
  return next;
};

export const dungeonStep = (
  dungeon: Dungeon,
  depth: number,
  roomId: string,
  direction: MoveDirection,
  blockedRoomFeatures: RoomFeature[] = [],
): { depth: number; roomId: string } | null => {
  const room = getRoom(dungeon, depth, roomId);
  const target = room.exits[direction];
  if (!target) {
    return null;
  }
  const targetRoom = getRoom(dungeon, target.depth, target.roomId);
  if (blockedRoomFeatures.includes(targetRoom.feature)) {
    return null;
  }
  return {
    depth: target.depth,
    roomId: target.roomId,
  };
};

export const isSafeHaven = (dungeon: Dungeon, depth: number, roomId: string): boolean => {
  return getRoom(dungeon, depth, roomId).feature === ROOM_FEATURE_RUNE_FORGE;
};

export const weaponPowerForTier = (tags: string[]): number => {
  if (tags.includes("legendary")) {
    return 4;
  }
  if (tags.includes("epic")) {
    return 3;
  }
  if (tags.includes("rare")) {
    return 2;
  }
  return 1;
};

export const topRoomVector = (room: RoomNode, limit = 3): Array<{ trait: TraitName; value: number }> => {
  const vector = effectiveRoomVector(room);
  return TRAIT_NAMES.map((trait) => ({ trait, value: vector[trait] }))
    .filter((row) => Math.abs(row.value) > 0.0001)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, Math.max(1, limit));
};
