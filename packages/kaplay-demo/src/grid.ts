import { ACTION_TYPE, type ActionItem, type PlayUiAction } from "@dungeonbreak/engine";
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
import { drawMutedTextAtom } from "./ui/atoms";
import { renderKeyHintLegendMolecule, renderSectionHeaderMolecule, renderStatRowMolecule } from "./ui/molecules";
import {
  renderCommandPanelOrganism,
  renderRoomBriefOrganism,
  renderThreeColumnShellOrganism,
  type ThreeColumnShellLayout,
} from "./ui/organisms";

const COLS = 10;
const ROWS = 5;
const MAP_CELL_SIZE = 24;
const MAP_LINE_H = 30;
const NAV_COLUMN_GAP = 8;
const NAV_LEFT_W = 148;
const NAV_RIGHT_W = 132;
const MAIN_PANEL_BOTTOM_GAP = 6;
const FOOTER_SAFE_OFFSET = 22;
const FOOTER_TOP_OFFSET = 2;
const INVENTORY_ACTION_COLUMN_GAP = 8;

const GLYPHS = {
  undiscovered: "#",
  floor: ".",
  player: "@",
  exit: "^",
  rune: "R",
  treasure: "T",
  training: "*",
  rest: "~",
  hostile: "E",
  dungeoneer: "D",
} as const;

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

function buildMap(state: ReturnType<SceneCallbacks["getState"]>): string[] {
  hydrateDiscovery();
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  const discovered = discoveredByDepth.get(depth) ?? new Set<number>();

  const map: string[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => GLYPHS.undiscovered));

  for (const idx of discovered) {
    const { col, row } = indexToPos(idx);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      map[row][col] = GLYPHS.floor;
    }
  }

  if (parsed) {
    const { col, row } = indexToPos(parsed.index);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      map[row][col] = GLYPHS.player;
    }
  }

  return map.map((row) => row.join(""));
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
        title: "Escape the Dungeon - ASCII Grid",
        subtitle: "[1] First-Person | [C] Controls",
        leftWidth: NAV_LEFT_W,
        rightWidth: NAV_RIGHT_W,
        showJournal: false,
      });
      const uiState = cb.getUiState();
      const fog = selectFogMetrics(uiState);
      markDiscovered(state, fog.radius);

      const mapLines = buildMap(state);
      const mapDisplayLines = mapLines.map((line) => line.split("").join(" "));
      const widestLineChars = Math.max(...mapDisplayLines.map((line) => line.length));
      const approxMapPixelWidth = widestLineChars * (MAP_CELL_SIZE * 0.6);
      const centerInnerX = shell.centerX + Math.max(0, Math.floor((shell.centerWidth - approxMapPixelWidth) / 2));
      let mapY = shell.innerY;
      drawMutedTextAtom(k, { x: centerInnerX, y: mapY, text: "Map View", size: 11, tag: UI_TAG });
      mapY += LINE_H;

      for (const line of mapDisplayLines) {
        k.add([
          k.text(line, { size: MAP_CELL_SIZE, font: "monospace" }),
          k.pos(centerInnerX, mapY),
          k.color(218, 220, 228),
          k.anchor("topleft"),
          UI_TAG,
        ]);
        mapY += MAP_LINE_H;
      }

      drawMutedTextAtom(k, {
        x: centerInnerX,
        y: mapY + 2,
        text: "Legend: # unknown . explored @ you",
        size: 10,
        width: shell.centerWidth,
        tag: UI_TAG,
      });
      const hints = ["[WASD] Move", "[C] Controls", "[B] Bag", "[J] Journal"];
      if (hasEncounter(state)) hints.splice(1, 0, "[F] Combat");
      if (inRuneForgeContext(state)) hints.push("[M] Magic Lab");
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
  const widgets = createWidgetRegistry(k);
  k.scene("gridCombat", () => {
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Combat Console",
        subtitle: "[Esc] Back | [1] First-Person",
        journalTitle: "Battle Log",
        journalMaxLines: 8,
      });

      let y = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Combat Actions",
        subtitle: `Enemy: ${nearestEnemyLabel(state)}`,
      });
      y += 2;
      y = renderStatRowMolecule(k, {
        x: shell.centerX,
        y,
        icon: "[HP]",
        label: "Kael",
        value: String(state.status.health ?? "?"),
        tone: "good",
        width: shell.centerWidth,
      });
      y = renderStatRowMolecule(k, {
        x: shell.centerX,
        y,
        icon: "[EN]",
        label: "Energy",
        value: String(state.status.energy ?? "?"),
        tone: "warn",
        width: shell.centerWidth,
      });
      y = renderStatRowMolecule(k, {
        x: shell.centerX,
        y,
        icon: "[LV]",
        label: "Level",
        value: String(state.status.level ?? "?"),
        tone: "neutral",
        width: shell.centerWidth,
      });
      y += 2;
      drawMutedTextAtom(k, { x: shell.centerX, y, text: "Choose one action this turn.", size: 10, tag: UI_TAG });
      y += LINE_H;

      const fight = firstItemByActionType(state, ACTION_TYPE.FIGHT);
      const flees = itemsByActionType(state, ACTION_TYPE.FLEE);
      const fallbackFlee = flees[0] ?? null;

      let buttonY = y;
      buttonY = addButton(
        k,
        shell.centerX,
        buttonY,
        shell.centerWidth,
        fight ? "[ATK] Fight" : "[ATK] Fight (Unavailable)",
        () => {
          if (fight) {
            cb.doAction(fight.action);
            k.go("gridNavigation");
          }
        },
        Boolean(fight?.available),
        { tone: "danger" },
      );

      if (fightsAvailable(flees)) {
        for (const flee of flees.slice(0, 3)) {
          buttonY = addButton(
            k,
            shell.centerX,
            buttonY,
            shell.centerWidth,
            formatActionButtonLabel(flee),
            () => {
              cb.doAction(flee.action);
              k.go("gridNavigation");
            },
            flee.available,
            { tone: actionToneFor(flee) },
          );
        }
      } else {
        buttonY = addButton(
          k,
          shell.centerX,
          buttonY,
          shell.centerWidth,
          fallbackFlee ? formatActionButtonLabel(fallbackFlee) : "[RUN] Flee (Unavailable)",
          () => {
            if (fallbackFlee) {
              cb.doAction(fallbackFlee.action);
              k.go("gridNavigation");
            }
          },
          Boolean(fallbackFlee?.available),
          { tone: "warn" },
        );
      }

      buttonY = addButton(k, shell.centerX, buttonY, shell.centerWidth, "[ITEM] Item (Soon)", () => {}, false);
      addButton(k, shell.centerX, buttonY, shell.centerWidth, "[SKILL] Skill (Soon)", () => {}, false);

      const hints = ["[C] Controls", "[ATK] Fight", "[RUN] Flee", "[Esc] Navigation", "[1] First-Person"];
      renderGridFooter(k, state, hints);
    };

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("escape", () => k.go("gridNavigation"));

    cb.setRefresh(render);
    render();
  });
}

function fightsAvailable(flees: ActionItem[]): boolean {
  return flees.length > 1;
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
      if (inRuneForgeContext(state)) hints.push("[M] Magic Lab");
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
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Magic Lab",
        subtitle: "[Esc] Controls | [1] First-Person",
        journalTitle: "Magic Log",
        journalMaxLines: 8,
      });
      let y = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Rune Forge",
        subtitle: "Rest, evolve skills, and tune loadout.",
      });
      y += 2;

      const restAction = firstItemByActionType(state, "rest");
      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        restAction ? formatActionButtonLabel(restAction) : "[REST] Rest (Unavailable)",
        () => {
          if (!restAction) return;
          cb.doAction(restAction.action);
          k.go("gridNavigation");
        },
        Boolean(restAction?.available),
        { tone: "good" },
      );

      const evolveActions = itemsByActionType(state, ACTION_TYPE.EVOLVE_SKILL);
      if (evolveActions.length === 0) {
        y = addButton(k, shell.centerX, y, shell.centerWidth, "[EVO] Evolve Skill (Unavailable)", () => {}, false);
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
            { tone: actionToneFor(action) },
          );
        }
      }

      y = addButton(k, shell.centerX, y, shell.centerWidth, "[B] Bag", () => k.go("gridInventory"));

      const purchaseActions = itemsByActionType(state, "purchase");
      if (purchaseActions.length === 0) {
        y = addButton(k, shell.centerX, y, shell.centerWidth, "[BUY] Purchase (Unavailable)", () => {}, false);
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
            { tone: actionToneFor(action) },
          );
        }
      }

      const reEquipActions = itemsByActionType(state, ACTION_TYPE.RE_EQUIP);
      if (reEquipActions.length === 0) {
        addButton(k, shell.centerX, y, shell.centerWidth, "[RE-EQ] Re-equip (Unavailable)", () => {}, false);
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
            { tone: actionToneFor(action) },
          );
        }
      }

      const hints = ["[M] Magic Lab", "[B] Bag", "[C] Controls", "[Esc] Controls", "[1] First-Person"];
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


