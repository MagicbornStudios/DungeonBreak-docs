"use client";

import { useMemo } from "react";

type RuntimeModelSchemaRow = {
  modelId: string;
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

export function useContentCreatorCounts(params: {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  panelModelId?: string | null;
}) {
  const { runtimeModelSchemas, modelInstances, panelModelId } = params;

  const canonicalAssetCount = useMemo(
    () => modelInstances.filter((instance) => instance.canonical).length,
    [modelInstances],
  );

  const modelDefinitionCount = useMemo(
    () => runtimeModelSchemas.filter((row) => !row.modelId.endsWith("stats")).length,
    [runtimeModelSchemas],
  );

  const linkedCanonicalCount = useMemo(() => {
    if (!panelModelId) return 0;
    return modelInstances.filter((instance) => instance.canonical && instance.modelId === panelModelId).length;
  }, [modelInstances, panelModelId]);

  return {
    canonicalAssetCount,
    modelDefinitionCount,
    linkedCanonicalCount,
  };
}

