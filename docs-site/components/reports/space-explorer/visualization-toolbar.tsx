import type { DistanceAlgorithm } from "@/lib/space-explorer-runtime";
import { Button } from "@/components/ui/button";

type VisualizationToolbarProps = {
  vizMode: "3d" | "2d" | "json" | "deltas";
  setVizMode: (next: "3d" | "2d" | "json" | "deltas") => void;
  contentPackInfoEnabled: boolean;
  statModifiersEnabled: boolean;
  distanceAlgorithm: DistanceAlgorithm;
  setDistanceAlgorithm: (next: DistanceAlgorithm) => void;
  nearestK: number;
  setNearestK: (next: number) => void;
};

export function VisualizationToolbar({
  vizMode,
  setVizMode,
  contentPackInfoEnabled,
  statModifiersEnabled,
  distanceAlgorithm,
  setDistanceAlgorithm,
  nearestK,
  setNearestK,
}: VisualizationToolbarProps) {
  return (
    <div
      id="panel-visualization-toolbar"
      data-ui-id="panel-visualization-toolbar"
      className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2"
    >
      <Button
        id="btn-viz-3d"
        data-ui-id="btn-viz-3d"
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setVizMode("3d")}
        className={`px-3 py-1.5 text-xs font-semibold ${vizMode === "3d" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
        title="Interactive 3D projection of current content vectors."
      >
        3D
      </Button>
      <Button
        id="btn-viz-2d"
        data-ui-id="btn-viz-2d"
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setVizMode("2d")}
        className={`px-3 py-1.5 text-xs font-semibold ${vizMode === "2d" ? "bg-cyan-500/20 text-cyan-100" : "text-muted-foreground"}`}
        title="Interactive 2D projection."
      >
        2D
      </Button>
      <Button
        id="btn-viz-info"
        data-ui-id="btn-viz-info"
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          if (!contentPackInfoEnabled) return;
          setVizMode("json");
        }}
        disabled={!contentPackInfoEnabled}
        className={`px-3 py-1.5 text-xs font-semibold ${
          !contentPackInfoEnabled
            ? "cursor-not-allowed opacity-40"
            : vizMode === "json"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground"
        }`}
        title="Info panel with code/schema/data tabs."
      >
        Info
      </Button>
      <Button
        id="btn-viz-deltas"
        data-ui-id="btn-viz-deltas"
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          if (!statModifiersEnabled) return;
          setVizMode("deltas");
        }}
        disabled={!statModifiersEnabled}
        className={`px-3 py-1.5 text-xs font-semibold ${
          !statModifiersEnabled
            ? "cursor-not-allowed opacity-40"
            : vizMode === "deltas"
              ? "bg-violet-500/20 text-violet-100"
              : "text-muted-foreground"
        }`}
        title={
          statModifiersEnabled
            ? "Inspect selected asset stat sets and their stat modifiers."
            : "Select an asset to inspect stat modifiers."
        }
      >
        Stat Modifiers
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          Distance Algorithm
          <select
            value={distanceAlgorithm}
            onChange={(e) =>
              setDistanceAlgorithm(
                e.target.value as DistanceAlgorithm
              )
            }
            className="rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
          >
            <option value="game-default">Game default</option>
            <option value="euclidean">Euclidean</option>
            <option value="cosine">Cosine</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          K
          <input
            type="number"
            min={1}
            max={50}
            value={nearestK}
            onChange={(e) =>
              setNearestK(
                Math.max(1, Math.min(50, Number(e.target.value) || 1))
              )
            }
            className="w-14 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
          />
        </label>
      </div>
    </div>
  );
}
