"use client";

import { useMemo } from "react";

type FeatureRef = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  featureRefs: FeatureRef[];
};

function resolveParentModelId(
  modelId: string,
  modelIdSet: Set<string>,
  byId: Map<string, RuntimeModelSchemaRow>,
): string | undefined {
  const model = byId.get(modelId);
  if (!model) return undefined;
  if (model.extendsModelId && modelIdSet.has(model.extendsModelId)) return model.extendsModelId;
  const segments = modelId.split(".");
  if (segments.length <= 1) return undefined;
  for (let i = segments.length - 1; i > 0; i--) {
    const candidate = segments.slice(0, i).join(".");
    if (modelIdSet.has(candidate)) return candidate;
    const baseCandidate = `${candidate}.base`;
    if (baseCandidate !== modelId && modelIdSet.has(baseCandidate)) return baseCandidate;
  }
  return undefined;
}

export function usePanelResolvedFeatureRefs(params: {
  panelModelSchema: RuntimeModelSchemaRow | null;
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  featureDefaultMap: Map<string, number>;
  normalizeModelId: (value: string) => string;
}) {
  const { panelModelSchema, runtimeModelSchemas, featureDefaultMap, normalizeModelId } = params;

  return useMemo(() => {
    if (!panelModelSchema) return [] as RuntimeModelSchemaRow["featureRefs"];
    const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));

    const pushStatChain = (statModelId: string): RuntimeModelSchemaRow[] => {
      const stat = byId.get(statModelId);
      if (!stat || !stat.modelId.endsWith("stats")) return [];
      const chain: RuntimeModelSchemaRow[] = [];
      const visited = new Set<string>();
      let cursor: RuntimeModelSchemaRow | undefined = stat;
      while (cursor && !visited.has(cursor.modelId)) {
        visited.add(cursor.modelId);
        chain.unshift(cursor);
        const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
        if (!parentId) break;
        const parent = byId.get(parentId);
        if (!parent || !parent.modelId.endsWith("stats")) break;
        cursor = parent;
      }
      return chain;
    };

    const featureMap = new Map<string, RuntimeModelSchemaRow["featureRefs"][number]>();
    const mergeRefs = (schema: RuntimeModelSchemaRow) => {
      for (const ref of schema.featureRefs) {
        featureMap.set(ref.featureId, {
          featureId: ref.featureId,
          spaces: Array.isArray(ref.spaces) && ref.spaces.length > 0 ? [...ref.spaces] : ["entity"],
          required: ref.required,
          defaultValue: ref.defaultValue ?? featureDefaultMap.get(ref.featureId) ?? 0,
        });
      }
    };

    if (panelModelSchema.modelId.endsWith("stats")) {
      for (const statLayer of pushStatChain(panelModelSchema.modelId)) {
        mergeRefs(statLayer);
      }
      return Array.from(featureMap.values());
    }

    const processedStatIds = new Set<string>();
    const collectAttachedStatIds = (start: RuntimeModelSchemaRow): string[] => {
      const ids: string[] = [];
      const visited = new Set<string>();
      let cursor: RuntimeModelSchemaRow | undefined = start;
      while (cursor && !visited.has(cursor.modelId)) {
        visited.add(cursor.modelId);
        if (cursor.extendsModelId && cursor.extendsModelId.endsWith("stats")) {
          ids.push(cursor.extendsModelId);
        }
        ids.push(...(cursor.attachedStatModelIds ?? []));
        const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
        cursor = parentId ? byId.get(parentId) : undefined;
      }
      return ids;
    };

    for (const statId of collectAttachedStatIds(panelModelSchema)) {
      const normalized = normalizeModelId(statId);
      if (processedStatIds.has(normalized)) continue;
      processedStatIds.add(normalized);
      for (const statLayer of pushStatChain(normalized)) {
        mergeRefs(statLayer);
      }
    }
    return Array.from(featureMap.values());
  }, [featureDefaultMap, normalizeModelId, panelModelSchema, runtimeModelSchemas]);
}
