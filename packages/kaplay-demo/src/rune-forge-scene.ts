import { ACTION_TYPE } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import {
  actionToneFor,
  firstItemByActionType,
  formatActionButtonLabel,
  itemsByActionType,
} from "./action-renderer";
import { renderCombatSprite } from "./combat-ui";
import { resolveSpellSprite } from "./content-visuals";
import { renderGridFooter, renderGridFrame } from "./grid-frame";
import { preparedSpellSlots, spellPoolRows } from "./navigation-helpers";
import {
  buildRuneForgeSpellDetail,
  formatRuneForgeBlockedReasons,
  type RuneForgeEngine,
} from "./rune-forge-content";
import type { SceneCallbacks } from "./scene-contracts";
import { addButton, clearUi, LINE_H, UI_TAG } from "./shared";
import { drawMutedTextAtom } from "./ui/atoms";
import { renderSectionHeaderMolecule } from "./ui/molecules";
import { createWidgetRegistry } from "./widget-registry";

const RIGHT_PANEL_WIDTH = 132;
const COMBAT_MENU_ICON_SCALE = 1.05;

function slotTone(
  selected: boolean,
  skillId: string | null | undefined
): "accent" | "neutral" | "warn" {
  if (selected) {
    return "accent";
  }
  if (skillId) {
    return "neutral";
  }
  return "warn";
}

function poolTone(
  isFocused: boolean,
  isEquipped: boolean
): "accent" | "good" | "neutral" {
  if (isFocused) {
    return "accent";
  }
  if (isEquipped) {
    return "good";
  }
  return "neutral";
}

function noopDisabledAction(): void {
  // intentionally disabled placeholder for unavailable forge actions
}

export function registerRuneForgeScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridRuneForge", () => {
    let selectedSlotIndex = 0;
    let selectedSpellId: string | null = null;

    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Rune Forge",
        subtitle: "[Esc] Navigation",
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
      selectedSlotIndex = Math.max(
        0,
        Math.min(selectedSlotIndex, Math.max(0, slots.length - 1))
      );
      const selectedSlot = slots[selectedSlotIndex] ?? null;
      const spellPool = spellPoolRows(state);
      const evolveActions = itemsByActionType(state, ACTION_TYPE.EVOLVE_SKILL);
      const fallbackSpellId =
        selectedSlot?.skillId ?? spellPool[0]?.skillId ?? null;
      if (
        !(
          selectedSpellId &&
          spellPool.some((spell) => spell.skillId === selectedSpellId)
        )
      ) {
        selectedSpellId = fallbackSpellId;
      }
      const forgeDetail = buildRuneForgeSpellDetail(
        state.engine as unknown as RuneForgeEngine,
        selectedSpellId,
        evolveActions
      );
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
            selectedSpellId = slot.skillId;
            render();
          },
          true,
          {
            tone: slotTone(selected, slot.skillId),
            compact: true,
          }
        );
        if (slot.skillId) {
          const spriteName = resolveSpellSprite(slot.skillId);
          if (spriteName) {
            renderCombatSprite(
              k,
              spriteName,
              shell.centerX + shell.centerWidth - 24,
              y - 15,
              { scale: COMBAT_MENU_ICON_SCALE }
            );
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
        { tone: "warn", compact: true }
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
        const isFocused = spell.skillId === selectedSpellId;
        const buttonLabel = spell.isEquipped
          ? `${isFocused ? "> " : ""}${spell.name} [slot ${Number(spell.slotIndex ?? 0) + 1}]`
          : `${isFocused ? "> " : ""}${spell.name}`;
        poolY = addButton(
          k,
          poolX,
          poolY,
          poolWidth,
          buttonLabel,
          () => {
            selectedSpellId = spell.skillId;
            render();
          },
          true,
          {
            tone: poolTone(isFocused, spell.isEquipped),
            compact: true,
          }
        );
        const spriteName = resolveSpellSprite(spell.skillId);
        if (spriteName) {
          renderCombatSprite(
            k,
            spriteName,
            poolX + poolWidth - 24,
            poolY - 15,
            { scale: COMBAT_MENU_ICON_SCALE }
          );
        }
      }

      y = forgeActionStartY;
      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        selectedSpellId
          ? `Prepare ${forgeDetail.title} -> Slot ${selectedSlotIndex + 1}`
          : `Prepare -> Slot ${selectedSlotIndex + 1}`,
        () => {
          if (!selectedSpellId) {
            return;
          }
          cb.prepareSpellSlot(selectedSlotIndex, selectedSpellId);
          render();
        },
        Boolean(selectedSpellId),
        { tone: "accent", compact: true }
      );

      const restAction = firstItemByActionType(state, "rest");
      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        restAction ? formatActionButtonLabel(restAction) : "Rest (Unavailable)",
        () => {
          if (!restAction) {
            return;
          }
          cb.doAction(restAction.action);
          k.go("gridNavigation");
        },
        Boolean(restAction?.available),
        { tone: "good", compact: true }
      );

      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        "Open Bag",
        () => k.go("gridInventory"),
        true,
        { compact: true }
      );

      const purchaseActions = itemsByActionType(state, "purchase");
      if (purchaseActions.length === 0) {
        y = addButton(
          k,
          shell.centerX,
          y,
          shell.centerWidth,
          "Purchase (Unavailable)",
          noopDisabledAction,
          false,
          { compact: true }
        );
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
            { tone: actionToneFor(action), compact: true }
          );
        }
      }

      const reEquipActions = itemsByActionType(state, ACTION_TYPE.RE_EQUIP);
      if (reEquipActions.length === 0) {
        addButton(
          k,
          shell.centerX,
          y,
          shell.centerWidth,
          "Re-equip (Unavailable)",
          noopDisabledAction,
          false,
          { compact: true }
        );
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
            { tone: actionToneFor(action), compact: true }
          );
        }
      }

      let detailY = renderSectionHeaderMolecule(k, {
        x: shell.rightX,
        y: shell.innerY,
        title: "Spell Dossier",
        subtitle: forgeDetail.subtitle,
      });
      detailY += 2;
      for (const line of forgeDetail.detailLines.slice(0, 6)) {
        drawMutedTextAtom(k, {
          x: shell.rightX,
          y: detailY,
          text: line,
          size: 10,
          width: RIGHT_PANEL_WIDTH,
          tag: UI_TAG,
        });
        detailY += LINE_H;
      }
      detailY += 4;
      drawMutedTextAtom(k, {
        x: shell.rightX,
        y: detailY,
        text: "Evolution paths",
        size: 10,
        tag: UI_TAG,
      });
      detailY += 14;
      if (forgeDetail.evolutionRows.length === 0) {
        drawMutedTextAtom(k, {
          x: shell.rightX,
          y: detailY,
          text: "No authored evolution path is available for the selected spell.",
          size: 10,
          width: RIGHT_PANEL_WIDTH,
          tag: UI_TAG,
        });
      } else {
        for (const evolution of forgeDetail.evolutionRows.slice(0, 4)) {
          detailY = addButton(
            k,
            shell.rightX,
            detailY,
            RIGHT_PANEL_WIDTH,
            evolution.label,
            () => {
              if (!evolution.actionItem) {
                return;
              }
              cb.doAction(evolution.actionItem.action);
              k.go("gridRuneForge");
            },
            evolution.available && Boolean(evolution.actionItem),
            {
              tone:
                evolution.available && evolution.actionItem ? "accent" : "warn",
              compact: true,
            }
          );
          drawMutedTextAtom(k, {
            x: shell.rightX,
            y: detailY - 2,
            text: `${evolution.detail} | ${formatRuneForgeBlockedReasons(evolution.blockedReasons)}`,
            size: 9,
            width: RIGHT_PANEL_WIDTH,
            tag: UI_TAG,
          });
          detailY += LINE_H + 2;
        }
      }

      renderGridFooter(k, state, [
        "[M] Map",
        "[O] World",
        "[Click] Focus / Prepare",
        "[B] Bag",
        "[P] Spellbook",
        "[V] Stats",
        "[Q] Equipped",
        "[Esc] Navigation",
      ]);
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
