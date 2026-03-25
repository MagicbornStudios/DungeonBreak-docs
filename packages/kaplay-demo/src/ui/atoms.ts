import type { KAPLAYCtx } from "kaplay";
import { escapeKaplayStyledText } from "../escape-kaplay-tags";
import {
  tonePalette,
  UI_FONT_FAMILY,
  type UiTone,
  uiMetrics,
  uiPalette,
} from "../theme-tokens";

type Rgb = readonly [number, number, number] | [number, number, number];
const NEWLINE_REGEX = /\r?\n/;

interface TextAtomOptions {
  text: string;
  x: number;
  y: number;
  size?: number;
  width?: number;
  font?: string;
  color?: Rgb;
  tag?: string;
}

type ToneTextAtomOptions = Omit<TextAtomOptions, "color"> & {
  tone: UiTone;
  disabled?: boolean;
};

interface ButtonSurfaceAtomOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: UiTone;
  enabled?: boolean;
  tag?: string;
}

interface KeycapAtomOptions {
  x: number;
  y: number;
  text: string;
  tone?: UiTone;
  size?: number;
  paddingX?: number;
  tag?: string;
}

interface SelectionFrameAtomOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  tag?: string;
}

interface SurfaceAtomPalette {
  bg: Rgb;
  border: Rgb;
  highlight: Rgb;
  shadow: Rgb;
}

export function drawSurfaceAtom(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  tag = "ui",
  palette?: Partial<SurfaceAtomPalette>
): void {
  const shadow = palette?.shadow ?? uiPalette.panelShadow;
  const bg = palette?.bg ?? uiPalette.panelBg;
  const highlight = palette?.highlight ?? uiPalette.panelHighlight;
  const border = palette?.border ?? uiPalette.panelBorder;
  k.add([
    k.rect(width, height, { radius: 5 }),
    k.pos(x, y),
    k.color(shadow[0], shadow[1], shadow[2]),
    k.anchor("topleft"),
    tag,
  ]);
  k.add([
    k.rect(width - 2, height - 2, { radius: 4 }),
    k.pos(x + 1, y + 1),
    k.color(bg[0], bg[1], bg[2]),
    k.anchor("topleft"),
    tag,
  ]);
  k.add([
    k.rect(width - 10, 2, { radius: 1 }),
    k.pos(x + 5, y + 7),
    k.color(highlight[0], highlight[1], highlight[2]),
    k.anchor("topleft"),
    tag,
  ]);
  k.add([
    k.rect(width - 2, 1),
    k.pos(x + 1, y + 1),
    k.color(border[0], border[1], border[2]),
    k.anchor("topleft"),
    tag,
  ]);
}

export function drawHorizontalRuleAtom(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  tag = "ui"
): void {
  k.add([
    k.rect(width, 1),
    k.pos(x, y),
    k.color(
      uiPalette.panelHeaderRule[0],
      uiPalette.panelHeaderRule[1],
      uiPalette.panelHeaderRule[2]
    ),
    k.anchor("topleft"),
    tag,
  ]);
}

export function drawDividerAtom(
  k: KAPLAYCtx,
  x: number,
  y: number,
  height: number,
  tag = "ui"
): void {
  k.add([
    k.rect(1, height),
    k.pos(x, y),
    k.color(
      uiPalette.separator[0],
      uiPalette.separator[1],
      uiPalette.separator[2]
    ),
    k.anchor("topleft"),
    tag,
  ]);
}

export function drawTextAtom(k: KAPLAYCtx, opts: TextAtomOptions): void {
  const color = opts.color ?? uiPalette.textPrimary;
  k.add([
    k.text(escapeKaplayStyledText(opts.text), {
      font: opts.font ?? UI_FONT_FAMILY,
      size: opts.size ?? 10,
      width: opts.width,
    }),
    k.pos(opts.x, opts.y),
    k.color(color[0], color[1], color[2]),
    k.anchor("topleft"),
    opts.tag ?? "ui",
  ]);
}

export function drawToneTextAtom(
  k: KAPLAYCtx,
  opts: ToneTextAtomOptions
): void {
  const tone = tonePalette[opts.tone];
  drawTextAtom(k, {
    ...opts,
    color: opts.disabled ? uiPalette.textMuted : tone.fg,
  });
}

export function drawMutedTextAtom(
  k: KAPLAYCtx,
  opts: Omit<TextAtomOptions, "color">
): void {
  drawTextAtom(k, { ...opts, color: uiPalette.textMuted });
}

export function drawButtonSurfaceAtom(
  k: KAPLAYCtx,
  opts: ButtonSurfaceAtomOptions
) {
  const tone = tonePalette[opts.tone];
  const enabled = opts.enabled ?? true;
  const bg = enabled ? tone.bg : ([45, 45, 45] as const);
  const shadowNode = k.add([
    k.rect(opts.width, opts.height, { radius: 4 }),
    k.pos(opts.x, opts.y),
    k.color(
      uiPalette.panelShadow[0],
      uiPalette.panelShadow[1],
      uiPalette.panelShadow[2]
    ),
    k.anchor("topleft"),
    k.opacity(1),
    opts.tag ?? "ui",
  ]);
  const buttonNode = k.add([
    k.rect(opts.width - 2, opts.height - 2, { radius: 3 }),
    k.pos(opts.x + 1, opts.y + 1),
    k.area(),
    k.anchor("topleft"),
    k.color(bg[0], bg[1], bg[2]),
    k.opacity(1),
    opts.tag ?? "ui",
  ]);
  return Object.assign(buttonNode, { shadowNode });
}

export function approximateWrappedLineCount(
  text: string,
  width: number | undefined,
  size = 10
): number {
  const normalized = text.trim();
  if (normalized.length === 0) {
    return 1;
  }
  if (!width || width <= 0) {
    return Math.max(1, normalized.split(NEWLINE_REGEX).length);
  }

  const approxCharWidth = Math.max(5, Math.round(size * 0.58));
  const charsPerLine = Math.max(10, Math.floor(width / approxCharWidth));
  let wrappedLines = 0;
  for (const paragraph of normalized.split(NEWLINE_REGEX)) {
    const paragraphText = paragraph.trim();
    if (paragraphText.length === 0) {
      wrappedLines += 1;
      continue;
    }
    wrappedLines += Math.max(1, Math.ceil(paragraphText.length / charsPerLine));
  }
  return wrappedLines;
}

export function approximateTextHeight(
  text: string,
  width: number | undefined,
  size = 10,
  lineHeight = uiMetrics.panelTitleGap
): number {
  return approximateWrappedLineCount(text, width, size) * lineHeight;
}

export function drawSelectionFrameAtom(
  k: KAPLAYCtx,
  opts: SelectionFrameAtomOptions
): void {
  const tag = opts.tag ?? "ui";
  const outerX = opts.x - 2;
  const outerY = opts.y - 2;
  const outerWidth = opts.width + 4;
  const outerHeight = opts.height + 4;

  k.add([
    k.rect(outerWidth, outerHeight, { radius: 6 }),
    k.pos(outerX, outerY),
    k.color(
      uiPalette.selectionShadow[0],
      uiPalette.selectionShadow[1],
      uiPalette.selectionShadow[2]
    ),
    tag,
  ]);
  k.add([
    k.rect(outerWidth - 2, 2, { radius: 1 }),
    k.pos(outerX + 1, outerY + 1),
    k.color(
      uiPalette.selectionOutline[0],
      uiPalette.selectionOutline[1],
      uiPalette.selectionOutline[2]
    ),
    tag,
  ]);
  k.add([
    k.rect(outerWidth - 2, 2, { radius: 1 }),
    k.pos(outerX + 1, outerY + outerHeight - 3),
    k.color(
      uiPalette.selectionOutline[0],
      uiPalette.selectionOutline[1],
      uiPalette.selectionOutline[2]
    ),
    tag,
  ]);
  k.add([
    k.rect(2, outerHeight - 6, { radius: 1 }),
    k.pos(outerX + 1, outerY + 3),
    k.color(
      uiPalette.selectionOutline[0],
      uiPalette.selectionOutline[1],
      uiPalette.selectionOutline[2]
    ),
    tag,
  ]);
  k.add([
    k.rect(2, outerHeight - 6, { radius: 1 }),
    k.pos(outerX + outerWidth - 3, outerY + 3),
    k.color(
      uiPalette.selectionOutline[0],
      uiPalette.selectionOutline[1],
      uiPalette.selectionOutline[2]
    ),
    tag,
  ]);
  k.add([
    k.rect(5, Math.max(12, opts.height - 10), { radius: 2 }),
    k.pos(opts.x + 3, opts.y + 5),
    k.color(
      uiPalette.selectionMarker[0],
      uiPalette.selectionMarker[1],
      uiPalette.selectionMarker[2]
    ),
    tag,
  ]);
}

export function drawKeycapAtom(k: KAPLAYCtx, opts: KeycapAtomOptions): number {
  const size = opts.size ?? 9;
  const tone = tonePalette[opts.tone ?? "accent"];
  const paddingX = opts.paddingX ?? 5;
  const width = opts.text.length * 6 + paddingX * 2;
  drawButtonSurfaceAtom(k, {
    x: opts.x,
    y: opts.y,
    width,
    height: 16,
    tone: opts.tone ?? "accent",
    enabled: true,
    tag: opts.tag,
  });
  drawTextAtom(k, {
    x: opts.x + paddingX,
    y: opts.y + 4,
    text: opts.text,
    size,
    color: tone.fg,
    tag: opts.tag,
  });
  return width;
}
