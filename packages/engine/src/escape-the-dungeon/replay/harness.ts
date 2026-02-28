import { createHash } from "node:crypto";
import type { GameSnapshot, PlayerAction } from "../core/types";
import { GameEngine } from "../engine/game";

export interface ReplayFixture {
  fixtureId: string;
  seed: number;
  actions: PlayerAction[];
  expectedSnapshotHash?: string;
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
  return `{${entries.join(",")}}`;
};

export const hashSnapshot = (snapshot: GameSnapshot): string => {
  const serialized = stableStringify(snapshot);
  return createHash("sha256").update(serialized).digest("hex");
};

export const runReplayFixture = (fixture: ReplayFixture): { snapshot: GameSnapshot; snapshotHash: string } => {
  const game = GameEngine.create(fixture.seed);
  game.state.config.hostileSpawnPerTurn = 0;

  for (const action of fixture.actions) {
    game.dispatch(action);
  }
  const snapshot = game.snapshot();
  const snapshotHash = hashSnapshot(snapshot);
  return { snapshot, snapshotHash };
};
