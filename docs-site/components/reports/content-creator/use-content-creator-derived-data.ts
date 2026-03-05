"use client";

import { useMemo } from "react";
import { buildContentCreatorTrees, type ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";
import {
  buildCanonicalAssetsSchemaJson,
  buildModelsSchemaJson,
  buildStatsSchemaJson,
} from "@/components/reports/content-creator/schema-json-utils";

type RuntimeFeatureSchemaRow = {
  featureId: string;
  defaultValue?: number;
};
type RuntimeModelSchemaRow = Parameters<typeof buildContentCreatorTrees>[0]["runtimeModelSchemas"][number];
type ModelInstanceBinding = Parameters<typeof buildContentCreatorTrees>[0]["modelInstances"][number];

export function useContentCreatorDerivedData(params: {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  objectSectionTab: "models" | "canonical";
  modelsNavigatorMode: "tree" | "json";
  canonicalNavigatorMode: "tree" | "json";
  formatModelIdForUi: (modelId: string) => string;
  hashToUnit: (value: string) => number;
}) {
  const {
    runtimeModelSchemas,
    runtimeFeatureSchema,
    modelInstances,
    objectSectionTab,
    modelsNavigatorMode,
    canonicalNavigatorMode,
    formatModelIdForUi,
    hashToUnit,
  } = params;

  const { modelsTreeData, canonicalTreeData } = useMemo(
    () =>
      buildContentCreatorTrees({
        runtimeModelSchemas,
        modelInstances,
        formatModelIdForUi,
      }),
    [runtimeModelSchemas, modelInstances, formatModelIdForUi],
  );

  const activeNavigatorMode = objectSectionTab === "models" ? modelsNavigatorMode : canonicalNavigatorMode;
  const activeTreeData = objectSectionTab === "models" ? modelsTreeData : canonicalTreeData;

  const featureDefaultMap = useMemo(
    () => new Map(runtimeFeatureSchema.map((row) => [row.featureId, row.defaultValue ?? 0] as const)),
    [runtimeFeatureSchema],
  );

  const modelTreeNodeById = useMemo(() => {
    const next = new Map<string, ContentCreatorTreeNode>();
    const walk = (nodes: ContentCreatorTreeNode[]) => {
      for (const node of nodes) {
        next.set(node.id, node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(modelsTreeData);
    walk(canonicalTreeData);
    return next;
  }, [modelsTreeData, canonicalTreeData]);

  const statModelIds = useMemo(
    () => runtimeModelSchemas.filter((row) => row.modelId.endsWith("stats")).map((row) => row.modelId),
    [runtimeModelSchemas],
  );

  const statColorByModelId = useMemo(() => {
    const map = new Map<string, string>();
    for (const statModelId of statModelIds) {
      const hue = Math.round(hashToUnit(`stat-color:${statModelId}`) * 360);
      map.set(statModelId, `hsl(${hue}, 82%, 62%)`);
    }
    return map;
  }, [hashToUnit, statModelIds]);

  const attachedStatModelIdsByModelId = useMemo(() => {
    const validStatIds = new Set(statModelIds);
    const ids = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const resolveParent = (modelId: string): string | undefined => {
      const explicitParent = byId.get(modelId)?.extendsModelId;
      if (explicitParent && explicitParent !== modelId && ids.has(explicitParent)) return explicitParent;
      const segments = modelId.split(".");
      if (segments.length <= 1) return undefined;
      for (let i = segments.length - 1; i > 0; i -= 1) {
        const candidate = segments.slice(0, i).join(".");
        if (ids.has(candidate)) return candidate;
        const baseCandidate = `${candidate}.base`;
        if (baseCandidate !== modelId && ids.has(baseCandidate)) return baseCandidate;
      }
      return undefined;
    };
    const directByModelId = new Map<string, string[]>();
    for (const model of runtimeModelSchemas) {
      if (model.modelId.endsWith("stats")) continue;
      const direct = [
        ...(model.extendsModelId && validStatIds.has(model.extendsModelId) ? [model.extendsModelId] : []),
        ...((model.attachedStatModelIds ?? []).filter((statId) => validStatIds.has(statId))),
      ];
      directByModelId.set(model.modelId, [...new Set(direct)]);
    }
    const resolved = new Map<string, string[]>();
    const resolving = new Set<string>();
    const collect = (modelId: string): string[] => {
      const cached = resolved.get(modelId);
      if (cached) return cached;
      if (resolving.has(modelId)) return [];
      resolving.add(modelId);
      const own = [...(directByModelId.get(modelId) ?? [])];
      const parentId = resolveParent(modelId);
      const inherited = parentId ? collect(parentId) : [];
      const merged = [...new Set([...inherited, ...own])];
      resolved.set(modelId, merged);
      resolving.delete(modelId);
      return merged;
    };
    for (const model of runtimeModelSchemas) {
      if (model.modelId.endsWith("stats")) continue;
      collect(model.modelId);
    }
    return resolved;
  }, [runtimeModelSchemas, statModelIds]);

  const modelsSchemaJson = useMemo(() => buildModelsSchemaJson(runtimeModelSchemas), [runtimeModelSchemas]);
  const statsSchemaJson = useMemo(() => buildStatsSchemaJson(runtimeModelSchemas), [runtimeModelSchemas]);
  const canonicalAssetsSchemaJson = useMemo(
    () => buildCanonicalAssetsSchemaJson(modelInstances),
    [modelInstances],
  );

  return {
    modelsTreeData,
    canonicalTreeData,
    activeNavigatorMode,
    activeTreeData,
    featureDefaultMap,
    modelTreeNodeById,
    statModelIds,
    statColorByModelId,
    attachedStatModelIdsByModelId,
    modelsSchemaJson,
    statsSchemaJson,
    canonicalAssetsSchemaJson,
  };
}
