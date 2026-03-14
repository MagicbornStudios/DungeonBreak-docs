import { ACTION_TYPE, getRoom, type ActionItem, type GameSnapshot, type PlayUiAction } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import type { SceneCallbacks } from "./scene-contracts";
import {
  addButton,
  addFooterStatus,
  addRoomInfoPanel,
  clearUi,
  LINE_H,
  PAD,
  UI_TAG,
} from "./shared";
import {
  actionToneFor,
  collectActionItems,
  firstItemByActionType,
  formatActionButtonLabel,
  getActionType,
  itemsByActionType,
} from "./action-renderer";
import { renderSceneLayout } from "./scene-layout";
import { createWidgetRegistry } from "./widget-registry";
import { selectFogMetrics } from "./ui-selectors";
import { hotkeyRouteMap, routeForActionItem } from "./intent-router";
import { hasEncounter, inRuneForgeContext } from "./scene-blocks";
import {
  H,
  LEFT_PANEL_W,
  NAV_PANEL_H,
  NAV_ROW_Y,
  PANEL_INSET,
  RIGHT_PANEL_W,
  W,
} from "./layout-constants";
import { resolveEntityCombatSprite, resolveItemSprite, resolveSpellSprite } from "./content-visuals";
import { drawMutedTextAtom, drawSurfaceAtom, drawTextAtom } from "./ui/atoms";
import { renderKeyHintLegendMolecule, renderSectionHeaderMolecule, renderStatRowMolecule } from "./ui/molecules";
import {
  renderCommandPanelOrganism,
  renderRoomBriefOrganism,
  renderThreeColumnShellOrganism,
  type ThreeColumnShellLayout,
} from "./ui/organisms";

const COLS = 10;
const ROWS = 5;
const NAV_COLUMN_GAP = 8;
const NAV_LEFT_W = 148;
const NAV_RIGHT_W = 132;
const MAIN_PANEL_BOTTOM_GAP = 6;
const FOOTER_SAFE_OFFSET = 22;
const FOOTER_TOP_OFFSET = 2;
const INVENTORY_ACTION_COLUMN_GAP = 8;
const COMBAT_FIELD_H = 324;
const COMBAT_FIELD_GAP = 8;
const COMBAT_BOX_H = 104;
const COMBAT_BOX_GAP = 8;
const COMBAT_SPRITE_SCALE = 3;
const COMBAT_MENU_ICON_SCALE = 1.05;

const DISCOVERY_STORAGE_KEY = "dungeonbreak:kaplay:discovered-by-depth:v1";
const discoveredByDepth = new Map<number, Set<number>>();
let discoveryHydrated = false;

function hydrateDiscovery(): void {
  if (discoveryHydrated) return;
  discoveryHydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DISCOVERY_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, number[]>;
    for (const [depthKey, indices] of Object.entries(parsed)) {
      const depth = Number(depthKey);
      if (!Number.isFinite(depth)) continue;
      discoveredByDepth.set(depth, new Set(indices.filter((v) => Number.isFinite(v))));
    }
  } catch {
    // non-fatal; keep in-memory discovery only
  }
}

function persistDiscovery(): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Record<string, number[]> = {};
    for (const [depth, indices] of discoveredByDepth.entries()) {
      payload[String(depth)] = [...indices.values()].sort((a, b) => a - b);
    }
    window.localStorage.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures in constrained environments
  }
}

type Direction = "north" | "south" | "west" | "east";

function parseRoomId(roomId: string): { depth: number; index: number } | null {
  const m = /^L(\d+)_R(\d+)$/.exec(roomId);
  if (!m) return null;
  return { depth: Number.parseInt(m[1], 10), index: Number.parseInt(m[2], 10) };
}

function indexToPos(idx: number): { col: number; row: number } {
  return { col: idx % COLS, row: Math.floor(idx / COLS) };
}

function executeMove(k: KAPLAYCtx, cb: SceneCallbacks, direction: Direction): void {
  const action: PlayUiAction = {
    kind: "player",
    playerAction: { actionType: "move", payload: { direction } },
  };
  cb.doAction(action);
  if (hasEncounter(cb.getState())) {
    k.go("gridCombat");
  }
}

function markDiscovered(state: ReturnType<SceneCallbacks["getState"]>, fogRadius: number): void {
  hydrateDiscovery();
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  if (!parsed || !depth) return;
  const existing = discoveredByDepth.get(depth) ?? new Set<number>();
  existing.add(parsed.index);
  const { col, row } = indexToPos(parsed.index);
  for (let dr = -fogRadius; dr <= fogRadius; dr += 1) {
    for (let dc = -fogRadius; dc <= fogRadius; dc += 1) {
      if (Math.abs(dr) + Math.abs(dc) > fogRadius) continue;
      const nextCol = col + dc;
      const nextRow = row + dr;
      if (nextCol < 0 || nextCol >= COLS || nextRow < 0 || nextRow >= ROWS) continue;
      existing.add(nextRow * COLS + nextCol);
    }
  }
  discoveredByDepth.set(depth, existing);
  persistDiscovery();
}

function nearestEnemyLabel(state: ReturnType<SceneCallbacks["getState"]>): string {
  const look = state.look.toLowerCase();
  if (look.includes("nearby:")) {
    const nearby = state.look
      .split("\n")
      .find((line) => line.toLowerCase().startsWith("nearby:"));
    if (nearby) return nearby.slice("Nearby:".length).trim() || "none";
  }
  return "unknown";
}

function getWorldSnapshot(state: ReturnType<SceneCallbacks["getState"]>): GameSnapshot {
  return state.engine.snapshot() as GameSnapshot;
}

function currentRoom(state: ReturnType<SceneCallbacks["getState"]>) {
  const snapshot = getWorldSnapshot(state);
  return getRoom(snapshot.dungeon, Number(state.status.depth ?? 1), String(state.status.roomId ?? ""));
}

function exitRows(state: ReturnType<SceneCallbacks["getState"]>): Array<{
  direction: Direction;
  roomId: string;
  feature: string;
}> {
  const room = currentRoom(state);
  const rows: Array<{ direction: Direction; roomId: string; feature: string }> = [];
  for (const direction of ["north", "west", "east", "south"] as const) {
    const next = room.exits[direction];
    if (!next) {
      continue;
    }
    const nextRoom = getRoom(getWorldSnapshot(state).dungeon, next.depth, next.roomId);
    rows.push({
      direction,
      roomId: next.roomId,
      feature: nextRoom.feature,
    });
  }
  return rows;
}

function roomActionItems(state: ReturnType<SceneCallbacks["getState"]>): ActionItem[] {
  return collectActionItems(state).filter((item) => {
    if (item.action.kind !== "player") {
      return false;
    }
    return ["search", "rest", "train", "talk"].includes(item.action.playerAction.actionType);
  });
}

function dialogueChoiceItems(state: ReturnType<SceneCallbacks["getState"]>): ActionItem[] {
  return collectActionItems(state).filter((item) => {
    if (item.action.kind !== "player") {
      return false;
    }
    return item.action.playerAction.actionType === ACTION_TYPE.CHOOSE_DIALOGUE;
  });
}

function preparedSpellSlots(state: ReturnType<SceneCallbacks["getState"]>) {
  return state.engine.preparedSpellSlots();
}

function spellPoolRows(state: ReturnType<SceneCallbacks["getState"]>) {
  return state.engine.spellPool();
}

function roomNarrativeLines(state: ReturnType<SceneCallbacks["getState"]>): string[] {
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
  const options = dialogueChoiceItems(state).slice(0, 2).map((item) => item.label.replace(/^Choose:\s*/i, ""));
  if (options.length > 0) {
    return [`Dialogue opens here: ${options.join(", ")}`];
  }
  return state.look.split("\n").slice(0, 2);
}

function roomFeatureTone(feature: string): "neutral" | "good" | "warn" | "danger" | "accent" {
  if (feature === "combat") return "danger";
  if (feature === "rune_forge") return "accent";
  if (feature === "rest") return "good";
  if (feature === "treasure") return "warn";
  return "neutral";
}

function renderMiniMapTiles(
  k: KAPLAYCtx,
  x: number,
  y: number,
  state: ReturnType<SceneCallbacks["getState"]>,
): void {
  hydrateDiscovery();
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  const discovered = discoveredByDepth.get(depth) ?? new Set<number>();
  const cell = 8;
  const gap = 4;

  for (const idx of discovered) {
    const { col, row } = indexToPos(idx);
    const isCurrent = parsed?.index === idx;
    k.add([
      k.rect(cell, cell, { radius: 2 }),
      k.pos(x + col * (cell + gap), y + row * (cell + gap)),
      k.color(isCurrent ? 226 : 93, isCurrent ? 214 : 122, isCurrent ? 122 : 162),
      UI_TAG,
    ]);
  }
}

type InventoryRow = {
  itemId: string;
  line: string;
  canUse: boolean;
  canEquip: boolean;
  canDrop: boolean;
  useAction: ActionItem | null;
  equipAction: ActionItem | null;
  dropAction: ActionItem | null;
};

function inventoryRows(state: ReturnType<SceneCallbacks["getState"]>): InventoryRow[] {
  const snapshot = state.engine.snapshot() as {
    entities: Record<
      string,
      {
        inventory: Array<{ itemId: string; name: string; rarity?: string; tags?: string[] }>;
        equippedWeaponItemId?: string | null;
      }
    >;
    playerId: string;
  };
  const player = snapshot.entities[snapshot.playerId];
  const inventory = player?.inventory ?? [];
  const rows = inventory.map((item, idx) => {
    const rarity = item.rarity ?? "common";
    const tags = item.tags?.join(", ") ?? "-";
    const equippedMarker = player?.equippedWeaponItemId === item.itemId ? " [equipped]" : "";
    const useAction = collectActionItems(state).find(
      (action) =>
        action.action.kind === "player" &&
        action.action.playerAction.actionType === "use_item" &&
        String(action.action.playerAction.payload.itemId ?? "") === item.itemId,
    ) ?? null;
    const equipAction = collectActionItems(state).find(
      (action) =>
        action.action.kind === "player" &&
        action.action.playerAction.actionType === "equip_item" &&
        String(action.action.playerAction.payload.itemId ?? "") === item.itemId,
    ) ?? null;
    const dropAction = collectActionItems(state).find(
      (action) =>
        action.action.kind === "player" &&
        action.action.playerAction.actionType === "drop_item" &&
        String(action.action.playerAction.payload.itemId ?? "") === item.itemId,
    ) ?? null;
    return {
      itemId: item.itemId,
      line: `${idx + 1}. ${item.name} (${rarity}) [${tags}]${equippedMarker}`,
      canUse: Boolean(useAction?.available),
      canEquip: Boolean(equipAction?.available),
      canDrop: Boolean(dropAction?.available),
      useAction,
      equipAction,
      dropAction,
    };
  });
  return rows;
}

type CombatEntitySnapshot = {
  entityId: string;
  name: string;
  isPlayer: boolean;
  entityKind: string;
  archetypeHeading: string;
  depth: number;
  roomId: string;
  health: number;
  baseLevel: number;
  xp: number;
  inventory: Array<{ itemId: string; name: string }>;
};

type CombatEventSnapshot = {
  actorId: string;
  actorName: string;
  actionType: string;
  depth: number;
  roomId: string;
  message: string;
  metadata?: Record<string, unknown>;
};

type CombatSnapshot = {
  playerId: string;
  entities: Record<string, CombatEntitySnapshot>;
  eventLog: CombatEventSnapshot[];
};

type CombatMenuMode = "root" | "fight" | "spells" | "pack";
type CombatRootAction = "fight" | "spells" | "pack" | "flee";

type CombatMenuEntry = {
  label: string;
  enabled: boolean;
  tone: "neutral" | "good" | "warn" | "danger" | "accent";
  onChoose?: () => void;
  spriteName?: string;
};

function getCombatSnapshot(state: ReturnType<SceneCallbacks["getState"]>): CombatSnapshot {
  return state.engine.snapshot() as unknown as CombatSnapshot;
}

function currentEncounterEnemy(state: ReturnType<SceneCallbacks["getState"]>): CombatEntitySnapshot | null {
  const snapshot = getCombatSnapshot(state);
  const player = snapshot.entities[snapshot.playerId];
  if (!player) {
    return null;
  }
  const enemies = Object.values(snapshot.entities)
    .filter((entity) => {
      if (entity.entityId === player.entityId) {
        return false;
      }
      if (entity.depth !== player.depth || entity.roomId !== player.roomId) {
        return false;
      }
      return entity.health > 0;
    })
    .sort((left, right) => {
      const leftPriority = left.entityKind === "boss" ? 0 : left.entityKind === "hostile" ? 1 : 2;
      const rightPriority = right.entityKind === "boss" ? 0 : right.entityKind === "hostile" ? 1 : 2;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return left.entityId.localeCompare(right.entityId);
    });
  return enemies[0] ?? null;
}

function estimateMaxHealth(entity: CombatEntitySnapshot | null, fallback: number): number {
  if (!entity) {
    return fallback;
  }
  const base =
    entity.isPlayer
      ? 100
      : entity.entityKind === "boss"
        ? 120
        : entity.entityKind === "dungeoneer"
          ? 94
          : 70;
  return Math.max(base, entity.health);
}

function titleCaseLabel(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function combatItemLabel(item: ActionItem): string {
  const label = item.label.replace(/^use\s+/i, "");
  return `Use ${titleCaseLabel(label)}`;
}

function combatMessageLines(
  state: ReturnType<SceneCallbacks["getState"]>,
  enemy: CombatEntitySnapshot | null,
): string[] {
  const snapshot = getCombatSnapshot(state);
  const player = snapshot.entities[snapshot.playerId];
  if (!player) {
    return ["Kael steadies for battle."];
  }
  const relevant = snapshot.eventLog.filter((event) => {
    if (event.depth !== player.depth || event.roomId !== player.roomId) {
      return false;
    }
    const targetId = typeof event.metadata?.targetId === "string" ? String(event.metadata.targetId) : null;
    return (
      event.actorId === player.entityId ||
      targetId === player.entityId ||
      (enemy ? event.actorId === enemy.entityId || targetId === enemy.entityId : false)
    );
  });
  const messages = relevant.slice(-3).map((event) => event.message.trim()).filter(Boolean);
  if (messages.length > 0) {
    return messages;
  }
  if (enemy) {
    return [`${enemy.name} blocks the path.`, "Choose a command."];
  }
  return ["The encounter has broken.", "Return to navigation."];
}

function moveRootSelection(current: CombatRootAction, key: "up" | "down" | "left" | "right"): CombatRootAction {
  if (current === "fight") {
    if (key === "right") return "spells";
    if (key === "down") return "pack";
    return current;
  }
  if (current === "spells") {
    if (key === "left") return "fight";
    if (key === "down") return "flee";
    return current;
  }
  if (current === "pack") {
    if (key === "up") return "fight";
    if (key === "right") return "flee";
    return current;
  }
  if (key === "up") return "spells";
  if (key === "left") return "pack";
  return current;
}

function renderCombatHealthPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  roleLabel: string,
  name: string,
  subtitle: string,
  health: number,
  maxHealth: number,
  tone: "good" | "danger",
): void {
  drawSurfaceAtom(k, x, y, width, 70, UI_TAG);
  drawMutedTextAtom(k, { x: x + 10, y: y + 8, text: roleLabel, size: 9, tag: UI_TAG });
  drawTextAtom(k, { x: x + 10, y: y + 22, text: name, size: 11, tag: UI_TAG });
  drawMutedTextAtom(k, { x: x + 10, y: y + 36, text: subtitle, size: 9, tag: UI_TAG });

  const barX = x + 10;
  const barY = y + 52;
  const barW = width - 20;
  const barRatio = Math.max(0, Math.min(1, maxHealth <= 0 ? 0 : health / maxHealth));
  const barColor = tone === "danger" ? [214, 82, 88] : [90, 184, 118];

  k.add([k.rect(barW, 8, { radius: 4 }), k.pos(barX, barY), k.color(45, 45, 52), UI_TAG]);
  k.add([k.rect(Math.max(8, Math.floor(barW * barRatio)), 8, { radius: 4 }), k.pos(barX, barY), k.color(barColor[0], barColor[1], barColor[2]), UI_TAG]);
  drawTextAtom(k, {
    x: x + width - 56,
    y: y + 22,
    text: `${health}/${maxHealth}`,
    size: 9,
    tag: UI_TAG,
  });
}

function renderCombatSprite(
  k: KAPLAYCtx,
  spriteName: string | null,
  x: number,
  y: number,
  options: { isPlayer?: boolean; scale?: number } = {},
): void {
  if (!spriteName) {
    return;
  }
  const scale = options.scale ?? (options.isPlayer ? COMBAT_SPRITE_SCALE + 0.3 : COMBAT_SPRITE_SCALE);
  k.add([
    k.sprite(spriteName),
    k.pos(x, y),
    k.anchor("center"),
    k.scale(scale),
    UI_TAG,
  ]);
}

type GridFrameOptions = {
  title: string;
  subtitle: string;
  leftWidth?: number;
  rightWidth?: number;
  columnGap?: number;
  panelHeight?: number;
  showJournal?: boolean;
  journalTitle?: string;
  journalMaxLines?: number;
};

type GridFrame = {
  state: ReturnType<SceneCallbacks["getState"]>;
  shell: ThreeColumnShellLayout;
  leftWidth: number;
  rightWidth: number;
};

function renderGridFrame(
  k: KAPLAYCtx,
  cb: SceneCallbacks,
  widgets: ReturnType<typeof createWidgetRegistry>,
  options: GridFrameOptions,
): GridFrame {
  const state = cb.getState();
  renderSceneLayout(k, {
    width: W,
    title: options.title,
    subtitle: options.subtitle,
  });

  const leftWidth = options.leftWidth ?? LEFT_PANEL_W;
  const rightWidth = options.rightWidth ?? RIGHT_PANEL_W;
  const columnGap = options.columnGap ?? NAV_COLUMN_GAP;
  const panelHeight = options.panelHeight ?? NAV_PANEL_H;

  const shell = renderThreeColumnShellOrganism(k, {
    x: PAD,
    y: NAV_ROW_Y,
    width: W - PAD * 2,
    height: panelHeight,
    leftWidth,
    rightWidth,
    inset: PANEL_INSET,
    columnGap,
    tag: UI_TAG,
  });

  renderCommandPanelOrganism(k, {
    x: shell.leftX,
    y: shell.innerY,
    width: leftWidth,
    hasEncounter: hasEncounter(state),
    inRuneForgeContext: inRuneForgeContext(state),
    onOpenNavigation: () => k.go("gridNavigation"),
    onOpenCombat: () => k.go("gridCombat"),
    onOpenControls: () => k.go("gridActionMenu"),
    onOpenBag: () => k.go("gridInventory"),
    onOpenJournal: () => k.go("gridDialogue"),
    onOpenMagic: () => k.go("gridRuneForge"),
  });

  const roomBriefBottomY = renderRoomBriefOrganism(k, {
    x: shell.rightX,
    y: shell.innerY,
    width: rightWidth,
    look: state.look,
    status: state.status,
    tag: UI_TAG,
  });

  if (options.showJournal ?? true) {
    widgets.renderEventLog({
      x: shell.rightX,
      y: roomBriefBottomY,
      width: rightWidth,
      title: options.journalTitle ?? "Journal",
      lines: cb.feedLines,
      maxLines: options.journalMaxLines ?? 8,
    });
  }

  return { state, shell, leftWidth, rightWidth };
}

function renderGridFooter(
  k: KAPLAYCtx,
  state: ReturnType<SceneCallbacks["getState"]>,
  hints: string[],
): void {
  let y = NAV_ROW_Y + NAV_PANEL_H + MAIN_PANEL_BOTTOM_GAP;
  y = addRoomInfoPanel(k, PAD, y, W - PAD * 2, state.status, state.look.split("\n").slice(1, 3).join(" "));
  y += 4;
  const legendHints = hints.map((hint) => {
    const match = /^\[([^\]]+)\]\s*(.+)?$/.exec(hint.trim());
    if (!match) return { key: "?", label: hint };
    return { key: match[1], label: match[2] ?? "" };
  });
  y = renderKeyHintLegendMolecule(k, { x: PAD, y, hints: legendHints, width: W - PAD * 2, tag: UI_TAG });
  y += 2;
  addFooterStatus(k, PAD, Math.min(H - FOOTER_SAFE_OFFSET, y + FOOTER_TOP_OFFSET), state.status);
}

function registerNavigationScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridNavigation", () => {
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Escape the Dungeon - Room Navigation",
        subtitle: "[1] First-Person | [C] Controls",
        leftWidth: NAV_LEFT_W,
        rightWidth: NAV_RIGHT_W,
        journalTitle: "Room Log",
        journalMaxLines: 8,
      });
      const uiState = cb.getUiState();
      const fog = selectFogMetrics(uiState);
      markDiscovered(state, fog.radius);
      const room = currentRoom(state);
      const exits = exitRows(state);
      const roomOptions = roomActionItems(state).slice(0, 3);
      const dialogueOptions = dialogueChoiceItems(state).slice(0, 2);
      const spellSlots = preparedSpellSlots(state).filter((slot) => slot.skillId);
      const enemy = currentEncounterEnemy(state);
      const enemySprite = resolveEntityCombatSprite(enemy?.entityKind ?? "hostile", enemy?.archetypeHeading, false);
      const playerSnapshot = getCombatSnapshot(state).entities[getCombatSnapshot(state).playerId] ?? null;
      const playerSprite = resolveEntityCombatSprite(
        playerSnapshot?.entityKind ?? "player",
        playerSnapshot?.archetypeHeading,
        true,
      );

      let centerY = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Current Room",
        subtitle: `${room.description}  |  ${String(state.status.roomId ?? "")}`,
      });
      centerY += 4;

      const stageY = centerY;
      const stageH = 186;
      drawSurfaceAtom(k, shell.centerX, stageY, shell.centerWidth, stageH, UI_TAG);
      k.add([
        k.rect(shell.centerWidth - 24, 54, { radius: 6 }),
        k.pos(shell.centerX + 12, stageY + 14),
        k.color(69, 105, 146),
        k.opacity(0.14),
        UI_TAG,
      ]);
      k.add([
        k.rect(shell.centerWidth - 48, 16, { radius: 8 }),
        k.pos(shell.centerX + 24, stageY + stageH - 36),
        k.color(46, 73, 58),
        k.opacity(0.42),
        UI_TAG,
      ]);

      drawMutedTextAtom(k, {
        x: shell.centerX + 12,
        y: stageY + 10,
        text: "Dungeon pulse",
        size: 10,
        tag: UI_TAG,
      });
      renderMiniMapTiles(k, shell.centerX + shell.centerWidth - 126, stageY + 14, state);
      renderStatRowMolecule(k, {
        x: shell.centerX + 12,
        y: stageY + 28,
        icon: "[F]",
        label: "",
        value: String(state.status.roomFeature ?? room.feature).replace(/_/g, " "),
        tone: roomFeatureTone(String(state.status.roomFeature ?? room.feature)),
        width: 180,
        tag: UI_TAG,
      });
      renderStatRowMolecule(k, {
        x: shell.centerX + 12,
        y: stageY + 44,
        icon: "[!]",
        label: "",
        value: enemy ? `${enemy.name} is pressing the room.` : nearestEnemyLabel(state),
        tone: enemy ? "danger" : "neutral",
        width: shell.centerWidth - 148,
        tag: UI_TAG,
      });

      const narrative = roomNarrativeLines(state);
      let narrativeY = stageY + 74;
      for (const line of narrative.slice(0, 3)) {
        drawTextAtom(k, {
          x: shell.centerX + 12,
          y: narrativeY,
          text: line,
          size: 10,
          width: shell.centerWidth - 160,
          tag: UI_TAG,
        });
        narrativeY += LINE_H;
      }

      renderCombatSprite(k, playerSprite, shell.centerX + 92, stageY + 148, { isPlayer: true, scale: 2.2 });
      if (enemySprite) {
        renderCombatSprite(k, enemySprite, shell.centerX + shell.centerWidth - 94, stageY + 126, { scale: 2.2 });
      }

      centerY = stageY + stageH + 8;
      drawMutedTextAtom(k, {
        x: shell.centerX,
        y: centerY,
        text: "Exits",
        size: 10,
        tag: UI_TAG,
      });
      centerY += 14;
      const exitButtonW = Math.floor((shell.centerWidth - 8) / 2);
      for (let index = 0; index < exits.length; index += 1) {
        const exit = exits[index]!;
        const column = index % 2;
        const row = Math.floor(index / 2);
        addButton(
          k,
          shell.centerX + column * (exitButtonW + 8),
          centerY + row * 28,
          exitButtonW,
          `${exit.direction.toUpperCase()} -> ${exit.feature.replace(/_/g, " ")} (${exit.roomId})`,
          () => executeMove(k, cb, exit.direction),
          true,
          { tone: roomFeatureTone(exit.feature), compact: true },
        );
      }

      const exitRowsUsed = Math.max(1, Math.ceil(exits.length / 2));
      centerY += exitRowsUsed * 28 + 4;
      drawMutedTextAtom(k, {
        x: shell.centerX,
        y: centerY,
        text: "Room Options",
        size: 10,
        tag: UI_TAG,
      });
      centerY += 14;

      for (const item of roomOptions) {
        centerY = addButton(
          k,
          shell.centerX,
          centerY,
          shell.centerWidth,
          formatActionButtonLabel(item),
          () => cb.doAction(item.action),
          item.available,
          { tone: actionToneFor(item), compact: true },
        );
      }

      for (const item of dialogueOptions) {
        centerY = addButton(
          k,
          shell.centerX,
          centerY,
          shell.centerWidth,
          formatActionButtonLabel(item),
          () => cb.doAction(item.action),
          item.available,
          { tone: "accent", compact: true },
        );
      }

      if (spellSlots.length > 0) {
        drawMutedTextAtom(k, {
          x: shell.centerX,
          y: centerY,
          text: "Prepared Spells",
          size: 10,
          tag: UI_TAG,
        });
        centerY += 14;
        for (const slot of spellSlots.slice(0, 4)) {
          const spriteName = slot.skillId ? resolveSpellSprite(slot.skillId) : null;
          centerY = addButton(
            k,
            shell.centerX,
            centerY,
            shell.centerWidth,
            `Slot ${slot.slotIndex + 1}: ${slot.name}`,
            () => k.go("gridRuneForge"),
            true,
            { tone: slot.available ? "accent" : "neutral", compact: true },
          );
          if (spriteName) {
            renderCombatSprite(k, spriteName, shell.centerX + shell.centerWidth - 24, centerY - 15, {
              scale: COMBAT_MENU_ICON_SCALE,
            });
          }
        }
      }

      const hints = ["[WASD] Move", "[C] Controls", "[B] Bag", "[J] Journal"];
      if (hasEncounter(state)) hints.splice(1, 0, "[F] Combat");
      if (inRuneForgeContext(state)) hints.push("[M] Rune Forge");
      renderGridFooter(k, state, hints);
    };

    const moveKeys: Record<string, Direction> = {
      w: "north",
      a: "west",
      s: "south",
      d: "east",
      up: "north",
      left: "west",
      down: "south",
      right: "east",
    };

    for (const [key, direction] of Object.entries(moveKeys)) {
      k.onKeyPress(key as "w", () => executeMove(k, cb, direction));
    }

    const routeMapKeys = ["1", "e", "space", "c", "f", "i", "t", "r", "b", "j", "m"] as const;
    for (const key of routeMapKeys) {
      k.onKeyPress(key, () => {
        const latest = cb.getState();
        const route = hotkeyRouteMap({
          inRuneForgeContext: inRuneForgeContext(latest),
          hasEncounter: hasEncounter(latest),
        })[key];
        if (route) k.go(route);
      });
    }

    cb.setRefresh(render);
    render();
  });
}

function registerCombatScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridCombat", () => {
    let menuMode: CombatMenuMode = "root";
    let rootSelection: CombatRootAction = "fight";
    let submenuIndex = 0;

    const render = () => {
      clearUi(k);
      const state = cb.getState();
      const snapshot = getCombatSnapshot(state);
      const player = snapshot.entities[snapshot.playerId] ?? null;
      const enemy = currentEncounterEnemy(state);
      const fight = firstItemByActionType(state, ACTION_TYPE.FIGHT);
      const fleeOptions = itemsByActionType(state, ACTION_TYPE.FLEE).filter((item) => item.available);
      const spellOptions = preparedSpellSlots(state).filter((slot) => slot.skillId);
      const packOptions = itemsByActionType(state, "use_item").filter((item) => item.available);
      const enemySprite = resolveEntityCombatSprite(enemy?.entityKind ?? "hostile", enemy?.archetypeHeading, false);
      const playerSprite = resolveEntityCombatSprite(player?.entityKind ?? "player", player?.archetypeHeading, true);

      if (!enemy || !player) {
        renderSceneLayout(k, {
          width: W,
          title: "Encounter",
          subtitle: "[Esc] Return",
        });
        drawSurfaceAtom(k, PAD, NAV_ROW_Y, W - PAD * 2, 160, UI_TAG);
        drawTextAtom(k, {
          x: PAD + 16,
          y: NAV_ROW_Y + 24,
          text: "No enemy is in front of Kael.",
          size: 14,
          tag: UI_TAG,
        });
        addButton(k, PAD + 16, NAV_ROW_Y + 72, 220, "Return to exploration", () => k.go("gridNavigation"), true, {
          tone: "accent",
        });
        return;
      }

      const contentY = renderSceneLayout(k, {
        width: W,
        title: "Encounter",
        subtitle: menuMode === "root" ? "[Arrows] Move  [Enter] Confirm  [Esc] Back" : "[Esc] Back  [Enter] Confirm",
      });

      const fieldX = PAD;
      const fieldY = contentY;
      const fieldW = W - PAD * 2;
      const fieldBottom = fieldY + COMBAT_FIELD_H;
      drawSurfaceAtom(k, fieldX, fieldY, fieldW, COMBAT_FIELD_H, UI_TAG);

      k.add([k.rect(fieldW - 24, 112, { radius: 6 }), k.pos(fieldX + 12, fieldY + 18), k.color(63, 114, 163), k.opacity(0.12), UI_TAG]);
      k.add([k.rect(178, 18, { radius: 9 }), k.pos(fieldX + 92, fieldBottom - 96), k.color(44, 72, 56), k.opacity(0.45), UI_TAG]);
      k.add([k.rect(178, 18, { radius: 9 }), k.pos(fieldX + fieldW - 270, fieldY + 150), k.color(72, 72, 52), k.opacity(0.45), UI_TAG]);

      const enemyPanelX = fieldX + fieldW - 264;
      const enemyPanelY = fieldY + 18;
      const playerPanelX = fieldX + 220;
      const playerPanelY = fieldBottom - 110;

      renderCombatHealthPanel(
        k,
        enemyPanelX,
        enemyPanelY,
        246,
        "Enemy Front",
        enemy.name,
        `${titleCaseLabel(enemy.entityKind)} Lv.${Math.max(1, enemy.baseLevel)}`,
        enemy.health,
        estimateMaxHealth(enemy, 70),
        "danger",
      );
      renderCombatHealthPanel(
        k,
        playerPanelX,
        playerPanelY,
        258,
        "You • Back View",
        player.name,
        `Lv.${Math.max(1, Number(state.status.level ?? player.baseLevel))}  Energy ${String(state.status.energy ?? "?")}`,
        Number(state.status.health ?? player.health),
        estimateMaxHealth(player, 100),
        "good",
      );

      renderCombatSprite(k, enemySprite, fieldX + fieldW - 170, fieldY + 188);
      renderCombatSprite(k, playerSprite, fieldX + 172, fieldBottom - 56, { isPlayer: true });
      drawMutedTextAtom(k, {
        x: fieldX + 112,
        y: fieldBottom - 142,
        text: "You",
        size: 10,
        tag: UI_TAG,
      });

      const messageY = fieldBottom + COMBAT_FIELD_GAP;
      const messageW = Math.floor((fieldW - COMBAT_BOX_GAP) * 0.56);
      const menuX = fieldX + messageW + COMBAT_BOX_GAP;
      const menuW = fieldW - messageW - COMBAT_BOX_GAP;
      drawSurfaceAtom(k, fieldX, messageY, messageW, COMBAT_BOX_H, UI_TAG);
      drawSurfaceAtom(k, menuX, messageY, menuW, COMBAT_BOX_H, UI_TAG);

      drawMutedTextAtom(k, {
        x: fieldX + 12,
        y: messageY + 10,
        text: "Battle Messages",
        size: 10,
        tag: UI_TAG,
      });

      const messageLines = combatMessageLines(state, enemy);
      let lineY = messageY + 28;
      for (const line of messageLines) {
        drawTextAtom(k, {
          x: fieldX + 12,
          y: lineY,
          text: line,
          size: 10,
          width: messageW - 24,
          tag: UI_TAG,
        });
        lineY += LINE_H;
      }

      const executeCombatAction = (action: ActionItem | null) => {
        if (!action?.available) {
          return;
        }
        menuMode = "root";
        submenuIndex = 0;
        cb.doAction(action.action);
        if (!hasEncounter(cb.getState())) {
          k.go("gridNavigation");
        }
      };

      const executeRandomFlee = () => {
        const choices = fleeOptions;
        if (choices.length === 0) {
          return;
        }
        const picked = choices[Math.floor(Math.random() * choices.length)] ?? choices[0] ?? null;
        executeCombatAction(picked);
      };

      const submenuEntries: Record<Exclude<CombatMenuMode, "root">, CombatMenuEntry[]> = {
        fight: [
          {
            label: enemy ? `Attack ${enemy.name}` : "Attack",
            enabled: Boolean(fight?.available),
            tone: "danger",
            onChoose: () => executeCombatAction(fight),
          },
        ],
        spells:
          spellOptions.length > 0
            ? spellOptions.map((slot) => {
                const skillId = String(slot.skillId ?? "");
                return {
                  label: `Slot ${slot.slotIndex + 1}: ${slot.name}`,
                  enabled: slot.available,
                  tone: "accent" as const,
                  onChoose: () => cb.castSpell(skillId),
                  spriteName: resolveSpellSprite(skillId) ?? undefined,
                };
              })
            : [
                {
                  label: "No spells learned",
                  enabled: false,
                  tone: "neutral" as const,
                },
              ],
        pack:
          packOptions.length > 0
            ? packOptions.map((item) => {
                const itemId =
                  item.action.kind === "player" ? String(item.action.playerAction.payload.itemId ?? "") : "";
                return {
                  label: combatItemLabel(item),
                  enabled: item.available,
                  tone: "good" as const,
                  onChoose: () => executeCombatAction(item),
                  spriteName: resolveItemSprite(itemId) ?? undefined,
                };
              })
            : [
                {
                  label: "Pack is empty",
                  enabled: false,
                  tone: "neutral" as const,
                },
              ],
      };

      if (menuMode !== "root") {
        const entries = submenuEntries[menuMode];
        submenuIndex = Math.max(0, Math.min(submenuIndex, entries.length - 1));
        drawMutedTextAtom(k, {
          x: menuX + 12,
          y: messageY + 10,
          text: menuMode === "fight" ? "Fight" : menuMode === "spells" ? "Combat Spells" : "Bag",
          size: 10,
          tag: UI_TAG,
        });
        let entryY = messageY + 28;
        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index]!;
          const selected = index === submenuIndex;
          addButton(
            k,
            menuX + 10,
            entryY,
            menuW - 20,
            `${selected ? "> " : ""}${entry.label}`,
            () => entry.onChoose?.(),
            entry.enabled,
            { tone: selected ? entry.tone : "neutral", compact: true },
          );
          if (entry.spriteName) {
            renderCombatSprite(k, entry.spriteName, menuX + menuW - 42, entryY + 10, {
              scale: COMBAT_MENU_ICON_SCALE,
            });
          }
          entryY += 24;
        }
      } else {
        drawMutedTextAtom(k, {
          x: menuX + 12,
          y: messageY + 10,
          text: "Choose Command",
          size: 10,
          tag: UI_TAG,
        });

        const rootOptions: Array<{ id: CombatRootAction; label: string; tone: CombatMenuEntry["tone"]; enabled: boolean; onChoose: () => void }> = [
          {
            id: "fight",
            label: "Fight",
            tone: "danger",
            enabled: Boolean(fight?.available),
            onChoose: () => {
              menuMode = "fight";
              submenuIndex = 0;
              render();
            },
          },
          {
            id: "spells",
            label: "Spells",
            tone: "accent",
            enabled: spellOptions.length > 0,
            onChoose: () => {
              menuMode = "spells";
              submenuIndex = 0;
              render();
            },
          },
          {
            id: "pack",
            label: "Bag",
            tone: "good",
            enabled: true,
            onChoose: () => {
              menuMode = "pack";
              submenuIndex = 0;
              render();
            },
          },
          {
            id: "flee",
            label: "Run",
            tone: "warn",
            enabled: fleeOptions.length > 0,
            onChoose: executeRandomFlee,
          },
        ];

        const boxInnerW = menuW - 24;
        const buttonW = Math.floor((boxInnerW - 8) / 2);
        const firstRowY = messageY + 30;
        const secondRowY = firstRowY + 30;

        const positionFor = (id: CombatRootAction): { x: number; y: number } => {
          if (id === "fight") return { x: menuX + 12, y: firstRowY };
          if (id === "spells") return { x: menuX + 12 + buttonW + 8, y: firstRowY };
          if (id === "pack") return { x: menuX + 12, y: secondRowY };
          return { x: menuX + 12 + buttonW + 8, y: secondRowY };
        };

        for (const option of rootOptions) {
          const position = positionFor(option.id);
          const selected = rootSelection === option.id;
          addButton(
            k,
            position.x,
            position.y,
            buttonW,
            `${selected ? "> " : ""}${option.label}`,
            option.onChoose,
            option.enabled,
            { tone: selected ? option.tone : "neutral", compact: true },
          );
        }
      }
    };

    const moveSubmenu = (delta: number) => {
      const state = cb.getState();
      const spellOptions = preparedSpellSlots(state).filter((slot) => slot.skillId);
      const packOptions = itemsByActionType(state, "use_item").filter((item) => item.available);
      const lengths: Record<Exclude<CombatMenuMode, "root">, number> = {
        fight: 1,
        spells: Math.max(1, spellOptions.length),
        pack: Math.max(1, packOptions.length),
      };
      const max = lengths[menuMode as Exclude<CombatMenuMode, "root">] ?? 1;
      submenuIndex = (submenuIndex + delta + max) % max;
      render();
    };

    const confirmSelection = () => {
      const state = cb.getState();
      const fight = firstItemByActionType(state, ACTION_TYPE.FIGHT);
      const fleeOptions = itemsByActionType(state, ACTION_TYPE.FLEE).filter((item) => item.available);
      const spellOptions = preparedSpellSlots(state).filter((slot) => slot.skillId);
      const packOptions = itemsByActionType(state, "use_item").filter((item) => item.available);

      const executeCombatAction = (action: ActionItem | null) => {
        if (!action?.available) {
          return;
        }
        menuMode = "root";
        submenuIndex = 0;
        cb.doAction(action.action);
        if (!hasEncounter(cb.getState())) {
          k.go("gridNavigation");
        }
      };

      if (menuMode === "root") {
        if (rootSelection === "fight") {
          menuMode = "fight";
          submenuIndex = 0;
          render();
          return;
        }
        if (rootSelection === "spells") {
          menuMode = "spells";
          submenuIndex = 0;
          render();
          return;
        }
        if (rootSelection === "pack") {
          menuMode = "pack";
          submenuIndex = 0;
          render();
          return;
        }
        if (fleeOptions.length > 0) {
          const picked = fleeOptions[Math.floor(Math.random() * fleeOptions.length)] ?? fleeOptions[0] ?? null;
          executeCombatAction(picked);
        }
        return;
      }

      if (menuMode === "fight") {
        executeCombatAction(fight);
        return;
      }
      if (menuMode === "spells") {
        const selected = spellOptions[submenuIndex] ?? null;
        if (!selected?.skillId || !selected.available) {
          return;
        }
        menuMode = "root";
        submenuIndex = 0;
        cb.castSpell(selected.skillId);
        if (!hasEncounter(cb.getState())) {
          k.go("gridNavigation");
        }
        return;
      }
      executeCombatAction(packOptions[submenuIndex] ?? null);
    };

    const moveMenu = (direction: "up" | "down" | "left" | "right") => {
      if (menuMode === "root") {
        rootSelection = moveRootSelection(rootSelection, direction);
        render();
        return;
      }
      if (direction === "up") {
        moveSubmenu(-1);
        return;
      }
      if (direction === "down") {
        moveSubmenu(1);
      }
    };

    k.onKeyPress("up", () => moveMenu("up"));
    k.onKeyPress("down", () => moveMenu("down"));
    k.onKeyPress("left", () => moveMenu("left"));
    k.onKeyPress("right", () => moveMenu("right"));
    k.onKeyPress("w", () => moveMenu("up"));
    k.onKeyPress("s", () => moveMenu("down"));
    k.onKeyPress("a", () => moveMenu("left"));
    k.onKeyPress("d", () => moveMenu("right"));
    k.onKeyPress("enter", confirmSelection);
    k.onKeyPress("space", confirmSelection);
    k.onKeyPress("escape", () => {
      if (menuMode !== "root") {
        menuMode = "root";
        submenuIndex = 0;
        render();
        return;
      }
      k.go("gridNavigation");
    });

    cb.setRefresh(render);
    render();
  });
}

function registerActionMenuScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridActionMenu", () => {
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Controls and Actions",
        subtitle: "[Esc] Navigation | [1] First-Person",
        journalTitle: "Recent Log",
        journalMaxLines: 8,
      });

      const centerBottomY = NAV_ROW_Y + NAV_PANEL_H - PANEL_INSET - LINE_H;
      let actionY = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Available Actions",
        subtitle: "Choose a move, interaction, or utility action.",
      });
      actionY += 2;
      for (const group of state.groups) {
        drawMutedTextAtom(k, {
          x: shell.centerX,
          y: actionY,
          text: group.title,
          size: 10,
          tag: UI_TAG,
        });
        actionY += LINE_H;

        for (const item of group.items) {
          const actionType = getActionType(item.action);
          actionY = addButton(
            k,
            shell.centerX,
            actionY,
            shell.centerWidth,
            formatActionButtonLabel(item),
            () => {
              if (!item.available) return;
              cb.doAction(item.action);
              k.go(
                routeForActionItem(actionType, item.uiScreen, {
                  inRuneForgeContext: inRuneForgeContext(state),
                  hasEncounter: hasEncounter(state),
                }),
              );
            },
            item.available,
            { tone: actionToneFor(item), compact: true },
          );
          if (actionY > centerBottomY) break;
        }
        actionY += 2;
        if (actionY > centerBottomY) break;
      }

      const hints = ["[C] Controls", "[B] Bag", "[J] Journal", "[Esc] Navigation", "[1] First-Person"];
      if (hasEncounter(state)) hints.splice(1, 0, "[F] Combat");
      if (inRuneForgeContext(state)) hints.push("[M] Rune Forge");
      renderGridFooter(k, state, hints);
    };

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("escape", () => k.go("gridNavigation"));

    cb.setRefresh(render);
    render();
  });
}

function registerRuneForgeScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridRuneForge", () => {
    let selectedSlotIndex = 0;

    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Rune Forge",
        subtitle: "[Esc] Controls | [1] First-Person",
        journalTitle: "Forge Log",
        journalMaxLines: 8,
      });
      let y = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Rune Forge",
        subtitle: "Recover, tune combat spells, and prepare the next room run.",
      });
      y += 4;

      const slots = preparedSpellSlots(state);
      selectedSlotIndex = Math.max(0, Math.min(selectedSlotIndex, Math.max(0, slots.length - 1)));
      const spellPool = spellPoolRows(state);
      const spellPoolTop = y;

      drawMutedTextAtom(k, {
        x: shell.centerX,
        y,
        text: "Active slots",
        size: 10,
        tag: UI_TAG,
      });
      y += 14;
      for (const slot of slots) {
        const selected = slot.slotIndex === selectedSlotIndex;
        y = addButton(
          k,
          shell.centerX,
          y,
          shell.centerWidth,
          `${selected ? "> " : ""}Slot ${slot.slotIndex + 1}: ${slot.name}`,
          () => {
            selectedSlotIndex = slot.slotIndex;
            render();
          },
          true,
          { tone: selected ? "accent" : slot.skillId ? "neutral" : "warn", compact: true },
        );
        if (slot.skillId) {
          const spriteName = resolveSpellSprite(slot.skillId);
          if (spriteName) {
            renderCombatSprite(k, spriteName, shell.centerX + shell.centerWidth - 24, y - 15, {
              scale: COMBAT_MENU_ICON_SCALE,
            });
          }
        }
      }

      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        `Clear Slot ${selectedSlotIndex + 1}`,
        () => cb.prepareSpellSlot(selectedSlotIndex, null),
        Boolean(slots[selectedSlotIndex]?.skillId),
        { tone: "warn", compact: true },
      );

      const forgeActionStartY = Math.max(y + 4, spellPoolTop + 132);
      const poolX = shell.centerX + Math.floor(shell.centerWidth * 0.53);
      const poolWidth = shell.centerWidth - (poolX - shell.centerX);
      drawMutedTextAtom(k, {
        x: poolX,
        y: spellPoolTop,
        text: "Spell pool",
        size: 10,
        tag: UI_TAG,
      });
      let poolY = spellPoolTop + 14;
      for (const spell of spellPool.slice(0, 5)) {
        const buttonLabel = spell.isEquipped
          ? `${spell.name} [slot ${Number(spell.slotIndex ?? 0) + 1}]`
          : `${spell.name} -> slot ${selectedSlotIndex + 1}`;
        poolY = addButton(
          k,
          poolX,
          poolY,
          poolWidth,
          buttonLabel,
          () => cb.prepareSpellSlot(selectedSlotIndex, spell.skillId),
          true,
          { tone: spell.isEquipped ? "good" : "accent", compact: true },
        );
        const spriteName = resolveSpellSprite(spell.skillId);
        if (spriteName) {
          renderCombatSprite(k, spriteName, poolX + poolWidth - 24, poolY - 15, {
            scale: COMBAT_MENU_ICON_SCALE,
          });
        }
      }

      y = forgeActionStartY;

      const restAction = firstItemByActionType(state, "rest");
      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        restAction ? formatActionButtonLabel(restAction) : "Rest (Unavailable)",
        () => {
          if (!restAction) return;
          cb.doAction(restAction.action);
          k.go("gridNavigation");
        },
        Boolean(restAction?.available),
        { tone: "good", compact: true },
      );

      const evolveActions = itemsByActionType(state, ACTION_TYPE.EVOLVE_SKILL);
      if (evolveActions.length === 0) {
        y = addButton(k, shell.centerX, y, shell.centerWidth, "Evolve Spell (Unavailable)", () => {}, false, {
          compact: true,
        });
      } else {
        for (const action of evolveActions.slice(0, 4)) {
          y = addButton(
            k,
            shell.centerX,
            y,
            shell.centerWidth,
            formatActionButtonLabel(action),
            () => {
              cb.doAction(action.action);
              k.go("gridNavigation");
            },
            action.available,
            { tone: actionToneFor(action), compact: true },
          );
        }
      }

      y = addButton(k, shell.centerX, y, shell.centerWidth, "Open Bag", () => k.go("gridInventory"), true, {
        compact: true,
      });

      const purchaseActions = itemsByActionType(state, "purchase");
      if (purchaseActions.length === 0) {
        y = addButton(k, shell.centerX, y, shell.centerWidth, "Purchase (Unavailable)", () => {}, false, {
          compact: true,
        });
      } else {
        for (const action of purchaseActions.slice(0, 4)) {
          y = addButton(
            k,
            shell.centerX,
            y,
            shell.centerWidth,
            formatActionButtonLabel(action),
            () => {
              cb.doAction(action.action);
              k.go("gridRuneForge");
            },
            action.available,
            { tone: actionToneFor(action), compact: true },
          );
        }
      }

      const reEquipActions = itemsByActionType(state, ACTION_TYPE.RE_EQUIP);
      if (reEquipActions.length === 0) {
        addButton(k, shell.centerX, y, shell.centerWidth, "Re-equip (Unavailable)", () => {}, false, {
          compact: true,
        });
      } else {
        for (const action of reEquipActions.slice(0, 4)) {
          y = addButton(
            k,
            shell.centerX,
            y,
            shell.centerWidth,
            formatActionButtonLabel(action),
            () => {
              cb.doAction(action.action);
              k.go("gridRuneForge");
            },
            action.available,
            { tone: actionToneFor(action), compact: true },
          );
        }
      }

      const hints = ["[Click] Prepare", "[B] Bag", "[C] Controls", "[Esc] Controls", "[1] First-Person"];
      renderGridFooter(k, state, hints);
    };

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("escape", () => k.go("gridActionMenu"));

    cb.setRefresh(render);
    render();
  });
}

function registerInventoryScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridInventory", () => {
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Bag",
        subtitle: "[Esc] Controls | [1] First-Person",
        journalTitle: "Bag Log",
        journalMaxLines: 8,
      });

      const rows = inventoryRows(state);
      let y = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Inventory",
        subtitle: "Manage use, equip, and drop actions.",
      });
      y += 2;

      if (rows.length === 0) {
        drawMutedTextAtom(k, {
          x: shell.centerX,
          y,
          text: "Inventory is empty.",
          size: 11,
          width: shell.centerWidth,
          tag: UI_TAG,
        });
        y += LINE_H * 2;
      } else {
        const slotRows = rows.slice(0, 6);
        for (const row of slotRows) {
          drawMutedTextAtom(k, {
            x: shell.centerX,
            y,
            text: row.line,
            size: 10,
            width: shell.centerWidth,
            tag: UI_TAG,
          });
          y += LINE_H;

          let actionY = y;
          const actionWidth = Math.floor((shell.centerWidth - INVENTORY_ACTION_COLUMN_GAP * 2) / 3);
          actionY = addButton(
            k,
            shell.centerX,
            actionY,
            actionWidth,
            "[USE] Use",
            () => {
              if (row.useAction) {
                cb.doAction(row.useAction.action);
                k.go("gridInventory");
              }
            },
            row.canUse,
            { tone: "good", compact: true },
          );
          actionY = addButton(
            k,
            shell.centerX + actionWidth + INVENTORY_ACTION_COLUMN_GAP,
            y,
            actionWidth,
            "[EQP] Equip",
            () => {
              if (row.equipAction) {
                cb.doAction(row.equipAction.action);
                k.go("gridInventory");
              }
            },
            row.canEquip,
            { tone: "accent", compact: true },
          );
          addButton(
            k,
            shell.centerX + (actionWidth + INVENTORY_ACTION_COLUMN_GAP) * 2,
            y,
            actionWidth,
            "[DROP] Drop",
            () => {
              if (row.dropAction) {
                cb.doAction(row.dropAction.action);
                k.go("gridInventory");
              }
            },
            row.canDrop,
            { tone: "warn", compact: true },
          );
          y = actionY + 2;
        }
      }

      addButton(k, shell.centerX, y, shell.centerWidth, "[C] Back to Controls", () => k.go("gridActionMenu"), true, {
        tone: "neutral",
      });
      const hints = ["[B] Bag", "[C] Controls", "[J] Journal", "[Esc] Controls", "[1] First-Person"];
      renderGridFooter(k, state, hints);
    };

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("escape", () => k.go("gridActionMenu"));

    cb.setRefresh(render);
    render();
  });
}

function registerDialogueScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridDialogue", () => {
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Journal and Dialogue",
        subtitle: "[Esc] Controls | [1] First-Person",
        journalTitle: "Dialogue Log",
        journalMaxLines: 8,
      });
      const uiState = cb.getUiState();
      let y = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Conversation",
        subtitle: `Nearby: ${nearestEnemyLabel(state)}`,
      });
      y = widgets.renderDialogueProgress({
        x: shell.centerX,
        y,
        width: shell.centerWidth,
        ui: uiState,
        timelineLimit: 3,
      });
      y += 8;

      const options = itemsByActionType(state, "choose_dialogue");
      if (options.length === 0) {
        y = addButton(k, shell.centerX, y, shell.centerWidth, "No dialogue options available", () => {}, false);
      } else {
        y = widgets.renderActionList({
          x: shell.centerX,
          y,
          width: shell.centerWidth,
          items: options,
          onAction: (option) => {
            cb.doAction(option.action);
            k.go("gridNavigation");
          },
          maxItems: 10,
          compact: true,
        });
      }

      const talkAction = firstItemByActionType(state, ACTION_TYPE.TALK);
      y += 4;
      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        talkAction ? formatActionButtonLabel(talkAction) : "[TALK] Talk (Unavailable)",
        () => {
          if (!talkAction) return;
          cb.doAction(talkAction.action);
          k.go("gridNavigation");
        },
        Boolean(talkAction?.available),
        { tone: "neutral" },
      );

      addButton(k, shell.centerX, y, shell.centerWidth, "[C] Back to Controls", () => k.go("gridActionMenu"));
      const hints = ["[J] Journal", "[C] Controls", "[B] Bag", "[Esc] Controls", "[1] First-Person"];
      renderGridFooter(k, state, hints);
    };

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("escape", () => k.go("gridActionMenu"));

    cb.setRefresh(render);
    render();
  });
}

export function registerGridScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  registerNavigationScene(k, cb);
  registerCombatScene(k, cb);
  registerActionMenuScene(k, cb);
  registerRuneForgeScene(k, cb);
  registerInventoryScene(k, cb);
  registerDialogueScene(k, cb);
}


