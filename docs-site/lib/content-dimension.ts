export type ContentDimensionLayerId = "schema-model" | "canonical-asset";

export interface ContentDimensionCoordinates {
  x: number;
  y: number;
  z: number;
}

export interface ContentDimensionSurface {
  width: number;
  height: number;
}

export interface ContentDimension {
  id: string;
  label: string;
  layerId: ContentDimensionLayerId;
  modelId: string;
  modelIndex: number;
  coords: ContentDimensionCoordinates;
  scopeRootModelId?: string;
  inheritanceDepth: number;
  contentSharePct: number;
  surface: ContentDimensionSurface;
  lineageRootModelId: string;
}

export interface ContentDimensionModelSchemaInput {
  modelId: string;
  label?: string;
  extendsModelId?: string;
}

export interface ContentDimensionCanonicalAssetInput {
  id: string;
  name: string;
  modelId: string;
}

export interface ContentDimensionScopeConfig {
  scopeRootModelId?: string | null;
  hiddenModelIds?: readonly string[];
  collapsedDepths?: readonly number[];
}

export interface ContentTreeSelectionLike {
  nodeType?: string;
  modelId?: string | null;
  instanceId?: string | null;
}

export interface ContentDimensionModelGraph {
  modelById: Map<string, ContentDimensionModelSchemaInput>;
  childrenById: Map<string, string[]>;
  parentById: Map<string, string | null>;
}

export class ContentDimensionNode implements ContentDimension {
  id: string;
  label: string;
  layerId: ContentDimensionLayerId;
  modelId: string;
  modelIndex: number;
  coords: ContentDimensionCoordinates;
  scopeRootModelId?: string;
  inheritanceDepth: number;
  contentSharePct: number;
  surface: ContentDimensionSurface;
  lineageRootModelId: string;

  constructor(input: ContentDimension) {
    this.id = input.id;
    this.label = input.label;
    this.layerId = input.layerId;
    this.modelId = input.modelId;
    this.modelIndex = input.modelIndex;
    this.coords = input.coords;
    this.scopeRootModelId = input.scopeRootModelId;
    this.inheritanceDepth = input.inheritanceDepth;
    this.contentSharePct = input.contentSharePct;
    this.surface = input.surface;
    this.lineageRootModelId = input.lineageRootModelId;
  }
}

export function buildModelGraph(
  modelSchemas: readonly ContentDimensionModelSchemaInput[]
): ContentDimensionModelGraph {
  const modelById = new Map<string, ContentDimensionModelSchemaInput>();
  const childrenById = new Map<string, string[]>();
  const parentById = new Map<string, string | null>();

  for (const schema of modelSchemas) {
    modelById.set(schema.modelId, schema);
    if (!childrenById.has(schema.modelId)) {
      childrenById.set(schema.modelId, []);
    }
  }

  for (const schema of modelSchemas) {
    const parentId =
      schema.extendsModelId && modelById.has(schema.extendsModelId)
        ? schema.extendsModelId
        : null;
    parentById.set(schema.modelId, parentId);
    if (parentId) {
      const nextChildren = childrenById.get(parentId) ?? [];
      nextChildren.push(schema.modelId);
      childrenById.set(parentId, nextChildren);
    }
  }

  return { modelById, childrenById, parentById };
}

export function deriveScopeFromTreeSelection(
  selectedTreeNode: ContentTreeSelectionLike | null | undefined,
  modelGraph: ContentDimensionModelGraph,
  canonicalAssets: readonly ContentDimensionCanonicalAssetInput[]
): Pick<ContentDimensionScopeConfig, "scopeRootModelId"> {
  if (!selectedTreeNode) {
    return { scopeRootModelId: null };
  }

  const directModelId = selectedTreeNode.modelId?.trim() || "";
  if (directModelId && modelGraph.modelById.has(directModelId)) {
    return { scopeRootModelId: directModelId };
  }

  const instanceId = selectedTreeNode.instanceId?.trim() || "";
  if (instanceId) {
    const canonical = canonicalAssets.find((row) => row.id === instanceId);
    if (canonical?.modelId && modelGraph.modelById.has(canonical.modelId)) {
      return { scopeRootModelId: canonical.modelId };
    }
  }

  return { scopeRootModelId: null };
}

function collectDescendants(
  childrenById: Map<string, string[]>,
  rootModelId: string
): Set<string> {
  const result = new Set<string>();
  const queue = [rootModelId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || result.has(current)) {
      continue;
    }
    result.add(current);
    const children = childrenById.get(current) ?? [];
    for (const child of children) {
      if (!result.has(child)) {
        queue.push(child);
      }
    }
  }
  return result;
}

function buildDepthMap(
  scopeRootModelId: string | null,
  includedModelIds: readonly string[],
  graph: ContentDimensionModelGraph
): Map<string, number> {
  const depthByModelId = new Map<string, number>();

  if (scopeRootModelId) {
    const queue: Array<{ modelId: string; depth: number }> = [
      { modelId: scopeRootModelId, depth: 1 },
    ];
    const includedSet = new Set(includedModelIds);
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next || depthByModelId.has(next.modelId)) {
        continue;
      }
      depthByModelId.set(next.modelId, Math.max(1, next.depth));
      for (const child of graph.childrenById.get(next.modelId) ?? []) {
        if (includedSet.has(child) && !depthByModelId.has(child)) {
          queue.push({ modelId: child, depth: next.depth + 1 });
        }
      }
    }
    return depthByModelId;
  }

  for (const modelId of includedModelIds) {
    let depth = 1;
    const visited = new Set<string>([modelId]);
    let cursor = graph.parentById.get(modelId) ?? null;
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      depth += 1;
      cursor = graph.parentById.get(cursor) ?? null;
    }
    depthByModelId.set(modelId, Math.max(1, depth));
  }

  return depthByModelId;
}

function resolveLineageRootModelId(
  modelId: string,
  graph: ContentDimensionModelGraph,
  scopeRootModelId: string | null
): string {
  if (scopeRootModelId) {
    return scopeRootModelId;
  }
  let cursor: string | null = modelId;
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);
    const parent: string | null = graph.parentById.get(cursor) ?? null;
    if (!parent) {
      return cursor;
    }
    cursor = parent;
  }
  return modelId;
}

export function buildScopedContentDimensions(
  modelSchemas: readonly ContentDimensionModelSchemaInput[],
  canonicalAssets: readonly ContentDimensionCanonicalAssetInput[],
  scopeConfig: ContentDimensionScopeConfig
): ContentDimensionNode[] {
  const graph = buildModelGraph(modelSchemas);
  const modelOrder = modelSchemas.map((row) => row.modelId);
  const requestedRoot = scopeConfig.scopeRootModelId?.trim() || null;
  const scopeRootModelId =
    requestedRoot && graph.modelById.has(requestedRoot) ? requestedRoot : null;

  const scopedSet = scopeRootModelId
    ? collectDescendants(graph.childrenById, scopeRootModelId)
    : new Set(modelOrder);

  const hiddenModelIdSet = new Set(scopeConfig.hiddenModelIds ?? []);
  const collapsedDepthSet = new Set(scopeConfig.collapsedDepths ?? []);
  const scopedModelIds = modelOrder.filter((modelId) => scopedSet.has(modelId));

  const includedModelIds = modelOrder.filter(
    (modelId) => scopedSet.has(modelId) && !hiddenModelIdSet.has(modelId)
  );
  const depthByModelId = buildDepthMap(
    scopeRootModelId,
    scopedModelIds,
    graph
  );

  const canonicalCountByModelId = new Map<string, number>();
  for (const asset of canonicalAssets) {
    if (!scopedSet.has(asset.modelId) || hiddenModelIdSet.has(asset.modelId)) {
      continue;
    }
    if (collapsedDepthSet.has(depthByModelId.get(asset.modelId) ?? 1)) {
      continue;
    }
    canonicalCountByModelId.set(
      asset.modelId,
      (canonicalCountByModelId.get(asset.modelId) ?? 0) + 1
    );
  }

  const totalContentInScope = Math.max(
    1,
    [...canonicalCountByModelId.values()].reduce((sum, count) => sum + count, 0)
  );

  const nodes: ContentDimensionNode[] = [];
  const modelIndexById = new Map<string, number>();

  for (const [index, modelId] of includedModelIds.entries()) {
    const depth = Math.max(1, depthByModelId.get(modelId) ?? 1);
    if (collapsedDepthSet.has(depth)) {
      continue;
    }
    const schema = graph.modelById.get(modelId);
    if (!schema) {
      continue;
    }
    const modelIndex = index + 1;
    modelIndexById.set(modelId, modelIndex);
    const contentSharePct =
      (canonicalCountByModelId.get(modelId) ?? 0) / totalContentInScope;
    const surface = {
      width: Math.max(1, Math.round(contentSharePct * 100)),
      height: Math.max(1, depth),
    };
    const lineageRootModelId = resolveLineageRootModelId(
      modelId,
      graph,
      scopeRootModelId
    );
    nodes.push(
      new ContentDimensionNode({
        id: `schema-model:${modelId}`,
        label: schema.label?.trim() || modelId,
        layerId: "schema-model",
        modelId,
        modelIndex,
        coords: { x: modelIndex, y: surface.height, z: 1 },
        scopeRootModelId: scopeRootModelId ?? undefined,
        inheritanceDepth: depth,
        contentSharePct,
        surface,
        lineageRootModelId,
      })
    );
  }

  for (const [assetIndex, asset] of canonicalAssets.entries()) {
    const modelIndex = modelIndexById.get(asset.modelId);
    if (!modelIndex) {
      continue;
    }
    const depth = Math.max(1, depthByModelId.get(asset.modelId) ?? 1);
    if (collapsedDepthSet.has(depth)) {
      continue;
    }
    const contentSharePct =
      (canonicalCountByModelId.get(asset.modelId) ?? 0) / totalContentInScope;
    const surface = {
      width: Math.max(1, Math.round(contentSharePct * 100)),
      height: Math.max(1, depth),
    };
    const lineageRootModelId = resolveLineageRootModelId(
      asset.modelId,
      graph,
      scopeRootModelId
    );
    nodes.push(
      new ContentDimensionNode({
        id: `canonical-asset:${asset.id}`,
        label: asset.name?.trim() || `${asset.modelId} asset ${assetIndex + 1}`,
        layerId: "canonical-asset",
        modelId: asset.modelId,
        modelIndex,
        // Keep canonical assets in their own z-layer, and align y to the model depth.
        coords: { x: modelIndex, y: depth, z: 2 },
        scopeRootModelId: scopeRootModelId ?? undefined,
        inheritanceDepth: depth,
        contentSharePct,
        surface,
        lineageRootModelId,
      })
    );
  }

  return nodes;
}
