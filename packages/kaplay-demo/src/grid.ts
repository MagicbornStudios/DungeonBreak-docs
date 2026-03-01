import type { ActionItem, PlayUiAction } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import type { SceneCallbacks } from "./scene-contracts";
import {
  addButton,
  addChip,
  addFooterStatus,
  addFeedBlock,
  addPanel,
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
import { selectDialogueSummary, selectFogMetrics, selectRecentDialogueTimeline } from "./ui-selectors";
import { hotkeyRouteMap, routeForActionItem } from "./intent-router";

const W = 800;
const H = 600;
const COLS = 10;
const ROWS = 5;
const CELL_H = 18;

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

function executeMove(cb: SceneCallbacks, direction: Direction): void {
  const action: PlayUiAction = {
    kind: "player",
    playerAction: { actionType: "move", payload: { direction } },
  };
  cb.doAction(action);
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

function inRuneForgeContext(state: ReturnType<SceneCallbacks["getState"]>): boolean {
  if (itemsByActionType(state, "evolve_skill").length > 0) return true;
  return state.look.toLowerCase().includes("rune") && state.look.toLowerCase().includes("forge");
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

function registerNavigationScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const navTabs = ["Map", "Feed", "Context"] as const;
  let activeTab: (typeof navTabs)[number] = "Map";
  const widgets = createWidgetRegistry(k);

  k.scene("gridNavigation", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      const uiState = cb.getUiState();
      const fog = selectFogMetrics(uiState);
      markDiscovered(state, fog.radius);

      let y = renderSceneLayout(k, {
        width: W,
        title: "Escape the Dungeon - ASCII Grid / Navigation",
        subtitle: "[1] First-Person | [E] Actions",
        tabs: navTabs,
      }, {
        activeTab,
        onSelectTab: (tab) => {
          activeTab = tab as (typeof navTabs)[number];
          render();
        },
      });

      const mapLines = buildMap(state);
      const panelTop = y;
      const panelHeight = 240;
      addPanel(k, PAD, panelTop, W - PAD * 2, panelHeight);
      y += 8;

      if (activeTab === "Map") {
        k.add([
          k.text("Map View", { size: 11 }),
          k.pos(PAD + 8, y),
          k.color(160, 170, 196),
          k.anchor("topleft"),
          UI_TAG,
        ]);
        y += LINE_H;

        for (const line of mapLines) {
          k.add([
            k.text(line, { size: CELL_H - 2, font: "monospace" }),
            k.pos(PAD + 8, y),
            k.color(218, 220, 228),
            k.anchor("topleft"),
            UI_TAG,
          ]);
          y += CELL_H;
        }

        y += 2;
        k.add([
          k.text(`Legend: # unknown . explored @ you`, { size: 10, width: W - PAD * 2 - 16 }),
          k.pos(PAD + 8, y),
          k.color(138, 145, 165),
          k.anchor("topleft"),
          UI_TAG,
        ]);
      } else if (activeTab === "Feed") {
        widgets.renderEventLog({
          x: PAD + 8,
          y,
          width: W - PAD * 2 - 16,
          title: "[LOG] Event Feed",
          lines: cb.feedLines,
          maxLines: 11,
        });
      } else {
        let chipX = PAD + 8;
        const health = Number(state.status.health ?? 0);
        const energy = Number(state.status.energy ?? 0);
        const level = Number(state.status.level ?? 0);
        chipX = addChip(k, chipX, y, `Depth ${String(state.status.depth ?? "?")}`, "neutral");
        chipX = addChip(k, chipX, y, `Lv ${String(state.status.level ?? "?")}`, level >= 5 ? "good" : "neutral");
        chipX = addChip(k, chipX, y, `HP ${String(state.status.health ?? "?")}`, health <= 25 ? "danger" : "good");
        addChip(k, chipX, y, `Energy ${String(state.status.energy ?? "?")}`, energy <= 20 ? "warn" : "good");
        y += 26;
        chipX = PAD + 8;
        chipX = addChip(k, chipX, y, `Fog r=${fog.radius}`, "accent");
        chipX = addChip(k, chipX, y, `Lvl+${fog.levelFactor}`, "neutral");
        chipX = addChip(k, chipX, y, `Cmp+${fog.comprehensionFactor}`, "neutral");
        addChip(k, chipX, y, `Aware+${fog.awarenessFactor}`, "neutral");
        y += 26;

        const nearby = nearestEnemyLabel(state);
        addChip(k, PAD + 8, y, nearby === "none" ? "Nearby: clear" : `Nearby: ${nearby}`, nearby === "none" ? "good" : "warn");
        y += 26;
        k.add([
          k.text(state.look, { size: 11, width: W - PAD * 2 - 16 }),
          k.pos(PAD + 8, y),
          k.color(212, 218, 232),
          k.anchor("topleft"),
          UI_TAG,
        ]);
      }
      y = panelTop + panelHeight + 6;

      y = addRoomInfoPanel(k, PAD, y, W - PAD * 2, state.status, state.look.split("\n").slice(1, 3).join(" "));

      y += 4;
      k.add([
        k.text("[WASD] Move  |  [E] Actions  |  [C] Combat  |  [I] Inventory  |  [T] Dialogue", { size: 10, width: W - PAD * 2 }),
        k.pos(PAD, y),
        k.color(155, 165, 186),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LINE_H + 2;

      if (activeTab !== "Feed") {
        y = widgets.renderEventLog({
          x: PAD,
          y,
          width: W - PAD * 2,
          title: "[LOG] Recent",
          lines: cb.feedLines,
          maxLines: 4,
        });
      }

      addFooterStatus(k, PAD, Math.min(H - 22, y + 2), state.status);
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
      k.onKeyPress(key as "w", () => executeMove(cb, direction));
    }

    const routeMapKeys = ["1", "e", "space", "c", "i", "t", "r"] as const;
    for (const key of routeMapKeys) {
      k.onKeyPress(key, () => {
        const state = cb.getState();
        const route = hotkeyRouteMap({ inRuneForgeContext: inRuneForgeContext(state) })[key];
        if (route) k.go(route);
      });
    }

    cb.setRefresh(render);
    render();
  });
}

function registerCombatScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridCombat", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = renderSceneLayout(k, {
        width: W,
        title: "Combat Screen",
        subtitle: "Pokemon-style | [1] First-Person | [Esc] Navigation",
      });

      k.add([
        k.rect(W - PAD * 2, 150, { radius: 4 }),
        k.pos(PAD, y),
        k.color(26, 34, 58),
        k.anchor("topleft"),
        UI_TAG,
      ]);

      k.add([
        k.text(`Enemy: ${nearestEnemyLabel(state)}`, { size: 13, width: W - PAD * 2 - 12 }),
        k.pos(PAD + 6, y + 8),
        k.color(236, 196, 178),
        k.anchor("topleft"),
        UI_TAG,
      ]);

      k.add([
        k.text(
          `Kael HP ${String(state.status.health ?? "?")} | Energy ${String(state.status.energy ?? "?")} | Level ${String(state.status.level ?? "?")}`,
          { size: 11, width: W - PAD * 2 - 12 },
        ),
        k.pos(PAD + 6, y + 30),
        k.color(190, 216, 236),
        k.anchor("topleft"),
        UI_TAG,
      ]);

      k.add([
        k.text("Choose an action:", { size: 11 }),
        k.pos(PAD + 6, y + 56),
        k.color(155, 168, 188),
        k.anchor("topleft"),
        UI_TAG,
      ]);

      const fight = firstItemByActionType(state, "fight");
      const flees = itemsByActionType(state, "flee");
      const fallbackFlee = flees[0] ?? null;

      let buttonY = y + 74;
      buttonY = addButton(
        k,
        PAD + 6,
        buttonY,
        260,
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
            PAD + 6,
            buttonY,
            260,
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
          PAD + 6,
          buttonY,
          260,
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

      buttonY = addButton(k, PAD + 6, buttonY, 260, "[ITEM] Item (Stub)", () => {}, false);
      addButton(k, PAD + 6, buttonY, 260, "[SKILL] Skill (Stub)", () => {}, false);

      y += 160;
      addFeedBlock(k, PAD, y, W - PAD * 2, cb.feedLines, 4);
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
  k.scene("gridActionMenu", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = renderSceneLayout(k, {
        width: W,
        title: "Action Menu Screen",
        subtitle: "[Esc] Navigation | [1] First-Person",
      });

      let rowY = y;
      rowY = addButton(k, PAD, rowY, 190, "[ATK] Combat Screen", () => k.go("gridCombat"), true, { tone: "danger" });
      rowY = addButton(k, PAD, rowY, 190, "[DIA] Dialogue Screen", () => k.go("gridDialogue"));
      rowY = addButton(k, PAD, rowY, 190, "[INV] Inventory Screen", () => k.go("gridInventory"));
      rowY = addButton(k, PAD, rowY, 190, "[EVO] Rune Forge Screen", () => k.go("gridRuneForge"), true, { tone: "accent" });
      addButton(k, PAD, rowY, 190, "[MAP] Back to Navigation", () => k.go("gridNavigation"));

      const colX = PAD + 206;
      let actionY = y;
      for (const group of state.groups) {
        k.add([
          k.text(group.title, { size: 11 }),
          k.pos(colX, actionY),
          k.color(155, 168, 190),
          k.anchor("topleft"),
          UI_TAG,
        ]);
        actionY += LINE_H;

        for (const item of group.items) {
          const actionType = getActionType(item.action);
          actionY = addButton(
            k,
            colX,
            actionY,
            W - colX - PAD,
            formatActionButtonLabel(item),
            () => {
              if (!item.available) return;
              cb.doAction(item.action);
              k.go(
                routeForActionItem(actionType, item.uiScreen, {
                  inRuneForgeContext: inRuneForgeContext(state),
                }),
              );
            },
            item.available,
            { tone: actionToneFor(item), compact: true },
          );
          if (actionY > H - 120) break;
        }
        actionY += 2;
        if (actionY > H - 120) break;
      }

      addFeedBlock(k, PAD, H - 95, W - PAD * 2, cb.feedLines, 3);
    };

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("escape", () => k.go("gridNavigation"));

    cb.setRefresh(render);
    render();
  });
}

function registerRuneForgeScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridRuneForge", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = renderSceneLayout(k, {
        width: W,
        title: "Rune Forge Screen",
        subtitle: "[Esc] Action Menu | [1] First-Person",
      });

      k.add([
        k.text("Available in rune forge context: Rest, Evolve Skill, Inventory", { size: 11, width: W - PAD * 2 }),
        k.pos(PAD, y),
        k.color(164, 174, 196),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LINE_H + 4;

      const restAction = firstItemByActionType(state, "rest");
      y = addButton(
        k,
        PAD,
        y,
        260,
        restAction ? formatActionButtonLabel(restAction) : "[REST] Rest (Unavailable)",
        () => {
          if (!restAction) return;
          cb.doAction(restAction.action);
          k.go("gridNavigation");
        },
        Boolean(restAction?.available),
        { tone: "good" },
      );

      const evolveActions = itemsByActionType(state, "evolve_skill");
      if (evolveActions.length === 0) {
        y = addButton(k, PAD, y, 260, "[EVO] Evolve Skill (Unavailable)", () => {}, false);
      } else {
        for (const action of evolveActions.slice(0, 4)) {
          y = addButton(
            k,
            PAD,
            y,
            260,
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

      y = addButton(k, PAD, y, 260, "[INV] Inventory", () => k.go("gridInventory"));

      const purchaseActions = itemsByActionType(state, "purchase");
      if (purchaseActions.length === 0) {
        y = addButton(k, PAD, y, 260, "[BUY] Purchase (Unavailable)", () => {}, false);
      } else {
        for (const action of purchaseActions.slice(0, 4)) {
          y = addButton(
            k,
            PAD,
            y,
            260,
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

      const reEquipActions = itemsByActionType(state, "re_equip");
      if (reEquipActions.length === 0) {
        addButton(k, PAD, y, 260, "[RE-EQ] Re-equip (Unavailable)", () => {}, false);
      } else {
        for (const action of reEquipActions.slice(0, 4)) {
          y = addButton(
            k,
            PAD,
            y,
            260,
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

      y += 8;
      addRoomInfoPanel(k, PAD, y, W - PAD * 2, state.status, state.look.split("\n").slice(1, 3).join(" "));
      addFeedBlock(k, PAD, H - 95, W - PAD * 2, cb.feedLines, 3);
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
      const state = cb.getState();
      let y = renderSceneLayout(k, {
        width: W,
        title: "Inventory Screen",
        subtitle: "[Esc] Action Menu | [1] First-Person",
      });

      const rows = inventoryRows(state);
      k.add([
        k.rect(W - PAD * 2, 340, { radius: 4 }),
        k.pos(PAD, y),
        k.color(22, 30, 52),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += 8;
      if (rows.length === 0) {
        k.add([
          k.text("Inventory is empty.", { size: 11, width: W - PAD * 2 - 12 }),
          k.pos(PAD + 6, y),
          k.color(190, 196, 210),
          k.anchor("topleft"),
          UI_TAG,
        ]);
        y += LINE_H * 2;
      } else {
        for (const row of rows.slice(0, 8)) {
          k.add([
            k.text(row.line, { size: 11, width: W - PAD * 2 - 12 }),
            k.pos(PAD + 6, y),
            k.color(225, 230, 240),
            k.anchor("topleft"),
            UI_TAG,
          ]);
          y += LINE_H;

          let actionY = y;
          actionY = addButton(
            k,
            PAD + 20,
            actionY,
            120,
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
            PAD + 148,
            y,
            120,
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
            PAD + 276,
            y,
            120,
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

      let buttonY = 410;
      addButton(k, PAD, buttonY, 220, "[MENU] Back to Action Menu", () => k.go("gridActionMenu"));

      widgets.renderEventLog({
        x: PAD + 240,
        y: 410,
        width: W - (PAD + 240) - PAD,
        title: "[LOG] Inventory",
        lines: cb.feedLines,
        maxLines: 5,
      });
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
      const state = cb.getState();
      const uiState = cb.getUiState();
      const summary = selectDialogueSummary(uiState);
      const timeline = selectRecentDialogueTimeline(uiState, 3);
      let y = renderSceneLayout(k, {
        width: W,
        title: "Dialogue Screen",
        subtitle: "[Esc] Action Menu | [1] First-Person",
      });

      k.add([
        k.text(`Nearby: ${nearestEnemyLabel(state)}`, { size: 11, width: W - PAD * 2 }),
        k.pos(PAD, y),
        k.color(178, 188, 210),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LINE_H + 2;
      widgets.renderDialogueProgress({
        x: PAD,
        y,
        width: W - PAD * 2,
        sequence: summary.sequence,
        stepsCount: summary.stepsCount,
        lastLabel: summary.lastLabel,
        timeline,
      });
      y += 94;

      const options = itemsByActionType(state, "choose_dialogue");
      if (options.length === 0) {
        y = addButton(k, PAD, y, W - PAD * 2, "No dialogue options available", () => {}, false);
      } else {
        y = widgets.renderActionList({
          x: PAD,
          y,
          width: W - PAD * 2,
          items: options,
          onAction: (option) => {
            cb.doAction(option.action);
            k.go("gridNavigation");
          },
          maxItems: 10,
          compact: true,
        });
      }

      const talkAction = firstItemByActionType(state, "talk");
      y += 4;
      y = addButton(
        k,
        PAD,
        y,
        W - PAD * 2,
        talkAction ? formatActionButtonLabel(talkAction) : "[TALK] Talk (Unavailable)",
        () => {
          if (!talkAction) return;
          cb.doAction(talkAction.action);
          k.go("gridNavigation");
        },
        Boolean(talkAction?.available),
        { tone: "neutral" },
      );

      addButton(k, PAD, y, 180, "[BACK] Back", () => k.go("gridActionMenu"));
      addFeedBlock(k, PAD, H - 95, W - PAD * 2, cb.feedLines, 3);
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

