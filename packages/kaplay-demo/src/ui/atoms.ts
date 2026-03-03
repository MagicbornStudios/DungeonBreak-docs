import type { KAPLAYCtx } from "kaplay";
import { escapeKaplayStyledText } from "../escape-kaplay-tags";
import { tonePalette, uiPalette, type UiTone } from "../theme-tokens";

type Rgb = readonly [number, number, number] | [number, number, number];

type TextAtomOptions = {
  text: string;
  x: number;
  y: number;
  size?: number;
  width?: number;
  color?: Rgb;
  tag?: string;
};

type ToneTextAtomOptions = Omit<TextAtomOptions, "color"> & {
  tone: UiTone;
  disabled?: boolean;
};

type ButtonSurfaceAtomOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: UiTone;
  enabled?: boolean;
  tag?: string;
};

type KeycapAtomOptions = {
  x: number;
  y: number;
  text: string;
  tone?: UiTone;
  size?: number;
  paddingX?: number;
  tag?: string;
};

export function drawSurfaceAtom(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  tag = "ui",
): void {
  k.add([
    k.rect(width, height, { radius: 4 }),
    k.pos(x, y),
    k.color(uiPalette.panelBg[0], uiPalette.panelBg[1], uiPalette.panelBg[2]),
    k.anchor("topleft"),
    tag,
  ]);
  k.add([
    k.rect(width, 1),
    k.pos(x, y),
    k.color(uiPalette.panelBorder[0], uiPalette.panelBorder[1], uiPalette.panelBorder[2]),
    k.anchor("topleft"),
    tag,
  ]);
}

export function drawDividerAtom(
  k: KAPLAYCtx,
  x: number,
  y: number,
  height: number,
  tag = "ui",
): void {
  k.add([
    k.rect(1, height),
    k.pos(x, y),
    k.color(uiPalette.separator[0], uiPalette.separator[1], uiPalette.separator[2]),
    k.anchor("topleft"),
    tag,
  ]);
}

export function drawTextAtom(k: KAPLAYCtx, opts: TextAtomOptions): void {
  const color = opts.color ?? uiPalette.textPrimary;
  k.add([
    k.text(escapeKaplayStyledText(opts.text), {
      size: opts.size ?? 10,
      width: opts.width,
    }),
    k.pos(opts.x, opts.y),
    k.color(color[0], color[1], color[2]),
    k.anchor("topleft"),
    opts.tag ?? "ui",
  ]);
}

export function drawToneTextAtom(k: KAPLAYCtx, opts: ToneTextAtomOptions): void {
  const tone = tonePalette[opts.tone];
  drawTextAtom(k, {
    ...opts,
    color: opts.disabled ? uiPalette.textMuted : tone.fg,
  });
}

export function drawMutedTextAtom(k: KAPLAYCtx, opts: Omit<TextAtomOptions, "color">): void {
  drawTextAtom(k, { ...opts, color: uiPalette.textMuted });
}

export function drawButtonSurfaceAtom(k: KAPLAYCtx, opts: ButtonSurfaceAtomOptions) {
  const tone = tonePalette[opts.tone];
  const enabled = opts.enabled ?? true;
  const bg = enabled ? tone.bg : ([45, 45, 45] as const);
  return k.add([
    k.rect(opts.width, opts.height, { radius: 3 }),
    k.pos(opts.x, opts.y),
    k.area(),
    k.anchor("topleft"),
    k.color(bg[0], bg[1], bg[2]),
    opts.tag ?? "ui",
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
