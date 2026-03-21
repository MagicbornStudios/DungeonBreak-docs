import { isAlive } from "../../core/entity-stats";
import type {
  Dungeon,
  EntityState,
  GameState,
  NumberMap,
} from "../../core/types";
import { getLevel } from "../../world/map";

export const ticksUntilNextBossSpawn = (
  turnIndex: number,
  lastHostileSpawnTurn: number,
  spawnIntervalTicks: number
): number => {
  const interval = Math.max(1, Math.floor(spawnIntervalTicks));
  const elapsed = Math.max(0, turnIndex - lastHostileSpawnTurn);
  const remainder = elapsed % interval;
  if (elapsed >= interval && remainder === 0) {
    return 0;
  }
  return interval - remainder;
};

export const restoreExpiredTemporaryHostility = (
  entities: Record<string, EntityState>,
  currentTurn: number
): void => {
  for (const entity of Object.values(entities)) {
    if (
      entity.hostileUntilTurn !== null &&
      currentTurn >= entity.hostileUntilTurn
    ) {
      entity.hostileUntilTurn = null;
      entity.faction = entity.baseFaction;
    }
  }
};

export const makeTemporarilyHostile = (
  entity: EntityState,
  currentTurn: number,
  durationTicks: number,
  hostileFaction = "rogue_dungeoneer"
): void => {
  const duration = Math.max(1, Math.floor(durationTicks));
  entity.hostileUntilTurn = Math.max(
    entity.hostileUntilTurn ?? 0,
    currentTurn + duration
  );
  entity.faction = hostileFaction;
};

const roomIdsAdjacentTo = (
  dungeon: Dungeon,
  depth: number,
  roomId: string
): string[] => {
  const level = dungeon.levels[depth];
  const room = level?.rooms[roomId];
  if (!(level && room)) {
    return [];
  }
  return [
    ...new Set(
      Object.values(room.exits).flatMap((exit) =>
        exit && exit.depth === depth ? exit.roomId : []
      )
    ),
  ];
};

export const chooseBossSpawnRoom = (input: {
  state: GameState;
  depth: number;
  bossRoomId: string;
  capPerRoom: number;
  capPerLevel: number;
  nextFloat: () => number;
}): string | null => {
  const { state, depth, bossRoomId, capPerRoom, capPerLevel, nextFloat } =
    input;
  const hostileOnDepth = Object.values(state.entities).filter((entity) => {
    return (
      entity.entityKind === "hostile" &&
      entity.depth === depth &&
      isAlive(entity)
    );
  });
  if (hostileOnDepth.length >= capPerLevel) {
    return null;
  }

  const bossRoomHostileCount = hostileOnDepth.filter(
    (entity) => entity.roomId === bossRoomId
  ).length;
  if (bossRoomHostileCount < capPerRoom) {
    return bossRoomId;
  }

  const candidateRoomIds = roomIdsAdjacentTo(state.dungeon, depth, bossRoomId);
  const availableRoomIds = candidateRoomIds.filter((roomId) => {
    const roomHostileCount = hostileOnDepth.filter(
      (entity) => entity.roomId === roomId
    ).length;
    return roomHostileCount < capPerRoom;
  });
  if (availableRoomIds.length === 0) {
    return null;
  }

  const index = Math.min(
    availableRoomIds.length - 1,
    Math.floor(nextFloat() * availableRoomIds.length)
  );
  return availableRoomIds[index] ?? null;
};

export const chooseSpawnArchetypeId = (input: {
  entries: Array<{
    archetypeId: string;
    weight: number;
    minDepth: number;
    maxDepth: number;
  }>;
  depth: number;
  nextFloat: () => number;
}): string | null => {
  const entries = input.entries.filter((entry) => {
    return input.depth >= entry.minDepth && input.depth <= entry.maxDepth;
  });
  if (entries.length === 0) {
    return null;
  }
  const totalWeight = entries.reduce((sum, entry) => {
    return sum + Math.max(0, entry.weight);
  }, 0);
  if (totalWeight <= 0) {
    return entries[0]?.archetypeId ?? null;
  }
  let roll = input.nextFloat() * totalWeight;
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) {
      return entry.archetypeId;
    }
  }
  return entries.at(-1)?.archetypeId ?? null;
};

export const pressureEntityCount = (
  state: GameState,
  activeDepth: number
): number => {
  const livingEntityCount = Object.values(state.entities).filter((entity) => {
    return isAlive(entity);
  }).length;
  if (!state.config.countItemsAsEntitiesForPressure) {
    return livingEntityCount;
  }

  const activeLevel = state.dungeon.levels[activeDepth];
  if (!activeLevel) {
    return livingEntityCount;
  }

  let itemCount = 0;
  for (const room of Object.values(activeLevel.rooms)) {
    itemCount += room.items.filter((item) => item.isPresent).length;
  }

  return livingEntityCount + itemCount;
};

interface RecordPressureEventInput {
  actionType: string;
  actor: EntityState;
  message: string;
  metadata: Record<string, unknown>;
  narrativeStatDelta: NumberMap;
  warnings: string[];
}

interface EnforcePressureCapInput {
  actor: EntityState;
  recordEvent: (input: RecordPressureEventInput) => void;
  state: GameState;
}

export const enforcePressureCap = ({
  actor,
  recordEvent,
  state,
}: EnforcePressureCapInput): void => {
  const cap = state.config.entityPressureCap;
  let pressure = pressureEntityCount(state, actor.depth);
  if (pressure <= cap) {
    return;
  }

  const pruneCandidates = Object.values(state.entities)
    .filter((entity) => entity.entityKind === "hostile" && isAlive(entity))
    .sort((left, right) => left.entityId.localeCompare(right.entityId));
  let pruned = 0;

  for (const entity of pruneCandidates) {
    if (pressure <= cap) {
      break;
    }
    delete state.entities[entity.entityId];
    pruned += 1;
    pressure = pressureEntityCount(state, actor.depth);
  }

  if (pruned > 0) {
    recordEvent({
      actor,
      actionType: "pressure_control",
      message: `Pressure cap enforced at ${cap}. Pruned ${pruned} hostile entities.`,
      warnings: [],
      narrativeStatDelta: {},
      metadata: {
        cap,
        pruned,
        pressureAfter: pressure,
      },
    });
  }
};

interface SpawnHostilesInput {
  capPerLevel: number;
  capPerRoom: number;
  createHostile: (input: {
    archetypeId: string;
    depth: number;
    hostileSpawnIndex: number;
    roomId: string;
  }) => EntityState;
  depth: number;
  entries: Array<{
    archetypeId: string;
    maxDepth: number;
    minDepth: number;
    weight: number;
  }>;
  nextFloat: () => number;
  recordEvent: (input: RecordPressureEventInput) => void;
  refreshEntityArchetype: (entity: EntityState) => void;
  state: GameState;
}

export const spawnHostiles = ({
  capPerLevel,
  capPerRoom,
  createHostile,
  depth,
  entries,
  nextFloat,
  recordEvent,
  refreshEntityArchetype,
  state,
}: SpawnHostilesInput): void => {
  const level = getLevel(state.dungeon, depth);
  const spawnCount = Math.max(0, Math.floor(state.config.hostileSpawnPerTurn));
  if (spawnCount <= 0) {
    return;
  }

  for (let cycleIndex = 0; cycleIndex < spawnCount; cycleIndex += 1) {
    const spawnRoomId = chooseBossSpawnRoom({
      state,
      depth,
      bossRoomId: level.exitRoomId,
      capPerRoom,
      capPerLevel,
      nextFloat,
    });
    if (!spawnRoomId) {
      break;
    }

    const archetypeId =
      chooseSpawnArchetypeId({
        entries,
        depth,
        nextFloat,
      }) ?? "hunter";
    state.hostileSpawnIndex += 1;
    const hostile = createHostile({
      archetypeId,
      depth,
      hostileSpawnIndex: state.hostileSpawnIndex,
      roomId: spawnRoomId,
    });
    state.entities[hostile.entityId] = hostile;
    refreshEntityArchetype(hostile);
    recordEvent({
      actor: hostile,
      actionType: "spawn",
      message: `${hostile.name} pushes out from the boss wing into ${spawnRoomId}.`,
      warnings: [],
      narrativeStatDelta: {},
      metadata: {
        spawnRoomId,
        bossRoomId: level.exitRoomId,
        archetypeId,
      },
    });
  }

  state.lastHostileSpawnTurn = state.turnIndex;
};
