#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ACTION_POLICIES, CANONICAL_SEED_V1, DEFAULT_GAME_CONFIG, GameEngine, buildDungeonWorld } from "@dungeonbreak/engine";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../public/reports/dungeon-layout.v1.json");
const TURNS = 75;

const DEFAULT_PRIORITY =
  ACTION_POLICIES.policies.find((p) => p.policyId === "agent-play-default")?.priorityOrder ?? [
    "choose_dialogue",
    "evolve_skill",
    "fight",
    "flee",
    "steal",
    "recruit",
    "murder",
    "search",
    "talk",
    "train",
    "live_stream",
    "move",
    "rest",
    "speak",
  ];

function toAction(row) {
  if (row.actionType === "choose_dialogue") {
    const options = row.payload?.options ?? [];
    return {
      actionType: "choose_dialogue",
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (row.actionType === "evolve_skill") {
    return {
      actionType: "evolve_skill",
      payload: { skillId: String(row.payload?.skillId ?? "") },
    };
  }
  if (row.actionType === "live_stream") {
    return { actionType: "live_stream", payload: { effort: 10 } };
  }
  if (row.actionType === "speak") {
    return { actionType: "speak", payload: { intentText: "Precompute run." } };
  }
  return { actionType: row.actionType, payload: { ...(row.payload ?? {}) } };
}

function chooseAction(rows, priorityOrder) {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) {
    return { actionType: "rest", payload: {} };
  }
  for (const actionType of priorityOrder) {
    const found = legal.find((row) => row.actionType === actionType);
    if (found) return toAction(found);
  }
  return toAction(legal[0]);
}

function mapExits(room) {
  const exits = [];
  for (const [direction, target] of Object.entries(room.exits ?? {})) {
    if (!target) continue;
    exits.push({
      direction,
      depth: target.depth,
      roomId: target.roomId,
    });
  }
  return exits;
}

function buildPlaythroughSteps(seed, turns) {
  const engine = GameEngine.create(seed);
  const steps = [
    {
      roomId: engine.player.roomId,
      depth: engine.player.depth,
      turn: 0,
    },
  ];
  for (let turn = 0; turn < turns; turn += 1) {
    if (engine.state.escaped || engine.player.health <= 0) break;
    const rows = engine.availableActions(engine.player);
    const action = chooseAction(rows, DEFAULT_PRIORITY);
    engine.dispatch(action);
    steps.push({
      roomId: engine.player.roomId,
      depth: engine.player.depth,
      turn: turn + 1,
    });
  }
  return steps;
}

function buildLayout(seed) {
  const dungeon = buildDungeonWorld({ ...DEFAULT_GAME_CONFIG, randomSeed: seed });
  const levels = Object.values(dungeon.levels)
    .sort((a, b) => a.depth - b.depth)
    .map((level) => ({
      depth: level.depth,
      rows: level.rows,
      columns: level.columns,
      size: level.size,
      transform: level.transform,
      rooms: Object.values(level.rooms).map((room) => ({
        roomId: room.roomId,
        depth: room.depth,
        row: room.row,
        column: room.column,
        feature: room.feature,
        size: room.size,
        transform: room.transform,
        exits: mapExits(room),
        items: room.items.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          tags: item.tags,
          isPresent: item.isPresent,
          transform: item.transform ?? null,
        })),
      })),
    }));
  return {
    title: dungeon.title,
    startDepth: dungeon.startDepth,
    startRoomId: dungeon.startRoomId,
    escapeDepth: dungeon.escapeDepth,
    escapeRoomId: dungeon.escapeRoomId,
    size: dungeon.size,
    transform: dungeon.transform,
    levels,
  };
}

function main() {
  const seed = CANONICAL_SEED_V1;
  const output = {
    schemaVersion: "dungeon-layout.v1",
    generatedAt: new Date().toISOString(),
    seed,
    dungeon: buildLayout(seed),
    playthroughSteps: buildPlaythroughSteps(seed, TURNS),
  };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf8");
  console.log(`Wrote dungeon layout report: ${OUT_PATH}`);
}

main();
