"use client";

import { IconPlus as PlusIcon } from "@tabler/icons-react";
import type { ReactNode } from "react";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";

type TreeContextMenuContentProps = {
  node: ContentCreatorTreeNode;
  namespaceModelId: string | null;
  namespaceActionModelId: string | null;
  isCanonicalModelNode: boolean;
  isCanonicalNamespaceModelNode: boolean;
  isStatsNamespaceNode: boolean;
  isStatsModelNode: boolean;
  isModelsNamespaceNode: boolean;
  isModelsNamespaceModelNode: boolean;
  isModelsModelNode: boolean;
  renderGroupItems: (node: ContentCreatorTreeNode) => ReactNode;
  renderStatAttachDetachSubmenus: (targetModelId: string, keyPrefix: string) => ReactNode;
  renderStatsModelDeleteItem: (modelId: string) => ReactNode;
  renderModelDeleteItem: (modelId: string) => ReactNode;
  suggestDerivedStatId: (baseModelId: string) => string;
  suggestDerivedModelId: (baseModelId: string) => string;
  formatModelIdForUi: (modelId: string) => string;
  createSchemaViaTree: (
    kind: "stat" | "model",
    templateModelId?: string,
    suggestedModelId?: string,
  ) => void;
  createCanonicalAsset: (modelId: string, nodeId: string) => void;
};

export function TreeContextMenuContent({
  node,
  namespaceModelId,
  namespaceActionModelId,
  isCanonicalModelNode,
  isCanonicalNamespaceModelNode,
  isStatsNamespaceNode,
  isStatsModelNode,
  isModelsNamespaceNode,
  isModelsNamespaceModelNode,
  isModelsModelNode,
  renderGroupItems,
  renderStatAttachDetachSubmenus,
  renderStatsModelDeleteItem,
  renderModelDeleteItem,
  suggestDerivedStatId,
  suggestDerivedModelId,
  formatModelIdForUi,
  createSchemaViaTree,
  createCanonicalAsset,
}: TreeContextMenuContentProps) {
  return (
    <ContextMenuContent className="z-[230]">
      {node.nodeType === "group" ? renderGroupItems(node) : null}
      {isCanonicalModelNode && node.modelId ? (
        <ContextMenuItem onClick={() => createCanonicalAsset(node.modelId ?? "", node.id)}>
          <span className="inline-flex items-center gap-2">
            <PlusIcon className="h-3.5 w-3.5" />
            Create Canonical Asset
          </span>
        </ContextMenuItem>
      ) : null}
      {isCanonicalNamespaceModelNode && namespaceActionModelId ? (
        <ContextMenuItem onClick={() => createCanonicalAsset(namespaceActionModelId, node.id)}>
          <span className="inline-flex items-center gap-2">
            <PlusIcon className="h-3.5 w-3.5" />
            Create Asset
          </span>
        </ContextMenuItem>
      ) : null}
      {isStatsNamespaceNode && namespaceModelId ? (
        <>
          <ContextMenuItem
            onClick={() => createSchemaViaTree("stat", namespaceModelId, suggestDerivedStatId(namespaceModelId))}
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-3.5 w-3.5" />
              Create Sub Stat Set
            </span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          {renderStatsModelDeleteItem(namespaceModelId)}
        </>
      ) : null}
      {isStatsModelNode ? (
        <>
          <ContextMenuItem
            onClick={() => createSchemaViaTree("stat", node.modelId, suggestDerivedStatId(node.modelId ?? ""))}
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-3.5 w-3.5" />
              Create Derived Stat Set
            </span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          {renderStatsModelDeleteItem(node.modelId!)}
        </>
      ) : null}
      {isModelsNamespaceNode && namespaceModelId ? (
        <>
          <ContextMenuItem
            onClick={() => createSchemaViaTree("model", namespaceModelId, suggestDerivedModelId(namespaceModelId))}
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-3.5 w-3.5" />
              {`Create new ${formatModelIdForUi(namespaceModelId)} type`}
            </span>
          </ContextMenuItem>
          {namespaceActionModelId ? (
            <>
              <ContextMenuSeparator />
              {renderStatAttachDetachSubmenus(namespaceActionModelId, "models-ns")}
            </>
          ) : null}
          {isModelsNamespaceModelNode ? (
            <>
              <ContextMenuSeparator />
              {renderModelDeleteItem(namespaceActionModelId ?? namespaceModelId)}
            </>
          ) : null}
        </>
      ) : null}
      {isModelsModelNode ? (
        <>
          <ContextMenuItem
            onClick={() => createSchemaViaTree("model", node.modelId, suggestDerivedModelId(node.modelId ?? ""))}
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-3.5 w-3.5" />
              {`Create new ${formatModelIdForUi(node.modelId ?? "model")} type`}
            </span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          {renderStatAttachDetachSubmenus(node.modelId!, "models-node")}
          <ContextMenuSeparator />
          {renderModelDeleteItem(node.modelId!)}
        </>
      ) : null}
      {node.nodeType === "instance" && node.instanceId && node.canonical ? (
        <ContextMenuItem disabled>Canonical assets are edited in the Info Panel.</ContextMenuItem>
      ) : null}
    </ContextMenuContent>
  );
}
