import type { KAPLAYCtx } from "kaplay";
import { LINE_H } from "../shared";
import type { UiTone } from "../theme-tokens";
import { drawKeycapAtom, drawMutedTextAtom, drawTextAtom, drawToneTextAtom } from "./atoms";

type SectionHeaderOptions = {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  titleSize?: number;
  subtitleSize?: number;
  tag?: string;
};

type StatRowOptions = {
  x: number;
  y: number;
  icon: string;
  label: string;
  value: string;
  tone?: UiTone;
  size?: number;
  width?: number;
  tag?: string;
};

type HintRowOptions = {
  x: number;
  y: number;
  hints: string[];
  width?: number;
  size?: number;
  tag?: string;
};

type KeyHintLegendOptions = {
  x: number;
  y: number;
  hints: Array<{ key: string; label: string; tone?: UiTone }>;
  width: number;
  tag?: string;
};

export function renderSectionHeaderMolecule(k: KAPLAYCtx, opts: SectionHeaderOptions): number {
  drawTextAtom(k, {
    x: opts.x,
    y: opts.y,
    text: opts.title,
    size: opts.titleSize ?? 10,
    tag: opts.tag,
  });
  if (!opts.subtitle) return opts.y + LINE_H;
  drawMutedTextAtom(k, {
    x: opts.x,
    y: opts.y + LINE_H - 2,
    text: opts.subtitle,
    size: opts.subtitleSize ?? 9,
    tag: opts.tag,
  });
  return opts.y + LINE_H * 2;
}

export function renderStatRowMolecule(k: KAPLAYCtx, opts: StatRowOptions): number {
  drawToneTextAtom(k, {
    x: opts.x,
    y: opts.y,
    text: `${opts.icon} ${opts.label} ${opts.value}`,
    tone: opts.tone ?? "neutral",
    size: opts.size ?? 9,
    width: opts.width,
    tag: opts.tag,
  });
  return opts.y + LINE_H;
}

export function renderHintRowMolecule(k: KAPLAYCtx, opts: HintRowOptions): number {
  drawMutedTextAtom(k, {
    x: opts.x,
    y: opts.y,
    text: opts.hints.join("  |  "),
    width: opts.width,
    size: opts.size ?? 10,
    tag: opts.tag,
  });
  return opts.y + LINE_H;
}

export function renderKeyHintLegendMolecule(k: KAPLAYCtx, opts: KeyHintLegendOptions): number {
  let cursorX = opts.x;
  let cursorY = opts.y;
  for (const hint of opts.hints) {
    const keycapWidth = drawKeycapAtom(k, {
      x: cursorX,
      y: cursorY,
      text: hint.key,
      tone: hint.tone ?? "accent",
      tag: opts.tag,
    });
    const labelX = cursorX + keycapWidth + 6;
    drawMutedTextAtom(k, {
      x: labelX,
      y: cursorY + 4,
      text: hint.label,
      size: 9,
      tag: opts.tag,
    });
    const itemWidth = keycapWidth + 6 + hint.label.length * 6 + 12;
    cursorX += itemWidth;
    if (cursorX > opts.x + opts.width - 90) {
      cursorX = opts.x;
      cursorY += LINE_H;
    }
  }
  return cursorY + LINE_H;
}
