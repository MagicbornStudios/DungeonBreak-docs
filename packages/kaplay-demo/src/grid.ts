import type { ActionItem, PlayUiAction } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import type { SceneCallbacks } from "./scene-contracts";
import {
  addButton,
  addFeedBlock,
  addHeader,
  addRoomInfoPanel,
  clearUi,
  LINE_H,
  PAD,
  UI_TAG,
} from "./shared";

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

const discoveredByDepth = new Map<number, Set<number>>();

type Direction = "north" | "south" | "west" | "east";

function parseRoomId(roomId: string): { depth: number; index: number } | null {
  const m = /^L(\d+)_R(\d+)$/.exec(roomId);
  if (!m) return null;
  return { depth: Number.parseInt(m[1], 10), index: Number.parseInt(m[2], 10) };
}

function indexToPos(idx: number): { col: number; row: number } {
  return { col: idx % COLS, row: Math.floor(idx / COLS) };
}

function allItems(state: ReturnType<SceneCallbacks["getState"]>): ActionItem[] {
  return state.groups.flatMap((group) => group.items);
}

function playerActionType(item: ActionItem): string | null {
  return item.action.kind === "player" ? item.action.playerAction.actionType : null;
}

function itemsByActionType(state: ReturnType<SceneCallbacks["getState"]>, actionType: string): ActionItem[] {
  return allItems(state).filter((item) => playerActionType(item) === actionType);
}

function firstItemByActionType(state: ReturnType<SceneCallbacks["getState"]>, actionType: string): ActionItem | null {
  return itemsByActionType(state, actionType)[0] ?? null;
}

function executeMove(cb: SceneCallbacks, direction: Direction): void {
  const action: PlayUiAction = {
    kind: "player",
    playerAction: { actionType: "move", payload: { direction } },
  };
  cb.doAction(action);
}

function markDiscovered(state: ReturnType<SceneCallbacks["getState"]>): void {
  const parsed = parseRoomId(String(state.status.roomId ?? ""));
  const depth = Number(state.status.depth ?? parsed?.depth ?? 0);
  if (!parsed || !depth) return;
  const existing = discoveredByDepth.get(depth) ?? new Set<number>();
  existing.add(parsed.index);
  discoveredByDepth.set(depth, existing);
}

function buildMap(state: ReturnType<SceneCallbacks["getState"]>): string[] {
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

function playerInventoryLines(state: ReturnType<SceneCallbacks["getState"]>): string[] {
  const snapshot = state.engine.snapshot() as {
    entities: Record<string, { inventory: Array<{ name: string; rarity?: string; tags?: string[] }> }>;
    playerId: string;
  };
  const player = snapshot.entities[snapshot.playerId];
  const inventory = player?.inventory ?? [];
  if (inventory.length === 0) {
    return ["Inventory is empty."];
  }
  return inventory.map((item, idx) => {
    const rarity = item.rarity ?? "common";
    const tags = item.tags?.join(", ") ?? "-";
    return `${idx + 1}. ${item.name} (${rarity}) [${tags}]`;
  });
}

function registerNavigationScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridNavigation", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      markDiscovered(state);

      let y = addHeader(k, W, "Escape the Dungeon - ASCII Grid / Navigation", "[1] First-Person | [E] Actions");

      const mapLines = buildMap(state);
      k.add([
        k.text("Navigation Map", { size: 11 }),
        k.pos(PAD, y),
        k.color(160, 170, 196),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LINE_H;

      for (const line of mapLines) {
        k.add([
          k.text(line, { size: CELL_H - 2, font: "monospace" }),
          k.pos(PAD, y),
          k.color(218, 220, 228),
          k.anchor("topleft"),
          UI_TAG,
        ]);
        y += CELL_H;
      }

      y += 2;
      k.add([
        k.text(`Legend: # ${GLYPHS.undiscovered} . ${GLYPHS.floor} @ ${GLYPHS.player} E ${GLYPHS.hostile} D ${GLYPHS.dungeoneer} R ${GLYPHS.rune} T ${GLYPHS.treasure} ^ ${GLYPHS.exit} * ${GLYPHS.training} ~ ${GLYPHS.rest}`, { size: 10, width: W - PAD * 2 }),
        k.pos(PAD, y),
        k.color(138, 145, 165),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LINE_H + 4;

      y = addRoomInfoPanel(k, PAD, y, W - PAD * 2, state.status, state.look.split("\n").slice(1, 3).join(" "));

      y += 4;
      k.add([
        k.text("WASD/Arrows: Move  |  E/Space: Action Menu  |  C: Combat  |  I: Inventory  |  T: Dialogue", { size: 10, width: W - PAD * 2 }),
        k.pos(PAD, y),
        k.color(155, 165, 186),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LINE_H + 2;

      y = addFeedBlock(k, PAD, y, W - PAD * 2, cb.feedLines, 6);

      k.add([
        k.text(`Depth ${String(state.status.depth ?? "?")} | HP ${String(state.status.health ?? "?")} | Energy ${String(state.status.energy ?? "?")} | Lv ${String(state.status.level ?? "?")}`, { size: 11 }),
        k.pos(PAD, Math.min(H - 18, y + 2)),
        k.color(163, 177, 201),
        k.anchor("topleft"),
        UI_TAG,
      ]);
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

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("e", () => k.go("gridActionMenu"));
    k.onKeyPress("space", () => k.go("gridActionMenu"));
    k.onKeyPress("c", () => k.go("gridCombat"));
    k.onKeyPress("i", () => k.go("gridInventory"));
    k.onKeyPress("t", () => k.go("gridDialogue"));
    k.onKeyPress("r", () => {
      if (inRuneForgeContext(cb.getState())) {
        k.go("gridRuneForge");
      }
    });

    cb.setRefresh(render);
    render();
  });
}

function registerCombatScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridCombat", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = addHeader(k, W, "Combat Screen", "Pokemon-style | [1] First-Person | [Esc] Navigation");

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
        fight ? "Fight" : "Fight (Unavailable)",
        () => {
          if (fight) {
            cb.doAction(fight.action);
            k.go("gridNavigation");
          }
        },
        Boolean(fight?.available),
      );

      if (fightsAvailable(flees)) {
        for (const flee of flees.slice(0, 3)) {
          buttonY = addButton(
            k,
            PAD + 6,
            buttonY,
            260,
            flee.label,
            () => {
              cb.doAction(flee.action);
              k.go("gridNavigation");
            },
            flee.available,
          );
        }
      } else {
        buttonY = addButton(
          k,
          PAD + 6,
          buttonY,
          260,
          fallbackFlee ? fallbackFlee.label : "Flee (Unavailable)",
          () => {
            if (fallbackFlee) {
              cb.doAction(fallbackFlee.action);
              k.go("gridNavigation");
            }
          },
          Boolean(fallbackFlee?.available),
        );
      }

      buttonY = addButton(k, PAD + 6, buttonY, 260, "Item (Stub)", () => {}, false);
      addButton(k, PAD + 6, buttonY, 260, "Skill (Stub)", () => {}, false);

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
      let y = addHeader(k, W, "Action Menu Screen", "[Esc] Navigation | [1] First-Person");

      let rowY = y;
      rowY = addButton(k, PAD, rowY, 190, "Combat Screen", () => k.go("gridCombat"));
      rowY = addButton(k, PAD, rowY, 190, "Dialogue Screen", () => k.go("gridDialogue"));
      rowY = addButton(k, PAD, rowY, 190, "Inventory Screen", () => k.go("gridInventory"));
      rowY = addButton(k, PAD, rowY, 190, "Rune Forge Screen", () => k.go("gridRuneForge"));
      addButton(k, PAD, rowY, 190, "Back to Navigation", () => k.go("gridNavigation"));

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
          const actionType = playerActionType(item);
          actionY = addButton(
            k,
            colX,
            actionY,
            W - colX - PAD,
            item.label,
            () => {
              if (!item.available) return;
              if (actionType === "choose_dialogue") {
                k.go("gridDialogue");
                return;
              }
              if (actionType === "fight" || actionType === "flee") {
                k.go("gridCombat");
                return;
              }
              if (actionType === "evolve_skill" || (actionType === "rest" && inRuneForgeContext(state))) {
                k.go("gridRuneForge");
                return;
              }
              cb.doAction(item.action);
              k.go("gridNavigation");
            },
            item.available,
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
      let y = addHeader(k, W, "Rune Forge Screen", "[Esc] Action Menu | [1] First-Person");

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
        restAction?.label ?? "Rest (Unavailable)",
        () => {
          if (!restAction) return;
          cb.doAction(restAction.action);
          k.go("gridNavigation");
        },
        Boolean(restAction?.available),
      );

      const evolveActions = itemsByActionType(state, "evolve_skill");
      if (evolveActions.length === 0) {
        y = addButton(k, PAD, y, 260, "Evolve Skill (Unavailable)", () => {}, false);
      } else {
        for (const action of evolveActions.slice(0, 4)) {
          y = addButton(
            k,
            PAD,
            y,
            260,
            action.label,
            () => {
              cb.doAction(action.action);
              k.go("gridNavigation");
            },
            action.available,
          );
        }
      }

      y = addButton(k, PAD, y, 260, "Inventory", () => k.go("gridInventory"));
      y = addButton(k, PAD, y, 260, "Purchase (Stub)", () => {}, false);
      addButton(k, PAD, y, 260, "Re-equip (Stub)", () => {}, false);

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
  k.scene("gridInventory", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = addHeader(k, W, "Inventory Screen", "[Esc] Action Menu | [1] First-Person");

      const lines = playerInventoryLines(state);
      k.add([
        k.rect(W - PAD * 2, 340, { radius: 4 }),
        k.pos(PAD, y),
        k.color(22, 30, 52),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += 8;
      for (const line of lines.slice(0, 12)) {
        k.add([
          k.text(line, { size: 11, width: W - PAD * 2 - 12 }),
          k.pos(PAD + 6, y),
          k.color(225, 230, 240),
          k.anchor("topleft"),
          UI_TAG,
        ]);
        y += LINE_H;
      }

      let buttonY = 410;
      buttonY = addButton(k, PAD, buttonY, 220, "Select (Stub)", () => {}, false);
      buttonY = addButton(k, PAD, buttonY, 220, "Equip (Future)", () => {}, false);
      buttonY = addButton(k, PAD, buttonY, 220, "Drop (Future)", () => {}, false);
      addButton(k, PAD, buttonY, 220, "Back", () => k.go("gridActionMenu"));

      addFeedBlock(k, PAD + 240, 410, W - (PAD + 240) - PAD, cb.feedLines, 5);
    };

    k.onKeyPress("1", () => k.go("firstPerson"));
    k.onKeyPress("escape", () => k.go("gridActionMenu"));

    cb.setRefresh(render);
    render();
  });
}

function registerDialogueScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridDialogue", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = addHeader(k, W, "Dialogue Screen", "[Esc] Action Menu | [1] First-Person");

      k.add([
        k.text(`Nearby: ${nearestEnemyLabel(state)}`, { size: 11, width: W - PAD * 2 }),
        k.pos(PAD, y),
        k.color(178, 188, 210),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LINE_H + 2;

      const options = itemsByActionType(state, "choose_dialogue");
      if (options.length === 0) {
        y = addButton(k, PAD, y, W - PAD * 2, "No dialogue options available", () => {}, false);
      } else {
        for (const option of options.slice(0, 10)) {
          y = addButton(
            k,
            PAD,
            y,
            W - PAD * 2,
            option.label,
            () => {
              cb.doAction(option.action);
              k.go("gridNavigation");
            },
            option.available,
          );
        }
      }

      const talkAction = firstItemByActionType(state, "talk");
      y += 4;
      y = addButton(
        k,
        PAD,
        y,
        W - PAD * 2,
        talkAction?.label ?? "Talk (Unavailable)",
        () => {
          if (!talkAction) return;
          cb.doAction(talkAction.action);
          k.go("gridNavigation");
        },
        Boolean(talkAction?.available),
      );

      addButton(k, PAD, y, 180, "Back", () => k.go("gridActionMenu"));
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

