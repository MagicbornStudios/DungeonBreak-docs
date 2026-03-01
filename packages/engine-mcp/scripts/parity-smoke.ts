import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ACTION_CATALOG, CANONICAL_SEED_V1, buildActionGroups, GameEngine } from "@dungeonbreak/engine";
import {
  applyReplayFixtureSetup,
  hashSnapshot,
  runReplayFixture,
  type ReplayFixture,
} from "@dungeonbreak/engine/replay";

import { GameSessionStore } from "../src/session-store.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.resolve(__dirname, "../../engine/test-fixtures/canonical-dense-trace-v1.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as ReplayFixture;
const fixtureForDispatch = structuredClone(fixture);
const fixtureForReplay = structuredClone(fixture);

assert.equal(fixture.seed, CANONICAL_SEED_V1, "Dense fixture must use canonical seed.");

const store = new GameSessionStore();
const session = store.createSession(fixture.seed, "parity-smoke");
const sessionId = session.sessionId;

const presenterEngine = GameEngine.create(fixture.seed);
const presenterActionTypes = new Set(
  buildActionGroups(presenterEngine)
    .flatMap((group) => group.items)
    .filter((item) => item.action.kind === "player")
    .map((item) => item.action.playerAction.actionType),
);

const storeActionTypes = new Set(store.listActions(sessionId).map((action) => action.actionType));
for (const actionType of storeActionTypes) {
  assert.ok(presenterActionTypes.has(actionType), `Presenter is missing MCP action type '${actionType}'.`);
}

const catalogActionTypes = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));
for (const actionType of storeActionTypes) {
  assert.ok(catalogActionTypes.has(actionType), `MCP action '${actionType}' is not in ACTION_CATALOG.`);
}

const preparedEngine = GameEngine.create(fixtureForDispatch.seed);
applyReplayFixtureSetup(preparedEngine, fixtureForDispatch.setup);
store.restoreSnapshot(sessionId, preparedEngine.snapshot());
for (const action of fixtureForDispatch.actions) {
  store.dispatchAction(sessionId, structuredClone(action));
}

const mcpSnapshot = store.getSnapshot(sessionId);
const mcpSnapshotHash = hashSnapshot(mcpSnapshot);
const replayResult = runReplayFixture(fixtureForReplay);

assert.equal(
  mcpSnapshotHash,
  replayResult.snapshotHash,
  "MCP dispatch replay diverged from direct runReplayFixture output.",
);

if (fixture.expectedSnapshotHash) {
  assert.equal(
    replayResult.snapshotHash,
    fixtureForReplay.expectedSnapshotHash,
    "Dense fixture expected hash drift detected.",
  );
}

console.log(
  `MCP parity smoke passed. Session ${sessionId} hash ${mcpSnapshotHash} with ${fixtureForDispatch.actions.length} actions.`,
);
