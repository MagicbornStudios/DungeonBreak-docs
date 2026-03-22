"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

export type AssetSpacePoint = {
  assetId: string;
  label: string;
  x: number;
  y: number;
  z: number;
  colorLabel: string;
};

type AssetSpacePlotProps = {
  axisLabels: {
    x: string;
    y: string;
    z: string;
  };
  points: AssetSpacePoint[];
  selectedAssetId: string | null;
  onSelectAsset: (assetId: string) => void;
};

function hueForLabel(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % 360;
}

export function AssetSpacePlot({
  axisLabels,
  points,
  selectedAssetId,
  onSelectAsset,
}: AssetSpacePlotProps) {
  const Plot = useMemo(
    () =>
      dynamic(
        () => import("react-plotly.js").then((module_) => module_.default),
        {
          ssr: false,
          loading: () => (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Loading asset space...
            </div>
          ),
        }
      ),
    []
  );

  return (
    <Plot
      data={[
        {
          type: "scatter3d",
          mode: "markers",
          x: points.map((point) => point.x),
          y: points.map((point) => point.y),
          z: points.map((point) => point.z),
          text: points.map((point) => point.label),
          customdata: points.map((point) => point.assetId),
          hovertemplate:
            "<b>%{text}</b><br>" +
            `${axisLabels.x}: %{x}<br>` +
            `${axisLabels.y}: %{y}<br>` +
            `${axisLabels.z}: %{z}<extra></extra>`,
          marker: {
            size: points.map((point) =>
              point.assetId === selectedAssetId ? 10 : 7
            ),
            color: points.map((point) => {
              const hue = hueForLabel(point.colorLabel);
              return `hsl(${hue}, 78%, 58%)`;
            }),
            line: {
              width: points.map((point) =>
                point.assetId === selectedAssetId ? 2 : 1
              ),
              color: points.map((point) => {
                const hue = hueForLabel(point.colorLabel);
                return `hsl(${hue}, 78%, 30%)`;
              }),
            },
            opacity: 0.92,
          },
        },
      ]}
      layout={{
        autosize: true,
        showlegend: false,
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        margin: { t: 12, l: 0, r: 0, b: 0 },
        scene: {
          bgcolor: "rgba(0,0,0,0)",
          xaxis: {
            title: axisLabels.x,
            gridcolor: "rgba(148, 163, 184, 0.18)",
            zerolinecolor: "rgba(148, 163, 184, 0.18)",
          },
          yaxis: {
            title: axisLabels.y,
            gridcolor: "rgba(148, 163, 184, 0.18)",
            zerolinecolor: "rgba(148, 163, 184, 0.18)",
          },
          zaxis: {
            title: axisLabels.z,
            gridcolor: "rgba(148, 163, 184, 0.18)",
            zerolinecolor: "rgba(148, 163, 184, 0.18)",
          },
          camera: {
            eye: { x: 1.45, y: 1.2, z: 0.95 },
          },
        },
      }}
      config={{
        displayModeBar: false,
        responsive: true,
      }}
      onClick={(event: { points?: Array<{ customdata?: unknown }> }) => {
        const assetId = event.points?.[0]?.customdata;
        if (typeof assetId === "string" && assetId.length > 0) {
          onSelectAsset(assetId);
        }
      }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}
