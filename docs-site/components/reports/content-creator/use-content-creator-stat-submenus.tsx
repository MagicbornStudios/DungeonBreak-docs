"use client";

import { useCallback } from "react";
import { TreeStatAttachDetachSubmenus } from "@/components/reports/content-creator/tree-stat-attach-detach-submenus";
import {
  getDirectAttachedStatIdsForModel,
  type RuntimeModelSchemaRow,
} from "@/components/reports/content-creator/stat-impact-utils";

export function useContentCreatorStatSubmenus(params: {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  statModelIds: string[];
  statColorByModelId: Map<string, string>;
  onAttachStatModelToModel: (modelId: string, statModelId: string) => void;
  onDetachStatFromModelWithImpact: (modelId: string, oldStatId: string) => void;
}) {
  const {
    runtimeModelSchemas,
    statModelIds,
    statColorByModelId,
    onAttachStatModelToModel,
    onDetachStatFromModelWithImpact,
  } = params;

  return useCallback(
    (targetModelId: string, keyPrefix: string) => {
      const directStatIds = getDirectAttachedStatIdsForModel(runtimeModelSchemas, targetModelId);
      return (
        <TreeStatAttachDetachSubmenus
          targetModelId={targetModelId}
          keyPrefix={keyPrefix}
          statModelIds={statModelIds}
          directStatIds={directStatIds}
          statColorByModelId={statColorByModelId}
          onAttachStatModelToModel={onAttachStatModelToModel}
          onDetachStatFromModelWithImpact={onDetachStatFromModelWithImpact}
        />
      );
    },
    [
      onAttachStatModelToModel,
      onDetachStatFromModelWithImpact,
      runtimeModelSchemas,
      statColorByModelId,
      statModelIds,
    ],
  );
}
