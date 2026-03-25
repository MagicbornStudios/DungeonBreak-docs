import assert from "node:assert/strict";
import test from "node:test";
import { resolveRoomSceneTheme } from "../../src/theme-tokens";

test("room scene themes resolve known room features", () => {
  const combatTheme = resolveRoomSceneTheme("combat");
  const forgeTheme = resolveRoomSceneTheme("rune_forge");

  assert.equal(combatTheme.id, "combat");
  assert.equal(forgeTheme.id, "rune_forge");
  assert.notDeepEqual(combatTheme.background, forgeTheme.background);
  assert.notDeepEqual(combatTheme.frameSurface, forgeTheme.frameSurface);
});

test("unknown features fall back to the default dungeon theme", () => {
  const fallbackTheme = resolveRoomSceneTheme("mystery-room");

  assert.equal(fallbackTheme.id, "default");
  assert.equal(fallbackTheme.feature, "default");
});
