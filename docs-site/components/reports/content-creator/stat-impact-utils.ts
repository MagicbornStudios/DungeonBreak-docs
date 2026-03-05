type FeatureRef = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

export type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  featureRefs: FeatureRef[];
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
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

function buildModelByIdMap(runtimeModelSchemas: RuntimeModelSchemaRow[]) {
  return new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
}

function getStatChain(
  statModelId: string,
  byId: Map<string, RuntimeModelSchemaRow>,
): RuntimeModelSchemaRow[] {
  const stat = byId.get(statModelId);
  if (!stat || !stat.modelId.endsWith("stats")) return [];
  const chain: RuntimeModelSchemaRow[] = [];
  const visited = new Set<string>();
  let cursor: RuntimeModelSchemaRow | undefined = stat;
  while (cursor && !visited.has(cursor.modelId)) {
    visited.add(cursor.modelId);
    chain.unshift(cursor);
    const parentId = resolveParentModelId(cursor.modelId, new Set(byId.keys()), byId);
    if (!parentId) break;
    const parent = byId.get(parentId);
    if (!parent || !parent.modelId.endsWith("stats")) break;
    cursor = parent;
  }
  return chain;
}

function collectResolvedStatIdsForModel(
  modelId: string,
  byId: Map<string, RuntimeModelSchemaRow>,
): string[] {
  const resolved = new Set<string>();
  const visited = new Set<string>();
  let cursor = byId.get(modelId);
  while (cursor && !visited.has(cursor.modelId)) {
    visited.add(cursor.modelId);
    if (cursor.extendsModelId && cursor.extendsModelId.endsWith("stats")) resolved.add(cursor.extendsModelId);
    for (const attached of cursor.attachedStatModelIds ?? []) {
      if (attached.endsWith("stats")) resolved.add(attached);
    }
    const parentId = resolveParentModelId(cursor.modelId, new Set(byId.keys()), byId);
    cursor = parentId ? byId.get(parentId) : undefined;
  }
  return [...resolved];
}

function collectInheritanceChainIdsForModel(
  modelId: string,
  byId: Map<string, RuntimeModelSchemaRow>,
): Set<string> {
  const ids = new Set<string>();
  const visited = new Set<string>();
  let cursor = byId.get(modelId);
  while (cursor && !visited.has(cursor.modelId)) {
    visited.add(cursor.modelId);
    ids.add(cursor.modelId);
    const parentId = resolveParentModelId(cursor.modelId, new Set(byId.keys()), byId);
    cursor = parentId ? byId.get(parentId) : undefined;
  }
  return ids;
}

export function findImpactedModelsForStat(
  runtimeModelSchemas: RuntimeModelSchemaRow[],
  statModelId: string,
  scopeModelId?: string,
): string[] {
  const byId = buildModelByIdMap(runtimeModelSchemas);
  const impacted: string[] = [];
  for (const model of runtimeModelSchemas) {
    if (model.modelId.endsWith("stats")) continue;
    const resolvedStatIds = collectResolvedStatIdsForModel(model.modelId, byId);
    if (!resolvedStatIds.includes(statModelId)) continue;
    if (scopeModelId) {
      const inheritanceIds = collectInheritanceChainIdsForModel(model.modelId, byId);
      if (!inheritanceIds.has(scopeModelId)) continue;
    }
    impacted.push(model.modelId);
  }
  return impacted;
}

export function getDirectAttachedStatIdsForModel(
  runtimeModelSchemas: RuntimeModelSchemaRow[],
  modelId: string,
): string[] {
  const direct = runtimeModelSchemas.find((row) => row.modelId === modelId);
  if (!direct || direct.modelId.endsWith("stats")) return [];
  return [
    ...(direct.extendsModelId && direct.extendsModelId.endsWith("stats") ? [direct.extendsModelId] : []),
    ...(direct.attachedStatModelIds ?? []),
  ];
}

function replaceStatLinkOnModel(
  model: RuntimeModelSchemaRow,
  oldStatId: string,
  replacementStatId: string | null,
  directOnly: boolean,
): RuntimeModelSchemaRow {
  if (model.modelId.endsWith("stats")) return model;
  let attached = [...(model.attachedStatModelIds ?? [])];
  if (directOnly || attached.includes(oldStatId) || model.extendsModelId === oldStatId) {
    attached = attached.filter((id) => id !== oldStatId);
    if (replacementStatId && !attached.includes(replacementStatId)) attached.push(replacementStatId);
  }
  const extendsModelId = model.extendsModelId === oldStatId ? (replacementStatId ?? undefined) : model.extendsModelId;
  return {
    ...model,
    extendsModelId,
    attachedStatModelIds: attached.length > 0 ? attached : undefined,
  };
}

function remapFeaturesForModel(
  model: RuntimeModelSchemaRow,
  oldStatId: string,
  replacementStatId: string | null,
  byId: Map<string, RuntimeModelSchemaRow>,
): RuntimeModelSchemaRow {
  const oldStatFeatures = new Set(
    getStatChain(oldStatId, byId).flatMap((row) => row.featureRefs.map((ref) => ref.featureId)),
  );
  const replacementRefs = replacementStatId ? getStatChain(replacementStatId, byId).flatMap((row) => row.featureRefs) : [];
  const nextRefs = model.featureRefs.filter((ref) => !oldStatFeatures.has(ref.featureId));
  for (const ref of replacementRefs) {
    if (nextRefs.some((row) => row.featureId === ref.featureId)) continue;
    nextRefs.push({
      featureId: ref.featureId,
      spaces: [...ref.spaces],
      required: ref.required,
      defaultValue: ref.defaultValue,
    });
  }
  return { ...model, featureRefs: nextRefs };
}

export function applyStatRemovalStrategy(params: {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  oldStatId: string;
  impactedModelIds: string[];
  replacementStatId: string | null;
  deleteImpactedCanonical: boolean;
  deleteStatModel: boolean;
  scopeModelId?: string;
}): { nextModels: RuntimeModelSchemaRow[]; nextCanonicalAssets: ModelInstanceBinding[] } {
  const {
    runtimeModelSchemas,
    modelInstances,
    oldStatId,
    impactedModelIds,
    replacementStatId,
    deleteImpactedCanonical,
    deleteStatModel,
    scopeModelId,
  } = params;

  let nextModels = runtimeModelSchemas.map((row) =>
    impactedModelIds.includes(row.modelId)
      ? replaceStatLinkOnModel(row, oldStatId, replacementStatId, Boolean(scopeModelId && row.modelId === scopeModelId))
      : row,
  );
  const byIdAfterLinkUpdate = new Map(nextModels.map((row) => [row.modelId, row] as const));
  nextModels = nextModels.map((row) =>
    impactedModelIds.includes(row.modelId) ? remapFeaturesForModel(row, oldStatId, replacementStatId, byIdAfterLinkUpdate) : row,
  );
  if (deleteStatModel) {
    nextModels = nextModels.filter((row) => row.modelId !== oldStatId);
  }

  if (!deleteImpactedCanonical) {
    return { nextModels, nextCanonicalAssets: modelInstances };
  }
  const impactedSet = new Set(impactedModelIds);
  const nextCanonicalAssets = modelInstances.filter((instance) => !(instance.canonical && impactedSet.has(instance.modelId)));
  return { nextModels, nextCanonicalAssets };
}
