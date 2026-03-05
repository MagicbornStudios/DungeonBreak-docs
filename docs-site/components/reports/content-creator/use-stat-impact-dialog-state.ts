"use client";

import { useState } from "react";

export type PendingStatImpactAction = {
  oldStatId: string;
  impactedModelIds: string[];
  impactedCanonicalCount: number;
  deleteStatModel: boolean;
  scopeModelId?: string;
  title: string;
  description: string;
};

export function useStatImpactDialogState(statModelIds: string[]) {
  const [pendingStatImpactAction, setPendingStatImpactAction] = useState<PendingStatImpactAction | null>(null);
  const [pendingStatImpactChoice, setPendingStatImpactChoice] = useState<"delete" | "replace">("delete");
  const [pendingStatImpactReplacementId, setPendingStatImpactReplacementId] = useState("");

  const openStatImpactDialog = ({
    oldStatId,
    impactedModelIds,
    impactedCanonicalCount,
    deleteStatModel,
    scopeModelId,
    title,
    description,
  }: PendingStatImpactAction) => {
    const defaultReplacement = statModelIds.find((statModelId) => statModelId !== oldStatId) ?? "";
    setPendingStatImpactChoice("delete");
    setPendingStatImpactReplacementId(defaultReplacement);
    setPendingStatImpactAction({
      oldStatId,
      impactedModelIds,
      impactedCanonicalCount,
      deleteStatModel,
      scopeModelId,
      title,
      description,
    });
  };

  const closeStatImpactDialog = () => setPendingStatImpactAction(null);

  return {
    pendingStatImpactAction,
    pendingStatImpactChoice,
    pendingStatImpactReplacementId,
    openStatImpactDialog,
    closeStatImpactDialog,
    setPendingStatImpactChoice,
    setPendingStatImpactReplacementId,
  };
}
