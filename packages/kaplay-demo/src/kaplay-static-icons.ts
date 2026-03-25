import type { KAPLAYCtx } from "kaplay";
import arrowLeftRightSvg from "lucide-static/icons/arrow-left-right.svg";
import arrowUpDownSvg from "lucide-static/icons/arrow-up-down.svg";
import backpackSvg from "lucide-static/icons/backpack.svg";
import bedSvg from "lucide-static/icons/bed.svg";
import bookOpenSvg from "lucide-static/icons/book-open.svg";
import crownSvg from "lucide-static/icons/crown.svg";
import doorOpenSvg from "lucide-static/icons/door-open.svg";
import dumbbellSvg from "lucide-static/icons/dumbbell.svg";
import funnelSvg from "lucide-static/icons/funnel.svg";
import gemSvg from "lucide-static/icons/gem.svg";
import hammerSvg from "lucide-static/icons/hammer.svg";
import mapSvg from "lucide-static/icons/map.svg";
import messagesSquareSvg from "lucide-static/icons/messages-square.svg";
import scrollTextSvg from "lucide-static/icons/scroll-text.svg";
import shieldSvg from "lucide-static/icons/shield.svg";
import sparklesSvg from "lucide-static/icons/sparkles.svg";
import swordsSvg from "lucide-static/icons/swords.svg";
import trash2Svg from "lucide-static/icons/trash-2.svg";
import wandSparklesSvg from "lucide-static/icons/wand-sparkles.svg";
import type { NavigationRoomIconId } from "./navigation-visual-language";

const STATIC_ICON_SVG: Record<NavigationRoomIconId, string> = {
  "arrow-left-right": arrowLeftRightSvg,
  "arrow-up-down": arrowUpDownSvg,
  backpack: backpackSvg,
  bed: bedSvg,
  "book-open": bookOpenSvg,
  crown: crownSvg,
  "door-open": doorOpenSvg,
  dumbbell: dumbbellSvg,
  funnel: funnelSvg,
  gem: gemSvg,
  hammer: hammerSvg,
  map: mapSvg,
  "messages-square": messagesSquareSvg,
  "scroll-text": scrollTextSvg,
  shield: shieldSvg,
  sparkles: sparklesSvg,
  swords: swordsSvg,
  "trash-2": trash2Svg,
  "wand-sparkles": wandSparklesSvg,
};

const loadedStaticIconSprites = new Set<string>();

function staticIconSpriteName(iconId: NavigationRoomIconId): string {
  return `lucide-static-${iconId}`;
}

function staticIconDataUrl(svg: string, strokeHex = "#F8EDD6"): string {
  const normalizedSvg = svg
    .replace(/currentColor/g, strokeHex)
    .replace(/\r?\n\s*/g, " ")
    .trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(normalizedSvg)}`;
}

export function preloadKaplayStaticIconSprites(k: KAPLAYCtx): void {
  for (const [iconId, svg] of Object.entries(STATIC_ICON_SVG) as [
    NavigationRoomIconId,
    string,
  ][]) {
    const spriteName = staticIconSpriteName(iconId);
    if (loadedStaticIconSprites.has(spriteName)) {
      continue;
    }
    loadedStaticIconSprites.add(spriteName);
    k.loadSprite(spriteName, staticIconDataUrl(svg));
  }
}

export function resolveKaplayStaticIconSprite(
  iconId: NavigationRoomIconId
): string {
  return staticIconSpriteName(iconId);
}
