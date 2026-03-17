import type { KAPLAYCtx } from "kaplay";
import { addGameplayHud } from "./gameplay-hud";
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
import type { SceneCallbacks } from "./scene-contracts";
import { renderSceneLayout } from "./scene-layout";
import { addRoomInfoPanel, PAD, UI_TAG } from "./shared";
import { renderKeyHintLegendMolecule } from "./ui/molecules";
import {
  renderCommandPanelOrganism,
  renderRoomBriefOrganism,
  renderThreeColumnShellOrganism,
  type ThreeColumnShellLayout,
} from "./ui/organisms";
import type { createWidgetRegistry } from "./widget-registry";

const NAV_COLUMN_GAP = 8;
const MAIN_PANEL_BOTTOM_GAP = 6;
const FOOTER_SAFE_OFFSET = 22;
const FOOTER_TOP_OFFSET = 2;
const LEGEND_HINT_PATTERN = /^\[([^\]]+)\]\s*(.+)?$/;

export interface GridFrameOptions {
  title: string;
  subtitle: string;
  leftWidth?: number;
  rightWidth?: number;
  columnGap?: number;
  panelHeight?: number;
  showJournal?: boolean;
  journalTitle?: string;
  journalMaxLines?: number;
}

export interface GridFrame {
  state: ReturnType<SceneCallbacks["getState"]>;
  shell: ThreeColumnShellLayout;
  leftWidth: number;
  rightWidth: number;
}

export function renderGridFrame(
  k: KAPLAYCtx,
  cb: SceneCallbacks,
  widgets: ReturnType<typeof createWidgetRegistry>,
  options: GridFrameOptions
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
    onOpenMap: () => k.go("gridMap"),
    onOpenWorldMap: () => k.go("gridWorldMap"),
    onOpenCombat: () => k.go("gridCombat"),
    onOpenBag: () => k.go("gridInventory"),
    onOpenJournal: () => k.go("gridJournal"),
    onOpenSpellbook: () => k.go("gridSpellbook"),
    onOpenStats: () => k.go("gridNavigation"),
    onOpenEquipped: () => k.go("gridEquipped"),
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

export function renderGridFooter(
  k: KAPLAYCtx,
  state: ReturnType<SceneCallbacks["getState"]>,
  hints: string[]
): void {
  let y = NAV_ROW_Y + NAV_PANEL_H + MAIN_PANEL_BOTTOM_GAP;
  y = addRoomInfoPanel(
    k,
    PAD,
    y,
    W - PAD * 2,
    state.status,
    state.look.split("\n").slice(1, 3).join(" ")
  );
  y += 4;
  const legendHints = hints.map((hint) => {
    const match = LEGEND_HINT_PATTERN.exec(hint.trim());
    if (!match) {
      return { key: "?", label: hint };
    }
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
  addGameplayHud(
    k,
    PAD,
    Math.min(H - FOOTER_SAFE_OFFSET, y + FOOTER_TOP_OFFSET),
    W - PAD * 2,
    state.status
  );
}
