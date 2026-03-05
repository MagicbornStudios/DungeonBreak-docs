"use client";

import { ContextMenu, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { TreeContextMenuContent } from "@/components/reports/content-creator/tree-context-menu-content";
import { TreeNodeRow } from "@/components/reports/content-creator/tree-node-row";
import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";

type TreeSectionTone = "none" | "stats" | "models" | "canonical";

type ContentCreatorTreeProps = {
  nodes: ContentCreatorTreeNode[];
  runtimeModelSchemas: Array<{ modelId: string }>;
  attachedStatModelIdsByModelId: Map<string, string[]>;
  statColorByModelId: Map<string, string>;
  activeModelInstanceId: string | null;
  selectedTreeNodeId: string;
  isExpanded: (nodeId: string) => boolean;
  toggleTreeNode: (nodeId: string) => void;
  setSelectedTreeNodeId: (nodeId: string) => void;
  setActiveSelection: (modelId: string, instanceId: string | null) => void;
  renderGroupItems: (node: ContentCreatorTreeNode) => React.ReactNode;
  renderStatAttachDetachSubmenus: (targetModelId: string, keyPrefix: string) => React.ReactNode;
  renderStatsModelDeleteItem: (modelId: string) => React.ReactNode;
  renderModelDeleteItem: (modelId: string) => React.ReactNode;
  suggestDerivedStatId: (baseModelId: string) => string;
  suggestDerivedModelId: (baseModelId: string) => string;
  formatModelIdForUi: (modelId: string) => string;
  createSchemaViaTree: (
    kind: "stat" | "model",
    templateModelId?: string,
    suggestedModelId?: string,
  ) => void;
  onCreateCanonicalAsset: (modelId: string, nodeId: string) => void;
};

export function ContentCreatorTree({
  nodes,
  runtimeModelSchemas,
  attachedStatModelIdsByModelId,
  statColorByModelId,
  activeModelInstanceId,
  selectedTreeNodeId,
  isExpanded,
  toggleTreeNode,
  setSelectedTreeNodeId,
  setActiveSelection,
  renderGroupItems,
  renderStatAttachDetachSubmenus,
  renderStatsModelDeleteItem,
  renderModelDeleteItem,
  suggestDerivedStatId,
  suggestDerivedModelId,
  formatModelIdForUi,
  createSchemaViaTree,
  onCreateCanonicalAsset,
}: ContentCreatorTreeProps) {
  const resolveNamespaceActionModelId = (namespaceId: string | null): string | null => {
    if (!namespaceId) return null;
    const ids = runtimeModelSchemas.map((row) => row.modelId);
    if (ids.includes(namespaceId)) return namespaceId;
    const baseCandidate = `${namespaceId}.base`;
    if (ids.includes(baseCandidate)) return baseCandidate;
    const descendants = ids
      .filter((modelId) => modelId.startsWith(`${namespaceId}.`))
      .sort((a, b) => {
        const depthDiff = a.split(".").length - b.split(".").length;
        if (depthDiff !== 0) return depthDiff;
        return a.localeCompare(b);
      });
    if (descendants.length === 0) return null;
    return descendants.find((modelId) => modelId.endsWith(".base")) ?? descendants[0] ?? null;
  };

  const toneTextClasses: Record<TreeSectionTone, string> = {
    none: "text-muted-foreground hover:bg-muted/30",
    stats: "text-cyan-100 hover:bg-cyan-500/10",
    models: "text-indigo-100 hover:bg-indigo-500/10",
    canonical: "text-amber-100 hover:bg-amber-500/10",
  };
  const toneDepthRowClasses: Record<TreeSectionTone, string[]> = {
    none: ["", "", "", "", "", ""],
    stats: [
      "bg-cyan-500/5",
      "bg-cyan-500/10",
      "bg-cyan-500/15",
      "bg-cyan-500/20",
      "bg-cyan-500/25",
      "bg-cyan-500/30",
    ],
    models: [
      "bg-indigo-500/5",
      "bg-indigo-500/10",
      "bg-indigo-500/15",
      "bg-indigo-500/20",
      "bg-indigo-500/25",
      "bg-indigo-500/30",
    ],
    canonical: [
      "bg-amber-500/5",
      "bg-amber-500/10",
      "bg-amber-500/15",
      "bg-amber-500/20",
      "bg-amber-500/25",
      "bg-amber-500/30",
    ],
  };
  const toneExpandedBorderClasses: Record<TreeSectionTone, string> = {
    none: "",
    stats: "border-l border-cyan-400/30",
    models: "border-l border-indigo-400/30",
    canonical: "border-l border-amber-400/30",
  };

  const renderNodes = (
    currentNodes: ContentCreatorTreeNode[],
    depth = 0,
    sectionTone: TreeSectionTone = "none",
  ): React.ReactNode =>
    currentNodes.map((node) => {
      const hasChildren = !!node.children?.length;
      const expanded = hasChildren ? isExpanded(node.id) : false;
      const isCanonicalModelNode = node.nodeType === "model" && node.id.startsWith("canonical-model:");
      const isStatsModelNode = node.nodeType === "model" && !!node.modelId && node.modelId.endsWith("stats");
      const isModelsModelNode = node.nodeType === "model" && !!node.modelId && !node.modelId.endsWith("stats") && !isCanonicalModelNode;
      const isStatsNamespaceNode = node.nodeType === "model-group" && node.id.startsWith("stats:");
      const isModelsNamespaceNode = node.nodeType === "model-group" && node.id.startsWith("models:");
      const namespaceModelId =
        node.nodeType === "model-group" && node.id.includes(":")
          ? node.id.slice(node.id.indexOf(":") + 1)
          : null;
      const namespaceActionModelId = resolveNamespaceActionModelId(namespaceModelId);
      const isModelsNamespaceModelNode =
        node.nodeType === "model-group" &&
        node.id.startsWith("models:") &&
        !!namespaceActionModelId;
      const isCanonicalNamespaceModelNode =
        node.nodeType === "model-group" &&
        node.id.startsWith("canonical:") &&
        !!namespaceActionModelId;
      const childCount = node.children?.length ?? 0;
      const statAttachmentModelId =
        node.modelId ??
        ((isModelsNamespaceNode || isCanonicalNamespaceModelNode) && namespaceActionModelId ? namespaceActionModelId : null);
      const attachedStatIds = statAttachmentModelId ? (attachedStatModelIdsByModelId.get(statAttachmentModelId) ?? []) : [];
      const nextTone: TreeSectionTone =
        node.id === "group:stats"
          ? "stats"
          : node.id === "group:models"
            ? "models"
            : node.id === "group:canonical"
              ? "canonical"
              : sectionTone;
      const depthIndex = Math.min(depth, 5);
      const depthClass = toneDepthRowClasses[nextTone][depthIndex] ?? "";
      const expandedClass = expanded ? `${toneExpandedBorderClasses[nextTone]} ${depthClass}` : "";
      const selected =
        node.instanceId != null ? node.instanceId === activeModelInstanceId : selectedTreeNodeId === node.id;

      const row = (
        <TreeNodeRow
          node={node}
          depth={depth}
          hasChildren={hasChildren}
          expanded={expanded}
          selected={selected}
          nextTone={nextTone}
          depthClass={depthClass}
          expandedClass={expandedClass}
          childCount={childCount}
          attachedStatIds={attachedStatIds}
          isCanonicalModelNode={isCanonicalModelNode}
          isStatsModelNode={isStatsModelNode}
          statColorByModelId={statColorByModelId}
          toneTextClasses={toneTextClasses}
          onSelectNode={(selectedNode, selectedHasChildren) => {
            setSelectedTreeNodeId(selectedNode.id);
            if (
              selectedNode.nodeType === "group" ||
              selectedNode.nodeType === "model" ||
              selectedNode.nodeType === "object-group" ||
              selectedNode.nodeType === "model-group"
            ) {
              if (selectedNode.modelId) {
                setActiveSelection(selectedNode.modelId, null);
              } else if (selectedNode.nodeType === "model-group" && namespaceActionModelId) {
                setActiveSelection(namespaceActionModelId, null);
              }
              if (selectedHasChildren) toggleTreeNode(selectedNode.id);
              return;
            }
            if (selectedNode.nodeType === "instance" && selectedNode.modelId) {
              setActiveSelection(selectedNode.modelId, selectedNode.instanceId ?? null);
            }
          }}
          onToggleNode={toggleTreeNode}
        />
      );

      const wrappedRow =
        node.nodeType === "group" || node.nodeType === "model" || node.nodeType === "instance" || node.nodeType === "model-group" ? (
          <ContextMenu>
            <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
            <TreeContextMenuContent
              node={node}
              namespaceModelId={namespaceModelId}
              namespaceActionModelId={namespaceActionModelId}
              isCanonicalModelNode={isCanonicalModelNode}
              isCanonicalNamespaceModelNode={isCanonicalNamespaceModelNode}
              isStatsNamespaceNode={isStatsNamespaceNode}
              isStatsModelNode={isStatsModelNode}
              isModelsNamespaceNode={isModelsNamespaceNode}
              isModelsNamespaceModelNode={isModelsNamespaceModelNode}
              isModelsModelNode={isModelsModelNode}
              renderGroupItems={renderGroupItems}
              renderStatAttachDetachSubmenus={renderStatAttachDetachSubmenus}
              renderStatsModelDeleteItem={renderStatsModelDeleteItem}
              renderModelDeleteItem={renderModelDeleteItem}
              suggestDerivedStatId={suggestDerivedStatId}
              suggestDerivedModelId={suggestDerivedModelId}
              formatModelIdForUi={formatModelIdForUi}
              createSchemaViaTree={createSchemaViaTree}
              createCanonicalAsset={onCreateCanonicalAsset}
            />
          </ContextMenu>
        ) : (
          row
        );

      return (
        <div key={`tree-node-${node.id}`}>
          {wrappedRow}
          {hasChildren && expanded ? (
            <div className={`${toneExpandedBorderClasses[nextTone]} ${depthClass} ml-1 rounded`}>
              {renderNodes(node.children ?? [], depth + 1, nextTone)}
            </div>
          ) : null}
        </div>
      );
    });

  return <>{renderNodes(nodes)}</>;
}
