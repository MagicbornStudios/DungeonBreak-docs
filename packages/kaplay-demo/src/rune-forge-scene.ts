import type { KAPLAYCtx } from "kaplay";
import { ACTION_TYPE } from "@dungeonbreak/engine";
import { renderCombatSprite } from "./combat-ui";
import { resolveSpellSprite } from "./content-visuals";
import { renderGridFooter, renderGridFrame } from "./grid-frame";
import {
  setPendingNavigationOverlay,
  setPendingSpellbookContext,
} from "./navigation-overlay";
import { preparedSpellSlots, spellPoolRows } from "./navigation-helpers";
import {
  buildRuneForgeSpellDetail,
  buildRuneRecipePreview,
  formatRuneForgeBlockedReasons,
  RUNE_FORGE_RUNES,
  type RuneForgeEngine,
} from "./rune-forge-content";
import type { SceneCallbacks } from "./scene-contracts";
import { countCurrencyInventoryItems } from "./spell-forge-meta";
import { addButton, clearUi, LINE_H, UI_TAG } from "./shared";
import {
  drawMutedTextAtom,
  drawSelectionFrameAtom,
  drawSurfaceAtom,
  drawTextAtom,
} from "./ui/atoms";
import { renderSectionHeaderMolecule } from "./ui/molecules";
import { createWidgetRegistry } from "./widget-registry";

const RIGHT_PANEL_WIDTH = 132;
const COMBAT_MENU_ICON_SCALE = 1.05;
const RUNES_PER_PAGE = 12;
const RUNE_BOARD_LIMIT = 4;

type RuneForgeRuntime = RuneForgeEngine & {
  discoveredSpellIds: () => string[];
  discoveredEvolutionIds: () => string[];
};

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

function promptForSpellName(currentName: string | null): string | null {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    return currentName;
  }
  const response = window.prompt(
    "Name the spell. Leave blank to keep the current name.",
    currentName ?? ""
  );
  if (response === null) {
    return null;
  }
  const trimmed = response.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function registerRuneForgeScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridRuneForge", () => {
    let selectedSlotIndex = 0;
    let selectedSpellId: string | null = null;
    let runeBoard: string[] = [];
    let runePageIndex = 0;
    let pendingCraftName: string | null = null;

    const openRuneCodex = () => {
      setPendingSpellbookContext({
        allowCodex: true,
        tab: "codex",
      });
      setPendingNavigationOverlay("spellbook");
      k.go("gridNavigation");
    };

    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Rune Forge",
        subtitle: "[Esc] Navigation",
        journalTitle: "Forge Log",
        journalMaxLines: 8,
      });
      const engine = state.engine as unknown as RuneForgeRuntime;
      const discoveredSpellIds = new Set(engine.discoveredSpellIds());
      const discoveredEvolutionIds = new Set(engine.discoveredEvolutionIds());
      const snapshot = state.engine.snapshot() as {
        entities: Record<
          string,
          {
            inventory: Array<{ tags: string[] }>;
          }
        >;
        playerId: string;
      };
      const playerInventory =
        snapshot.entities[snapshot.playerId]?.inventory ?? [];
      const currencyCount = countCurrencyInventoryItems(playerInventory);

      let y = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Rune Forge",
        subtitle: "Arrange runes, discover recipes, and stabilize evolutions.",
      });
      y += 4;

      const slots = preparedSpellSlots(state);
      selectedSlotIndex = Math.max(
        0,
        Math.min(selectedSlotIndex, Math.max(0, slots.length - 1))
      );
      const spellPool = spellPoolRows(state);
      const fallbackSpellId =
        slots[selectedSlotIndex]?.skillId ?? spellPool[0]?.skillId ?? null;
      if (
        !(
          selectedSpellId &&
          spellPool.some((spell) => spell.skillId === selectedSpellId)
        )
      ) {
        selectedSpellId = fallbackSpellId;
      }
      const selectedSpell = spellPool.find(
        (spell) => spell.skillId === selectedSpellId
      );
      const evolveActions = state.groups
        .flatMap((group) => group.items)
        .filter((item) => {
          return (
            item.action.kind === "player" &&
            item.action.playerAction.actionType === ACTION_TYPE.EVOLVE_SKILL
          );
        });
      const forgeDetail = buildRuneForgeSpellDetail(
        engine,
        selectedSpellId,
        evolveActions,
        discoveredEvolutionIds
      );
      const recipePreview = buildRuneRecipePreview(
        engine,
        runeBoard,
        selectedSpellId,
        discoveredSpellIds,
        discoveredEvolutionIds
      );

      drawMutedTextAtom(k, {
        x: shell.centerX,
        y,
        text: `Mana ${String(state.status.mana ?? 0)} | Crystals ${currencyCount} | Pending Name ${pendingCraftName ?? "Auto"}`,
        size: 9,
        width: shell.centerWidth,
        tag: UI_TAG,
      });
      y += 16;

      const leftWidth = 108;
      const poolWidth = 128;
      const poolX = shell.centerX + shell.centerWidth - poolWidth;
      const boardX = shell.centerX + leftWidth + 10;
      const boardWidth = poolX - boardX - 10;
      const topY = y;

      drawMutedTextAtom(k, {
        x: shell.centerX,
        y: topY,
        text: "Prepared Slots",
        size: 10,
        tag: UI_TAG,
      });
      let slotsY = topY + 14;
      for (const slot of slots) {
        const selected = slot.slotIndex === selectedSlotIndex;
        slotsY = addButton(
          k,
          shell.centerX,
          slotsY,
          leftWidth,
          `${selected ? "> " : ""}${slot.slotIndex + 1}. ${slot.name}`,
          () => {
            selectedSlotIndex = slot.slotIndex;
            if (slot.skillId) {
              selectedSpellId = slot.skillId;
            }
            render();
          },
          true,
          {
            tone: slotTone(selected, slot.skillId),
            compact: true,
          }
        );
      }
      slotsY = addButton(
        k,
        shell.centerX,
        slotsY,
        leftWidth,
        `Clear Slot ${selectedSlotIndex + 1}`,
        () => {
          cb.prepareSpellSlot(selectedSlotIndex, null);
          render();
        },
        Boolean(slots[selectedSlotIndex]?.skillId),
        { tone: "warn", compact: true }
      );

      drawMutedTextAtom(k, {
        x: poolX,
        y: topY,
        text: "Known Pool",
        size: 10,
        tag: UI_TAG,
      });
      let poolY = topY + 14;
      for (const spell of spellPool.slice(0, 6)) {
        const isFocused = spell.skillId === selectedSpellId;
        const buttonLabel = spell.isEquipped
          ? `${isFocused ? "> " : ""}${spell.name} [${Number(spell.slotIndex ?? 0) + 1}]`
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

      drawMutedTextAtom(k, {
        x: boardX,
        y: topY,
        text: "Rune Board",
        size: 10,
        tag: UI_TAG,
      });
      drawSurfaceAtom(k, boardX, topY + 14, boardWidth, 58, UI_TAG);
      drawTextAtom(k, {
        x: boardX + 8,
        y: topY + 22,
        text: runeBoard.length > 0 ? runeBoard.join(" -> ") : "Empty board",
        size: 10,
        width: boardWidth - 16,
        tag: UI_TAG,
      });
      drawMutedTextAtom(k, {
        x: boardX + 8,
        y: topY + 38,
        text: recipePreview.title,
        size: 9,
        width: boardWidth - 16,
        tag: UI_TAG,
      });
      const boardSlotWidth = Math.floor((boardWidth - 18) / RUNE_BOARD_LIMIT);
      for (let index = 0; index < RUNE_BOARD_LIMIT; index += 1) {
        const slotX = boardX + 6 + index * boardSlotWidth;
        const slotY = topY + 50;
        drawSurfaceAtom(k, slotX, slotY, boardSlotWidth - 4, 18, UI_TAG);
        drawTextAtom(k, {
          x: slotX + 4,
          y: slotY + 5,
          text: runeBoard[index] ?? `Slot ${index + 1}`,
          size: 8,
          width: boardSlotWidth - 12,
          tag: UI_TAG,
        });
      }

      let actionY = topY + 78;
      actionY = addButton(
        k,
        boardX,
        actionY,
        boardWidth,
        `Forge Recipe -> Slot ${selectedSlotIndex + 1}`,
        () => {
          cb.forgeSpellRecipe(runeBoard, {
            customName: pendingCraftName,
            slotIndex: selectedSlotIndex,
          });
          if (recipePreview.recipeSpellId) {
            selectedSpellId = recipePreview.recipeSpellId;
          }
          pendingCraftName = null;
          render();
        },
        Boolean(recipePreview.recipeSpellId),
        { tone: "accent", compact: true }
      );
      actionY = addButton(
        k,
        boardX,
        actionY,
        boardWidth,
        recipePreview.evolutionMatch
          ? `Evolve ${selectedSpell?.name ?? recipePreview.evolutionMatch.sourceSpellId} On Board`
          : "Evolve Selected On Board",
        () => {
          if (!(selectedSpellId && recipePreview.evolutionMatch)) {
            return;
          }
          cb.forgeSpellEvolution(selectedSpellId, runeBoard);
          render();
        },
        Boolean(selectedSpellId && recipePreview.evolutionMatch),
        {
          tone:
            recipePreview.evolutionMatch?.available === false ? "warn" : "good",
          compact: true,
        }
      );
      actionY = addButton(
        k,
        boardX,
        actionY,
        boardWidth,
        `Name Forged Spell (${pendingCraftName ?? "Auto"})`,
        () => {
          const nextName = promptForSpellName(pendingCraftName);
          if (nextName === null) {
            return;
          }
          pendingCraftName = nextName;
          render();
        },
        true,
        { compact: true }
      );
      actionY = addButton(
        k,
        boardX,
        actionY,
        boardWidth,
        selectedSpellId
          ? `Rename Selected (${selectedSpell?.name ?? selectedSpellId})`
          : "Rename Selected",
        () => {
          if (!selectedSpellId) {
            return;
          }
          const currentName = selectedSpell?.name ?? selectedSpellId;
          const nextName = promptForSpellName(currentName);
          if (nextName === null) {
            return;
          }
          cb.renameSpell(selectedSpellId, nextName);
          render();
        },
        Boolean(selectedSpellId),
        { compact: true }
      );
      actionY = addButton(
        k,
        boardX,
        actionY,
        Math.floor(boardWidth / 2) - 2,
        "Pop Rune",
        () => {
          runeBoard = runeBoard.slice(0, -1);
          render();
        },
        runeBoard.length > 0,
        { tone: "warn", compact: true }
      );
      addButton(
        k,
        boardX + Math.floor(boardWidth / 2) + 2,
        actionY - 24,
        Math.floor(boardWidth / 2) - 2,
        "Clear Board",
        () => {
          runeBoard = [];
          render();
        },
        runeBoard.length > 0,
        { tone: "warn", compact: true }
      );

      const pageCount = Math.max(
        1,
        Math.ceil(RUNE_FORGE_RUNES.length / RUNES_PER_PAGE)
      );
      runePageIndex = Math.max(0, Math.min(runePageIndex, pageCount - 1));
      const visibleRunes = RUNE_FORGE_RUNES.slice(
        runePageIndex * RUNES_PER_PAGE,
        runePageIndex * RUNES_PER_PAGE + RUNES_PER_PAGE
      );
      let paletteY = actionY + 8;
      drawMutedTextAtom(k, {
        x: boardX,
        y: paletteY,
        text: `Rune Palette ${runePageIndex + 1}/${pageCount}`,
        size: 10,
        tag: UI_TAG,
      });
      paletteY += 14;
      paletteY = addButton(
        k,
        boardX,
        paletteY,
        Math.floor(boardWidth / 2) - 2,
        "Prev Runes",
        () => {
          runePageIndex = (runePageIndex + pageCount - 1) % pageCount;
          render();
        },
        pageCount > 1,
        { compact: true }
      );
      addButton(
        k,
        boardX + Math.floor(boardWidth / 2) + 2,
        paletteY - 24,
        Math.floor(boardWidth / 2) - 2,
        "Next Runes",
        () => {
          runePageIndex = (runePageIndex + 1) % pageCount;
          render();
        },
        pageCount > 1,
        { compact: true }
      );
      let leftRuneY = paletteY + 4;
      let rightRuneY = paletteY + 4;
      const runeButtonWidth = Math.floor(boardWidth / 2) - 2;
      visibleRunes.forEach((rune, index) => {
        const label = `${rune.runeId.replace("rune_", "").toUpperCase()} ${rune.name}`;
        if (index % 2 === 0) {
          leftRuneY = addButton(
            k,
            boardX,
            leftRuneY,
            runeButtonWidth,
            label,
            () => {
              if (runeBoard.length >= RUNE_BOARD_LIMIT) {
                return;
              }
              runeBoard = [...runeBoard, rune.runeId];
              render();
            },
            runeBoard.length < RUNE_BOARD_LIMIT,
            { compact: true }
          );
          return;
        }
        rightRuneY = addButton(
          k,
          boardX + runeButtonWidth + 4,
          rightRuneY,
          runeButtonWidth,
          label,
          () => {
            if (runeBoard.length >= RUNE_BOARD_LIMIT) {
              return;
            }
            runeBoard = [...runeBoard, rune.runeId];
            render();
          },
          runeBoard.length < RUNE_BOARD_LIMIT,
          { compact: true }
        );
      });

      let utilityY = Math.max(leftRuneY, rightRuneY) + 4;
      utilityY = addButton(
        k,
        boardX,
        utilityY,
        boardWidth,
        "Open Rune Codex",
        openRuneCodex,
        true,
        { tone: "accent", compact: true }
      );
      utilityY = addButton(
        k,
        boardX,
        utilityY,
        boardWidth,
        "Open Bag",
        () => k.go("gridInventory"),
        true,
        { compact: true }
      );
      addButton(
        k,
        boardX,
        utilityY,
        boardWidth,
        "Back To Navigation",
        () => k.go("gridNavigation"),
        true,
        { compact: true }
      );

      let detailY = renderSectionHeaderMolecule(k, {
        x: shell.rightX,
        y: shell.innerY,
        title: "Forge Readout",
        subtitle: recipePreview.subtitle,
      });
      detailY += 2;
      for (const line of recipePreview.detailLines.slice(0, 7)) {
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
      renderSectionHeaderMolecule(k, {
        x: shell.rightX,
        y: detailY,
        title: "Selected Spell",
        subtitle: forgeDetail.subtitle,
      });
      detailY += 20;
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
      if (selectedSpellId) {
        const spriteName = resolveSpellSprite(selectedSpellId);
        if (spriteName) {
          renderCombatSprite(
            k,
            spriteName,
            shell.rightX + RIGHT_PANEL_WIDTH - 18,
            shell.innerY + 10,
            { scale: COMBAT_MENU_ICON_SCALE }
          );
        }
      }
      if (recipePreview.evolutionMatch) {
        detailY += 6;
        drawMutedTextAtom(k, {
          x: shell.rightX,
          y: detailY,
          text: `Board Evolution: ${recipePreview.evolutionMatch.resultName}`,
          size: 10,
          width: RIGHT_PANEL_WIDTH,
          tag: UI_TAG,
        });
        detailY += LINE_H;
        drawMutedTextAtom(k, {
          x: shell.rightX,
          y: detailY,
          text: formatRuneForgeBlockedReasons(
            recipePreview.evolutionMatch.blockedReasons
          ),
          size: 9,
          width: RIGHT_PANEL_WIDTH,
          tag: UI_TAG,
        });
      }

      if (selectedSpellId) {
        const poolIndex = spellPool.findIndex(
          (spell) => spell.skillId === selectedSpellId
        );
        if (poolIndex >= 0) {
          const focusY = topY + 14 + poolIndex * 24;
          drawSelectionFrameAtom(k, {
            x: poolX,
            y: focusY,
            width: poolWidth,
            height: 20,
            tag: UI_TAG,
          });
        }
      }
      const selectedSlotY = topY + 14 + selectedSlotIndex * 24;
      drawSelectionFrameAtom(k, {
        x: shell.centerX,
        y: selectedSlotY,
        width: leftWidth,
        height: 20,
        tag: UI_TAG,
      });

      renderGridFooter(k, state, [
        "[Click] Select / Add Rune",
        "[P] Rune Codex",
        "[B] Bag",
        "[Q] Equipped",
        "[Esc] Navigation",
      ]);
    };

    k.onKeyPress("b", () => k.go("gridInventory"));
    k.onKeyPress("p", openRuneCodex);
    k.onKeyPress("r", openRuneCodex);
    k.onKeyPress("q", () => k.go("gridEquipped"));
    k.onKeyPress("escape", () => k.go("gridNavigation"));

    cb.setRefresh(render);
    render();
  });
}
