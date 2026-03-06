import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { OverlayVisibility } from "@/components/reports/space-explorer/dimension-plotly";

type PlotOverlayControlsProps = {
  overlayVisibility: OverlayVisibility;
  setOverlayVisibility: Dispatch<SetStateAction<OverlayVisibility>>;
};

export function PlotOverlayControls({
  overlayVisibility,
  setOverlayVisibility,
}: PlotOverlayControlsProps) {
  return (
    <div className="absolute bottom-2 right-2 z-20 w-48 rounded border border-border/80 bg-black/80 p-2 backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground">
        Controls
      </p>
      <details className="mt-2 rounded border border-border/70 bg-background/20" open>
        <summary className="cursor-pointer px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Layers
        </summary>
        <div className="space-y-1.5 border-t border-border/60 px-2 py-2">
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-foreground">Space Outline</span>
            <Switch
              checked={overlayVisibility.spaceOutline}
              onCheckedChange={() =>
                setOverlayVisibility((prev) => ({
                  ...prev,
                  spaceOutline: !prev.spaceOutline,
                }))
              }
              size="sm"
              aria-label="Toggle full stat-space overlays"
            />
          </label>
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-foreground">Schema Outline</span>
            <Switch
              checked={overlayVisibility.schemaOutline}
              onCheckedChange={() =>
                setOverlayVisibility((prev) => ({
                  ...prev,
                  schemaOutline: !prev.schemaOutline,
                }))
              }
              size="sm"
              aria-label="Toggle schema-model overlays"
            />
          </label>
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-foreground">Canonical Outline</span>
            <Switch
              checked={overlayVisibility.canonicalOutline}
              onCheckedChange={() =>
                setOverlayVisibility((prev) => ({
                  ...prev,
                  canonicalOutline: !prev.canonicalOutline,
                }))
              }
              size="sm"
              aria-label="Toggle canonical-asset overlays"
            />
          </label>
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-foreground">Schema Points</span>
            <Switch
              checked={overlayVisibility.schemaPoints}
              onCheckedChange={() =>
                setOverlayVisibility((prev) => ({
                  ...prev,
                  schemaPoints: !prev.schemaPoints,
                }))
              }
              size="sm"
              aria-label="Toggle schema-model points"
            />
          </label>
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-foreground">Canonical Points</span>
            <Switch
              checked={overlayVisibility.canonicalPoints}
              onCheckedChange={() =>
                setOverlayVisibility((prev) => ({
                  ...prev,
                  canonicalPoints: !prev.canonicalPoints,
                }))
              }
              size="sm"
              aria-label="Toggle canonical-asset points"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 w-full text-[10px]"
            onClick={() =>
              setOverlayVisibility({
                spaceOutline: true,
                schemaOutline: true,
                canonicalOutline: true,
                schemaPoints: true,
                canonicalPoints: true,
              })
            }
          >
            Reset Layers
          </Button>
        </div>
      </details>
    </div>
  );
}
