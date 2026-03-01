import type { KAPLAYCtx } from "kaplay";

export const PAD = 8;
export const LINE_H = 16;
export const UI_TAG = "ui";

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
  const button = k.add([
    k.rect(width, 24, { radius: 3 }),
    k.pos(x, y),
    k.area(),
    k.anchor("topleft"),
    k.color(enabled ? 58 : 45, enabled ? 76 : 45, enabled ? 108 : 45),
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
    button.onClick(onClick);
  }
  return y + 28;
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
    k.text("--- Feed ---", { size: 11 }),
    k.pos(x, y),
    k.color(150, 155, 170),
    k.anchor("topleft"),
    UI_TAG,
  ]);
  y += LINE_H;

  const feed = lines.slice(-Math.max(1, maxLines));
  for (const line of feed) {
    k.add([
      k.text(truncate(line, 120), { size: 10, width }),
      k.pos(x, y),
      k.color(175, 178, 190),
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
