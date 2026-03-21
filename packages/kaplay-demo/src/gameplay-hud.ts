import type { KAPLAYCtx } from "kaplay";
import { resolveMountSprite } from "./content-visuals";
import { addChip, LINE_H, UI_TAG } from "./shared";
import { drawMutedTextAtom, drawTextAtom } from "./ui/atoms";

const formatMoveTickCost = (value: unknown): string => {
  const tickCost = Number(value ?? 1);
  if (!Number.isFinite(tickCost)) {
    return "1.0";
  }
  return tickCost.toFixed(1);
};

export function addGameplayHud(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  status: Record<string, unknown>
): number {
  const health = Number(status.health ?? 0);
  const mana = Number(status.mana ?? 0);
  const fame = Number(status.fame ?? 0);
  const hpTone = health <= 25 ? "danger" : "good";
  const manaTone = mana <= 0 ? "warn" : "good";
  const mountSummoned = Boolean(status.mountSummoned);
  const mountName = String(status.mountName ?? "Mount");

  let chipX = x;
  chipX = addChip(k, chipX, y, `[D] ${String(status.depth ?? "?")}`, "neutral");
  chipX = addChip(k, chipX, y, `[HP] ${String(status.health ?? "?")}`, hpTone);
  chipX = addChip(k, chipX, y, `[MP] ${String(status.mana ?? "?")}`, manaTone);
  chipX = addChip(k, chipX, y, `[LV] ${String(status.level ?? "?")}`, "accent");
  chipX = addChip(
    k,
    chipX,
    y,
    `[FAME] ${fame}`,
    fame > 0 ? "accent" : "neutral"
  );
  chipX = addChip(
    k,
    chipX,
    y,
    mountSummoned ? `[MOUNT] ${mountName}` : "[MOUNT] Stabled",
    mountSummoned ? "good" : "neutral"
  );
  addChip(
    k,
    chipX,
    y,
    `[MOVE] ${formatMoveTickCost(status.moveTickCost)} tick`,
    mountSummoned ? "accent" : "neutral"
  );

  const mountSprite = resolveMountSprite();
  if (mountSprite) {
    k.add([
      k.sprite(mountSprite),
      k.pos(x + width - 16, y + 10),
      k.anchor("center"),
      k.scale(1.2),
      UI_TAG,
    ]);
  }

  drawTextAtom(k, {
    x,
    y: y + 24,
    text: "Gameplay HUD",
    size: 10,
    tag: UI_TAG,
  });
  drawMutedTextAtom(k, {
    x: x + 80,
    y: y + 24,
    text: mountSummoned
      ? `${mountName} is active. Movement bonus applies where allowed.`
      : "Call your mount from the in-game action rail when you want traversal speed.",
    size: 9,
    width: Math.max(0, width - 96),
    tag: UI_TAG,
  });

  return y + LINE_H * 2;
}
