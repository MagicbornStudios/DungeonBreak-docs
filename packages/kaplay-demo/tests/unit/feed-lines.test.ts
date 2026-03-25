import assert from "node:assert/strict";
import test from "node:test";
import { formatFeedLine } from "../../src/feed-lines";

test("formats warning lines with system prefix", () => {
  const formatted = formatFeedLine("[t3] warning: pressure is rising");

  assert.equal(formatted.kind, "system");
  assert.equal(formatted.displayText, "[SYSTEM] pressure is rising");
});

test("formats player event lines with MMO-style player prefix", () => {
  const formatted = formatFeedLine(
    "[t7] Kael move@L01_R002: slips into the forge approach"
  );

  assert.equal(formatted.kind, "player");
  assert.equal(
    formatted.displayText,
    "[YOU] @ L01_R002: slips into the forge approach"
  );
});

test("formats livestream event lines with live prefix", () => {
  const formatted = formatFeedLine(
    "[t11] Kael stream@L01_R004: starts livestreaming the descent"
  );

  assert.equal(formatted.kind, "live");
  assert.equal(
    formatted.displayText,
    "[LIVE] Kael @ L01_R004: starts livestreaming the descent"
  );
});

test("formats non-player events with actor-aware prefixes", () => {
  const formatted = formatFeedLine(
    "[t9] Warden Delver talk@L01_R003: the dungeoneer shares a rumor"
  );

  assert.equal(formatted.kind, "dungeoneer");
  assert.equal(
    formatted.displayText,
    "[DUNGEONEER] Warden Delver @ L01_R003: the dungeoneer shares a rumor"
  );
});
