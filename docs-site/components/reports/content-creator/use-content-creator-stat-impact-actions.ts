"use client";

import { useCallback } from "react";
import {
  applyStatRemovalStrategy as computeStatRemovalStrategy,
  findImpactedModelsForStat,
  type RuntimeModelSchemaRow,
} from "@/components/reports/content-creator/stat-impact-utils";
import type { PendingStatImpactAction } from "@/components/reports/content-creator/use-stat-impact-dialog-state";

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

type StatImpactChoice = "delete" | "replace";

export function useContentCreatorStatImpactActions(params: {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  statModelIds: string[];
  pendingStatImpactAction: PendingStatImpactAction | null;
  pendingStatImpactChoice: StatImpactChoice;
  pendingStatImpactReplacementId: string;
  normalizeModelId: (value: string) => string;
  onReplaceModelSchemas: (next: RuntimeModelSchemaRow[]) => void;
  onReplaceCanonicalAssets: (next: ModelInstanceBinding[]) => void;
  onOpenStatImpactDialog: (next: PendingStatImpactAction) => void;
  onCloseStatImpactDialog: () => void;
}) {
  const {
    runtimeModelSchemas,
    modelInstances,
    statModelIds,
    pendingStatImpactAction,
    pendingStatImpactChoice,
    pendingStatImpactReplacementId,
    normalizeModelId,
    onReplaceModelSchemas,
    onReplaceCanonicalAssets,
    onOpenStatImpactDialog,
    onCloseStatImpactDialog,
  } = params;

  const applyStatRemovalStrategy = useCallback(
    (
      oldStatId: string,
      impactedModelIds: string[],
      replacementStatId: string | null,
      deleteImpactedCanonical: boolean,
      deleteStatModel: boolean,
      scopeModelId?: string,
    ) => {
      const { nextModels, nextCanonicalAssets } = computeStatRemovalStrategy({
        runtimeModelSchemas,
        modelInstances,
        oldStatId,
        impactedModelIds,
        replacementStatId,
        deleteImpactedCanonical,
        deleteStatModel,
        scopeModelId,
      });
      onReplaceModelSchemas(nextModels);
      if (deleteImpactedCanonical) onReplaceCanonicalAssets(nextCanonicalAssets);
    },
    [modelInstances, onReplaceCanonicalAssets, onReplaceModelSchemas, runtimeModelSchemas],
  );

  const handleDetachStatFromModelWithImpact = useCallback(
    (modelId: string, oldStatId: string) => {
      const impactedModelIds = findImpactedModelsForStat(runtimeModelSchemas, oldStatId, modelId);
      const impactedCanonicalCount = modelInstances.filter(
        (instance) => instance.canonical && impactedModelIds.includes(instance.modelId),
      ).length;
      if (impactedCanonicalCount === 0) {
        applyStatRemovalStrategy(oldStatId, impactedModelIds, null, false, false, modelId);
        return;
      }
      onOpenStatImpactDialog({
        oldStatId,
        impactedModelIds,
        impactedCanonicalCount,
        deleteStatModel: false,
        scopeModelId: modelId,
        title: `Detach ${oldStatId}`,
        description: `Detach from ${modelId}. Impacted models: ${impactedModelIds.length}. Canonical assets: ${impactedCanonicalCount}.`,
      });
    },
    [modelInstances, onOpenStatImpactDialog, runtimeModelSchemas],
  );

  const submitPendingStatImpactAction = useCallback(() => {
    if (!pendingStatImpactAction) return;
    if (pendingStatImpactChoice === "replace") {
      const normalized = normalizeModelId(pendingStatImpactReplacementId);
      if (
        !normalized ||
        !statModelIds.includes(normalized) ||
        normalized === pendingStatImpactAction.oldStatId
      ) {
        return;
      }
      applyStatRemovalStrategy(
        pendingStatImpactAction.oldStatId,
        pendingStatImpactAction.impactedModelIds,
        normalized,
        false,
        pendingStatImpactAction.deleteStatModel,
        pendingStatImpactAction.scopeModelId,
      );
      onCloseStatImpactDialog();
      return;
    }
    applyStatRemovalStrategy(
      pendingStatImpactAction.oldStatId,
      pendingStatImpactAction.impactedModelIds,
      null,
      true,
      pendingStatImpactAction.deleteStatModel,
      pendingStatImpactAction.scopeModelId,
    );
    onCloseStatImpactDialog();
  }, [
    applyStatRemovalStrategy,
    normalizeModelId,
    onCloseStatImpactDialog,
    pendingStatImpactAction,
    pendingStatImpactChoice,
    pendingStatImpactReplacementId,
    statModelIds,
  ]);

  return {
    handleDetachStatFromModelWithImpact,
    submitPendingStatImpactAction,
  };
}
