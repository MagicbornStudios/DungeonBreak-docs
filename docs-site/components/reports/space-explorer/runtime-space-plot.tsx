"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { hashToUnit } from "@/lib/space-explorer-shared";
import { getPointColor, type ColorBy } from "@/components/reports/space-explorer/view-helpers";
import type { ContentPoint, ModelSpaceOverlayPoint } from "@/components/reports/space-explorer/config";

type RuntimeSpacePlotProps = {
  content: ContentPoint[];
  contentCoords: { x: number; y: number; z: number }[];
  player3d: [number, number, number];
  modelSpacePoints: ModelSpaceOverlayPoint[];
  colorBy: ColorBy;
  projection: "3d" | "2d";
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function RuntimeSpacePlot({
  content,
  contentCoords,
  player3d,
  modelSpacePoints,
  colorBy,
  projection,
  selectedId,
  onSelect,
}: RuntimeSpacePlotProps) {
  const Plot = useMemo(
    () =>
      dynamic(() => import("react-plotly.js").then((mod) => mod.default), {
        ssr: false,
        loading: () => (
          <div className="flex h-full items-center justify-center">Loading 3D...</div>
        ),
      }),
    []
  );

  const text = content.map(
    (p) =>
      `<b>${p.name}</b> (${p.type})<br>branch: ${p.branch}<br>${p.vector
        .map((v) => v.toFixed(2))
        .join(", ")}`
  );

  const traceContent =
    projection === "2d"
      ? {
          x: contentCoords.map((c) => c.x),
          y: contentCoords.map((c) => c.y),
          text,
          mode: "markers" as const,
          type: "scatter" as const,
          marker: {
            size: content.map((p) => (selectedId === p.id ? 12 : 6)),
            color: content.map((p) => getPointColor(p, colorBy)),
            opacity: content.map((p) => (selectedId === p.id ? 1 : 0.85)),
          },
          hovertemplate: "%{text}<extra></extra>",
          hoverinfo: "text" as const,
        }
      : {
          x: contentCoords.map((c) => c.x),
          y: contentCoords.map((c) => c.y),
          z: contentCoords.map((c) => c.z),
          text,
          mode: "markers" as const,
          type: "scatter3d" as const,
          marker: {
            size: content.map((p) => (selectedId === p.id ? 12 : 6)),
            color: content.map((p) => getPointColor(p, colorBy)),
            opacity: content.map((p) => (selectedId === p.id ? 1 : 0.85)),
          },
          hovertemplate: "%{text}<extra></extra>",
          hoverinfo: "text" as const,
        };

  const tracePlayer =
    projection === "2d"
      ? {
          x: [player3d[0]],
          y: [player3d[1]],
          text: ["You"],
          mode: "markers" as const,
          type: "scatter" as const,
          marker: { size: 14, color: "#eab308", symbol: "diamond" },
          hovertemplate: "You<extra></extra>",
        }
      : {
          x: [player3d[0]],
          y: [player3d[1]],
          z: [player3d[2]],
          text: ["You"],
          mode: "markers" as const,
          type: "scatter3d" as const,
          marker: { size: 14, color: "#eab308", symbol: "diamond" },
          hovertemplate: "You<extra></extra>",
        };

  const traceModels =
    projection === "2d"
      ? {
          x: modelSpacePoints.map((row) => row.coords.x),
          y: modelSpacePoints.map((row) => row.coords.y),
          text: modelSpacePoints.map(
            (row) => `<b>${row.name}</b><br>model space overlay`
          ),
          mode: "markers+text" as const,
          type: "scatter" as const,
          marker: {
            size: 8,
            color: modelSpacePoints.map(
              (row) => `hsl(${Math.round(hashToUnit(row.id) * 360)}, 85%, 65%)`
            ),
            symbol: "cross",
          },
          textposition: "top center" as const,
          hovertemplate: "%{text}<extra></extra>",
        }
      : {
          x: modelSpacePoints.map((row) => row.coords.x),
          y: modelSpacePoints.map((row) => row.coords.y),
          z: modelSpacePoints.map((row) => row.coords.z),
          text: modelSpacePoints.map(
            (row) => `<b>${row.name}</b><br>model space overlay`
          ),
          mode: "markers+text" as const,
          type: "scatter3d" as const,
          marker: {
            size: 8,
            color: modelSpacePoints.map(
              (row) => `hsl(${Math.round(hashToUnit(row.id) * 360)}, 85%, 65%)`
            ),
            symbol: "cross",
          },
          textposition: "top center" as const,
          textfont: { size: 10, color: "#e5e7eb" },
          hovertemplate: "%{text}<extra></extra>",
        };

  return (
    <Plot
      data={[traceContent, tracePlayer, traceModels]}
      layout={
        projection === "2d"
          ? {
              margin: { l: 40, r: 12, t: 24, b: 40 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "rgba(0,0,0,0.1)",
              xaxis: { gridcolor: "rgba(128,128,128,0.2)" },
              yaxis: { gridcolor: "rgba(128,128,128,0.2)" },
              showlegend: false,
            }
          : {
              margin: { l: 0, r: 0, t: 24, b: 0 },
              paper_bgcolor: "transparent",
              plot_bgcolor: "rgba(0,0,0,0.1)",
              scene: {
                xaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                yaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                zaxis: { gridcolor: "rgba(128,128,128,0.2)" },
                dragmode: "orbit",
                hovermode: "closest",
              },
              showlegend: false,
            }
      }
      config={{
        responsive: true,
        scrollZoom: true,
        displayModeBar: true,
        modeBarButtonsToAdd: ["hoverclosest", "hovercompare"],
      }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
      onClick={(event: {
        points?: Array<{
          curveNumber?: number;
          pointIndex?: number;
        }>;
      }) => {
        const pts = event.points;
        if (pts?.[0] && pts[0].curveNumber === 0) {
          const idx = pts[0].pointIndex;
          if (typeof idx === "number" && content[idx]) onSelect(content[idx].id);
        }
      }}
    />
  );
}
