"use client";

import { useCallback } from "react";
import { IconPlus as PlusIcon, IconTrash as Trash2Icon } from "@tabler/icons-react";
import { ContextMenuItem } from "@/components/ui/context-menu";
import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";
import {
  findImpactedModelsForStat,
  type RuntimeModelSchemaRow,
} from "@/components/reports/content-creator/stat-impact-utils";

type ModelInstanceBinding = {
  modelId: string;
  canonical: boolean;
};

type UseContentCreatorMenuActionsParams = {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  createSchemaViaTree: (
    kind: "model" | "stat",
    templateModelId?: string,
    suggestedModelId?: string,
  ) => void;
  onDeleteModelSchema: (modelId: string) => void;
  onOpenStatImpactDialog: (payload: {
    oldStatId: string;
    impactedModelIds: string[];
    impactedCanonicalCount: number;
    deleteStatModel: boolean;
    scopeModelId?: string;
    title: string;
    description: string;
  }) => void;
};

export function useContentCreatorMenuActions({
  runtimeModelSchemas,
  modelInstances,
  createSchemaViaTree,
  onDeleteModelSchema,
  onOpenStatImpactDialog,
}: UseContentCreatorMenuActionsParams) {
  const renderGroupContextMenuItems = useCallback((node: ContentCreatorTreeNode) => {
    if (node.nodeType !== "group") return null;
    if (node.id === "group:stats") {
      return (
        <ContextMenuItem onClick={() => createSchemaViaTree("stat")}>
          <span className="inline-flex items-center gap-2">
            <PlusIcon className="h-3.5 w-3.5" />
            Create Stat Set
          </span>
        </ContextMenuItem>
      );
    }
    if (node.id === "group:models") {
      return (
        <ContextMenuItem onClick={() => createSchemaViaTree("model")}>
          <span className="inline-flex items-center gap-2">
            <PlusIcon className="h-3.5 w-3.5" />
            Create Model
          </span>
        </ContextMenuItem>
      );
    }
    if (node.id === "group:canonical") {
      return <ContextMenuItem disabled>Canonical assets are managed in the Info Panel.</ContextMenuItem>;
    }
    return null;
  }, [createSchemaViaTree]);

  const renderStatsModelDeleteItem = useCallback((modelId: string) => (
    <ContextMenuItem
      className="text-red-300 focus:text-red-200"
      onClick={() => {
        const impactedModelIds = findImpactedModelsForStat(runtimeModelSchemas, modelId);
        const impactedCanonicalCount = modelInstances.filter(
          (instance) => instance.canonical && impactedModelIds.includes(instance.modelId),
        ).length;
        onOpenStatImpactDialog({
          oldStatId: modelId,
          impactedModelIds,
          impactedCanonicalCount,
          deleteStatModel: true,
          title: `Delete ${modelId}`,
          description: `Delete stat set ${modelId}. Impacted models: ${impactedModelIds.length}. Canonical assets: ${impactedCanonicalCount}.`,
        });
      }}
    >
      <span className="inline-flex items-center gap-2">
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete
      </span>
    </ContextMenuItem>
  ), [modelInstances, onOpenStatImpactDialog, runtimeModelSchemas]);

  const renderModelDeleteItem = useCallback((modelId: string) => (
    <ContextMenuItem
      className="text-red-300 focus:text-red-200"
      onClick={() => {
        const linkedCanonicalCount = modelInstances.filter(
          (instance) => instance.modelId === modelId && instance.canonical,
        ).length;
        const warning = [
          `Delete model '${modelId}'?`,
          linkedCanonicalCount > 0
            ? `This will also delete ${linkedCanonicalCount} canonical object(s) that would be serialized for this model.`
            : "No canonical objects are linked to this model.",
          "Deleting models can orphan related content. Updating the model is usually safer.",
        ].join("\n");
        if (!window.confirm(warning)) return;
        onDeleteModelSchema(modelId);
      }}
    >
      <span className="inline-flex items-center gap-2">
        <Trash2Icon className="h-3.5 w-3.5" />
        Delete
      </span>
    </ContextMenuItem>
  ), [modelInstances, onDeleteModelSchema]);

  return {
    renderGroupContextMenuItems,
    renderStatsModelDeleteItem,
    renderModelDeleteItem,
  };
}
