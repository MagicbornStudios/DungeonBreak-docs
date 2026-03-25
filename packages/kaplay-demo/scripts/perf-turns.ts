import { performance } from "node:perf_hooks";
import type { ActionItem } from "@dungeonbreak/engine";
import {
  createGameBridge,
  dispatch,
  type GameState,
  restoreSnapshot,
} from "../src/engine-bridge";

const WARMUP_TURNS = 4;
const TURN_COUNT = 24;
const AVERAGE_WARN_MS = 700;
const P95_WARN_MS = 1200;
const MAX_WARN_MS = 1600;

function findNextMove(state: GameState): ActionItem | null {
  const preferredDirections = ["north", "east", "south", "west"];
  const moveItems = state.groups
    .flatMap((group) => group.items)
    .filter((item) => {
      return (
        item.available &&
        item.action.kind === "player" &&
        item.action.playerAction.actionType === "move"
      );
    });

  for (const direction of preferredDirections) {
    const match = moveItems.find((item) => {
      return item.action.kind === "player"
        ? item.action.playerAction.payload.direction === direction
        : false;
    });
    if (match) {
      return match;
    }
  }
  return moveItems[0] ?? null;
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const index = Math.min(
    values.length - 1,
    Math.max(0, Math.ceil(values.length * ratio) - 1)
  );
  return values[index] ?? 0;
}

function main(): void {
  let state = createGameBridge(7);
  for (let turn = 0; turn < WARMUP_TURNS; turn += 1) {
    const move = findNextMove(state);
    if (!move || move.action.kind !== "player") {
      break;
    }
    const result = dispatch(state, move.action.playerAction);
    if (!result.ok) {
      throw new Error(`Warmup turn ${turn + 1} failed: ${result.error}`);
    }
    state = restoreSnapshot(state, result.snapshot);
  }

  const durations: number[] = [];

  for (let turn = 0; turn < TURN_COUNT; turn += 1) {
    const move = findNextMove(state);
    if (!move || move.action.kind !== "player") {
      break;
    }
    const startedAt = performance.now();
    const result = dispatch(state, move.action.playerAction);
    durations.push(performance.now() - startedAt);
    if (!result.ok) {
      throw new Error(`Turn ${turn + 1} failed: ${result.error}`);
    }
    state = restoreSnapshot(state, result.snapshot);
  }

  if (durations.length < 10) {
    throw new Error(
      `Performance run only completed ${String(durations.length)} turns.`
    );
  }

  const sorted = [...durations].sort((left, right) => left - right);
  const averageMs =
    durations.reduce((total, value) => total + value, 0) / durations.length;
  const p95Ms = percentile(sorted, 0.95);
  const maxMs = sorted.at(-1) ?? 0;

  console.log(
    JSON.stringify(
      {
        averageMs: Math.round(averageMs * 100) / 100,
        maxMs: Math.round(maxMs * 100) / 100,
        p95Ms: Math.round(p95Ms * 100) / 100,
        turns: durations.length,
      },
      null,
      2
    )
  );

  if (
    averageMs > AVERAGE_WARN_MS ||
    p95Ms > P95_WARN_MS ||
    maxMs > MAX_WARN_MS
  ) {
    throw new Error(
      `Turn performance regressed: avg=${averageMs.toFixed(2)}ms p95=${p95Ms.toFixed(2)}ms max=${maxMs.toFixed(2)}ms`
    );
  }
}

try {
  main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
