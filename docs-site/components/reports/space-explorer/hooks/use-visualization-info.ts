import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { hashToUnit } from "@/lib/space-explorer-shared";
import {
  buildJsonSchemaForModel,
  buildSingleSchemaFileForLanguage,
  resolveParentModelId,
  toFileStem,
} from "@/lib/space-explorer-schema";
import type {
  ModelInstanceBinding,
  RuntimeModelSchemaRow,
} from "@/components/reports/space-explorer/config";

type InfoTab = { id: string; label: string; code: string };

type UseVisualizationInfoArgs = {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  activeModelSchemaId: string;
  modelInstances: ModelInstanceBinding[];
  activeModelInstanceId: string | null;
  featureDefaultsById: Map<string, number>;
  vizInfoTabId: string;
  setVizInfoTabId: (id: string) => void;
  setVizInfoEditorCode: (code: string) => void;
  visualizationScope: "asset" | "content-pack";
  selectedModelForSpaceView: RuntimeModelSchemaRow | null;
  vizMode: "3d" | "2d" | "json" | "deltas";
  setVizMode: (next: "3d" | "2d" | "json" | "deltas") => void;
  canonicalAssetOptions: ModelInstanceBinding[];
  enabledStatLevelById: Record<string, boolean>;
  setEnabledStatLevelById: Dispatch<SetStateAction<Record<string, boolean>>>;
};

export function useVisualizationInfo({
  runtimeModelSchemas,
  activeModelSchemaId,
  modelInstances,
  activeModelInstanceId,
  featureDefaultsById,
  vizInfoTabId,
  setVizInfoTabId,
  setVizInfoEditorCode,
  visualizationScope,
  selectedModelForSpaceView,
  vizMode,
  setVizMode,
  canonicalAssetOptions,
  enabledStatLevelById,
  setEnabledStatLevelById,
}: UseVisualizationInfoArgs) {
  const selectedInfoModelSchema = useMemo(
    () =>
      runtimeModelSchemas.find((row) => row.modelId === activeModelSchemaId) ??
      null,
    [runtimeModelSchemas, activeModelSchemaId]
  );

  const selectedInfoAsset = useMemo(
    () =>
      modelInstances.find((row) => row.id === activeModelInstanceId) ?? null,
    [modelInstances, activeModelInstanceId]
  );

  const infoSchemaTabs = useMemo(() => {
    if (!selectedInfoModelSchema) return [] as InfoTab[];
    const assetFileStem = toFileStem(
      selectedInfoAsset?.name ?? selectedInfoModelSchema.modelId
    );
    const tsFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "typescript",
      assetFileStem
    );
    const cppFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "cpp",
      assetFileStem
    );
    const csFile = buildSingleSchemaFileForLanguage(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById,
      "csharp",
      assetFileStem
    );
    const schemaJson = buildJsonSchemaForModel(
      selectedInfoModelSchema,
      runtimeModelSchemas,
      featureDefaultsById
    );
    const dataJson = {
      modelId: selectedInfoModelSchema.modelId,
      assetId: selectedInfoAsset?.id ?? null,
      assetName: selectedInfoAsset?.name ?? null,
      stats: Object.fromEntries(
        selectedInfoModelSchema.featureRefs.map((ref) => [
          ref.featureId,
          Number((ref.defaultValue ?? featureDefaultsById.get(ref.featureId) ?? 0).toFixed(3)),
        ])
      ),
    };

    const tabs: InfoTab[] = [];
    if (tsFile) tabs.push({ id: "info:ts", label: tsFile.path, code: tsFile.code });
    if (cppFile) tabs.push({ id: "info:cpp", label: cppFile.path, code: cppFile.code });
    if (csFile) tabs.push({ id: "info:csharp", label: csFile.path, code: csFile.code });
    tabs.push({
      id: "info:schema",
      label: `${assetFileStem}.schema.json`,
      code: JSON.stringify(schemaJson, null, 2),
    });
    tabs.push({
      id: "info:data",
      label: `${assetFileStem}.json`,
      code: JSON.stringify(dataJson, null, 2),
    });
    return tabs;
  }, [selectedInfoModelSchema, selectedInfoAsset, runtimeModelSchemas, featureDefaultsById]);

  const activeInfoSchemaTab = useMemo(
    () =>
      infoSchemaTabs.find((tab) => tab.id === vizInfoTabId) ??
      infoSchemaTabs[0] ??
      null,
    [infoSchemaTabs, vizInfoTabId]
  );

  const selectedCanonicalAsset = useMemo(
    () =>
      canonicalAssetOptions.find((row) => row.id === activeModelInstanceId) ??
      null,
    [canonicalAssetOptions, activeModelInstanceId]
  );

  const contentPackInfoEnabled = !(
    visualizationScope === "content-pack" && !selectedCanonicalAsset
  );

  useEffect(() => {
    if (vizMode !== "json") return;
    if (contentPackInfoEnabled) return;
    setVizMode("2d");
  }, [vizMode, contentPackInfoEnabled, setVizMode]);

  useEffect(() => {
    if (infoSchemaTabs.length === 0) {
      setVizInfoTabId("");
      setVizInfoEditorCode("");
      return;
    }
    if (!vizInfoTabId || !infoSchemaTabs.some((tab) => tab.id === vizInfoTabId)) {
      setVizInfoTabId(infoSchemaTabs[0]!.id);
    }
  }, [infoSchemaTabs, vizInfoTabId, setVizInfoTabId, setVizInfoEditorCode]);

  useEffect(() => {
    setVizInfoEditorCode(activeInfoSchemaTab?.code ?? "");
  }, [activeInfoSchemaTab, setVizInfoEditorCode]);

  const selectedModelInheritanceChain = useMemo(() => {
    if (!selectedModelForSpaceView) return [] as RuntimeModelSchemaRow[];
    const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const chain: RuntimeModelSchemaRow[] = [];
    const visited = new Set<string>();
    let cursor: RuntimeModelSchemaRow | undefined = selectedModelForSpaceView;
    while (cursor && !visited.has(cursor.modelId)) {
      chain.unshift(cursor);
      visited.add(cursor.modelId);
      const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
      cursor = parentId ? byId.get(parentId) : undefined;
    }
    return chain;
  }, [selectedModelForSpaceView, runtimeModelSchemas]);

  const statContentLevels = useMemo(
    () =>
      selectedModelInheritanceChain
        .filter((schema) => schema.modelId.endsWith("stats"))
        .map((schema, index) => {
          const hue = Math.round(hashToUnit(`stat-level:${schema.modelId}`) * 360);
          const featureIds = [...new Set(schema.featureRefs.map((row) => row.featureId))];
          return {
            modelId: schema.modelId,
            featureIds,
            depth: index,
            color: `hsl(${hue}, 82%, 62%)`,
            colorBorder: `hsla(${hue}, 82%, 62%, 0.46)`,
            colorSoft: `hsla(${hue}, 82%, 62%, 0.13)`,
          };
        }),
    [selectedModelInheritanceChain]
  );

  const statSchemaById = useMemo(
    () => new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const)),
    [runtimeModelSchemas]
  );

  const selectedAssetStatLevelSchemas = useMemo(
    () =>
      statContentLevels
        .map((level) => ({
          level,
          schema: statSchemaById.get(level.modelId) ?? null,
        }))
        .filter(
          (
            row
          ): row is { level: (typeof statContentLevels)[number]; schema: RuntimeModelSchemaRow } =>
            row.schema !== null
        ),
    [statContentLevels, statSchemaById]
  );

  const statModifiersEnabled = Boolean(
    selectedCanonicalAsset && selectedAssetStatLevelSchemas.length > 0
  );

  useEffect(() => {
    if (vizMode !== "deltas") return;
    if (statModifiersEnabled) return;
    setVizMode("2d");
  }, [vizMode, statModifiersEnabled, setVizMode]);

  useEffect(() => {
    setEnabledStatLevelById((prev) => {
      if (statContentLevels.length === 0) {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      }
      const next: Record<string, boolean> = {};
      let changed = false;
      for (const level of statContentLevels) {
        next[level.modelId] = prev[level.modelId] ?? true;
      }
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length !== nextKeys.length) {
        changed = true;
      } else {
        for (const key of nextKeys) {
          if (prev[key] !== next[key]) {
            changed = true;
            break;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [statContentLevels, setEnabledStatLevelById]);

  const enabledStatFeatureIdSet = useMemo(() => {
    const set = new Set<string>();
    for (const level of statContentLevels) {
      if (!(enabledStatLevelById[level.modelId] ?? true)) continue;
      for (const featureId of level.featureIds) {
        set.add(featureId);
      }
    }
    return set;
  }, [statContentLevels, enabledStatLevelById]);

  return {
    selectedInfoModelSchema,
    selectedInfoAsset,
    infoSchemaTabs,
    activeInfoSchemaTab,
    selectedCanonicalAsset,
    selectedModelInheritanceChain,
    statContentLevels,
    contentPackInfoEnabled,
    statSchemaById,
    selectedAssetStatLevelSchemas,
    statModifiersEnabled,
    enabledStatFeatureIdSet,
  };
}
