import type { KAPLAYCtx } from "kaplay";

export const PAD = 8;
export const LINE_H = 16;
export const UI_TAG = "ui";
export const PANEL_BG = [20, 28, 48] as const;
export const PANEL_BORDER = [44, 62, 100] as const;

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, Math.max(0, max - 3))}...`;
}

export function clearUi(k: KAPLAYCtx): void {
  k.destroyAll(UI_TAG);
}

/** Format room info from status. Engine status has roomId/depth; look contributes context. */
export function formatRoomInfo(status: Record<string, unknown>, lookExcerpt = ""): string {
  const roomId = String(status.roomId ?? "?");
  const depth = String(status.depth ?? "?");
  if (!lookExcerpt) return `${roomId} | Depth ${depth}`;
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
  lookExcerpt = "",
): number {
  const line = formatRoomInfo(status, lookExcerpt);
  k.add([
    k.text(line, { size: 11, width }),
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
  subtitle: string,
): number {
  const barH = 34;
  k.add([
    k.rect(width, barH),
    k.pos(0, 0),
    k.color(28, 36, 62),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.text(title, { size: 14 }),
    k.pos(PAD, 6),
    k.color(230, 230, 240),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.text(subtitle, { size: 10 }),
    k.pos(width - PAD, 10),
    k.color(170, 180, 205),
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
): number {
  const idle = enabled ? [58, 76, 108] : [45, 45, 45];
  const hover = enabled ? [78, 100, 138] : [45, 45, 45];
  const button = k.add([
    k.rect(width, 24, { radius: 3 }),
    k.pos(x, y),
    k.area(),
    k.anchor("topleft"),
    k.color(idle[0], idle[1], idle[2]),
    UI_TAG,
  ]);
  k.add([
    k.text(truncate(label, 64), { size: 10, width: width - 8 }),
    k.pos(x + 4, y + 6),
    k.anchor("topleft"),
    k.color(enabled ? 226 : 138, enabled ? 230 : 138, enabled ? 240 : 138),
    UI_TAG,
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
  return y + 28;
}

export function addPanel(k: KAPLAYCtx, x: number, y: number, width: number, height: number): void {
  k.add([
    k.rect(width, height, { radius: 4 }),
    k.pos(x, y),
    k.color(PANEL_BG[0], PANEL_BG[1], PANEL_BG[2]),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.rect(width, 1),
    k.pos(x, y),
    k.color(PANEL_BORDER[0], PANEL_BORDER[1], PANEL_BORDER[2]),
    k.anchor("topleft"),
    UI_TAG,
  ]);
}

export function addChip(
  k: KAPLAYCtx,
  x: number,
  y: number,
  label: string,
  tone: "neutral" | "good" | "warn" | "danger" = "neutral",
): number {
  const palette =
    tone === "good"
      ? { bg: [30, 78, 52], fg: [192, 238, 208] }
      : tone === "warn"
        ? { bg: [84, 66, 28], fg: [245, 222, 162] }
        : tone === "danger"
          ? { bg: [92, 34, 40], fg: [250, 196, 202] }
          : { bg: [42, 54, 82], fg: [196, 208, 232] };
  const width = Math.max(38, Math.min(220, label.length * 6 + 12));
  k.add([
    k.rect(width, 18, { radius: 9 }),
    k.pos(x, y),
    k.color(palette.bg[0], palette.bg[1], palette.bg[2]),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  k.add([
    k.text(label, { size: 9 }),
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
  tabs: readonly string[],
  active: string,
  onSelect: (tab: string) => void,
): number {
  let tabX = x;
  for (const tab of tabs) {
    const isActive = tab === active;
    const w = Math.max(52, tab.length * 7 + 16);
    const btn = k.add([
      k.rect(w, 22, { radius: 4 }),
      k.pos(tabX, y),
      k.area(),
      k.color(isActive ? 90 : 52, isActive ? 122 : 70, isActive ? 162 : 102),
      k.anchor("topleft"),
      UI_TAG,
    ]);
    k.add([
      k.text(tab, { size: 10 }),
      k.pos(tabX + 8, y + 6),
      k.color(isActive ? 240 : 208, isActive ? 244 : 216, isActive ? 252 : 232),
      k.anchor("topleft"),
      UI_TAG,
    ]);
    if (!isActive) {
      btn.onClick(() => onSelect(tab));
    }
    tabX += w + 6;
  }
  return y + 26;
}

function classifyFeedLine(line: string): "narrator" | "dialogue" | "chapter" | "combat" | "system" | "plain" {
  const lower = line.toLowerCase();
  if (lower.includes("chapter") || lower.includes("scene") || line.startsWith("***")) return "chapter";
  if (line.includes('"') || line.includes(":")) return "dialogue";
  if (lower.includes("attack") || lower.includes("damage") || lower.includes("fight")) return "combat";
  if (lower.includes("saved") || lower.includes("loaded") || lower.includes("autosave")) return "system";
  if (lower.includes("you ") || lower.includes("nearby") || lower.includes("room")) return "narrator";
  return "plain";
}

export function addFeedBlock(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  lines: string[],
  maxLines: number,
): number {
  k.add([
    k.text("--- Narrative Feed ---", { size: 11 }),
    k.pos(x, y),
    k.color(150, 155, 170),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  y += LINE_H;

  const feed = lines.slice(-Math.max(1, maxLines));
  for (const line of feed) {
    const style = classifyFeedLine(line);
    const color =
      style === "chapter"
        ? [246, 221, 162]
        : style === "dialogue"
          ? [206, 226, 248]
          : style === "combat"
            ? [246, 182, 182]
            : style === "system"
              ? [176, 212, 176]
              : style === "narrator"
                ? [218, 214, 236]
                : [175, 178, 190];
    const prefix = style === "chapter" ? "§ " : style === "dialogue" ? "> " : style === "system" ? "• " : "";
    k.add([
      k.text(truncate(`${prefix}${line}`, 120), { size: 10, width }),
      k.pos(x, y),
      k.color(color[0], color[1], color[2]),
      k.anchor("topleft"),
      UI_TAG,
    ]);
    y += LINE_H;
  }
  return y;
}

/** Cutscene overlay: title + prose + [Continue]. Blocking. All elements tagged "cutscene". */
export function addCutsceneOverlay(
  k: KAPLAYCtx,
  w: number,
  h: number,
  title: string,
  prose: string,
  onContinue: () => void,
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
    k.text(`*** ${title} ***`, { size: 18 }),
    k.pos(pad, pad),
    k.color(255, 220, 140),
    k.anchor("topleft"),
    "cutscene",
  ]);

  k.add([
    k.text(prose, { size: 14, width: boxW - 16 }),
    k.pos(pad, pad + 28),
    k.color(220, 220, 220),
    k.anchor("topleft"),
    "cutscene",
  ]);

  const btnY = h - pad - 40;
  const btn = k.add([
    k.rect(120, 32, { radius: 4 }),
    k.pos(w / 2 - 60, btnY),
    k.area(),
    k.color(60, 100, 140),
    k.anchor("topleft"),
    "cutscene",
  ]);
  k.add([
    k.text("Continue", { size: 14 }),
    k.pos(w / 2 - 30, btnY + 8),
    k.anchor("topleft"),
    k.color(255, 255, 255),
    "cutscene",
  ]);
  btn.onClick(onContinue);
}
