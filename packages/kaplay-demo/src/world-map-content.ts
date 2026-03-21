import {
  WORLD_REGION_LIST,
  type WorldMapRegion,
} from "../../engine/dist/index.js";

export interface WorldMapNodeView {
  regionId: string;
  name: string;
  kind: string;
  summary: string;
  xRatio: number;
  yRatio: number;
  isCurrent: boolean;
  isOnRoute: boolean;
}

const WORLD_MAP_LAYOUT: Record<string, { xRatio: number; yRatio: number }> = {
  frostmere: { xRatio: 0.16, yRatio: 0.2 },
  emberfall: { xRatio: 0.26, yRatio: 0.42 },
  ashford: { xRatio: 0.16, yRatio: 0.64 },
  "verdant-hollow": { xRatio: 0.4, yRatio: 0.28 },
  ironweald: { xRatio: 0.5, yRatio: 0.52 },
  sundermarch: { xRatio: 0.58, yRatio: 0.24 },
  blackmarsh: { xRatio: 0.68, yRatio: 0.48 },
  cinderwick: { xRatio: 0.72, yRatio: 0.2 },
  graveheath: { xRatio: 0.82, yRatio: 0.58 },
  "pale-reach": { xRatio: 0.86, yRatio: 0.28 },
  stormholm: { xRatio: 0.94, yRatio: 0.42 },
  "transition-escape-threshold": { xRatio: 0.32, yRatio: 0.78 },
  "dungeon-floors": { xRatio: 0.34, yRatio: 0.92 },
};

const ESCAPE_TARGET_REGION_ID = "emberfall";

function visibleWorldRegion(region: WorldMapRegion): boolean {
  return region.kind === "hub" || region.kind === "transition" || region.regionId === "dungeon-floors";
}

function currentRegionIdFromStatus(status: Record<string, unknown>): string {
  if (typeof status.regionId === "string" && status.regionId.length > 0) {
    return status.regionId;
  }
  if (Number(status.depth ?? 0) > 0) {
    return "dungeon-floors";
  }
  return ESCAPE_TARGET_REGION_ID;
}

function routeBetweenRegions(
  regions: WorldMapRegion[],
  startRegionId: string,
  targetRegionId: string
): string[] {
  if (startRegionId === targetRegionId) {
    return [startRegionId];
  }

  const regionById = new Map(
    regions.map((region) => [region.regionId, region] as const)
  );
  const queue: string[] = [startRegionId];
  const visited = new Set(queue);
  const previous = new Map<string, string | null>([[startRegionId, null]]);

  while (queue.length > 0) {
    const regionId = queue.shift();
    if (!regionId) {
      continue;
    }
    const region = regionById.get(regionId);
    if (!region) {
      continue;
    }
    for (const connectionRegionId of region.connectionRegionIds) {
      if (!(regionById.has(connectionRegionId) && !visited.has(connectionRegionId))) {
        continue;
      }
      visited.add(connectionRegionId);
      previous.set(connectionRegionId, regionId);
      if (connectionRegionId === targetRegionId) {
        const path = [connectionRegionId];
        let cursor: string | null = regionId;
        while (cursor) {
          path.unshift(cursor);
          cursor = previous.get(cursor) ?? null;
        }
        return path;
      }
      queue.push(connectionRegionId);
    }
  }

  return [startRegionId];
}

export function buildWorldMapView(
  status: Record<string, unknown>
): {
  currentRegionId: string;
  routeRegionIds: string[];
  nodes: WorldMapNodeView[];
} {
  const regions = WORLD_REGION_LIST.filter(visibleWorldRegion);
  const currentRegionId = currentRegionIdFromStatus(status);
  const routeRegionIds = routeBetweenRegions(
    regions,
    currentRegionId,
    ESCAPE_TARGET_REGION_ID
  );
  const routeSet = new Set(routeRegionIds);

  return {
    currentRegionId,
    routeRegionIds,
    nodes: regions.map((region) => {
      const layout = WORLD_MAP_LAYOUT[region.regionId] ?? {
        xRatio: 0.5,
        yRatio: 0.5,
      };
      return {
        regionId: region.regionId,
        name: region.name,
        kind: region.kind,
        summary: region.summary ?? "No authored summary yet.",
        xRatio: layout.xRatio,
        yRatio: layout.yRatio,
        isCurrent: region.regionId === currentRegionId,
        isOnRoute: routeSet.has(region.regionId),
      };
    }),
  };
}
