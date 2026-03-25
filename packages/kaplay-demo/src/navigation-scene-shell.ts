import type { KAPLAYCtx } from "kaplay";
import { PANEL_INSET } from "./layout-constants";
import {
  FRAME_H,
  HEADER_BAR_H,
  INFO_PANEL_GAP,
  INFO_PANEL_H,
  NAV_COLUMN_GAP,
  NAV_HEADER_TAG,
  NAV_RIGHT_W,
  NAV_STATIC_TAG,
  SHELL_INNER_PADDING,
  TOP_PANEL_Y,
} from "./navigation-scene-constants";
import { computeShellLayout } from "./navigation-scene-helpers";
import { drawEmbeddedArea } from "./navigation-scene-rendering";
import { addButton } from "./shared";
import type { RoomSceneTheme } from "./theme-tokens";
import { drawSurfaceAtom, drawTextAtom } from "./ui/atoms";

export function renderNavigationHeaderLayer(
  k: KAPLAYCtx,
  options: {
    activeMenu: boolean;
    frame: { width: number; x: number; y: number };
    onOpenMenu: () => void;
    statusText?: string | null;
    theme: RoomSceneTheme;
  }
): void {
  addButton(
    k,
    options.frame.x + 12,
    options.frame.y + 12,
    152,
    "[Tab/Start] Menus",
    options.onOpenMenu,
    true,
    {
      tone: options.activeMenu ? "accent" : "neutral",
      compact: true,
      tag: NAV_HEADER_TAG,
    }
  );
  drawTextAtom(k, {
    x: options.frame.x + 176,
    y: options.frame.y + 17,
    text:
      options.statusText && options.statusText.length > 0
        ? options.statusText
        : "M Map  |  R Room  |  V Mount  |  X Stream  |  Space Move  |  Esc Close",
    size: 10,
    width: options.frame.width - 200,
    color: options.theme.headerSubtitle,
    tag: NAV_HEADER_TAG,
  });
  k.add([
    k.rect(options.frame.width - 24, 2, { radius: 1 }),
    k.pos(options.frame.x + 12, options.frame.y + HEADER_BAR_H + 4),
    k.color(
      options.theme.headerRule[0],
      options.theme.headerRule[1],
      options.theme.headerRule[2]
    ),
    NAV_HEADER_TAG,
  ]);
}

export function renderNavigationStaticShell(
  k: KAPLAYCtx,
  options: {
    frame: { width: number; x: number; y: number };
    theme: RoomSceneTheme;
  }
): void {
  const frameH = FRAME_H;
  const shellHeight = frameH - (TOP_PANEL_Y - options.frame.y) - 10;
  drawSurfaceAtom(
    k,
    options.frame.x,
    options.frame.y,
    options.frame.width,
    frameH,
    NAV_STATIC_TAG,
    {
      bg: options.theme.frameSurface,
      border: options.theme.headerRule,
      highlight: options.theme.frameHighlight,
      shadow: options.theme.frameShadow,
    }
  );
  const shell = computeShellLayout(
    options.frame.x + 10,
    TOP_PANEL_Y,
    options.frame.width - 20,
    0,
    NAV_RIGHT_W,
    PANEL_INSET,
    NAV_COLUMN_GAP
  );
  const centerPanelY = shell.innerY + SHELL_INNER_PADDING;
  const shellInnerHeight = shellHeight - PANEL_INSET * 2;
  const integratedPanelW = shell.centerWidth + NAV_COLUMN_GAP + NAV_RIGHT_W;
  const roomInfoPanelW = integratedPanelW - NAV_RIGHT_W - NAV_COLUMN_GAP;
  const centerPanelH =
    shellInnerHeight - INFO_PANEL_H - INFO_PANEL_GAP - SHELL_INNER_PADDING * 2;

  drawEmbeddedArea(k, {
    x: shell.centerX,
    y: shell.innerY,
    width: integratedPanelW,
    height: shellInnerHeight,
    color: options.theme.embeddedSurface,
    opacity: 0.82,
    tag: NAV_STATIC_TAG,
  });

  k.add([
    k.rect(integratedPanelW, 1),
    k.pos(shell.centerX, centerPanelY + centerPanelH + 2),
    k.color(
      options.theme.divider[0],
      options.theme.divider[1],
      options.theme.divider[2]
    ),
    NAV_STATIC_TAG,
  ]);
  k.add([
    k.rect(1, INFO_PANEL_H - 24),
    k.pos(
      shell.centerX + roomInfoPanelW + NAV_COLUMN_GAP / 2,
      centerPanelY + centerPanelH + INFO_PANEL_GAP + 12
    ),
    k.color(
      options.theme.divider[0],
      options.theme.divider[1],
      options.theme.divider[2]
    ),
    NAV_STATIC_TAG,
  ]);
}
