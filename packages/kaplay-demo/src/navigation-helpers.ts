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
const DISCOVERY_STORAGE_KEY = "dungeonbreak:kaplay:discovered-by-depth:v1";
const discoveredByDepth = new Map<number, Set<number>>();
let discoveryHydrated = false;

type SceneState = ReturnType<SceneCallbacks["getState"]>;

export type Direction = "north" | "south" | "west" | "east";

function hydrateDiscovery(): void {
  if (discoveryHydrated) {
    return;
  }
  discoveryHydrated = true;
  if (typeof window === "undefined") {
    return;
  }
  try {
    const raw = window.localStorage.getItem(DISCOVERY_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, number[]>;
    for (const [depthKey, indices] of Object.entries(parsed)) {
      const depth = Number(depthKey);
      if (!Number.isFinite(depth)) {
        continue;
      }
      discoveredByDepth.set(
        depth,
        new Set(indices.filter((value) => Number.isFinite(value)))
      );
    }
  } catch {
    // non-fatal; keep in-memory discovery only
  }
}

function persistDiscovery(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: Record<string, number[]> = {};
    for (const [depth, indices] of discoveredByDepth.entries()) {
      payload[String(depth)] = [...indices.values()].sort((left, right) => {
        return left - right;
      });
    }
    window.localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures in constrained environments
  }
}

export function resetDiscoveryProgress(): void {
  discoveredByDepth.clear();
  discoveryHydrated = false;
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(DISCOVERY_STORAGE_KEY);
  } catch {
    // ignore storage failures in constrained environments
  }
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

export function markDiscovered(state: SceneState, fogRadius: number): void {
  hydrateDiscovery();
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  if (!(parsed && depth)) {
    return;
  }
  const existing = discoveredByDepth.get(depth) ?? new Set<number>();
  existing.add(parsed.index);
  const { col, row } = indexToPos(parsed.index);
  for (let dr = -fogRadius; dr <= fogRadius; dr += 1) {
    for (let dc = -fogRadius; dc <= fogRadius; dc += 1) {
      if (Math.abs(dr) + Math.abs(dc) > fogRadius) {
        continue;
      }
      const nextCol = col + dc;
      const nextRow = row + dr;
      if (
        nextCol < 0 ||
        nextCol >= DUNGEON_MAP_COLS ||
        nextRow < 0 ||
        nextRow >= DUNGEON_MAP_ROWS
      ) {
        continue;
      }
      existing.add(nextRow * DUNGEON_MAP_COLS + nextCol);
    }
  }
  discoveredByDepth.set(depth, existing);
  persistDiscovery();
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
    return ["whistle", "live_stream"].includes(item.action.playerAction.actionType);
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
  hydrateDiscovery();
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  const discovered = discoveredByDepth.get(depth) ?? new Set<number>();
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
  hydrateDiscovery();
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  const snapshot = getWorldSnapshot(state);
  const level = snapshot.dungeon.levels[depth];
  const discoveredCount = (discoveredByDepth.get(depth) ?? new Set<number>())
    .size;
  const totalRooms = level
    ? Object.keys(level.rooms).length
    : DUNGEON_MAP_COLS * DUNGEON_MAP_ROWS;
  return { discoveredCount, totalRooms };
}

export function discoveredRoomIndices(state: SceneState): Set<number> {
  hydrateDiscovery();
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  return new Set(discoveredByDepth.get(depth) ?? []);
}
