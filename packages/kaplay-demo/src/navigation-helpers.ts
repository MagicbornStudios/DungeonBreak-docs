import {
  ACTION_TYPE,
  type ActionItem,
  type GameSnapshot,
  getRoom,
  type PlayUiAction,
} from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { collectActionItems } from "./action-renderer";
import type { SceneCallbacks } from "./scene-contracts";

export const DUNGEON_MAP_COLS = 10;
export const DUNGEON_MAP_ROWS = 5;

const ROOM_ID_PATTERN = /^L(\d+)_R(\d+)$/;
const DIALOGUE_CHOOSE_PREFIX = /^Choose:\s*/i;

type SceneState = ReturnType<SceneCallbacks["getState"]>;

export type Direction = "north" | "south" | "west" | "east";

export function resetDiscoveryProgress(): void {
  // Discovery now lives in engine state and resets with a new game.
}

export function parseRoomId(
  roomId: string
): { depth: number; index: number } | null {
  const match = ROOM_ID_PATTERN.exec(roomId);
  if (!match) {
    return null;
  }
  return {
    depth: Number.parseInt(match[1], 10),
    index: Number.parseInt(match[2], 10),
  };
}

function indexToPos(idx: number): { col: number; row: number } {
  return {
    col: idx % DUNGEON_MAP_COLS,
    row: Math.floor(idx / DUNGEON_MAP_COLS),
  };
}

export function executeMove(
  k: KAPLAYCtx,
  cb: SceneCallbacks,
  direction: Direction
): void {
  const action: PlayUiAction = {
    kind: "player",
    playerAction: { actionType: "move", payload: { direction } },
  };
  cb.doAction(action);
  if (
    collectActionItems(cb.getState()).some(
      (item) => getActionType(item) === ACTION_TYPE.FIGHT
    )
  ) {
    k.go("gridCombat");
  }
}

function getActionType(item: ActionItem): string {
  if (item.action.kind !== "player") {
    return item.action.kind;
  }
  return item.action.playerAction.actionType;
}

export function markDiscovered(
  _state: SceneState,
  _fogRadius: number
): void {
  // Discovery is now owned by engine state; this remains as a compatibility no-op.
}

export function nearestEnemyLabel(state: SceneState): string {
  const look = state.look.toLowerCase();
  if (look.includes("nearby:")) {
    const nearby = state.look
      .split("\n")
      .find((line) => line.toLowerCase().startsWith("nearby:"));
    if (nearby) {
      return nearby.slice("Nearby:".length).trim() || "none";
    }
  }
  return "unknown";
}

export function getWorldSnapshot(state: SceneState): GameSnapshot {
  return state.engine.snapshot() as GameSnapshot;
}

export function currentRoom(state: SceneState) {
  const snapshot = getWorldSnapshot(state);
  return getRoom(
    snapshot.dungeon,
    Number(state.status.depth ?? 1),
    String(state.status.roomId ?? "")
  );
}

export function exitRows(state: SceneState): Array<{
  direction: Direction;
  roomId: string;
  feature: string;
}> {
  const room = currentRoom(state);
  const rows: Array<{
    direction: Direction;
    roomId: string;
    feature: string;
  }> = [];
  for (const direction of ["north", "west", "east", "south"] as const) {
    const next = room.exits[direction];
    if (!next) {
      continue;
    }
    const nextRoom = getRoom(
      getWorldSnapshot(state).dungeon,
      next.depth,
      next.roomId
    );
    rows.push({
      direction,
      roomId: next.roomId,
      feature: nextRoom.feature,
    });
  }
  return rows;
}

export function roomActionItems(state: SceneState): ActionItem[] {
  return collectActionItems(state).filter((item) => {
    if (item.action.kind !== "player") {
      return false;
    }
    return [
      "search",
      "rest",
      "train",
      "talk",
      "buy_item",
      "purchase",
      "re_equip",
      ACTION_TYPE.EVOLVE_SKILL,
    ].includes(item.action.playerAction.actionType);
  });
}

export function globalNavigationActionItems(state: SceneState): ActionItem[] {
  return collectActionItems(state).filter((item) => {
    if (item.action.kind !== "player") {
      return false;
    }
    return ["whistle", "live_stream"].includes(
      item.action.playerAction.actionType
    );
  });
}

export function dialogueChoiceItems(state: SceneState): ActionItem[] {
  return collectActionItems(state).filter((item) => {
    if (item.action.kind !== "player") {
      return false;
    }
    return item.action.playerAction.actionType === ACTION_TYPE.CHOOSE_DIALOGUE;
  });
}

export function preparedSpellSlots(state: SceneState) {
  return state.engine.preparedSpellSlots();
}

export function spellPoolRows(state: SceneState) {
  return state.engine.spellPool();
}

export function roomNarrativeLines(state: SceneState): string[] {
  const snapshot = getWorldSnapshot(state);
  const depth = Number(state.status.depth ?? 0);
  const roomId = String(state.status.roomId ?? "");
  const lines = snapshot.eventLog
    .filter((event) => event.depth === depth && event.roomId === roomId)
    .slice(-3)
    .map((event) => event.message.trim())
    .filter(Boolean);
  if (lines.length > 0) {
    return lines;
  }
  const options = dialogueChoiceItems(state)
    .slice(0, 2)
    .map((item) => item.label.replace(DIALOGUE_CHOOSE_PREFIX, ""));
  if (options.length > 0) {
    return [`Dialogue opens here: ${options.join(", ")}`];
  }
  return state.look.split("\n").slice(0, 2);
}

export function pressureWarningLines(state: SceneState): string[] {
  const ticksUntilBossSpawn = Number(state.status.ticksUntilBossSpawn ?? NaN);
  const hostileNpcCount = Number(state.status.hostileNpcCount ?? 0);
  const warnings: string[] = [];

  if (hostileNpcCount > 0) {
    warnings.push(
      hostileNpcCount === 1
        ? "Hostile movement is active on this floor."
        : `${String(hostileNpcCount)} hostile NPCs are active on this floor.`
    );
  }

  if (Number.isFinite(ticksUntilBossSpawn)) {
    if (ticksUntilBossSpawn <= 1) {
      warnings.push("Boss pressure is peaking. Another hostile surge is imminent.");
    } else if (ticksUntilBossSpawn <= 3) {
      warnings.push(
        `Boss pressure is rising. ${String(ticksUntilBossSpawn)} tick(s) until the next spawn check.`
      );
    }
  }

  return warnings;
}

export function roomFeatureTone(
  feature: string
): "neutral" | "good" | "warn" | "danger" | "accent" {
  if (feature === "combat") {
    return "danger";
  }
  if (feature === "rune_forge") {
    return "accent";
  }
  if (feature === "rest") {
    return "good";
  }
  if (feature === "treasure") {
    return "warn";
  }
  return "neutral";
}

export function renderMiniMapTiles(
  k: KAPLAYCtx,
  x: number,
  y: number,
  state: SceneState,
  options: { cell?: number; gap?: number } = {}
): void {
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const discovered = discoveredRoomIndices(state);
  const cell = options.cell ?? 8;
  const gap = options.gap ?? 4;

  for (const idx of discovered) {
    const { col, row } = indexToPos(idx);
    const isCurrent = parsed?.index === idx;
    k.add([
      k.rect(cell, cell, { radius: 2 }),
      k.pos(x + col * (cell + gap), y + row * (cell + gap)),
      k.color(
        isCurrent ? 226 : 93,
        isCurrent ? 214 : 122,
        isCurrent ? 122 : 162
      ),
      "ui",
    ]);
  }
}

export function depthDiscoveryStats(state: SceneState): {
  discoveredCount: number;
  totalRooms: number;
} {
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  const snapshot = getWorldSnapshot(state);
  const level = snapshot.dungeon.levels[depth];
  const discoveredCount = discoveredRoomIndices(state).size;
  const totalRooms = level
    ? Object.keys(level.rooms).length
    : DUNGEON_MAP_COLS * DUNGEON_MAP_ROWS;
  return { discoveredCount, totalRooms };
}

export function discoveredRoomIndices(state: SceneState): Set<number> {
  const statusDiscovered = Array.isArray(state.status.discoveredRoomIds)
    ? state.status.discoveredRoomIds
    : [];
  const indices = statusDiscovered
    .map((roomId) => parseRoomId(String(roomId ?? ""))?.index ?? null)
    .filter((index): index is number => Number.isInteger(index));
  return new Set(indices);
}
