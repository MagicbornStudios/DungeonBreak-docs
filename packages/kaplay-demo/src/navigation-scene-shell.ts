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
import { type RoomSceneTheme, tonePalette } from "./theme-tokens";
import {
  drawButtonSurfaceAtom,
  drawKeycapAtom,
  drawSurfaceAtom,
  drawTextAtom,
} from "./ui/atoms";
import { renderKeyHintLegendMolecule } from "./ui/molecules";

function renderHeaderMenuButton(
  k: KAPLAYCtx,
  options: {
    active: boolean;
    onOpenMenu: () => void;
    tag: string;
    x: number;
    y: number;
  }
): void {
  const tone = options.active ? "accent" : "neutral";
  const palette = tonePalette[tone];
  const button = drawButtonSurfaceAtom(k, {
    x: options.x,
    y: options.y,
    width: 152,
    height: 20,
    tone,
    enabled: true,
    tag: options.tag,
  });
  drawKeycapAtom(k, {
    x: options.x + 6,
    y: options.y + 2,
    text: "Tab",
    tone: "accent",
    tag: options.tag,
  });
  drawKeycapAtom(k, {
    x: options.x + 38,
    y: options.y + 2,
    text: "Start",
    tone: "accent",
    tag: options.tag,
  });
  drawTextAtom(k, {
    x: options.x + 85,
    y: options.y + 6,
    text: "Menus",
    size: 10,
    color: palette.fg,
    tag: options.tag,
  });
  const hover = [
    Math.min(255, palette.bg[0] + 20),
    Math.min(255, palette.bg[1] + 20),
    Math.min(255, palette.bg[2] + 20),
  ] as const;
  button.onHover(() => {
    button.color = k.rgb(hover[0], hover[1], hover[2]);
  });
  button.onHoverEnd(() => {
    button.color = k.rgb(palette.bg[0], palette.bg[1], palette.bg[2]);
  });
  button.onClick(options.onOpenMenu);
}

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
  renderHeaderMenuButton(k, {
    active: options.activeMenu,
    onOpenMenu: options.onOpenMenu,
    tag: NAV_HEADER_TAG,
    x: options.frame.x + 12,
    y: options.frame.y + 12,
  });
  if (options.statusText && options.statusText.length > 0) {
    drawTextAtom(k, {
      x: options.frame.x + 176,
      y: options.frame.y + 12,
      text: options.statusText,
      size: 10,
      width: options.frame.width - 200,
      color: options.theme.headerTitle,
      tag: NAV_HEADER_TAG,
    });
  }
  renderKeyHintLegendMolecule(k, {
    x: options.frame.x + 176,
    y: options.statusText ? options.frame.y + 26 : options.frame.y + 16,
    hints: [
      { key: "M", label: "Map", tone: "accent" },
      { key: "R", label: "Room", tone: "accent" },
      { key: "V", label: "Mount", tone: "accent" },
      { key: "X", label: "Stream", tone: "accent" },
      { key: "Space", label: "Move", tone: "accent" },
      { key: "Esc", label: "Close", tone: "neutral" },
    ],
    width: options.frame.width - 200,
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
