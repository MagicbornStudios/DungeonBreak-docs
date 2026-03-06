import type { ReactNode } from "react";
import { IconChevronDown as ChevronDownIcon, IconChevronRight as ChevronRightIcon } from "@tabler/icons-react";
import { hashToUnit, modelSurfaceHue } from "@/lib/space-explorer-shared";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { ModelInstanceBinding, PackScopeTreeNode } from "@/components/reports/space-explorer/config";

type PackScopeTreeProps = {
  nodes: PackScopeTreeNode[];
  tone: "stats" | "models";
  expandedPackTreeModelIds: Record<string, boolean>;
  selectedScopeTreeNodeId: string;
  hiddenModelIds: string[];
  activeModelInstanceId: string | null;
  modelHueById: Map<string, number>;
  statsRootHueByModelId: Map<string, number>;
  modelSectionRootById: Map<string, string>;
  togglePackTreeModel: (modelId: string) => void;
  setScopeRootModelId: (modelId: string | null) => void;
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  selectCanonicalAssetInPackScope: (asset: ModelInstanceBinding) => void;
  setHiddenModelIds: (updater: (prev: string[]) => string[]) => void;
};

function renderNodes({
  nodes,
  tone,
  expandedPackTreeModelIds,
  selectedScopeTreeNodeId,
  hiddenModelIds,
  activeModelInstanceId,
  modelHueById,
  statsRootHueByModelId,
  modelSectionRootById,
  togglePackTreeModel,
  setScopeRootModelId,
  setActiveModelSelection,
  selectCanonicalAssetInPackScope,
  setHiddenModelIds,
}: PackScopeTreeProps): ReactNode {
  return nodes.map((node) => {
    const expanded = expandedPackTreeModelIds[node.modelId] ?? node.depth <= 2;
    const selected = selectedScopeTreeNodeId === node.id;
    const hasChildren = node.children.length > 0;
    const hasAssets = node.canonicalAssets.length > 0;
    const hidden = hiddenModelIds.includes(node.modelId);
    const sectionRootModelId = modelSectionRootById.get(node.modelId) ?? node.modelId;
    const parentHue =
      tone === "stats"
        ? (statsRootHueByModelId.get(sectionRootModelId) ??
          (190 + Math.round(hashToUnit(sectionRootModelId) * 130)))
        : (modelHueById.get(sectionRootModelId) ?? modelSurfaceHue(sectionRootModelId));
    const nodeHue = modelHueById.get(node.modelId) ?? modelSurfaceHue(node.modelId);
    const rowBorder = `hsla(${parentHue}, 85%, 62%, ${selected ? 0.58 : 0.34})`;
    const rowBg = `hsla(${parentHue}, 85%, 45%, ${selected ? 0.26 : Math.min(0.2, 0.08 + node.depth * 0.03)})`;
    const textColor = `hsl(${parentHue}, 92%, 85%)`;
    const nodeChipColor = `hsl(${nodeHue}, 84%, 58%)`;

    return (
      <div key={node.id} className="space-y-1">
        <div
          className="flex items-center gap-1 rounded border px-1.5 py-1 text-[11px]"
          style={{
            marginLeft: `${(node.depth - 1) * 10}px`,
            borderColor: rowBorder,
            backgroundColor: rowBg,
          }}
        >
          {(hasChildren || hasAssets) && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="size-4 text-muted-foreground"
              onClick={() => togglePackTreeModel(node.modelId)}
              aria-label={`Toggle ${node.modelId}`}
            >
              {expanded ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`h-auto min-w-0 flex-1 justify-start truncate px-0 py-0 text-left ${hidden ? "text-muted-foreground line-through" : ""}`}
            style={hidden ? undefined : { color: textColor }}
            onClick={() => {
              setScopeRootModelId(node.modelId);
              setActiveModelSelection(node.modelId, null);
            }}
            title={`Scope to ${node.modelId} and descendants`}
          >
            <span className="inline-flex items-center gap-1">
              <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: nodeChipColor }} aria-hidden="true" />
              <span className="truncate">{node.label}</span>
            </span>
          </Button>
          <Switch
            checked={!hidden}
            onCheckedChange={(checked) => {
              setHiddenModelIds((prev) => {
                if (checked) return prev.filter((id) => id !== node.modelId);
                if (prev.includes(node.modelId)) return prev;
                return [...prev, node.modelId];
              });
            }}
            size="sm"
            aria-label={`Toggle model visibility ${node.modelId}`}
          />
        </div>
        {expanded && hasAssets
          ? node.canonicalAssets.map((asset) => {
              const assetHue = Math.round(hashToUnit(asset.id) * 360);
              const isSelectedAsset = activeModelInstanceId === asset.id;
              const assetParentHue = modelSurfaceHue(sectionRootModelId);
              return (
                <div
                  key={`scope-asset-${asset.id}`}
                  className="rounded border px-2 py-1 text-[11px]"
                  style={{
                    marginLeft: `${(node.depth - 1) * 10 + 26}px`,
                    borderColor: `hsla(${assetHue}, 85%, 60%, ${isSelectedAsset ? 0.72 : 0.4})`,
                    backgroundColor: `hsla(${assetParentHue}, 75%, 30%, ${isSelectedAsset ? 0.28 : 0.16})`,
                    color: `hsl(${assetHue}, 94%, 86%)`,
                  }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto w-full items-center justify-start gap-1 px-0 py-0 text-left"
                    onClick={() => {
                      selectCanonicalAssetInPackScope(asset);
                    }}
                    title={`Scope to ${node.modelId} from canonical asset ${asset.name}`}
                  >
                    <span
                      className="inline-block size-1.5 rounded-full"
                      style={{ backgroundColor: `hsl(${assetHue}, 86%, 60%)` }}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] uppercase tracking-wide text-foreground/80">canonical</span>
                    <span className="truncate">{asset.name}</span>
                  </Button>
                </div>
              );
            })
          : null}
        {expanded && hasChildren
          ? renderNodes({
              nodes: node.children,
              tone,
              expandedPackTreeModelIds,
              selectedScopeTreeNodeId,
              hiddenModelIds,
              activeModelInstanceId,
              modelHueById,
              statsRootHueByModelId,
              modelSectionRootById,
              togglePackTreeModel,
              setScopeRootModelId,
              setActiveModelSelection,
              selectCanonicalAssetInPackScope,
              setHiddenModelIds,
            })
          : null}
      </div>
    );
  });
}

export function PackScopeTree(props: PackScopeTreeProps) {
  return <>{renderNodes(props)}</>;
}
