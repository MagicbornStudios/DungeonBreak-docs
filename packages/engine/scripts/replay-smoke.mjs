import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runReplayFixture } from "../dist/replay.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.resolve(__dirname, "../test-fixtures/canonical-trace-v1.json");

const fixtureRaw = fs.readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureRaw);
const result = runReplayFixture(fixture);

if (result.snapshotHash !== fixture.expectedSnapshotHash) {
  throw new Error(
    `Replay smoke failed. Expected ${fixture.expectedSnapshotHash}, got ${result.snapshotHash}.`,
  );
}

console.log(
  `Replay smoke passed for ${fixture.fixtureId}. Snapshot hash: ${result.snapshotHash}`,
);
