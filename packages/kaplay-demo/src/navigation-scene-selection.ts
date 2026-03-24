import type { KAPLAYCtx } from "kaplay";
import {
  FLOOR_TILE_H,
  FLOOR_TILE_W,
  NAV_DYNAMIC_TAG,
} from "./navigation-scene-constants";
import type {
  ColorableNode,
  PositionableNode,
  SelectionOverlayNodes,
  TextDecorationNode,
} from "./navigation-scene-types";
import { UI_FONT_FAMILY } from "./theme-tokens";

export function destroySelectionOverlayNodes(
  nodes: SelectionOverlayNodes | null
): null {
  if (!nodes) {
    return null;
  }
  nodes.halo.destroy();
  nodes.fill.destroy();
  nodes.stripe.destroy();
  nodes.border.destroy();
  nodes.label.destroy();
  return null;
}

export function ensureSelectionOverlayNodes(
  k: KAPLAYCtx,
  nodes: SelectionOverlayNodes | null
): SelectionOverlayNodes {
  if (nodes) {
    return nodes;
  }
  return {
    halo: k.add([
      k.rect(FLOOR_TILE_W + 10, FLOOR_TILE_H + 10, { radius: 10 }),
      k.pos(-1000, -1000),
      k.color(238, 197, 116),
      k.opacity(0.18),
      NAV_DYNAMIC_TAG,
    ]) as PositionableNode & ColorableNode,
    fill: k.add([
      k.rect(FLOOR_TILE_W, FLOOR_TILE_H, { radius: 6 }),
      k.pos(-1000, -1000),
      k.color(116, 80, 32),
      NAV_DYNAMIC_TAG,
    ]),
    stripe: k.add([
      k.rect(FLOOR_TILE_W - 12, 2, { radius: 1 }),
      k.pos(-1000, -1000),
      k.color(208, 182, 88),
      NAV_DYNAMIC_TAG,
    ]),
    border: k.add([
      k.rect(FLOOR_TILE_W + 4, FLOOR_TILE_H + 4, { radius: 8 }),
      k.pos(-1000, -1000),
      k.color(28, 18, 19),
      k.outline(2, k.rgb(238, 197, 116)),
      NAV_DYNAMIC_TAG,
    ]),
    label: k.add([
      k.text("MOVE", { font: UI_FONT_FAMILY, size: 8 }),
      k.pos(-1000, -1000),
      k.color(120, 214, 152),
      k.opacity(1),
      k.anchor("center"),
      NAV_DYNAMIC_TAG,
    ]) as TextDecorationNode,
  };
}

export function hideSelectionOverlay(
  k: KAPLAYCtx,
  nodes: SelectionOverlayNodes
): void {
  nodes.halo.pos = k.vec2(-1000, -1000);
  (nodes.fill as PositionableNode).pos = k.vec2(-1000, -1000);
  (nodes.stripe as PositionableNode).pos = k.vec2(-1000, -1000);
  (nodes.border as PositionableNode).pos = k.vec2(-1000, -1000);
  nodes.label.pos = k.vec2(-1000, -1000);
}
