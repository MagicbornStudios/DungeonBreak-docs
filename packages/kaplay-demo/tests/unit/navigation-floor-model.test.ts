import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFloorRoomVisuals,
  floorRoomVisualCacheKey,
  hostileIntentTowardRoom,
} from "../../src/navigation-floor-model";

const ROOMS = [
  { roomId: "L01_R001", row: 0, column: 0, feature: "rest", index: 0 },
  { roomId: "L01_R002", row: 0, column: 1, feature: "combat", index: 1 },
  { roomId: "L01_R003", row: 1, column: 1, feature: "treasure", index: 2 },
];

test("boss rooms stay discovered even before player entry", () => {
  const visuals = buildFloorRoomVisuals({
    rooms: ROOMS,
    activeRoomId: "L01_R001",
    selectedRoomId: null,
    exitRoomIds: new Set(["L01_R002"]),
    bossRoomIds: new Set(["L01_R003"]),
    discoveredIndices: new Set([0]),
    hostileRoomIds: new Set(["L01_R003"]),
    hostileCountsByRoomId: new Map([["L01_R003", 1]]),
    dungeoneerRoomIds: new Set(),
    dungeoneerCountsByRoomId: new Map(),
  });

  const bossRoom = visuals.find((room) => room.roomId === "L01_R003");

  assert.ok(bossRoom);
  assert.equal(bossRoom.isBossRoom, true);
  assert.equal(bossRoom.isDiscovered, true);
  assert.equal(bossRoom.hasHostile, true);
});

test("cache key changes when boss-room visibility changes", () => {
  const baseArgs = {
    rooms: ROOMS,
    activeRoomId: "L01_R001",
    selectedRoomId: null,
    exitRoomIds: new Set(["L01_R002"]),
    discoveredIndices: new Set<number>([0]),
    hostileRoomIds: new Set<string>(),
    hostileCountsByRoomId: new Map<string, number>(),
    dungeoneerRoomIds: new Set<string>(),
    dungeoneerCountsByRoomId: new Map<string, number>(),
  };

  const withoutBoss = floorRoomVisualCacheKey({
    ...baseArgs,
    bossRoomIds: new Set(),
  });
  const withBoss = floorRoomVisualCacheKey({
    ...baseArgs,
    bossRoomIds: new Set(["L01_R003"]),
  });

  assert.notEqual(withoutBoss, withBoss);
});

test("hostile intent points toward the current room", () => {
  assert.equal(
    hostileIntentTowardRoom({ row: 1, column: 1 }, { row: 0, column: 1 }),
    "north"
  );
  assert.equal(
    hostileIntentTowardRoom({ row: 0, column: 0 }, { row: 0, column: 1 }),
    "east"
  );
});
