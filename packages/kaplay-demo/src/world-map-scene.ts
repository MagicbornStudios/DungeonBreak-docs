import type { KAPLAYCtx } from "kaplay";
import { DISPLAY_FONT_FAMILY } from "./theme-tokens";
import { clearUi, UI_TAG } from "./shared";
import type { SceneCallbacks } from "./scene-contracts";
import {
  buildWorldMapView,
  type WorldMapNodeView,
} from "./world-map-content";

const MAP_MARGIN_X = 42;
const MAP_MARGIN_Y = 54;
const PAPER_W = 716;
const PAPER_H = 488;
const MAP_INSET = 38;
const NODE_SIZE = 10;
const SELECT_RING_SIZE = 22;
const ROUTE_THICKNESS = 4;

type Direction = "up" | "down" | "left" | "right";

function mapNodePosition(node: WorldMapNodeView): { x: number; y: number } {
  return {
    x: MAP_MARGIN_X + MAP_INSET + node.xRatio * (PAPER_W - MAP_INSET * 2),
    y: MAP_MARGIN_Y + MAP_INSET + node.yRatio * (PAPER_H - MAP_INSET * 2),
  };
}

function inkColor(
  node: WorldMapNodeView
): [number, number, number] {
  if (node.isCurrent) {
    return [168, 96, 52];
  }
  if (node.isOnRoute) {
    return [116, 82, 42];
  }
  return [72, 56, 40];
}

function moveSelection(
  nodes: WorldMapNodeView[],
  selectedRegionId: string,
  direction: Direction
): string {
  const current = nodes.find((node) => node.regionId === selectedRegionId);
  if (!current) {
    return nodes[0]?.regionId ?? selectedRegionId;
  }

  const candidates = nodes
    .filter((node) => {
      if (node.regionId === current.regionId) {
        return false;
      }
      if (direction === "left") {
        return node.xRatio < current.xRatio;
      }
      if (direction === "right") {
        return node.xRatio > current.xRatio;
      }
      if (direction === "up") {
        return node.yRatio < current.yRatio;
      }
      return node.yRatio > current.yRatio;
    })
    .sort((left, right) => {
      const leftPrimary =
        direction === "left" || direction === "right"
          ? Math.abs(left.xRatio - current.xRatio)
          : Math.abs(left.yRatio - current.yRatio);
      const rightPrimary =
        direction === "left" || direction === "right"
          ? Math.abs(right.xRatio - current.xRatio)
          : Math.abs(right.yRatio - current.yRatio);
      if (leftPrimary !== rightPrimary) {
        return leftPrimary - rightPrimary;
      }
      const leftSecondary =
        direction === "left" || direction === "right"
          ? Math.abs(left.yRatio - current.yRatio)
          : Math.abs(left.xRatio - current.xRatio);
      const rightSecondary =
        direction === "left" || direction === "right"
          ? Math.abs(right.yRatio - current.yRatio)
          : Math.abs(right.xRatio - current.xRatio);
      return leftSecondary - rightSecondary;
    });

  return candidates[0]?.regionId ?? selectedRegionId;
}

function drawRouteLine(
  k: KAPLAYCtx,
  start: { x: number; y: number },
  end: { x: number; y: number }
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  k.add([
    k.rect(distance, ROUTE_THICKNESS, { radius: 2 }),
    k.pos(start.x, start.y),
    k.color(124, 92, 50),
    k.rotate(angle),
    UI_TAG,
  ]);
}

function drawMapNode(
  k: KAPLAYCtx,
  node: WorldMapNodeView,
  selected: boolean,
  onSelect: () => void
): void {
  const position = mapNodePosition(node);
  const color = inkColor(node);
  if (selected) {
    k.add([
      k.rect(SELECT_RING_SIZE, SELECT_RING_SIZE, { radius: 11 }),
      k.pos(position.x - SELECT_RING_SIZE / 2, position.y - SELECT_RING_SIZE / 2),
      k.color(192, 155, 103),
      k.opacity(0.35),
      UI_TAG,
    ]);
  }
  k.add([
    k.rect(NODE_SIZE, NODE_SIZE, { radius: 5 }),
    k.pos(position.x - NODE_SIZE / 2, position.y - NODE_SIZE / 2),
    k.area(),
    k.color(color[0], color[1], color[2]),
    UI_TAG,
  ]).onClick(onSelect);
  k.add([
    k.text(node.name, {
      font: DISPLAY_FONT_FAMILY,
      size: node.isCurrent ? 15 : 13,
    }),
    k.pos(position.x + 12, position.y - 10),
    k.color(58, 40, 28),
    UI_TAG,
  ]);
}

export function registerWorldMapScene(
  k: KAPLAYCtx,
  cb: SceneCallbacks
): void {
  k.scene("gridWorldMap", () => {
    let selectedRegionId: string | null = null;

    const render = () => {
      clearUi(k);
      const state = cb.getState();
      const worldMap = buildWorldMapView(state.status as Record<string, unknown>);
      const nodesById = new Map(
        worldMap.nodes.map((node) => [node.regionId, node] as const)
      );
      selectedRegionId =
        selectedRegionId && nodesById.has(selectedRegionId)
          ? selectedRegionId
          : worldMap.currentRegionId;
      const selectedNode =
        nodesById.get(selectedRegionId) ?? worldMap.nodes[0] ?? null;

      k.add([k.rect(800, 600), k.pos(0, 0), k.color(12, 11, 14), UI_TAG]);
      k.add([
        k.rect(760, 544, { radius: 28 }),
        k.pos(20, 28),
        k.color(24, 18, 18),
        k.opacity(0.92),
        UI_TAG,
      ]);

      k.add([
        k.rect(PAPER_W, PAPER_H, { radius: 28 }),
        k.pos(MAP_MARGIN_X, MAP_MARGIN_Y),
        k.color(158, 134, 96),
        UI_TAG,
      ]);
      k.add([
        k.rect(PAPER_W - 10, PAPER_H - 10, { radius: 24 }),
        k.pos(MAP_MARGIN_X + 5, MAP_MARGIN_Y + 5),
        k.color(206, 187, 147),
        UI_TAG,
      ]);
      k.add([
        k.rect(PAPER_W - 36, PAPER_H - 36, { radius: 18 }),
        k.pos(MAP_MARGIN_X + 18, MAP_MARGIN_Y + 18),
        k.color(226, 211, 176),
        UI_TAG,
      ]);
      k.add([
        k.rect(PAPER_W - 88, 2, { radius: 1 }),
        k.pos(MAP_MARGIN_X + 44, MAP_MARGIN_Y + 46),
        k.color(142, 111, 72),
        UI_TAG,
      ]);

      k.add([
        k.text("World Map", {
          font: DISPLAY_FONT_FAMILY,
          size: 28,
        }),
        k.pos(MAP_MARGIN_X + 46, MAP_MARGIN_Y + 18),
        k.color(66, 47, 33),
        UI_TAG,
      ]);
      k.add([
        k.text("A worn chart of the roads leading out of the dungeon lands.", {
          font: DISPLAY_FONT_FAMILY,
          size: 14,
          width: PAPER_W - 180,
        }),
        k.pos(MAP_MARGIN_X + 46, MAP_MARGIN_Y + 58),
        k.color(86, 65, 46),
        UI_TAG,
      ]);
      k.add([
        k.text("[M] Floor Map    [Esc] Close", {
          font: DISPLAY_FONT_FAMILY,
          size: 13,
        }),
        k.pos(MAP_MARGIN_X + PAPER_W - 250, MAP_MARGIN_Y + 28),
        k.color(92, 67, 44),
        UI_TAG,
      ]);

      k.add([
        k.rect(PAPER_W - 136, PAPER_H - 182, { radius: 16 }),
        k.pos(MAP_MARGIN_X + 68, MAP_MARGIN_Y + 94),
        k.color(214, 198, 164),
        k.opacity(0.55),
        UI_TAG,
      ]);
      k.add([
        k.rect(180, 96, { radius: 48 }),
        k.pos(MAP_MARGIN_X + 116, MAP_MARGIN_Y + 154),
        k.color(194, 176, 142),
        k.opacity(0.3),
        UI_TAG,
      ]);
      k.add([
        k.rect(214, 110, { radius: 52 }),
        k.pos(MAP_MARGIN_X + 318, MAP_MARGIN_Y + 132),
        k.color(190, 172, 138),
        k.opacity(0.24),
        UI_TAG,
      ]);
      k.add([
        k.rect(168, 92, { radius: 44 }),
        k.pos(MAP_MARGIN_X + 510, MAP_MARGIN_Y + 196),
        k.color(186, 167, 136),
        k.opacity(0.28),
        UI_TAG,
      ]);

      for (let index = 0; index < worldMap.routeRegionIds.length - 1; index += 1) {
        const startNode = nodesById.get(worldMap.routeRegionIds[index] ?? "");
        const endNode = nodesById.get(worldMap.routeRegionIds[index + 1] ?? "");
        if (!(startNode && endNode)) {
          continue;
        }
        drawRouteLine(k, mapNodePosition(startNode), mapNodePosition(endNode));
      }

      for (const node of worldMap.nodes) {
        drawMapNode(k, node, node.regionId === selectedRegionId, () => {
          selectedRegionId = node.regionId;
          render();
        });
      }

      if (selectedNode) {
        k.add([
          k.rect(PAPER_W - 94, 98, { radius: 14 }),
          k.pos(MAP_MARGIN_X + 47, MAP_MARGIN_Y + PAPER_H - 132),
          k.color(214, 198, 166),
          k.opacity(0.82),
          UI_TAG,
        ]);
        k.add([
          k.text(selectedNode.name, {
            font: DISPLAY_FONT_FAMILY,
            size: 20,
          }),
          k.pos(MAP_MARGIN_X + 66, MAP_MARGIN_Y + PAPER_H - 118),
          k.color(62, 44, 31),
          UI_TAG,
        ]);
        k.add([
          k.text(selectedNode.summary, {
            font: DISPLAY_FONT_FAMILY,
            size: 14,
            width: PAPER_W - 176,
          }),
          k.pos(MAP_MARGIN_X + 66, MAP_MARGIN_Y + PAPER_H - 88),
          k.color(86, 65, 46),
          UI_TAG,
        ]);
      }
    };

    const move = (direction: Direction) => {
      const worldMap = buildWorldMapView(cb.getState().status as Record<string, unknown>);
      const activeRegionId = selectedRegionId ?? worldMap.currentRegionId;
      selectedRegionId = moveSelection(worldMap.nodes, activeRegionId, direction);
      render();
    };

    k.onKeyPress("left", () => move("left"));
    k.onKeyPress("right", () => move("right"));
    k.onKeyPress("up", () => move("up"));
    k.onKeyPress("down", () => move("down"));
    k.onKeyPress("a", () => move("left"));
    k.onKeyPress("d", () => move("right"));
    k.onKeyPress("w", () => move("up"));
    k.onKeyPress("s", () => move("down"));
    k.onKeyPress("m", () => k.go("gridMap"));
    k.onKeyPress("escape", () => k.go("gridNavigation"));

    cb.setRefresh(render);
    render();
  });
}
