import type { KAPLAYCtx } from "kaplay";
import {
  addFooterStatus,
  addRoomInfoPanel,
  clearUi,
  LINE_H,
  PAD,
  UI_TAG,
} from "./shared";
import { escapeKaplayStyledText } from "./escape-kaplay-tags";
import type { SceneCallbacks } from "./scene-contracts";
import { renderSceneLayout } from "./scene-layout";
import { createWidgetRegistry } from "./widget-registry";
import {
  H,
  LEFT_PANEL_W,
  NAV_PANEL_H,
  NAV_ROW_Y,
  PANEL_INSET,
  RIGHT_PANEL_W,
  W,
} from "./layout-constants";
import { hasEncounter, inRuneForgeContext } from "./scene-blocks";
import { hotkeyRouteMap } from "./intent-router";
import { drawMutedTextAtom } from "./ui/atoms";
import { renderKeyHintLegendMolecule } from "./ui/molecules";
import {
  renderCommandPanelOrganism,
  renderRoomBriefOrganism,
  renderThreeColumnShellOrganism,
} from "./ui/organisms";

const LOOK_PANEL_TEXT_INSET = 6;
const FOOTER_SAFE_OFFSET = 22;
const FOOTER_TOP_OFFSET = 2;
const MAIN_PANEL_BOTTOM_GAP = 6;
const NAV_COLUMN_GAP = 8;

export function registerFirstPersonScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);

  k.scene("firstPerson", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();

      renderSceneLayout(k, {
        width: W,
        title: "Escape the Dungeon - First-Person",
        subtitle: "[2] Grid | [C] Controls",
      });

      const shell = renderThreeColumnShellOrganism(k, {
        x: PAD,
        y: NAV_ROW_Y,
        width: W - PAD * 2,
        height: NAV_PANEL_H,
        leftWidth: LEFT_PANEL_W,
        rightWidth: RIGHT_PANEL_W,
        inset: PANEL_INSET,
        columnGap: NAV_COLUMN_GAP,
        tag: UI_TAG,
      });

      renderCommandPanelOrganism(k, {
        x: shell.leftX,
        y: shell.innerY,
        width: LEFT_PANEL_W,
        hasEncounter: hasEncounter(state),
        inRuneForgeContext: inRuneForgeContext(state),
        onOpenNavigation: () => k.go("gridNavigation"),
        onOpenCombat: () => k.go("gridCombat"),
        onOpenControls: () => k.go("gridActionMenu"),
        onOpenBag: () => k.go("gridInventory"),
        onOpenJournal: () => k.go("gridDialogue"),
        onOpenMagic: () => k.go("gridRuneForge"),
      });

      drawMutedTextAtom(k, { x: shell.centerX, y: shell.innerY, text: "Narrative View", size: 11, tag: UI_TAG });
      k.add([
        k.text(escapeKaplayStyledText(state.look), { width: shell.centerWidth - LOOK_PANEL_TEXT_INSET * 2, size: 12 }),
        k.pos(shell.centerX + LOOK_PANEL_TEXT_INSET, shell.innerY + LINE_H + LOOK_PANEL_TEXT_INSET),
        k.color(225, 228, 236),
        k.anchor("topleft"),
        UI_TAG,
      ]);

      const roomBriefBottomY = renderRoomBriefOrganism(k, {
        x: shell.rightX,
        y: shell.innerY,
        width: RIGHT_PANEL_W,
        look: state.look,
        status: state.status,
        tag: UI_TAG,
      });

      widgets.renderEventLog({
        x: shell.rightX,
        y: roomBriefBottomY,
        width: RIGHT_PANEL_W,
        title: "Journal",
        lines: cb.feedLines,
        maxLines: 8,
      });

      let y = NAV_ROW_Y + NAV_PANEL_H + MAIN_PANEL_BOTTOM_GAP;
      y = addRoomInfoPanel(k, PAD, y, W - PAD * 2, state.status, state.look.split("\n").slice(1, 3).join(" "));
      y += 4;
      const hints = ["[WASD] Move", "[C] Controls", "[B] Bag", "[J] Journal", "[2] Grid"];
      if (hasEncounter(state)) hints.splice(1, 0, "[F] Combat");
      if (inRuneForgeContext(state)) hints.push("[M] Magic Lab");
      const legendHints = hints.map((hint) => {
        const match = /^\[([^\]]+)\]\s*(.+)?$/.exec(hint.trim());
        if (!match) return { key: "?", label: hint };
        return { key: match[1], label: match[2] ?? "" };
      });
      y = renderKeyHintLegendMolecule(k, {
        x: PAD,
        y,
        hints: legendHints,
        width: W - PAD * 2,
        tag: UI_TAG,
      });
      y += 2;
      addFooterStatus(k, PAD, Math.min(H - FOOTER_SAFE_OFFSET, y + FOOTER_TOP_OFFSET), state.status);
    };

    k.onKeyPress("2", () => k.go("gridNavigation"));
    const routeMapKeys = ["e", "space", "c", "f", "i", "t", "r", "b", "j", "m"] as const;
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
