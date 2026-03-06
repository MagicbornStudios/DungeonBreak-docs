"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type {
  ContentDimensionLayerId,
  ContentDimensionNode,
} from "@/lib/content-dimension";

function hashToUnit(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash / 0xffffffff;
}

function modelSurfaceHue(modelRootId: string): number {
  return Math.round(hashToUnit(modelRootId) * 360);
}

export type StatSpaceOverlay = {
  id: string;
  xCenter: number;
  width: number;
  height: number;
  color: string;
};

export type LayerSpaceOverlay = {
  id: string;
  layerId: ContentDimensionLayerId;
  xCenter: number;
  width: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
  color: string;
};

export type OverlayVisibility = {
  spaceOutline: boolean;
  schemaOutline: boolean;
  canonicalOutline: boolean;
  schemaPoints: boolean;
  canonicalPoints: boolean;
};

type DimensionLayer = {
  layerId: ContentDimensionLayerId;
  label: string;
  color: string;
  nodes: ContentDimensionNode[];
};

type DimensionPlotlyProps = {
  layers: DimensionLayer[];
  projection: "3d" | "2d";
  selectedCanonicalAssetId: string | null;
  onSelectCanonicalAsset: (assetId: string) => void;
  modelHueById: Record<string, number>;
  statSpaceOverlays: StatSpaceOverlay[];
  overlayVisibility: OverlayVisibility;
  layerSpaceOverlays: LayerSpaceOverlay[];
  selectedModelId: string | null;
};

export function DimensionPlotly({
  layers,
  projection,
  selectedCanonicalAssetId,
  onSelectCanonicalAsset,
  modelHueById,
  statSpaceOverlays,
  overlayVisibility,
  layerSpaceOverlays,
  selectedModelId,
}: DimensionPlotlyProps) {
  const Plot = useMemo(
    () =>
      dynamic(() => import("react-plotly.js").then((mod) => mod.default), {
        ssr: false,
        loading: () => (
          <div className="flex h-full items-center justify-center">
            Loading dimensions...
          </div>
        ),
      }),
    []
  );

  const visibleLayers = layers.filter((layer) =>
    layer.layerId === "schema-model"
      ? overlayVisibility.schemaPoints
      : overlayVisibility.canonicalPoints
  );
  const visibleSchemaLayer = visibleLayers.find(
    (layer) => layer.layerId === "schema-model"
  );
  const visibleCanonicalLayer = visibleLayers.find(
    (layer) => layer.layerId === "canonical-asset"
  );

  const traces =
    projection === "2d"
      ? [
          ...(overlayVisibility.spaceOutline
            ? statSpaceOverlays.map((overlay) => ({
                x: [overlay.xCenter],
                y: [overlay.height],
                width: [overlay.width],
                type: "bar" as const,
                marker: {
                  color: overlay.color,
                  line: { width: 0, color: overlay.color },
                },
                hoverinfo: "skip" as const,
                name: "",
              }))
            : []),
          ...(visibleSchemaLayer
            ? [
                {
                  x: visibleSchemaLayer.nodes.map((node) => node.modelIndex),
                  y: visibleSchemaLayer.nodes.map((node) => node.surface.height),
                  width: visibleSchemaLayer.nodes.map((node) =>
                    Math.max(0.55, node.surface.width / 40)
                  ),
                  customdata: visibleSchemaLayer.nodes.map((node) => ({
                    label: node.label,
                    modelId: node.modelId,
                    depth: node.inheritanceDepth,
                    share: node.contentSharePct * 100,
                    width: node.surface.width,
                  })),
                  type: "bar" as const,
                  marker: {
                    color: visibleSchemaLayer.nodes.map((node) => {
                      const hue = modelHueById[node.modelId];
                      return `hsl(${hue ?? modelSurfaceHue(node.modelId)}, 82%, 58%)`;
                    }),
                    line: {
                      width: 1,
                      color: "rgba(255,255,255,0.18)",
                    },
                  },
                  name: "Model Surface",
                  hovertemplate:
                    "<b>%{customdata.label}</b><br>" +
                    "model: %{customdata.modelId}<br>" +
                    "depth: %{customdata.depth}<br>" +
                    "content: %{customdata.share:.1f}%<br>" +
                    "surface width: %{customdata.width}<br>" +
                    "<extra></extra>",
                },
              ]
            : []),
          ...(visibleCanonicalLayer
            ? [
                {
                  x: visibleCanonicalLayer.nodes.map((node) => node.modelIndex),
                  y: visibleCanonicalLayer.nodes.map((node) =>
                    Math.max(0.15, node.surface.height - 0.18)
                  ),
                  text: visibleCanonicalLayer.nodes.map(
                    (node) => `${node.label} (${node.modelId})`
                  ),
                  customdata: visibleCanonicalLayer.nodes.map((node) => ({
                    assetId: node.id.replace("canonical-asset:", ""),
                    modelId: node.modelId,
                    label: node.label,
                  })),
                  type: "scatter" as const,
                  mode: "markers" as const,
                  marker: {
                    size: visibleCanonicalLayer.nodes.map((node) => {
                      const assetId = node.id.replace("canonical-asset:", "");
                      return assetId === selectedCanonicalAssetId ? 13 : 9;
                    }),
                    color: visibleCanonicalLayer.nodes.map((node) => {
                      const hue = modelHueById[node.modelId];
                      return `hsl(${hue ?? modelSurfaceHue(node.modelId)}, 85%, 62%)`;
                    }),
                    line: {
                      width: visibleCanonicalLayer.nodes.map((node) => {
                        const assetId = node.id.replace("canonical-asset:", "");
                        return assetId === selectedCanonicalAssetId ? 2 : 1;
                      }),
                      color: visibleCanonicalLayer.nodes.map((node) => {
                        const hue = modelHueById[node.modelId];
                        return `hsl(${hue ?? modelSurfaceHue(node.modelId)}, 90%, 40%)`;
                      }),
                    },
                  },
                  name: "Canonical Overlay",
                  hovertemplate: "%{text}<extra></extra>",
                },
              ]
            : []),
          ...(visibleCanonicalLayer
            ? (() => {
                const selectedNode = visibleCanonicalLayer.nodes.find(
                  (node) =>
                    node.id.replace("canonical-asset:", "") ===
                    selectedCanonicalAssetId
                );
                if (!selectedNode) return [];
                const selectedAssetId = selectedNode.id.replace(
                  "canonical-asset:",
                  ""
                );
                const selectedHue =
                  modelHueById[selectedNode.modelId] ??
                  modelSurfaceHue(selectedNode.modelId);
                return [
                  {
                    x: [selectedNode.modelIndex],
                    y: [Math.max(0.15, selectedNode.surface.height - 0.18)],
                    text: [`${selectedNode.label} (${selectedNode.modelId})`],
                    customdata: [
                      {
                        assetId: selectedAssetId,
                        modelId: selectedNode.modelId,
                        label: selectedNode.label,
                      },
                    ],
                    type: "scatter" as const,
                    mode: "markers+text" as const,
                    marker: {
                      size: 14,
                      color: `hsl(${selectedHue}, 92%, 70%)`,
                      line: {
                        width: 2,
                        color: `hsl(${selectedHue}, 92%, 36%)`,
                      },
                    },
                    textposition: "top center" as const,
                    textfont: {
                      size: 10,
                      color: "hsl(0, 0%, 96%)",
                    },
                    name: "Selected Asset",
                    hovertemplate: "%{text}<extra></extra>",
                  },
                ];
              })()
            : []),
        ]
      : [
          ...(overlayVisibility.spaceOutline
            ? statSpaceOverlays.map((overlay) => {
                const x0 = overlay.xCenter - overlay.width / 2;
                const x1 = overlay.xCenter + overlay.width / 2;
                const y0 = 0;
                const y1 = overlay.height;
                const z0 = 0.7;
                const z1 = 2.3;
                return {
                  x: [x0, x1, x1, x0, x0, null, x0, x1, x1, x0, x0, null, x0, x0, null, x1, x1, null, x1, x1, null, x0, x0],
                  y: [y0, y0, y1, y1, y0, null, y0, y0, y1, y1, y0, null, y0, y0, null, y0, y0, null, y1, y1, null, y1, y1],
                  z: [z0, z0, z0, z0, z0, null, z1, z1, z1, z1, z1, null, z0, z1, null, z0, z1, null, z0, z1, null, z0, z1],
                  type: "scatter3d" as const,
                  mode: "lines" as const,
                  line: {
                    color: overlay.color,
                    width: 5,
                  },
                  hoverinfo: "skip" as const,
                  name: "",
                  showlegend: false,
                };
              })
            : []),
          ...layerSpaceOverlays
            .filter((overlay) =>
              overlay.layerId === "schema-model"
                ? overlayVisibility.schemaOutline
                : overlayVisibility.canonicalOutline
            )
            .map((overlay) => {
              const x0 = overlay.xCenter - overlay.width / 2;
              const x1 = overlay.xCenter + overlay.width / 2;
              const y0 = overlay.yMin;
              const y1 = overlay.yMax;
              const z0 = overlay.zMin;
              const z1 = overlay.zMax;
              return {
                x: [x0, x1, x1, x0, x0, null, x0, x1, x1, x0, x0, null, x0, x0, null, x1, x1, null, x1, x1, null, x0, x0],
                y: [y0, y0, y1, y1, y0, null, y0, y0, y1, y1, y0, null, y0, y0, null, y0, y0, null, y1, y1, null, y1, y1],
                z: [z0, z0, z0, z0, z0, null, z1, z1, z1, z1, z1, null, z0, z1, null, z0, z1, null, z0, z1, null, z0, z1],
                type: "scatter3d" as const,
                mode: "lines" as const,
                line: {
                  color: overlay.color,
                  width: 3,
                },
                hoverinfo: "skip" as const,
                name: "",
                showlegend: false,
              };
            }),
          ...visibleLayers
            .filter((layer) => layer.nodes.length > 0)
            .map((layer) => {
              const text = layer.nodes.map(
                (node) =>
                  `<b>${node.label}</b><br>model: ${node.modelId}<br>index: ${node.modelIndex}<br>layer: ${layer.label}`
              );
              return {
                x: layer.nodes.map((node) => node.coords.x),
                y: layer.nodes.map((node) => node.coords.y),
                z: layer.nodes.map((node) => node.coords.z),
                text,
                name: layer.label,
                mode: "markers+text" as const,
                type: "scatter3d" as const,
                marker: {
                  size: 7,
                  color: layer.color,
                  opacity: 0.95,
                },
                textposition: "top center" as const,
                hovertemplate: "%{text}<extra></extra>",
              };
            }),
          ...(() => {
            const selectedModelNode = visibleLayers
              .flatMap((layer) => layer.nodes)
              .find(
                (node) =>
                  node.layerId === "schema-model" &&
                  node.modelId === selectedModelId
              );
            if (!selectedModelNode) return [];
            const hue =
              modelHueById[selectedModelNode.modelId] ??
              modelSurfaceHue(selectedModelNode.modelId);
            return [
              {
                x: [selectedModelNode.coords.x],
                y: [selectedModelNode.coords.y],
                z: [selectedModelNode.coords.z],
                text: [`${selectedModelNode.label} (${selectedModelNode.modelId})`],
                type: "scatter3d" as const,
                mode: "markers+text" as const,
                marker: {
                  size: 11,
                  color: `hsl(${hue}, 92%, 72%)`,
                  line: { width: 2, color: `hsl(${hue}, 92%, 36%)` },
                },
                textposition: "top center" as const,
                hovertemplate: "%{text}<extra></extra>",
                name: "",
                showlegend: false,
              },
            ];
          })(),
        ];

  const allDataNodes = layers.flatMap((layer) => layer.nodes);
  const xValues = allDataNodes.map((n) => n.coords.x);
  const yValues = allDataNodes.map((n) => n.coords.y);
  const zValues = allDataNodes.map((n) => n.coords.z);
  const xMin = xValues.length > 0 ? Math.min(...xValues) : 0;
  const xMax = xValues.length > 0 ? Math.max(...xValues) : 1;
  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 1;
  const zMin = zValues.length > 0 ? Math.min(...zValues) : 0;
  const zMax = zValues.length > 0 ? Math.max(...zValues) : 2;

  return (
    <Plot
      data={traces}
      layout={
        projection === "2d"
          ? {
              margin: { l: 40, r: 12, t: 12, b: 40 },
              uirevision: "dimension-plot",
              paper_bgcolor: "transparent",
              plot_bgcolor: "rgba(0,0,0,0.1)",
              xaxis: {
                title: "Model Index (tree order)",
                gridcolor: "rgba(128,128,128,0.2)",
                tickmode: "linear",
              },
              yaxis: {
                title: "Surface Height (Depth)",
                gridcolor: "rgba(128,128,128,0.2)",
                rangemode: "tozero",
              },
              showlegend: false,
              legend: { orientation: "h", y: 1.12 },
            }
          : {
              margin: { l: 0, r: 0, t: 12, b: 0 },
              uirevision: "dimension-plot",
              paper_bgcolor: "transparent",
              plot_bgcolor: "rgba(0,0,0,0.1)",
              scene: {
                xaxis: {
                  title: { text: "Model Index", font: { color: "#e5e7eb", size: 12 } },
                  gridcolor: "rgba(128,128,128,0.2)",
                  tickfont: { color: "#cbd5e1", size: 10 },
                  range: [xMin - 1.2, xMax + 1.2],
                },
                yaxis: {
                  title: { text: "Depth", font: { color: "#e5e7eb", size: 12 } },
                  gridcolor: "rgba(128,128,128,0.2)",
                  tickfont: { color: "#cbd5e1", size: 10 },
                  range: [Math.max(0, yMin - 0.9), yMax + 0.9],
                },
                zaxis: {
                  title: { text: "Layer", font: { color: "#e5e7eb", size: 12 } },
                  gridcolor: "rgba(128,128,128,0.2)",
                  tickfont: { color: "#cbd5e1", size: 10 },
                  range: [zMin - 0.6, zMax + 0.6],
                },
                dragmode: "orbit",
                hovermode: "closest",
                aspectmode: "manual",
                aspectratio: { x: 1.3, y: 1, z: 0.8 },
              },
              showlegend: false,
              legend: { orientation: "h", y: 1.05 },
            }
      }
      config={{
        responsive: true,
        scrollZoom: true,
        displayModeBar: true,
      }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
      onClick={(event: {
        points?: Array<{
          customdata?: { assetId?: string };
        }>;
      }) => {
        const point = event.points?.[0];
        if (!point || projection !== "2d") return;
        const assetId =
          typeof point.customdata?.assetId === "string"
            ? point.customdata.assetId
            : null;
        if (assetId) onSelectCanonicalAsset(assetId);
      }}
    />
  );
}
