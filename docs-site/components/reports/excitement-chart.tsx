"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(
  () => import("react-plotly.js").then((m) => m.default),
  { ssr: false },
);

type ExcitementChartProps = {
  perTurnScores: number[];
  rollingAverage: number[];
};

export function ExcitementChart({ perTurnScores, rollingAverage }: ExcitementChartProps) {
  const turns = perTurnScores.map((_, i) => i + 1);

  return (
    <Plot
      data={[
        {
          x: turns,
          y: perTurnScores,
          type: "scatter",
          mode: "lines+markers",
          name: "Per-turn",
          line: { color: "var(--color-chart-1)" },
        },
        {
          x: turns,
          y: rollingAverage,
          type: "scatter",
          mode: "lines",
          name: "Rolling avg",
          line: { color: "var(--color-chart-2)", width: 2 },
        },
      ]}
      layout={{
        margin: { l: 48, r: 24, t: 24, b: 36 },
        xaxis: { title: "Turn" },
        yaxis: { title: "Score" },
        showlegend: true,
        legend: { x: 1, xanchor: "right", y: 1 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "rgba(0,0,0,0.03)",
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%", height: "100%" }}
      useResizeHandler
    />
  );
}
