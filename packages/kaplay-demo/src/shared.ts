import type { KAPLAYCtx } from "kaplay";
import { escapeKaplayStyledText } from "./escape-kaplay-tags";
import { formatFeedLine } from "./feed-lines";
import {
  registerKaplayDebugButton,
  resetKaplayDebugButtons,
  resetKaplayDebugButtonsByTag,
} from "./kaplay-debug";
import {
  DISPLAY_FONT_FAMILY,
  tonePalette,
  UI_FONT_FAMILY,
  type UiTone,
  uiMetrics,
  uiPalette,
} from "./theme-tokens";
import {
  approximateTextHeight,
  drawButtonSurfaceAtom,
  drawHorizontalRuleAtom,
  drawSurfaceAtom,
} from "./ui/atoms";

export const PAD = 8;
export const LINE_H = 16;
export const UI_TAG = "ui";
export type { UiTone } from "./theme-tokens";
export interface TabBarItem {
  label: string;
  iconSpriteName?: string | null;
  tone?: UiTone;
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) {
    return str;
  }
  return `${str.slice(0, Math.max(0, max - 3))}...`;
}

export function clearUi(k: KAPLAYCtx): void {
  resetKaplayDebugButtons();
  k.destroyAll(UI_TAG);
}

export function clearUiTag(k: KAPLAYCtx, tag: string): void {
  resetKaplayDebugButtonsByTag(tag);
  k.destroyAll(tag);
}

/** Format room info from status. Engine status has roomId/depth; look contributes context. */
export function formatRoomInfo(
  status: Record<string, unknown>,
  lookExcerpt = ""
): string {
  const roomId = String(status.roomId ?? "?");
  const depth = String(status.depth ?? "?");
  if (!lookExcerpt) {
    return `${roomId} | Depth ${depth}`;
  }
  const lines = lookExcerpt.split("\n").slice(0, 2);
  return [`${roomId} | Depth ${depth}`, ...lines].join(" | ");
}

/** Render room info panel (1-2 lines). Shared by first-person and grid. */
export function addRoomInfoPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  status: Record<string, unknown>,
  lookExcerpt = ""
): number {
  const line = formatRoomInfo(status, lookExcerpt);
  k.add([
    k.text(escapeKaplayStyledText(line), {
      font: UI_FONT_FAMILY,
      size: 11,
      width,
    }),
    k.pos(x, y),
    k.color(180, 180, 180),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  return y + LINE_H;
}

export function addHeader(
  k: KAPLAYCtx,
  width: number,
  title: string,
  subtitle: string
): number {
  const barH = 34;
  k.add([
    k.rect(width, barH),
    k.pos(0, 0),
    k.color(
      uiPalette.headerBg[0],
      uiPalette.headerBg[1],
      uiPalette.headerBg[2]
    ),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.text(escapeKaplayStyledText(title), {
      font: DISPLAY_FONT_FAMILY,
      size: 14,
    }),
    k.pos(PAD, 6),
    k.color(
      uiPalette.headerTitle[0],
      uiPalette.headerTitle[1],
      uiPalette.headerTitle[2]
    ),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.text(escapeKaplayStyledText(subtitle), {
      font: UI_FONT_FAMILY,
      size: 10,
    }),
    k.pos(width - PAD, 10),
    k.color(
      uiPalette.headerSubtitle[0],
      uiPalette.headerSubtitle[1],
      uiPalette.headerSubtitle[2]
    ),
    k.anchor("topright"),
    UI_TAG,
  ]);
  return barH + PAD;
}

export function addButton(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  label: string,
  onClick: () => void,
  enabled = true,
  opts?: { tone?: UiTone; compact?: boolean; tag?: string }
): number {
  const tone = opts?.tone ?? "accent";
  const compact = opts?.compact ?? false;
  const tag = opts?.tag ?? UI_TAG;
  const buttonH = compact
    ? uiMetrics.buttonCompactHeight
    : uiMetrics.buttonHeight;
  const labelY = compact ? 4 : 6;
  const base = tonePalette[tone];
  const idle = enabled ? base.bg : [45, 45, 45];
  const hover = enabled
    ? [
        Math.min(255, idle[0] + 20),
        Math.min(255, idle[1] + 20),
        Math.min(255, idle[2] + 20),
      ]
    : [45, 45, 45];
  const button = drawButtonSurfaceAtom(k, {
    x,
    y,
    width,
    height: buttonH,
    tone,
    enabled,
    tag,
  });
  registerKaplayDebugButton({
    label,
    x,
    y,
    width,
    height: buttonH,
    tag,
  });
  k.add([
    k.text(escapeKaplayStyledText(truncate(label, 64)), {
      font: UI_FONT_FAMILY,
      size: 10,
      width: width - 8,
    }),
    k.pos(x + 4, y + labelY),
    k.anchor("topleft"),
    k.color(
      enabled ? base.fg[0] : 138,
      enabled ? base.fg[1] : 138,
      enabled ? base.fg[2] : 138
    ),
    tag,
  ]);
  if (enabled) {
    button.onHover(() => {
      button.color = k.rgb(hover[0], hover[1], hover[2]);
    });
    button.onHoverEnd(() => {
      button.color = k.rgb(idle[0], idle[1], idle[2]);
    });
    button.onClick(onClick);
  }
  return y + buttonH + uiMetrics.buttonGap;
}

export function addPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  drawSurfaceAtom(k, x, y, width, height, UI_TAG);
}

export function addChip(
  k: KAPLAYCtx,
  x: number,
  y: number,
  label: string,
  tone: UiTone = "neutral"
): number {
  const palette = tonePalette[tone];
  const width = Math.max(38, Math.min(220, label.length * 6 + 12));
  k.add([
    k.rect(width, 18, { radius: 9 }),
    k.pos(x, y),
    k.color(palette.bg[0], palette.bg[1], palette.bg[2]),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.text(escapeKaplayStyledText(label), {
      font: UI_FONT_FAMILY,
      size: 9,
    }),
    k.pos(x + 6, y + 5),
    k.color(palette.fg[0], palette.fg[1], palette.fg[2]),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  return x + width + 6;
}

export function addTabBar(
  k: KAPLAYCtx,
  x: number,
  y: number,
  tabs: readonly (string | TabBarItem)[],
  active: string,
  onSelect: (tab: string) => void,
  tag = UI_TAG
): number {
  let tabX = x;
  for (const tab of tabs) {
    const tabItem =
      typeof tab === "string" ? ({ label: tab } satisfies TabBarItem) : tab;
    const isActive = tabItem.label === active;
    const iconInset = tabItem.iconSpriteName ? 18 : 0;
    const w = Math.max(52, tabItem.label.length * 7 + 16 + iconInset);
    const palette = isActive
      ? tonePalette[tabItem.tone ?? "accent"]
      : tonePalette.neutral;
    const btn = k.add([
      k.rect(w, 22, { radius: 4 }),
      k.pos(tabX, y),
      k.area(),
      k.color(palette.bg[0], palette.bg[1], palette.bg[2]),
      k.anchor("topleft"),
      tag,
    ]);
    if (tabItem.iconSpriteName) {
      k.add([
        k.sprite(tabItem.iconSpriteName),
        k.pos(tabX + 9, y + 11),
        k.anchor("center"),
        k.scale(0.4),
        tag,
      ]);
    }
    k.add([
      k.text(tabItem.label, { font: UI_FONT_FAMILY, size: 10 }),
      k.pos(tabX + 8 + iconInset, y + 6),
      k.color(palette.fg[0], palette.fg[1], palette.fg[2]),
      k.anchor("topleft"),
      tag,
    ]);
    if (!isActive) {
      btn.onClick(() => onSelect(tabItem.label));
    }
    tabX += w + 6;
  }
  return y + 26;
}

export function addFeedBlock(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  lines: string[],
  maxLines: number
): number {
  let cursorY = y;
  const title = "--- Narrative Feed ---";
  k.add([
    k.text(title, { font: UI_FONT_FAMILY, size: 11 }),
    k.pos(x, cursorY),
    k.color(
      uiPalette.headerTitle[0],
      uiPalette.headerTitle[1],
      uiPalette.headerTitle[2]
    ),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  cursorY += LINE_H - 2;
  drawHorizontalRuleAtom(
    k,
    x,
    cursorY,
    Math.max(24, width - uiMetrics.panelRuleInset),
    UI_TAG
  );
  cursorY += uiMetrics.panelRuleGap;

  const feed = lines.slice(-Math.max(1, maxLines));
  for (const line of feed) {
    const formatted = formatFeedLine(line);
    k.add([
      k.text(escapeKaplayStyledText(truncate(formatted.displayText, 120)), {
        font: UI_FONT_FAMILY,
        size: 10,
        width,
      }),
      k.pos(x, cursorY),
      k.color(formatted.color[0], formatted.color[1], formatted.color[2]),
      k.anchor("topleft"),
      UI_TAG,
    ]);
    cursorY += approximateTextHeight(formatted.displayText, width, 10, LINE_H);
  }
  return cursorY;
}

export function addFooterStatus(
  k: KAPLAYCtx,
  x: number,
  y: number,
  status: Record<string, unknown>
): number {
  const health = Number(status.health ?? 0);
  const mana = Number(status.mana ?? 0);
  const hpTone: UiTone = health <= 25 ? "danger" : "good";
  const manaTone: UiTone = mana <= 20 ? "warn" : "good";

  let chipX = x;
  chipX = addChip(k, chipX, y, `[D] ${String(status.depth ?? "?")}`, "neutral");
  chipX = addChip(k, chipX, y, `[HP] ${String(status.health ?? "?")}`, hpTone);
  chipX = addChip(k, chipX, y, `[MP] ${String(status.mana ?? "?")}`, manaTone);
  addChip(k, chipX, y, `[LV] ${String(status.level ?? "?")}`, "accent");
  return y + 20;
}

/** Cutscene overlay: title + prose + [Continue]. Blocking. All elements tagged "cutscene". */
export function addCutsceneOverlay(
  k: KAPLAYCtx,
  w: number,
  h: number,
  title: string,
  prose: string,
  onContinue: () => void
): void {
  const pad = 24;
  const boxW = w - pad * 2;

  k.add([
    k.rect(w, h),
    k.pos(0, 0),
    k.color(0, 0, 0),
    k.opacity(0.85),
    k.area(),
    k.anchor("topleft"),
    "cutscene",
  ]);

  k.add([
    k.text(escapeKaplayStyledText(`*** ${title} ***`), {
      font: DISPLAY_FONT_FAMILY,
      size: 18,
    }),
    k.pos(pad, pad),
    k.color(255, 220, 140),
    k.anchor("topleft"),
    "cutscene",
  ]);

  k.add([
    k.text(escapeKaplayStyledText(prose), {
      font: UI_FONT_FAMILY,
      size: 14,
      width: boxW - 16,
    }),
    k.pos(pad, pad + 28),
    k.color(220, 220, 220),
    k.anchor("topleft"),
    "cutscene",
  ]);

  const btnY = h - pad - 40;
  registerKaplayDebugButton({
    label: "Continue",
    x: w / 2 - 60,
    y: btnY,
    width: 120,
    height: 32,
  });
  const btn = k.add([
    k.rect(120, 32, { radius: 4 }),
    k.pos(w / 2 - 60, btnY),
    k.area(),
    k.color(60, 100, 140),
    k.anchor("topleft"),
    "cutscene",
  ]);
  k.add([
    k.text("Continue", { font: UI_FONT_FAMILY, size: 14 }),
    k.pos(w / 2 - 30, btnY + 8),
    k.anchor("topleft"),
    k.color(255, 255, 255),
    "cutscene",
  ]);
  btn.onClick(onContinue);
}
