import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ACTION_CATALOG } from "../dist/index.js";
import { runReplayFixture } from "../dist/replay.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePaths = [
  path.resolve(__dirname, "../test-fixtures/canonical-trace-v1.json"),
  path.resolve(__dirname, "../test-fixtures/canonical-dense-trace-v1.json"),
];

const assertDeterminism = (fixture) => {
  const baseline = runReplayFixture(fixture);

  if (fixture.expectedSnapshotHash && baseline.snapshotHash !== fixture.expectedSnapshotHash) {
    throw new Error(
      `Replay smoke failed for ${fixture.fixtureId}. Expected ${fixture.expectedSnapshotHash}, got ${baseline.snapshotHash}.`,
    );
  }

  for (let index = 0; index < 2; index += 1) {
    const rerun = runReplayFixture(fixture);
    if (rerun.snapshotHash !== baseline.snapshotHash) {
      throw new Error(
        `Determinism failed for ${fixture.fixtureId} on rerun ${index + 1}. Expected ${baseline.snapshotHash}, got ${rerun.snapshotHash}.`,
      );
    }
  }

  return baseline;
};

for (const fixturePath of fixturePaths) {
  const fixtureRaw = fs.readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(fixtureRaw);
  const result = assertDeterminism(fixture);

  if (fixture.fixtureId === "canonical-seed-v1-75-turn-dense") {
    if (fixture.actions.length < 75) {
      throw new Error(`Dense fixture must include at least 75 turns. Found ${fixture.actions.length}.`);
    }
    const catalogTypes = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));
    const actionTypes = new Set(fixture.actions.map((action) => action.actionType));
    for (const actionType of catalogTypes) {
      if (!actionTypes.has(actionType)) {
        throw new Error(`Dense fixture is missing action type '${actionType}'.`);
      }
    }
    if (!result.snapshot.eventLog.some((event) => event.actionType === "cutscene")) {
      throw new Error("Dense fixture must produce at least one cutscene event.");
    }
    if (!result.snapshot.eventLog.some((event) => event.warnings.length > 0)) {
      throw new Error("Dense fixture must produce at least one blocked/warning event.");
    }
  }

  console.log(`Replay smoke passed for ${fixture.fixtureId}. Snapshot hash: ${result.snapshotHash}`);
}
