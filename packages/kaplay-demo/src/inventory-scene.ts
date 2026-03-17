import type { KAPLAYCtx } from "kaplay";
import { buildStandardDisplayHints } from "./display-screen";
import { renderGridFooter, renderGridFrame } from "./grid-frame";
import { inventoryRows } from "./inventory-content";
import type { SceneCallbacks } from "./scene-contracts";
import { addButton, clearUi, LINE_H, UI_TAG } from "./shared";
import { drawMutedTextAtom } from "./ui/atoms";
import { renderSectionHeaderMolecule } from "./ui/molecules";
import { createWidgetRegistry } from "./widget-registry";

const INVENTORY_ACTION_COLUMN_GAP = 8;

export function registerInventoryScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridInventory", () => {
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Bag",
        subtitle: "[Esc] Navigation",
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
        for (const row of rows.slice(0, 6)) {
          drawMutedTextAtom(k, {
            x: shell.centerX,
            y,
            text: row.line,
            size: 10,
            width: shell.centerWidth,
            tag: UI_TAG,
          });
          y += LINE_H;

          const actionWidth = Math.floor(
            (shell.centerWidth - INVENTORY_ACTION_COLUMN_GAP * 2) / 3
          );
          const actionY = addButton(
            k,
            shell.centerX,
            y,
            actionWidth,
            "[USE] Use",
            () => {
              if (row.useAction) {
                cb.doAction(row.useAction.action);
                k.go("gridInventory");
              }
            },
            row.canUse,
            { tone: "good", compact: true }
          );
          addButton(
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
            { tone: "accent", compact: true }
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
            { tone: "warn", compact: true }
          );
          y = actionY + 2;
        }
      }

      addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        "[Esc] Back to Floor",
        () => k.go("gridNavigation"),
        true,
        { tone: "neutral" }
      );
      renderGridFooter(
        k,
        state,
        buildStandardDisplayHints({ includeBag: true })
      );
    };

    k.onKeyPress("m", () => k.go("gridMap"));
    k.onKeyPress("o", () => k.go("gridWorldMap"));
    k.onKeyPress("p", () => k.go("gridSpellbook"));
    k.onKeyPress("v", () => k.go("gridNavigation"));
    k.onKeyPress("q", () => k.go("gridEquipped"));
    k.onKeyPress("escape", () => k.go("gridNavigation"));

    cb.setRefresh(render);
    render();
  });
}
