import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  modelSurfaceHue,
  overlayColorByDepth,
  rotatedHue,
} from "@/lib/space-explorer-shared";
import { formatModelIdForUi } from "@/lib/space-explorer-schema";
import {
  buildModelGraph,
  buildScopedContentDimensions,
  type ContentDimensionLayerId,
  type ContentDimensionNode,
} from "@/lib/content-dimension";
import {
  DIMENSION_LAYER_CONFIG,
  type ModelInstanceBinding,
  type PackScopeTreeNode,
  type RuntimeModelSchemaRow,
} from "@/components/reports/space-explorer/config";
import type {
  LayerSpaceOverlay,
  StatSpaceOverlay,
} from "@/components/reports/space-explorer/dimension-plotly";

type UseContentPackDimensionsParams = {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  canonicalAssetOptions: ModelInstanceBinding[];
  activeModelInstanceId: string | null;
  scopeRootModelId: string | null;
  hiddenModelIds: string[];
  enabledStatSpaces: Record<string, boolean>;
  setEnabledStatSpaces: Dispatch<SetStateAction<Record<string, boolean>>>;
  setScopeRootModelId: (modelId: string | null) => void;
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
};

export function useContentPackDimensions({
  runtimeModelSchemas,
  canonicalAssetOptions,
  activeModelInstanceId,
  scopeRootModelId,
  hiddenModelIds,
  enabledStatSpaces,
  setEnabledStatSpaces,
  setScopeRootModelId,
  setActiveModelSelection,
}: UseContentPackDimensionsParams) {
  const [expandedPackTreeModelIds, setExpandedPackTreeModelIds] = useState<
    Record<string, boolean>
  >({});

  const visualizationModelSchemas = useMemo(() => {
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    return runtimeModelSchemas.map((row) => {
      if (row.extendsModelId && idSet.has(row.extendsModelId)) {
        return row;
      }
      const dotIndex = row.modelId.lastIndexOf(".");
      if (dotIndex > 0) {
        const namespaceParent = row.modelId.slice(0, dotIndex);
        if (idSet.has(namespaceParent)) {
          return {
            ...row,
            extendsModelId: namespaceParent,
          };
        }
      }
      return row;
    });
  }, [runtimeModelSchemas]);

  const modelGraph = useMemo(
    () => buildModelGraph(visualizationModelSchemas),
    [visualizationModelSchemas]
  );

  const modelSchemaById = useMemo(
    () =>
      new Map(
        visualizationModelSchemas.map((row) => [row.modelId, row] as const)
      ),
    [visualizationModelSchemas]
  );

  const modelHueById = useMemo(() => {
    const map = new Map<string, number>();
    visualizationModelSchemas.forEach((row, index) => {
      map.set(row.modelId, rotatedHue(index));
    });
    return map;
  }, [visualizationModelSchemas]);

  const canonicalAssetsByModelId = useMemo(() => {
    const map = new Map<string, ModelInstanceBinding[]>();
    for (const asset of canonicalAssetOptions) {
      const bucket = map.get(asset.modelId) ?? [];
      bucket.push(asset);
      map.set(asset.modelId, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => a.name.localeCompare(b.name));
    }
    return map;
  }, [canonicalAssetOptions]);

  const packTreeRoots = useMemo<PackScopeTreeNode[]>(() => {
    const modelOrder = runtimeModelSchemas.map((row) => row.modelId);
    const roots = modelOrder.filter((modelId) => {
      const parentId = modelGraph.parentById.get(modelId) ?? null;
      return !parentId || !modelGraph.modelById.has(parentId);
    });
    const rootIds = roots.length > 0 ? roots : modelOrder;
    const visited = new Set<string>();
    const buildNode = (
      modelId: string,
      depth: number,
      parentModelId: string | null
    ): PackScopeTreeNode => {
      visited.add(modelId);
      const childIds = [...(modelGraph.childrenById.get(modelId) ?? [])].sort(
        (a, b) => a.localeCompare(b)
      );
      const shortLabel =
        parentModelId && modelId.startsWith(`${parentModelId}.`)
          ? modelId.slice(parentModelId.length + 1)
          : modelId;
      return {
        id: `model:${modelId}`,
        modelId,
        label: formatModelIdForUi(shortLabel),
        depth,
        children: childIds
          .filter((childId) => !visited.has(childId))
          .map((childId) => buildNode(childId, depth + 1, modelId)),
        canonicalAssets: canonicalAssetsByModelId.get(modelId) ?? [],
      };
    };
    return rootIds.map((rootId) => buildNode(rootId, 1, null));
  }, [runtimeModelSchemas, modelGraph, canonicalAssetsByModelId]);

  useEffect(() => {
    if (packTreeRoots.length === 0) {
      return;
    }
    setExpandedPackTreeModelIds((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const root of packTreeRoots) {
        if (!next[root.modelId]) {
          next[root.modelId] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [packTreeRoots]);

  const togglePackTreeModel = useCallback((modelId: string) => {
    setExpandedPackTreeModelIds((prev) => ({
      ...prev,
      [modelId]: !prev[modelId],
    }));
  }, []);

  const effectiveScopeRootModelId = scopeRootModelId;

  const statSpaceIdsByModelId = useMemo(() => {
    const map = new Map<string, string[]>();
    const modelIds = visualizationModelSchemas.map((row) => row.modelId);
    for (const modelId of modelIds) {
      const statIds = new Set<string>();
      const visited = new Set<string>();
      let cursor: string | null = modelId;
      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        const row = modelSchemaById.get(cursor);
        if (!row) break;
        if (row.modelId.endsWith("stats")) {
          statIds.add(row.modelId);
        }
        for (const attachedId of row.attachedStatModelIds ?? []) {
          if (attachedId.endsWith("stats")) statIds.add(attachedId);
        }
        const nextParentId: string | null =
          modelGraph.parentById.get(cursor) ?? null;
        cursor = nextParentId;
      }
      map.set(modelId, [...statIds]);
    }
    return map;
  }, [visualizationModelSchemas, modelSchemaById, modelGraph.parentById]);

  const selectedAssetStatSpaceIds = useMemo(() => {
    const selectedAsset =
      canonicalAssetOptions.find((row) => row.id === activeModelInstanceId) ?? null;
    if (!selectedAsset) return [] as string[];
    return statSpaceIdsByModelId.get(selectedAsset.modelId) ?? [];
  }, [canonicalAssetOptions, activeModelInstanceId, statSpaceIdsByModelId]);

  const selectedScopeStatSpaceIds = useMemo(() => {
    if (!effectiveScopeRootModelId) return [] as string[];
    if (effectiveScopeRootModelId.endsWith("stats")) {
      return [effectiveScopeRootModelId];
    }
    return [] as string[];
  }, [effectiveScopeRootModelId]);

  const effectiveStatSpaceIds = useMemo(
    () =>
      selectedAssetStatSpaceIds.length > 0
        ? selectedAssetStatSpaceIds
        : selectedScopeStatSpaceIds,
    [selectedAssetStatSpaceIds, selectedScopeStatSpaceIds]
  );

  useEffect(() => {
    if (effectiveStatSpaceIds.length === 0) {
      return;
    }
    setEnabledStatSpaces((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of effectiveStatSpaceIds) {
        if (next[id] === undefined) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [effectiveStatSpaceIds, setEnabledStatSpaces]);

  const activeSelectedAssetStatSpaceIds = useMemo(
    () => effectiveStatSpaceIds.filter((id) => enabledStatSpaces[id] !== false),
    [effectiveStatSpaceIds, enabledStatSpaces]
  );

  const dimensionNodes = useMemo<ContentDimensionNode[]>(
    () => {
      const baseNodes = buildScopedContentDimensions(
        visualizationModelSchemas,
        canonicalAssetOptions,
        {
          scopeRootModelId: effectiveScopeRootModelId,
          hiddenModelIds,
        }
      );
      if (activeSelectedAssetStatSpaceIds.length === 0) {
        return baseNodes;
      }
      const allowed = new Set(activeSelectedAssetStatSpaceIds);
      return baseNodes.filter((node) => {
        const statSpaces = statSpaceIdsByModelId.get(node.modelId) ?? [];
        if (statSpaces.length === 0) return false;
        return statSpaces.some((id) => allowed.has(id));
      });
    },
    [
      visualizationModelSchemas,
      canonicalAssetOptions,
      effectiveScopeRootModelId,
      hiddenModelIds,
      activeSelectedAssetStatSpaceIds,
      statSpaceIdsByModelId,
    ]
  );

  const scopedSchemaNodes = useMemo(
    () => dimensionNodes.filter((row) => row.layerId === "schema-model"),
    [dimensionNodes]
  );

  const scopedCanonicalNodes = useMemo(
    () => dimensionNodes.filter((row) => row.layerId === "canonical-asset"),
    [dimensionNodes]
  );

  const statSpaceOverlays = useMemo<StatSpaceOverlay[]>(() => {
    if (activeSelectedAssetStatSpaceIds.length === 0) return [];
    const overlays: StatSpaceOverlay[] = [];
    for (const statSpaceId of activeSelectedAssetStatSpaceIds) {
      const nodes = scopedSchemaNodes.filter((node) => {
        const spaces = statSpaceIdsByModelId.get(node.modelId) ?? [];
        return spaces.includes(statSpaceId);
      });
      if (nodes.length === 0) continue;
      const minX = Math.min(...nodes.map((n) => n.modelIndex));
      const maxX = Math.max(...nodes.map((n) => n.modelIndex));
      const maxY = Math.max(...nodes.map((n) => n.surface.height));
      const hue = modelHueById.get(statSpaceId) ?? modelSurfaceHue(statSpaceId);
      overlays.push({
        id: statSpaceId,
        xCenter: (minX + maxX) / 2,
        width: Math.max(0.9, maxX - minX + 0.9),
        height: Math.max(1, maxY),
        color: overlayColorByDepth(hue, 0, 0.22, 52),
      });
    }
    return overlays;
  }, [
    activeSelectedAssetStatSpaceIds,
    scopedSchemaNodes,
    statSpaceIdsByModelId,
    modelHueById,
  ]);

  const layerSpaceOverlays = useMemo<LayerSpaceOverlay[]>(() => {
    if (activeSelectedAssetStatSpaceIds.length === 0) return [];
    const overlays: LayerSpaceOverlay[] = [];
    const layers: Array<{
      id: ContentDimensionLayerId;
      zMin: number;
      zMax: number;
      lightness: number;
    }> = [
      { id: "schema-model", zMin: 0.82, zMax: 1.18, lightness: 56 },
      { id: "canonical-asset", zMin: 1.82, zMax: 2.18, lightness: 68 },
    ];
    for (const statSpaceId of activeSelectedAssetStatSpaceIds) {
      const baseHue = modelHueById.get(statSpaceId) ?? modelSurfaceHue(statSpaceId);
      for (const [layerIndex, layer] of layers.entries()) {
        const nodes = dimensionNodes.filter((node) => {
          if (node.layerId !== layer.id) return false;
          const spaces = statSpaceIdsByModelId.get(node.modelId) ?? [];
          return spaces.includes(statSpaceId);
        });
        if (nodes.length === 0) continue;
        const minX = Math.min(...nodes.map((n) => n.modelIndex));
        const maxX = Math.max(...nodes.map((n) => n.modelIndex));
        const minY = Math.min(...nodes.map((n) => n.coords.y));
        const maxY = Math.max(...nodes.map((n) => n.coords.y));
        overlays.push({
          id: `${statSpaceId}:${layer.id}`,
          layerId: layer.id,
          xCenter: (minX + maxX) / 2,
          width: Math.max(0.7, maxX - minX + 0.7),
          yMin: Math.max(0, minY - 0.18),
          yMax: Math.max(minY + 0.1, maxY + 0.18),
          zMin: layer.zMin,
          zMax: layer.zMax,
          color: overlayColorByDepth(baseHue, layerIndex + 1, 0.24, layer.lightness),
        });
      }
    }
    return overlays;
  }, [
    activeSelectedAssetStatSpaceIds,
    dimensionNodes,
    statSpaceIdsByModelId,
    modelHueById,
  ]);

  const scopePathCrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; modelId: string | null }> = [
      { label: "Pack Root", modelId: null },
    ];
    if (!effectiveScopeRootModelId) {
      return crumbs;
    }
    const pathModelIds: string[] = [];
    const visited = new Set<string>();
    let cursor: string | null = effectiveScopeRootModelId;
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      pathModelIds.unshift(cursor);
      cursor = modelGraph.parentById.get(cursor) ?? null;
    }
    for (const modelId of pathModelIds) {
      crumbs.push({ label: formatModelIdForUi(modelId), modelId });
    }
    return crumbs;
  }, [effectiveScopeRootModelId, modelGraph.parentById]);

  const resolveAssetScopeRootModelId = useCallback(
    (modelId: string) => modelGraph.parentById.get(modelId) ?? modelId,
    [modelGraph.parentById]
  );

  const selectCanonicalAssetInPackScope = useCallback(
    (asset: ModelInstanceBinding) => {
      const nextScopeRoot = resolveAssetScopeRootModelId(asset.modelId);
      setScopeRootModelId(nextScopeRoot);
      setActiveModelSelection(asset.modelId, null);
      requestAnimationFrame(() => {
        setActiveModelSelection(asset.modelId, asset.id);
      });
    },
    [resolveAssetScopeRootModelId, setScopeRootModelId, setActiveModelSelection]
  );

  const selectedScopeTreeNodeId = effectiveScopeRootModelId
    ? `model:${effectiveScopeRootModelId}`
    : "pack-root";

  const groupedPackTreeRoots = useMemo(
    () => ({
      stats: packTreeRoots.filter((node) => node.modelId.endsWith("stats")),
      models: packTreeRoots.filter((node) => !node.modelId.endsWith("stats")),
    }),
    [packTreeRoots]
  );

  const statsRootHueByModelId = useMemo(() => {
    const palette = [196, 312, 146, 252, 334, 176, 286];
    const map = new Map<string, number>();
    groupedPackTreeRoots.stats.forEach((node, index) => {
      map.set(node.modelId, palette[index % palette.length] ?? 214);
    });
    return map;
  }, [groupedPackTreeRoots.stats]);

  const modelSectionRootById = useMemo(() => {
    const map = new Map<string, string>();
    const modelIds = runtimeModelSchemas.map((row) => row.modelId);
    for (const modelId of modelIds) {
      const visited = new Set<string>();
      let cursor: string | null = modelId;
      let root = modelId;
      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        root = cursor;
        cursor = modelGraph.parentById.get(cursor) ?? null;
      }
      map.set(modelId, root);
    }
    return map;
  }, [runtimeModelSchemas, modelGraph.parentById]);

  const topScopedContributors = useMemo(
    () =>
      [...scopedSchemaNodes]
        .sort((a, b) => b.contentSharePct - a.contentSharePct)
        .slice(0, 5),
    [scopedSchemaNodes]
  );

  const dimensionNodesByLayer = useMemo(
    () =>
      Object.keys(DIMENSION_LAYER_CONFIG).map((layerId) => {
        const typedLayerId = layerId as ContentDimensionLayerId;
        return {
          layerId: typedLayerId,
          label: DIMENSION_LAYER_CONFIG[typedLayerId].label,
          color: DIMENSION_LAYER_CONFIG[typedLayerId].color,
          nodes: dimensionNodes.filter((node) => node.layerId === typedLayerId),
        };
      }),
    [dimensionNodes]
  );

  return {
    modelHueById,
    effectiveScopeRootModelId,
    packTreeRoots,
    expandedPackTreeModelIds,
    togglePackTreeModel,
    effectiveStatSpaceIds,
    scopedSchemaNodes,
    scopedCanonicalNodes,
    statSpaceOverlays,
    layerSpaceOverlays,
    scopePathCrumbs,
    selectCanonicalAssetInPackScope,
    selectedScopeTreeNodeId,
    groupedPackTreeRoots,
    statsRootHueByModelId,
    modelSectionRootById,
    topScopedContributors,
    dimensionNodesByLayer,
  };
}
