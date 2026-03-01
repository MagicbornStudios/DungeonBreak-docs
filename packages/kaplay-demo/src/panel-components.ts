import type { ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { addButton, addChip, addFeedBlock, addPanel, LINE_H, UI_TAG, type UiTone } from "./shared";
import { actionToneFor, formatActionButtonLabel } from "./action-renderer";

type PanelLine = {
  text: string;
  tone?: UiTone;
};

const toneTextColor: Record<UiTone, [number, number, number]> = {
  neutral: [206, 214, 228],
  good: [192, 238, 208],
  warn: [245, 222, 162],
  danger: [250, 196, 202],
  accent: [226, 230, 240],
};

export function renderInfoPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  lines: PanelLine[],
): number {
  addPanel(k, x, y, width, height);
  k.add([
    k.text(title, { size: 11 }),
    k.pos(x + 8, y + 8),
    k.color(182, 194, 216),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  let lineY = y + 26;
  for (const line of lines) {
    const color = toneTextColor[line.tone ?? "neutral"];
    k.add([
      k.text(line.text, { size: 10, width: width - 16 }),
      k.pos(x + 8, lineY),
      k.color(color[0], color[1], color[2]),
      k.anchor("topleft"),
      UI_TAG,
    ]);
    lineY += LINE_H;
  }
  return y + height;
}

export function renderActionListPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  items: ActionItem[],
  onAction: (item: ActionItem) => void,
  options?: { maxItems?: number; compact?: boolean },
): number {
  const maxItems = options?.maxItems ?? items.length;
  const compact = options?.compact ?? false;
  let nextY = y;
  for (const item of items.slice(0, maxItems)) {
    nextY = addButton(
      k,
      x,
      nextY,
      width,
      formatActionButtonLabel(item),
      () => onAction(item),
      item.available,
      { tone: actionToneFor(item), compact },
    );
  }
  return nextY;
}

export function renderEventLogPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  lines: string[],
  maxLines: number,
  title?: string,
): number {
  if (title) {
    addChip(k, x, y, title, "accent");
    y += 22;
  }
  return addFeedBlock(k, x, y, width, lines, maxLines);
}

