import type { ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { escapeKaplayStyledText } from "./escape-kaplay-tags";
import { addButton, addChip, addFeedBlock, addPanel, LINE_H, UI_TAG } from "./shared";
import { actionToneFor, formatActionButtonLabel, sortActionItems } from "./action-renderer";
import { tonePalette, type UiTone, uiMetrics, uiPalette, UI_FONT_FAMILY } from "./theme-tokens";
import { approximateTextHeight, drawHorizontalRuleAtom } from "./ui/atoms";

type PanelLine = {
  text: string;
  tone?: UiTone;
};

const toneTextColor: Record<UiTone, [number, number, number]> = {
  neutral: tonePalette.neutral.fg,
  good: tonePalette.good.fg,
  warn: tonePalette.warn.fg,
  danger: tonePalette.danger.fg,
  accent: tonePalette.accent.fg,
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
  const innerX = x + uiMetrics.panelInset;
  const innerWidth = width - uiMetrics.panelInset * 2;
  const titleY = y + uiMetrics.panelTitleTop;
  k.add([
    k.text(escapeKaplayStyledText(title), { font: UI_FONT_FAMILY, size: 11 }),
    k.pos(innerX, titleY),
    k.color(
      uiPalette.headerTitle[0],
      uiPalette.headerTitle[1],
      uiPalette.headerTitle[2]
    ),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.text(escapeKaplayStyledText("STATUS"), { font: UI_FONT_FAMILY, size: 8 }),
    k.pos(innerX, titleY - 1),
    k.color(
      uiPalette.panelHeaderEyebrow[0],
      uiPalette.panelHeaderEyebrow[1],
      uiPalette.panelHeaderEyebrow[2]
    ),
    k.anchor("botleft"),
    UI_TAG,
  ]);
  drawHorizontalRuleAtom(
    k,
    innerX,
    titleY + uiMetrics.panelTitleGap,
    Math.max(24, innerWidth - uiMetrics.panelRuleInset),
    UI_TAG
  );
  let lineY = titleY + uiMetrics.panelTitleGap + uiMetrics.panelSectionGap;
  for (const line of lines) {
    const color = toneTextColor[line.tone ?? "neutral"];
    k.add([
      k.text(escapeKaplayStyledText(line.text), {
        font: UI_FONT_FAMILY,
        size: 10,
        width: innerWidth,
      }),
      k.pos(innerX, lineY),
      k.color(color[0], color[1], color[2]),
      k.anchor("topleft"),
      UI_TAG,
    ]);
    lineY += approximateTextHeight(line.text, innerWidth, 10, LINE_H);
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
  const orderedItems = sortActionItems(items);
  let nextY = y;
  for (const item of orderedItems.slice(0, maxItems)) {
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
    y += 24;
  }
  return addFeedBlock(k, x, y, width, lines, maxLines);
}
