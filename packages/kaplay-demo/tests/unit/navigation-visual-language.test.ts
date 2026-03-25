import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePortraitStyle,
  resolvePresenceVisualKind,
  resolveRoomFeatureIconId,
  resolveRoomTileIconId,
} from "../../src/navigation-visual-language";

test("feature icon ids map gameplay rooms to stable visual language", () => {
  assert.equal(resolveRoomFeatureIconId("combat"), "swords");
  assert.equal(resolveRoomFeatureIconId("dialogue"), "messages-square");
  assert.equal(resolveRoomFeatureIconId("rest"), "bed");
  assert.equal(resolveRoomFeatureIconId("rune_forge"), "hammer");
  assert.equal(resolveRoomFeatureIconId("training"), "dumbbell");
  assert.equal(resolveRoomFeatureIconId("treasure"), "gem");
  assert.equal(resolveRoomFeatureIconId("unknown"), "map");
});

test("tile icon ids prioritize boss and exit affordances over generic room type", () => {
  assert.equal(
    resolveRoomTileIconId({
      feature: "combat",
      isBossRoom: true,
      isExitTarget: false,
    }),
    "crown"
  );
  assert.equal(
    resolveRoomTileIconId({
      feature: "rest",
      isBossRoom: false,
      isExitTarget: true,
    }),
    "door-open"
  );
  assert.equal(
    resolveRoomTileIconId({
      feature: "dialogue",
      isBossRoom: false,
      isExitTarget: false,
    }),
    "messages-square"
  );
});

test("presence visual kind prioritizes boss over other occupants", () => {
  assert.equal(
    resolvePresenceVisualKind({
      bossCount: 1,
      hostileCount: 3,
      dungeoneerCount: 1,
    }),
    "boss"
  );
  assert.equal(
    resolvePresenceVisualKind({
      bossCount: 0,
      hostileCount: 2,
      dungeoneerCount: 1,
    }),
    "hostile"
  );
  assert.equal(
    resolvePresenceVisualKind({
      bossCount: 0,
      hostileCount: 0,
      dungeoneerCount: 1,
    }),
    "dungeoneer"
  );
  assert.equal(resolvePresenceVisualKind({}), "room");
});

test("portrait styles stay role-specific and room fallback remains calmer", () => {
  const boss = resolvePortraitStyle("boss");
  const rival = resolvePortraitStyle("dungeoneer");
  const room = resolvePortraitStyle("room");

  assert.equal(boss.eyebrow, "BOSS");
  assert.equal(rival.eyebrow, "RIVAL");
  assert.equal(room.eyebrow, "ROOM");
  assert.ok(boss.portraitScale > room.portraitScale);
  assert.ok(rival.portraitScale > room.portraitScale);
  assert.ok(room.sceneBackplateOpacity > 0);
});
