import type { MoveDirection, Vec3 } from "./escape-the-dungeon/core/types";

export const LEVEL_CONTENT_DOCUMENT_VERSION = "level-content.document.v1";
export const LEVEL_BROWSER_PAYLOAD_VERSION = "level-browser.payload.v1";

export const LEVEL_KINDS = [
  "region",
  "dungeon-floor",
  "dungeon-region",
  "transition-level",
] as const;

export type LevelKind = (typeof LEVEL_KINDS)[number];

export const LEVEL_CONNECTION_KINDS = [
  "travel",
  "stairs",
  "door",
  "gate",
  "portal",
  "transition",
] as const;

export type LevelConnectionKind = (typeof LEVEL_CONNECTION_KINDS)[number];

export type LevelReference = {
  refId: string;
  label?: string;
  kind?: string;
  tags?: string[];
};

export type LevelTransform = {
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
};

export type LevelPoint = {
  pointId: string;
  label: string;
  summary?: string;
  tags?: string[];
};

export type LevelConnection = {
  connectionId: string;
  kind: LevelConnectionKind;
  label?: string;
  fromPointId?: string;
  toLevelId: string;
  toPointId?: string;
  tags?: string[];
};

export type LevelRoomExit = {
  direction: MoveDirection;
  targetLevelId?: string;
  targetPointId?: string;
  depth?: number;
  roomId?: string;
};

export type LevelRoomItem = {
  itemId: string;
  itemBlueprintId?: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  tags: string[];
  vectorDelta: Record<string, number>;
  isPresent: boolean;
  transform?: LevelTransform | null;
};

export type LevelRoom = {
  roomId: string;
  name?: string;
  kind?: string;
  summary?: string;
  tags?: string[];
  row?: number;
  column?: number;
  index?: number;
  feature?: string;
  baseVector?: Record<string, number>;
  entityRefs?: LevelReference[];
  contentRefs?: LevelReference[];
  dialogueRefs?: LevelReference[];
  questRefs?: LevelReference[];
  exits?: LevelRoomExit[];
  items?: LevelRoomItem[];
  transform?: LevelTransform;
};

export type LevelBuilding = {
  buildingId: string;
  name: string;
  kind: string;
  theme?: string;
  summary?: string;
  tags?: string[];
  entityRefs?: LevelReference[];
  contentRefs?: LevelReference[];
  dialogueRefs?: LevelReference[];
  questRefs?: LevelReference[];
  rooms?: LevelRoom[];
};

export type LevelDistrict = {
  districtId: string;
  name: string;
  theme?: string;
  summary?: string;
  tags?: string[];
  entityRefs?: LevelReference[];
  contentRefs?: LevelReference[];
  dialogueRefs?: LevelReference[];
  questRefs?: LevelReference[];
  buildings?: LevelBuilding[];
};

export type LevelTown = {
  townId: string;
  name: string;
  theme?: string;
  summary?: string;
  tags?: string[];
  entityRefs?: LevelReference[];
  contentRefs?: LevelReference[];
  dialogueRefs?: LevelReference[];
  questRefs?: LevelReference[];
  districts?: LevelDistrict[];
  buildings?: LevelBuilding[];
};

export type LevelSite = {
  siteId: string;
  name: string;
  kind: string;
  theme?: string;
  summary?: string;
  tags?: string[];
  entityRefs?: LevelReference[];
  contentRefs?: LevelReference[];
  dialogueRefs?: LevelReference[];
  questRefs?: LevelReference[];
};

export type LevelZone = {
  zoneId: string;
  name: string;
  kind: string;
  theme?: string;
  summary?: string;
  tags?: string[];
  entityRefs?: LevelReference[];
  contentRefs?: LevelReference[];
  dialogueRefs?: LevelReference[];
  questRefs?: LevelReference[];
  sites?: LevelSite[];
};

export type DungeonEntrance = {
  entranceId: string;
  name: string;
  summary?: string;
  tags?: string[];
  targetLevelId: string;
  targetPointId?: string;
};

export type DungeonFloorDefinition = {
  depth: number;
  rows: number;
  columns: number;
  heightScale?: number;
  startRoomId: string;
  escapeRoomId: string;
};

export type LevelDefinition = {
  levelId: string;
  name: string;
  kind: LevelKind;
  theme?: string;
  summary?: string;
  tags?: string[];
  entryPoints?: LevelPoint[];
  exitPoints?: LevelPoint[];
  connections?: LevelConnection[];
  entityRefs?: LevelReference[];
  contentRefs?: LevelReference[];
  dialogueRefs?: LevelReference[];
  questRefs?: LevelReference[];
  rules?: Record<string, boolean | number | string>;
  visualHints?: Record<string, boolean | number | string>;
  transform?: LevelTransform;
  dungeonFloor?: DungeonFloorDefinition;
  towns?: LevelTown[];
  buildings?: LevelBuilding[];
  rooms?: LevelRoom[];
  sites?: LevelSite[];
  wildernessZones?: LevelZone[];
  outskirtsZones?: LevelZone[];
  dungeonEntrances?: DungeonEntrance[];
};

export type LevelRunDefinition = {
  runId: string;
  title: string;
  summary?: string;
  levelIds: string[];
  startLevelId: string;
  escapeLevelId: string;
  roomSize: Vec3;
  levelSpacing: number;
  dungeonOrigin: Vec3;
};

export type LevelContentPack = {
  levels: LevelDefinition[];
  dungeonRuns?: LevelRunDefinition[];
};

export type LevelContentDocument = LevelContentPack & {
  schemaVersion: typeof LEVEL_CONTENT_DOCUMENT_VERSION;
  documentId?: string;
  title?: string;
  description?: string;
  generatedAt?: string;
};

export type LevelBrowserPayload = {
  schemaVersion: typeof LEVEL_BROWSER_PAYLOAD_VERSION;
  generatedAt: string;
  runs: Array<{
    runId: string;
    title: string;
    levelCount: number;
    levelIds: string[];
    startLevelId: string;
    escapeLevelId: string;
  }>;
  levels: Array<{
    levelId: string;
    name: string;
    kind: LevelKind;
    theme?: string;
    summary?: string;
    tags: string[];
    connectionCount: number;
    structure: {
      townCount: number;
      districtCount: number;
      buildingCount: number;
      roomCount: number;
      siteCount: number;
      wildernessZoneCount: number;
      outskirtsZoneCount: number;
      dungeonEntranceCount: number;
    };
    content: {
      entityRefCount: number;
      contentRefCount: number;
      dialogueRefCount: number;
      questRefCount: number;
    };
    rules: Record<string, string>;
    visualHints: Record<string, string>;
  }>;
};

export type DungeonLayoutPackData = {
  dungeons: Array<{
    dungeonId: string;
    title: string;
    startDepth: number;
    startRoomId: string;
    escapeDepth: number;
    escapeRoomId: string;
    roomSize: Vec3;
    levelSpacing: number;
    dungeonOrigin: Vec3;
    levels: Array<{
      depth: number;
      rows: number;
      columns: number;
      heightScale?: number;
      transform?: LevelTransform;
      rooms: Array<{
        roomId: string;
        name?: string;
        row: number;
        column: number;
        index: number;
        feature: string;
        description?: string;
        baseVector?: Record<string, number>;
        exits: Array<{
          direction: MoveDirection;
          depth: number;
          roomId: string;
        }>;
        items: LevelRoomItem[];
        transform?: LevelTransform;
      }>;
    }>;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function toStringMap(
  value: Record<string, boolean | number | string> | undefined
): Record<string, string> {
  const next: Record<string, string> = {};
  if (!value) return next;
  for (const [key, entry] of Object.entries(value)) {
    next[key] = String(entry);
  }
  return next;
}

function countRooms(buildings: LevelBuilding[] = []): number {
  return buildings.reduce(
    (total, building) => total + asArray(building.rooms).length,
    0
  );
}

function countDistricts(towns: LevelTown[] = []): number {
  return towns.reduce(
    (total, town) => total + asArray(town.districts).length,
    0
  );
}

function countBuildings(towns: LevelTown[] = [], directBuildings: LevelBuilding[] = []): number {
  const nested = towns.reduce((total, town) => {
    const districtBuildings = asArray(town.districts).reduce(
      (sum, district) => sum + asArray(district.buildings).length,
      0
    );
    return total + asArray(town.buildings).length + districtBuildings;
  }, 0);
  return nested + directBuildings.length;
}

function countTownRooms(towns: LevelTown[] = []): number {
  return towns.reduce((total, town) => {
    const districtRooms = asArray(town.districts).reduce(
      (sum, district) => sum + countRooms(asArray(district.buildings)),
      0
    );
    return total + countRooms(asArray(town.buildings)) + districtRooms;
  }, 0);
}

export function buildLevelBrowserPayload(
  levelContent: LevelContentPack,
  now: Date = new Date()
): LevelBrowserPayload {
  return {
    schemaVersion: LEVEL_BROWSER_PAYLOAD_VERSION,
    generatedAt: now.toISOString(),
    runs: asArray(levelContent.dungeonRuns).map((run) => ({
      runId: run.runId,
      title: run.title,
      levelCount: run.levelIds.length,
      levelIds: asArray(run.levelIds),
      startLevelId: run.startLevelId,
      escapeLevelId: run.escapeLevelId,
    })),
    levels: asArray(levelContent.levels).map((level) => ({
      levelId: level.levelId,
      name: level.name,
      kind: level.kind,
      theme: level.theme,
      summary: level.summary,
      tags: asArray(level.tags),
      connectionCount: asArray(level.connections).length,
      structure: {
        townCount: asArray(level.towns).length,
        districtCount: countDistricts(asArray(level.towns)),
        buildingCount: countBuildings(
          asArray(level.towns),
          asArray(level.buildings)
        ),
        roomCount:
          asArray(level.rooms).length +
          countRooms(asArray(level.buildings)) +
          countTownRooms(asArray(level.towns)),
        siteCount: asArray(level.sites).length,
        wildernessZoneCount: asArray(level.wildernessZones).length,
        outskirtsZoneCount: asArray(level.outskirtsZones).length,
        dungeonEntranceCount: asArray(level.dungeonEntrances).length,
      },
      content: {
        entityRefCount: asArray(level.entityRefs).length,
        contentRefCount: asArray(level.contentRefs).length,
        dialogueRefCount: asArray(level.dialogueRefs).length,
        questRefCount: asArray(level.questRefs).length,
      },
      rules: toStringMap(
        isRecord(level.rules)
          ? (level.rules as Record<string, boolean | number | string>)
          : undefined
      ),
      visualHints: toStringMap(
        isRecord(level.visualHints)
          ? (level.visualHints as Record<string, boolean | number | string>)
          : undefined
      ),
    })),
  };
}

export function buildDungeonLayoutPackFromLevelContent(
  levelContent: LevelContentPack
): DungeonLayoutPackData {
  const levelsById = new Map(
    asArray(levelContent.levels).map((level) => [level.levelId, level] as const)
  );
  const dungeonRuns = asArray(levelContent.dungeonRuns);

  return {
    dungeons: dungeonRuns
      .map((run) => {
        const floorLevels = run.levelIds
          .map((levelId) => levelsById.get(levelId))
          .filter((level): level is LevelDefinition => Boolean(level?.dungeonFloor))
          .sort((left, right) => {
            const leftDepth = left.dungeonFloor?.depth ?? 0;
            const rightDepth = right.dungeonFloor?.depth ?? 0;
            return rightDepth - leftDepth;
          });

        if (floorLevels.length === 0) {
          return null;
        }

        const startLevel = levelsById.get(run.startLevelId);
        const escapeLevel = levelsById.get(run.escapeLevelId);
        const startDepth = startLevel?.dungeonFloor?.depth ?? floorLevels[0]?.dungeonFloor?.depth ?? 1;
        const escapeDepth =
          escapeLevel?.dungeonFloor?.depth ??
          floorLevels[floorLevels.length - 1]?.dungeonFloor?.depth ??
          startDepth;
        const startRoomId =
          startLevel?.dungeonFloor?.startRoomId ??
          floorLevels[0]?.dungeonFloor?.startRoomId ??
          floorLevels[0]?.rooms?.[0]?.roomId ??
          "unknown";
        const escapeRoomId =
          escapeLevel?.dungeonFloor?.escapeRoomId ??
          floorLevels[floorLevels.length - 1]?.dungeonFloor?.escapeRoomId ??
          floorLevels[floorLevels.length - 1]?.rooms?.at(-1)?.roomId ??
          startRoomId;

        return {
          dungeonId: run.runId,
          title: run.title,
          startDepth,
          startRoomId,
          escapeDepth,
          escapeRoomId,
          roomSize: run.roomSize,
          levelSpacing: run.levelSpacing,
          dungeonOrigin: run.dungeonOrigin,
          levels: floorLevels.map((level) => ({
            depth: level.dungeonFloor?.depth ?? 1,
            rows: level.dungeonFloor?.rows ?? 1,
            columns: level.dungeonFloor?.columns ?? 1,
            heightScale: level.dungeonFloor?.heightScale ?? 1,
            transform: level.transform,
            rooms: asArray(level.rooms).map((room) => {
              const targetDepthByLevelId = (targetLevelId?: string): number | undefined => {
                if (!targetLevelId) return undefined;
                return levelsById.get(targetLevelId)?.dungeonFloor?.depth;
              };

              return {
                roomId: room.roomId,
                name: room.name,
                row: room.row ?? 0,
                column: room.column ?? 0,
                index: room.index ?? 0,
                feature: room.feature ?? "corridor",
                description: room.summary,
                baseVector: room.baseVector,
                exits: asArray(room.exits)
                  .map((exit) => ({
                    direction: exit.direction,
                    depth: exit.depth ?? targetDepthByLevelId(exit.targetLevelId) ?? level.dungeonFloor?.depth ?? 1,
                    roomId: exit.roomId ?? room.roomId,
                  }))
                  .filter((exit) => !!exit.roomId),
                items: asArray(room.items),
                transform: room.transform,
              };
            }),
          })),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null),
  };
}
