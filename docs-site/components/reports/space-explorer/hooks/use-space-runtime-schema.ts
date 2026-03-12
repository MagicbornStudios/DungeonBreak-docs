import { useMemo } from "react";
import { migrateModelSchemasAwayFromBase } from "@/lib/space-explorer-schema";
import { NO_MODEL_SELECTED, type ModelInstanceBinding, type RuntimeFeatureSchemaRow, type RuntimeModelSchemaRow, type SpaceVectorPackOverrides } from "@/components/reports/space-explorer/config";
import type { RuntimeUnifiedModel } from "@/lib/space-vector";

interface UseSpaceRuntimeSchemaParams {
  runtimeModule: unknown;
  spaceOverrides: SpaceVectorPackOverrides | undefined;
  behaviorWindowSeconds: number;
  behaviorStepSeconds: number;
  modelInstances: ModelInstanceBinding[];
  activeModelSchemaId: string;
}

export function useSpaceRuntimeSchema({
  runtimeModule,
  spaceOverrides,
  behaviorWindowSeconds,
  behaviorStepSeconds,
  modelInstances,
  activeModelSchemaId,
}: UseSpaceRuntimeSchemaParams) {
  const unifiedModel = useMemo(() => {
    const runtime = runtimeModule as {
      buildUnifiedSpaceModel?: (
        overrides?: SpaceVectorPackOverrides
      ) => RuntimeUnifiedModel;
    };
    const merged: SpaceVectorPackOverrides = {
      ...(spaceOverrides ?? {}),
      behaviorDefaults: {
        ...(spaceOverrides?.behaviorDefaults ?? {}),
        windowSeconds: behaviorWindowSeconds,
        stepSeconds: behaviorStepSeconds,
      },
    };
    if (typeof runtime.buildUnifiedSpaceModel === "function") {
      return runtime.buildUnifiedSpaceModel(merged);
    }
    return {
      actionSpace: [],
      eventSpace: [],
      effectSpace: [],
    } satisfies RuntimeUnifiedModel;
  }, [runtimeModule, spaceOverrides, behaviorWindowSeconds, behaviorStepSeconds]);

  const runtimeFeatureSchema = useMemo((): RuntimeFeatureSchemaRow[] => {
    const runtime = runtimeModule as {
      getFeatureSchema?: (
        overrides?: SpaceVectorPackOverrides
      ) => RuntimeFeatureSchemaRow[];
    };
    return typeof runtime.getFeatureSchema === "function"
      ? runtime.getFeatureSchema(spaceOverrides)
      : [];
  }, [runtimeModule, spaceOverrides]);

  const runtimeModelSchemas = useMemo((): RuntimeModelSchemaRow[] => {
    const runtime = runtimeModule as {
      getModelSchemas?: (
        overrides?: SpaceVectorPackOverrides
      ) => RuntimeModelSchemaRow[];
    };
    const baseRows =
      typeof runtime.getModelSchemas === "function"
        ? runtime.getModelSchemas(spaceOverrides)
        : [];
    return migrateModelSchemasAwayFromBase(baseRows);
  }, [runtimeModule, spaceOverrides]);

  const featureDefaultsById = useMemo(
    () =>
      new Map(
        runtimeFeatureSchema.map(
          (row) => [row.featureId, row.defaultValue ?? 0] as const
        )
      ),
    [runtimeFeatureSchema]
  );

  const inferredKaelModelId = useMemo(() => {
    const ids = runtimeModelSchemas.map((row) => row.modelId);
    if (ids.includes("entity.kael")) return "entity.kael";
    if (ids.includes("entity.player")) return "entity.player";
    if (ids.includes("entity")) return "entity";
    const firstEntity = ids.find((id) => id.startsWith("entity."));
    return firstEntity ?? ids[0] ?? "none";
  }, [runtimeModelSchemas]);

  const selectableModelSchemas = useMemo(() => {
    const canonicalModelIds = [
      ...new Set(
        modelInstances.filter((row) => row.canonical).map((row) => row.modelId)
      ),
    ];
    const canonicalRows = canonicalModelIds
      .map((modelId) =>
        runtimeModelSchemas.find((row) => row.modelId === modelId)
      )
      .filter((row): row is RuntimeModelSchemaRow => !!row);
    return canonicalRows.length > 0 ? canonicalRows : runtimeModelSchemas;
  }, [modelInstances, runtimeModelSchemas]);

  const selectedModelForSpaceView = useMemo(() => {
    if (!activeModelSchemaId || activeModelSchemaId === NO_MODEL_SELECTED) {
      return null;
    }
    return (
      selectableModelSchemas.find((row) => row.modelId === activeModelSchemaId) ??
      null
    );
  }, [selectableModelSchemas, activeModelSchemaId]);

  const selectedModelForSpaceViewId = selectedModelForSpaceView?.modelId ?? "";

  const modelOptions = useMemo(
    () =>
      [...selectableModelSchemas].sort((a, b) =>
        a.modelId.localeCompare(b.modelId)
      ),
    [selectableModelSchemas]
  );

  const canonicalAssetOptions = useMemo(
    () =>
      modelInstances
        .filter((row) => row.canonical)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [modelInstances]
  );

  return {
    unifiedModel,
    runtimeFeatureSchema,
    runtimeModelSchemas,
    featureDefaultsById,
    inferredKaelModelId,
    selectedModelForSpaceView,
    selectedModelForSpaceViewId,
    modelOptions,
    canonicalAssetOptions,
  };
}
