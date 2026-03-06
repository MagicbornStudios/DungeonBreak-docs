import type { Dispatch, SetStateAction } from "react";
import {
  IconChevronDown as ChevronDownIcon,
  IconChevronRight as ChevronRightIcon,
  IconChevronUp as ChevronUpIcon,
  IconRefresh as RefreshCwIcon,
} from "@tabler/icons-react";
import { formatModelIdForUi } from "@/lib/space-explorer-schema";
import { modelSurfaceHue } from "@/lib/space-explorer-shared";
import { Button } from "@/components/ui/button";
import { HelpInfo } from "@/components/reports/space-explorer/aux-controls";
import { NO_MODEL_SELECTED } from "@/components/reports/space-explorer/config";
import { getBranchBadgeClass, getTypeBadgeMeta } from "@/components/reports/space-explorer/view-helpers";

type NearestRow = {
  id: string;
  type: string;
  branch: string;
  name: string;
  score: number;
};

type ScopeCrumb = { label: string; modelId: string | null };

type VisualizationPanelHeaderProps = {
  visualizationScope: "asset" | "content-pack";
  scopePathCrumbs: ScopeCrumb[];
  effectiveScopeRootModelId: string | null;
  setScopeRootModelId: (modelId: string | null) => void;
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  effectiveStatSpaceIds: string[];
  enabledStatSpaces: Record<string, boolean>;
  setEnabledStatSpaces: Dispatch<SetStateAction<Record<string, boolean>>>;
  modelHueById: Map<string, number>;
  selectedTurn: number;
  maxTurn: number;
  setSelectedTurn: Dispatch<SetStateAction<number>>;
  handleRefreshVisualization: () => void;
  vizRefreshedAt: string | null;
  effectiveAlgorithm: string;
  nearestRows: NearestRow[];
};

export function VisualizationPanelHeader({
  visualizationScope,
  scopePathCrumbs,
  effectiveScopeRootModelId,
  setScopeRootModelId,
  setActiveModelSelection,
  effectiveStatSpaceIds,
  enabledStatSpaces,
  setEnabledStatSpaces,
  modelHueById,
  selectedTurn,
  maxTurn,
  setSelectedTurn,
  handleRefreshVisualization,
  vizRefreshedAt,
  effectiveAlgorithm,
  nearestRows,
}: VisualizationPanelHeaderProps) {
  return (
    <div className="border-b border-border px-3 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Visualization Panel</p>
          <span className="rounded border border-border/70 bg-background/30 px-1.5 py-0 text-[9px] uppercase tracking-wide text-muted-foreground">
            panel-visualization
          </span>
        </div>
        {visualizationScope === "content-pack" ? (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
              {scopePathCrumbs.map((crumb, index) => {
                const selected =
                  (crumb.modelId ?? null) ===
                  (effectiveScopeRootModelId ?? null);
                return (
                  <span
                    key={`scope-breadcrumb-${index}-${crumb.label}`}
                    className="inline-flex items-center gap-1"
                  >
                    {index > 0 ? (
                      <ChevronRightIcon className="size-3 text-muted-foreground/70" />
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-5 rounded border px-1.5 text-[10px] ${
                        selected
                          ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-100"
                          : "border-border/70 bg-background/40 text-foreground"
                      }`}
                      onClick={() => {
                        setScopeRootModelId(crumb.modelId);
                        if (crumb.modelId) {
                          setActiveModelSelection(crumb.modelId, null);
                        } else {
                          setActiveModelSelection(NO_MODEL_SELECTED, null);
                        }
                      }}
                      title={
                        crumb.modelId
                          ? `Scope to ${crumb.modelId}`
                          : "Scope to pack root"
                      }
                    >
                      {crumb.label}
                    </Button>
                  </span>
                );
              })}
            </div>
            {effectiveStatSpaceIds.length > 0 ? (
              <div className="ml-1 flex items-center gap-1">
                {effectiveStatSpaceIds.map((statSpaceId) => {
                  const enabled = enabledStatSpaces[statSpaceId] !== false;
                  const hue =
                    modelHueById.get(statSpaceId) ??
                    modelSurfaceHue(statSpaceId);
                  return (
                    <Button
                      key={`stat-space-toggle-${statSpaceId}`}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={`h-5 rounded border px-1.5 text-[10px] ${
                        enabled
                          ? "text-foreground"
                          : "text-muted-foreground opacity-55"
                      }`}
                      style={{
                        borderColor: `hsla(${hue}, 84%, 58%, ${enabled ? 0.7 : 0.35})`,
                        backgroundColor: `hsla(${hue}, 84%, 45%, ${enabled ? 0.2 : 0.08})`,
                      }}
                      onClick={() => {
                        setEnabledStatSpaces((prev) => ({
                          ...prev,
                          [statSpaceId]: !enabled,
                        }));
                      }}
                      title={`Toggle ${statSpaceId} space`}
                    >
                      {formatModelIdForUi(statSpaceId)}
                    </Button>
                  );
                })}
              </div>
            ) : null}
            <div className="flex shrink-0 items-center gap-1">
              <div className="flex items-center rounded border border-border/80 bg-background/40">
                <input
                  type="number"
                  min={0}
                  max={maxTurn}
                  value={selectedTurn}
                  onChange={(e) =>
                    setSelectedTurn(
                      Math.max(
                        0,
                        Math.min(maxTurn, Number(e.target.value) || 0)
                      )
                    )
                  }
                  className="h-6 w-12 border-0 bg-transparent px-1.5 py-0 text-[10px] text-foreground outline-none"
                  title="Turn"
                />
                <div className="flex flex-col border-l border-border/70">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setSelectedTurn((t) => Math.min(maxTurn, t + 1))
                    }
                    className="h-3.5 w-4 rounded-none px-1 py-0 text-muted-foreground"
                    disabled={selectedTurn >= maxTurn}
                    title="Next turn"
                  >
                    <ChevronUpIcon className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      setSelectedTurn((t) => Math.max(0, t - 1))
                    }
                    className="h-3.5 w-4 rounded-none border-t border-border/70 px-1 py-0 text-muted-foreground"
                    disabled={selectedTurn <= 0}
                    title="Previous turn"
                  >
                    <ChevronDownIcon className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 w-6 px-0"
                onClick={handleRefreshVisualization}
                title="Refresh PCA/clusters from current data."
              >
                <RefreshCwIcon className="h-3 w-3" />
              </Button>
              {vizRefreshedAt ? (
                <span className="rounded border border-border/70 bg-background/30 px-1.5 py-0 text-[9px] text-muted-foreground">
                  refreshed {vizRefreshedAt}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        <HelpInfo
          tone="content"
          title="Visualization Panel"
          body="Main plotting surface. Toggle 3D, 2D, Info, and Stat Modifiers views. Header badges show top-K reachable entries for the current space."
        />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-sky-400/50 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100">
          Reachability
        </span>
        <span className="rounded border border-border bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">
          Algo: <span className="font-semibold text-foreground">{effectiveAlgorithm}</span>
        </span>
        <span className="rounded border border-border bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">
          K: <span className="font-semibold text-foreground">{nearestRows.length}</span>
        </span>
        {nearestRows.length > 0
          ? nearestRows.slice(0, 8).map((row) => {
              const { Icon, className } = getTypeBadgeMeta(row.type);
              return (
                <span
                  key={`header-reach-${row.type}-${row.id}`}
                  className={`inline-flex max-w-[240px] items-center gap-1 rounded border px-2 py-0.5 text-[10px] ${className}`}
                  title={`${row.name} (${row.type}/${row.branch}) score=${row.score.toFixed(3)}`}
                >
                  <Icon className="size-3 shrink-0" />
                  <span
                    className={`rounded border px-1 py-[1px] uppercase ${getBranchBadgeClass(row.branch)}`}
                  >
                    {row.branch}
                  </span>
                  <span className="truncate">{row.name}</span>
                  <span className="font-mono text-[9px] opacity-80">
                    {row.score.toFixed(2)}
                  </span>
                </span>
              );
            })
          : null}
      </div>
    </div>
  );
}
