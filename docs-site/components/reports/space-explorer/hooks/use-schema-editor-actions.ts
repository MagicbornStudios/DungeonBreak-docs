import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  buildDefaultStatModifierMappings,
  normalizeModelId,
  resolveParentModelId,
  slugify,
} from "@/lib/space-explorer-schema";
import type {
  ModelInstanceBinding,
  RuntimeFeatureSchemaRow,
  RuntimeModelSchemaRow,
  SpaceVectorPackOverrides,
} from "@/components/reports/space-explorer/config";

type UseSchemaEditorActionsArgs = {
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  selectedModelForSpaceViewId: string;
  inferredKaelModelId: string;
  setSpaceOverrides: Dispatch<SetStateAction<SpaceVectorPackOverrides | undefined>>;
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  newFeatureId: string;
  newFeatureSpaces: string;
  newFeatureGroup: string;
  setSelectedModelFeatureIds: Dispatch<SetStateAction<string[]>>;
  setNewFeatureId: (value: string) => void;
  newModelId: string;
  newModelLabel: string;
  newModelSpaces: string;
  selectedModelFeatureIds: string[];
  modelInstances: ModelInstanceBinding[];
  replaceModelInstances: (nextInstances: ModelInstanceBinding[]) => void;
};

export function useSchemaEditorActions({
  runtimeModelSchemas,
  runtimeFeatureSchema,
  selectedModelForSpaceViewId,
  inferredKaelModelId,
  setSpaceOverrides,
  setActiveModelSelection,
  newFeatureId,
  newFeatureSpaces,
  newFeatureGroup,
  setSelectedModelFeatureIds,
  setNewFeatureId,
  newModelId,
  newModelLabel,
  newModelSpaces,
  selectedModelFeatureIds,
  modelInstances,
  replaceModelInstances,
}: UseSchemaEditorActionsArgs) {
  const createModelSchemaFromTree = useCallback(
    (modelIdRaw: string, labelRaw?: string, templateModelId?: string) => {
      const modelId = normalizeModelId(modelIdRaw);
      if (!modelId) return;
      if (runtimeModelSchemas.some((row) => row.modelId === modelId)) return;
      const template =
        runtimeModelSchemas.find((row) => row.modelId === templateModelId) ??
        runtimeModelSchemas.find((row) => row.modelId === selectedModelForSpaceViewId) ??
        runtimeModelSchemas.find((row) => row.modelId === inferredKaelModelId) ??
        runtimeModelSchemas[0];
      const featureRefs =
        template?.featureRefs?.map((ref) => ({ ...ref, spaces: [...ref.spaces] })) ??
        runtimeFeatureSchema.slice(0, 4).map((row) => ({
          featureId: row.featureId,
          spaces: row.spaces.length > 0 ? [...row.spaces] : ["entity"],
          required: false,
          defaultValue: row.defaultValue,
        }));
      if (featureRefs.length === 0) return;
      const newRow: RuntimeModelSchemaRow = {
        modelId,
        label: labelRaw?.trim() || modelId,
        description: `Generated in Space Explorer (${new Date().toISOString()})`,
        extendsModelId: template && template.modelId !== modelId ? template.modelId : undefined,
        featureRefs,
      };
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: [...runtimeModelSchemas, newRow] }));
      setActiveModelSelection(modelId, null);
    },
    [
      inferredKaelModelId,
      runtimeFeatureSchema,
      runtimeModelSchemas,
      selectedModelForSpaceViewId,
      setActiveModelSelection,
      setSpaceOverrides,
    ]
  );

  const addFeatureToSchema = useCallback(() => {
    const id = slugify(newFeatureId);
    if (!id) return;
    const spaces = newFeatureSpaces
      .split(",")
      .map((row) => row.trim())
      .filter((row) => row.length > 0);
    if (spaces.length === 0) return;
    const featureRow = {
      featureId: id,
      label: newFeatureId.trim() || id,
      groups: [newFeatureGroup],
      spaces,
      defaultValue: 0,
    };
    const current = runtimeFeatureSchema.filter((row) => row.featureId !== id);
    setSpaceOverrides((prev) => ({ ...(prev ?? {}), featureSchema: [...current, featureRow] }));
    setSelectedModelFeatureIds((prev) => [...new Set([...prev, id])]);
    setNewFeatureId("");
  }, [
    newFeatureGroup,
    newFeatureId,
    newFeatureSpaces,
    runtimeFeatureSchema,
    setNewFeatureId,
    setSelectedModelFeatureIds,
    setSpaceOverrides,
  ]);

  const addModelSchema = useCallback(() => {
    const modelId = slugify(newModelId);
    if (!modelId || selectedModelFeatureIds.length === 0) return;
    const spaces = newModelSpaces
      .split(",")
      .map((row) => row.trim())
      .filter((row) => row.length > 0);
    const featureRefs = selectedModelFeatureIds.map((featureId) => ({
      featureId,
      spaces,
      required: false,
      defaultValue: runtimeFeatureSchema.find((row) => row.featureId === featureId)?.defaultValue,
    }));
    const row: RuntimeModelSchemaRow = {
      modelId,
      label: newModelLabel.trim() || modelId,
      description: `Generated in Space Explorer (${new Date().toISOString()})`,
      featureRefs,
    };
    const current = runtimeModelSchemas.filter((model) => model.modelId !== modelId);
    setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: [...current, row] }));
  }, [
    newModelId,
    newModelLabel,
    newModelSpaces,
    runtimeFeatureSchema,
    runtimeModelSchemas,
    selectedModelFeatureIds,
    setSpaceOverrides,
  ]);

  const addFeatureRefToModel = useCallback(
    (modelId: string, featureId: string) => {
      if (!modelId || !featureId) return;
      const model = runtimeModelSchemas.find((row) => row.modelId === modelId);
      if (!model) return;
      if (model.featureRefs.some((row) => row.featureId === featureId)) return;
      const schemaRow = runtimeFeatureSchema.find((row) => row.featureId === featureId);
      const spaces = schemaRow?.spaces?.length ? schemaRow.spaces : ["entity"];
      const defaultValue = schemaRow?.defaultValue;
      const nextModels = runtimeModelSchemas.map((row) =>
        row.modelId === modelId
          ? {
              ...row,
              featureRefs: [...row.featureRefs, { featureId, spaces, required: false, defaultValue }],
            }
          : row
      );
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
    },
    [runtimeFeatureSchema, runtimeModelSchemas, setSpaceOverrides]
  );

  const removeFeatureRefFromModel = useCallback(
    (modelId: string, featureId: string) => {
      if (!modelId || !featureId) return;
      const nextModels = runtimeModelSchemas.map((row) =>
        row.modelId === modelId
          ? { ...row, featureRefs: row.featureRefs.filter((ref) => ref.featureId !== featureId) }
          : row
      );
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
    },
    [runtimeModelSchemas, setSpaceOverrides]
  );

  const updateStatModifierMapping = useCallback(
    (
      targetStatModelId: string,
      modifierStatModelId: string,
      modifierFeatureId: string,
      targetFeatureId: string
    ) => {
      if (!targetStatModelId || !modifierStatModelId || !modifierFeatureId || !targetFeatureId) return;
      const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
      const targetStat = byId.get(targetStatModelId);
      const modifierStat = byId.get(modifierStatModelId);
      if (!targetStat || !modifierStat) return;
      if (!targetStat.modelId.endsWith("stats")) return;
      if (!modifierStat.modelId.endsWith("stats")) return;
      if (!targetStat.featureRefs.some((ref) => ref.featureId === targetFeatureId)) return;
      if (!modifierStat.featureRefs.some((ref) => ref.featureId === modifierFeatureId)) return;

      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== targetStatModelId) return row;
        const current = row.statModifiers ?? [];
        const modifier = current.find((entry) => entry.modifierStatModelId === modifierStatModelId);
        if (!modifier) return row;
        const mappingByFeature = new Map(
          modifier.mappings.map((mapping) => [mapping.modifierFeatureId, mapping.targetFeatureId] as const)
        );
        mappingByFeature.set(modifierFeatureId, targetFeatureId);
        const nextMappings = modifierStat.featureRefs.map((ref) => ({
          modifierFeatureId: ref.featureId,
          targetFeatureId: mappingByFeature.get(ref.featureId) ?? targetFeatureId,
        }));
        return {
          ...row,
          statModifiers: current.map((entry) =>
            entry.modifierStatModelId === modifierStatModelId ? { ...entry, mappings: nextMappings } : entry
          ),
        };
      });

      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
    },
    [runtimeModelSchemas, setSpaceOverrides]
  );

  const updateFeatureRefDefaultValue = useCallback(
    (modelId: string, featureId: string, defaultValue: number | null) => {
      if (!modelId || !featureId) return;
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== modelId) return row;
        return {
          ...row,
          featureRefs: row.featureRefs.map((ref) =>
            ref.featureId === featureId
              ? {
                  ...ref,
                  defaultValue:
                    defaultValue == null || Number.isNaN(defaultValue) ? undefined : defaultValue,
                }
              : ref
          ),
        };
      });
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
    },
    [runtimeModelSchemas, setSpaceOverrides]
  );

  const attachStatModelToModel = useCallback(
    (modelId: string, statModelId: string) => {
      if (!modelId || !statModelId) return;
      const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
      const targetModel = byId.get(modelId);
      const statModel = byId.get(statModelId);
      if (!targetModel || !statModel) return;
      if (targetModel.modelId.endsWith("stats")) return;
      if (!statModel.modelId.endsWith("stats")) return;
      const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
      const statChain: RuntimeModelSchemaRow[] = [];
      const visited = new Set<string>();
      let cursor: RuntimeModelSchemaRow | undefined = statModel;
      while (cursor && !visited.has(cursor.modelId)) {
        visited.add(cursor.modelId);
        statChain.unshift(cursor);
        const parentId = resolveParentModelId(cursor.modelId, idSet, byId);
        if (!parentId) break;
        const parent = byId.get(parentId);
        if (!parent || !parent.modelId.endsWith("stats")) break;
        cursor = parent;
      }
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== modelId) return row;
        const existing = new Map(row.featureRefs.map((ref) => [ref.featureId, ref] as const));
        for (const statLayer of statChain) {
          for (const ref of statLayer.featureRefs) {
            if (!existing.has(ref.featureId)) {
              existing.set(ref.featureId, {
                featureId: ref.featureId,
                spaces: [...ref.spaces],
                required: ref.required,
                defaultValue: ref.defaultValue,
              });
            }
          }
        }
        return {
          ...row,
          featureRefs: Array.from(existing.values()),
          attachedStatModelIds: [...new Set([...(row.attachedStatModelIds ?? []), statModelId])],
        };
      });
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
    },
    [runtimeModelSchemas, setSpaceOverrides]
  );

  const toggleStatModifierForStatSet = useCallback(
    (targetStatModelId: string, modifierStatModelId: string, enabled: boolean) => {
      if (!targetStatModelId || !modifierStatModelId) return;
      if (targetStatModelId === modifierStatModelId) return;
      const byId = new Map(runtimeModelSchemas.map((row) => [row.modelId, row] as const));
      const targetStat = byId.get(targetStatModelId);
      const modifierStat = byId.get(modifierStatModelId);
      if (!targetStat || !modifierStat) return;
      if (!targetStat.modelId.endsWith("stats")) return;
      if (!modifierStat.modelId.endsWith("stats")) return;
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== targetStatModelId) return row;
        const current = row.statModifiers ?? [];
        if (enabled) {
          if (current.some((modifier) => modifier.modifierStatModelId === modifierStatModelId)) {
            return row;
          }
          return {
            ...row,
            statModifiers: [
              ...current,
              {
                modifierStatModelId,
                mappings: buildDefaultStatModifierMappings(targetStat, modifierStat),
              },
            ],
          };
        }
        return {
          ...row,
          statModifiers: current.filter((modifier) => modifier.modifierStatModelId !== modifierStatModelId),
        };
      });
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
    },
    [runtimeModelSchemas, setSpaceOverrides]
  );

  const updateModelMetadata = useCallback(
    (modelId: string, updates: { label?: string; description?: string }) => {
      if (!modelId) return;
      const nextModels = runtimeModelSchemas.map((row) =>
        row.modelId === modelId
          ? { ...row, label: updates.label ?? row.label, description: updates.description ?? row.description }
          : row
      );
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
    },
    [runtimeModelSchemas, setSpaceOverrides]
  );

  const deleteModelSchema = useCallback(
    (modelId: string) => {
      if (!modelId) return;
      const nextModels = runtimeModelSchemas.filter((row) => row.modelId !== modelId);
      const nextInstances = modelInstances.filter((row) => row.modelId !== modelId);
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: nextModels }));
      replaceModelInstances(nextInstances);
      setActiveModelSelection("__none__", null);
    },
    [modelInstances, replaceModelInstances, runtimeModelSchemas, setActiveModelSelection, setSpaceOverrides]
  );

  const replaceModelSchemas = useCallback(
    (models: RuntimeModelSchemaRow[]) => {
      setSpaceOverrides((prev) => ({ ...(prev ?? {}), modelSchemas: models }));
    },
    [setSpaceOverrides]
  );

  const replaceCanonicalAssets = useCallback(
    (assets: ModelInstanceBinding[]) => {
      const sanitized = assets.map((row) => ({
        id: row.id,
        name: row.name,
        modelId: normalizeModelId(row.modelId),
        canonical: true,
      }));
      replaceModelInstances(sanitized);
    },
    [replaceModelInstances]
  );

  return {
    createModelSchemaFromTree,
    addFeatureToSchema,
    addModelSchema,
    addFeatureRefToModel,
    removeFeatureRefFromModel,
    updateStatModifierMapping,
    updateFeatureRefDefaultValue,
    attachStatModelToModel,
    toggleStatModifierForStatSet,
    updateModelMetadata,
    deleteModelSchema,
    replaceModelSchemas,
    replaceCanonicalAssets,
  };
}
