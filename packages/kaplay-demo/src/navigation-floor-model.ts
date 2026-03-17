export type Direction = "north" | "south" | "west" | "east";

export interface NavigationLevelRoom {
  roomId: string;
  row: number;
  column: number;
  feature: string;
  index: number;
}

export interface FloorRoomVisual {
  roomId: string;
  row: number;
  column: number;
  feature: string;
  isCurrent: boolean;
  isDiscovered: boolean;
  isExitTarget: boolean;
  isSelected: boolean;
  hasHostile: boolean;
  hostileIntent: Direction | null;
}

interface BuildFloorRoomVisualsArgs {
  rooms: NavigationLevelRoom[];
  activeRoomId: string;
  selectedRoomId: string | null;
  exitRoomIds: Set<string>;
  discoveredIndices: Set<number>;
  hostileRoomIds: Set<string>;
}

export function hostileIntentTowardRoom(
  fromRoom: { row: number; column: number },
  targetRoom: { row: number; column: number }
): Direction | null {
  if (targetRoom.row < fromRoom.row) {
    return "north";
  }
  if (targetRoom.row > fromRoom.row) {
    return "south";
  }
  if (targetRoom.column < fromRoom.column) {
    return "west";
  }
  if (targetRoom.column > fromRoom.column) {
    return "east";
  }
  return null;
}

export function floorRoomVisualCacheKey(
  args: BuildFloorRoomVisualsArgs
): string {
  const discovered = [...args.discoveredIndices].sort((left, right) => {
    return left - right;
  });
  const hostile = [...args.hostileRoomIds].sort();
  const exits = [...args.exitRoomIds].sort();
  return [
    args.activeRoomId,
    args.selectedRoomId ?? "",
    discovered.join(","),
    hostile.join(","),
    exits.join(","),
  ].join("|");
}

export function buildFloorRoomVisuals(
  args: BuildFloorRoomVisualsArgs
): FloorRoomVisual[] {
  const roomMap = new Map(
    args.rooms.map((room) => {
      return [room.roomId, room] as const;
    })
  );
  const activeRoom = roomMap.get(args.activeRoomId);
  const hostileIntentByRoom = new Map<string, Direction | null>();
  if (activeRoom) {
    for (const hostileRoomId of args.hostileRoomIds) {
      const hostileRoom = roomMap.get(hostileRoomId);
      if (!hostileRoom) {
        continue;
      }
      hostileIntentByRoom.set(
        hostileRoomId,
        hostileIntentTowardRoom(hostileRoom, activeRoom)
      );
    }
  }

  return args.rooms
    .map((room) => {
      return {
        roomId: room.roomId,
        row: room.row,
        column: room.column,
        feature: room.feature,
        isCurrent: room.roomId === args.activeRoomId,
        isDiscovered:
          room.roomId === args.activeRoomId ||
          args.discoveredIndices.has(room.index),
        isExitTarget: args.exitRoomIds.has(room.roomId),
        isSelected: args.selectedRoomId === room.roomId,
        hasHostile: args.hostileRoomIds.has(room.roomId),
        hostileIntent: hostileIntentByRoom.get(room.roomId) ?? null,
      } satisfies FloorRoomVisual;
    })
    .sort((left, right) => {
      if (left.row !== right.row) {
        return left.row - right.row;
      }
      return left.column - right.column;
    });
}
