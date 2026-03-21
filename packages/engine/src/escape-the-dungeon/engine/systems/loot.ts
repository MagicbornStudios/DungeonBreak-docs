import type { EntityState, GameState } from "../../core/types";

const sortUniqueStrings = (values: string[]): string[] => {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
};

export const normalizeDiscoveredRoomsByDepth = (
  value: unknown
): Record<string, string[]> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record).map(([depth, roomIds]) => [
      depth,
      Array.isArray(roomIds)
        ? sortUniqueStrings(roomIds.map((roomId) => String(roomId)))
        : [],
    ])
  );
};

export const normalizeDocumentedDepths = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return [
    ...new Set(value.map((depth) => Number(depth)).filter(Number.isFinite)),
  ].sort((left, right) => left - right);
};

export const discoveredRoomsForDepth = (
  state: GameState,
  depth: number
): string[] => {
  return sortUniqueStrings(state.discoveredRoomsByDepth[String(depth)] ?? []);
};

export const discoveryProgressForDepth = (
  state: GameState,
  depth: number
): {
  discoveredRoomIds: string[];
  discoveredCount: number;
  totalRooms: number;
  isComplete: boolean;
} => {
  const discoveredRoomIds = discoveredRoomsForDepth(state, depth);
  const totalRooms = Object.keys(
    state.dungeon.levels[depth]?.rooms ?? {}
  ).length;
  return {
    discoveredRoomIds,
    discoveredCount: discoveredRoomIds.length,
    totalRooms,
    isComplete: totalRooms > 0 && discoveredRoomIds.length >= totalRooms,
  };
};

export const markRoomDiscovered = (
  state: GameState,
  depth: number,
  roomId: string
): boolean => {
  const key = String(depth);
  const next = new Set(state.discoveredRoomsByDepth[key] ?? []);
  const sizeBefore = next.size;
  next.add(roomId);
  state.discoveredRoomsByDepth[key] = [...next].sort((left, right) =>
    left.localeCompare(right)
  );
  return next.size !== sizeBefore;
};

export const createManaCrystalItems = (input: {
  count: number;
  turnIndex: number;
  source: string;
  rarity?: EntityState["inventory"][number]["rarity"];
}): EntityState["inventory"] => {
  const total = Math.max(0, Math.floor(input.count));
  const rarity = input.rarity ?? "common";
  return Array.from({ length: total }, (_, index) => ({
    itemId: `mana_crystal_${input.source}_${input.turnIndex}_${index + 1}`,
    name: "Mana Crystal",
    rarity,
    description:
      "A condensed crystal of dungeon mana. Spend it at the rune forge or hold it for trade.",
    tags: ["loot", "currency", "mana_crystal"],
    narrativeStatDelta: {},
    transform: null,
  }));
};

export const awardDocumentedDepthItem = (input: {
  actor: EntityState;
  state: GameState;
  depth: number;
  turnIndex: number;
  darkMapReputationPenalty: number;
}): {
  item: EntityState["inventory"][number];
  isDarkMap: boolean;
  discoveredCount: number;
  totalRooms: number;
  reputationDelta: number;
} | null => {
  const { actor, state, depth, turnIndex, darkMapReputationPenalty } = input;
  if (state.documentedDepths.includes(depth)) {
    return null;
  }
  const progress = discoveryProgressForDepth(state, depth);
  if (progress.totalRooms <= 0) {
    return null;
  }
  const completionRatio =
    progress.totalRooms <= 0
      ? 0
      : progress.discoveredCount / progress.totalRooms;
  const isDarkMap = completionRatio < 1;
  const rarity: EntityState["inventory"][number]["rarity"] = isDarkMap
    ? "common"
    : "rare";
  const item: EntityState["inventory"][number] = {
    itemId: `${isDarkMap ? "dark_map" : "survey_map"}_${depth}_${turnIndex}`,
    name: isDarkMap ? `Dark Map D${depth}` : `Survey Map D${depth}`,
    rarity,
    description: isDarkMap
      ? `An incomplete floor survey for depth ${depth}. Traders will treat it as a dark map.`
      : `A completed floor survey for depth ${depth}. Useful for trade and route planning.`,
    tags: isDarkMap
      ? ["loot", "map", "dark_map"]
      : ["loot", "map", "survey_map"],
    narrativeStatDelta: isDarkMap
      ? { Comprehension: 0.01 }
      : { Comprehension: 0.03, Direction: 0.02 },
    transform: null,
  };
  state.documentedDepths = [
    ...new Set([...state.documentedDepths, depth]),
  ].sort((left, right) => left - right);
  actor.inventory.push(item);
  const reputationDelta = isDarkMap
    ? -Math.max(0, darkMapReputationPenalty)
    : 0;
  actor.reputation += reputationDelta;
  return {
    item,
    isDarkMap,
    discoveredCount: progress.discoveredCount,
    totalRooms: progress.totalRooms,
    reputationDelta,
  };
};
