import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpInfo } from "@/components/reports/space-explorer/aux-controls";
import {
  NO_MODEL_SELECTED,
  type ModelInstanceBinding,
  type PackScopeTreeNode,
} from "@/components/reports/space-explorer/config";
import { PackScopeTree } from "@/components/reports/space-explorer/pack-scope-tree";

type ContentPackPanelProps = {
  loadedPackIdentity: { packId?: string } | null;
  setScopeRootModelId: (modelId: string | null) => void;
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  packTreeView: "models" | "stats";
  setPackTreeView: (next: "models" | "stats") => void;
  selectedScopeTreeNodeId: string;
  packTreeRoots: PackScopeTreeNode[];
  groupedPackTreeRoots: { stats: PackScopeTreeNode[]; models: PackScopeTreeNode[] };
  expandedPackTreeModelIds: Record<string, boolean>;
  hiddenModelIds: string[];
  activeModelInstanceId: string | null;
  modelHueById: Map<string, number>;
  statsRootHueByModelId: Map<string, number>;
  modelSectionRootById: Map<string, string>;
  togglePackTreeModel: (modelId: string) => void;
  selectCanonicalAssetInPackScope: (asset: ModelInstanceBinding) => void;
  setHiddenModelIds: Dispatch<SetStateAction<string[]>>;
};

export function ContentPackPanel({
  loadedPackIdentity,
  setScopeRootModelId,
  setActiveModelSelection,
  packTreeView,
  setPackTreeView,
  selectedScopeTreeNodeId,
  packTreeRoots,
  groupedPackTreeRoots,
  expandedPackTreeModelIds,
  hiddenModelIds,
  activeModelInstanceId,
  modelHueById,
  statsRootHueByModelId,
  modelSectionRootById,
  togglePackTreeModel,
  selectCanonicalAssetInPackScope,
  setHiddenModelIds,
}: ContentPackPanelProps) {
  return (
    <TabsContent
      value="content-pack"
      className="mt-0 flex min-h-[640px] flex-col space-y-3"
    >
      <div
        id="panel-control-header-pack"
        data-ui-id="panel-control-header-pack"
        className="flex items-center gap-2"
      >
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            {loadedPackIdentity?.packId ?? "Content Pack View"}
          </h2>
        </div>
        <HelpInfo
          tone="header"
          title="Content Pack View"
          body="Pack-level controls. Use layers to drive the shared visualization panel."
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded border border-border bg-background/50 p-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Object Tree Scope
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => {
              setScopeRootModelId(null);
              setActiveModelSelection(NO_MODEL_SELECTED, null);
            }}
          >
            Clear Scope
          </Button>
        </div>
        <Tabs
          value={packTreeView}
          onValueChange={(value) =>
            setPackTreeView(value === "stats" ? "stats" : "models")
          }
          className="mb-2"
        >
          <TabsList className="grid h-7 w-full grid-cols-2">
            <TabsTrigger value="models" className="text-[10px]">
              Models
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-[10px]">
              Stats
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
          <div
            className={`rounded border px-2 py-1 text-[11px] ${
              selectedScopeTreeNodeId === "pack-root"
                ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                : "border-border/80 text-foreground"
            }`}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start px-0 py-0 text-left"
              onClick={() => {
                setScopeRootModelId(null);
                setActiveModelSelection(NO_MODEL_SELECTED, null);
              }}
            >
              Pack Root
            </Button>
          </div>
          {packTreeRoots.length > 0 ? (
            packTreeView === "stats" ? (
              <div className="rounded border border-cyan-400/30 bg-cyan-500/5 p-1">
                {groupedPackTreeRoots.stats.length > 0 ? (
                  <PackScopeTree
                    nodes={groupedPackTreeRoots.stats}
                    tone="stats"
                    expandedPackTreeModelIds={expandedPackTreeModelIds}
                    selectedScopeTreeNodeId={selectedScopeTreeNodeId}
                    hiddenModelIds={hiddenModelIds}
                    activeModelInstanceId={activeModelInstanceId}
                    modelHueById={modelHueById}
                    statsRootHueByModelId={statsRootHueByModelId}
                    modelSectionRootById={modelSectionRootById}
                    togglePackTreeModel={togglePackTreeModel}
                    setScopeRootModelId={setScopeRootModelId}
                    setActiveModelSelection={setActiveModelSelection}
                    selectCanonicalAssetInPackScope={selectCanonicalAssetInPackScope}
                    setHiddenModelIds={setHiddenModelIds}
                  />
                ) : (
                  <p className="px-1 py-1 text-[11px] text-muted-foreground">
                    No stat models.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded border border-indigo-400/30 bg-indigo-500/5 p-1">
                {groupedPackTreeRoots.models.length > 0 ? (
                  <PackScopeTree
                    nodes={groupedPackTreeRoots.models}
                    tone="models"
                    expandedPackTreeModelIds={expandedPackTreeModelIds}
                    selectedScopeTreeNodeId={selectedScopeTreeNodeId}
                    hiddenModelIds={hiddenModelIds}
                    activeModelInstanceId={activeModelInstanceId}
                    modelHueById={modelHueById}
                    statsRootHueByModelId={statsRootHueByModelId}
                    modelSectionRootById={modelSectionRootById}
                    togglePackTreeModel={togglePackTreeModel}
                    setScopeRootModelId={setScopeRootModelId}
                    setActiveModelSelection={setActiveModelSelection}
                    selectCanonicalAssetInPackScope={selectCanonicalAssetInPackScope}
                    setHiddenModelIds={setHiddenModelIds}
                  />
                ) : (
                  <p className="px-1 py-1 text-[11px] text-muted-foreground">
                    No models.
                  </p>
                )}
              </div>
            )
          ) : (
            <p className="text-[11px] text-muted-foreground">
              No models in loaded pack.
            </p>
          )}
        </div>
      </div>
    </TabsContent>
  );
}
