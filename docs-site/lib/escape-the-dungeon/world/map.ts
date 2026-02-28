import { DeterministicRng } from "@/lib/escape-the-dungeon/core/rng";
import { ROOM_TEMPLATES } from "@/lib/escape-the-dungeon/contracts";
import {
  type Dungeon,
  type GameConfig,
  type Level,
  type MoveDirection,
  type RoomFeature,
  type RoomItemState,
  type RoomNode,
  TRAIT_NAMES,
  type TraitName,
  type TraitVector,
} from "@/lib/escape-the-dungeon/core/types";

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
      },
      {
        itemId: `weapon_${tier}_${depth}_${index}`,
        name: `${tier.charAt(0).toUpperCase()}${tier.slice(1)} Weapon`,
        rarity: tier,
        description: `A ${tier} weapon recovered from the dungeon.`,
        tags: ["weapon", "loot", tier],
        vectorDelta: tierDelta[tier],
        isPresent: true,
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

export const buildDungeonWorld = (
  config: GameConfig,
  rng = new DeterministicRng(config.randomSeed),
): Dungeon => {
  const levels: Record<number, Level> = {};

  const rows = config.levelRows;
  const columns = config.levelColumns;
  const roomCount = config.roomsPerLevel;
  if (rows * columns !== roomCount) {
    throw new Error(`Invalid room grid: ${rows}x${columns} != ${roomCount}`);
  }

  for (let depth = config.totalLevels; depth >= 1; depth -= 1) {
    const chapterNumber = config.totalLevels - depth + 1;
    const startIdx = 0;
    const exitIdx = roomCount - 1;
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
    }

    levels[depth] = {
      depth,
      chapterNumber,
      rows,
      columns,
      rooms,
      startRoomId: roomIdFor(depth, startIdx),
      exitRoomId: roomIdFor(depth, exitIdx),
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
  };
};

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
