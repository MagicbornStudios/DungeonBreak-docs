type FeatureRefRow = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

type ModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  statModifiers?: Array<{
    modifierStatModelId: string;
    mappings: Array<{ modifierFeatureId: string; targetFeatureId: string }>;
  }>;
  featureRefs: FeatureRefRow[];
};

type CanonicalAssetRow = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

export function buildModelsSchemaJson(runtimeModelSchemas: ModelSchemaRow[]): string {
  return JSON.stringify(
    runtimeModelSchemas
      .filter((row) => !row.modelId.endsWith("stats"))
      .map((row) => ({
        modelId: row.modelId,
        label: row.label,
        description: row.description ?? "",
        extendsModelId: row.extendsModelId ?? null,
        attachedStatModelIds: row.attachedStatModelIds ?? [],
        statModifiers: row.statModifiers ?? [],
        featureRefs: row.featureRefs,
      })),
    null,
    2,
  );
}

export function buildStatsSchemaJson(runtimeModelSchemas: ModelSchemaRow[]): string {
  return JSON.stringify(
    runtimeModelSchemas
      .filter((row) => row.modelId.endsWith("stats"))
      .map((row) => ({
        modelId: row.modelId,
        label: row.label,
        description: row.description ?? "",
        extendsModelId: row.extendsModelId ?? null,
        statModifiers: row.statModifiers ?? [],
        featureRefs: row.featureRefs,
      })),
    null,
    2,
  );
}

export function buildCanonicalAssetsSchemaJson(modelInstances: CanonicalAssetRow[]): string {
  return JSON.stringify(
    modelInstances
      .filter((row) => row.canonical)
      .map((row) => ({ id: row.id, name: row.name, modelId: row.modelId, canonical: true })),
    null,
    2,
  );
}

export function parseModelSchemaRows(
  raw: string,
  sectionLabel: string,
  normalizeModelId: (value: string) => string,
): ModelSchemaRow[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${sectionLabel} must be a JSON array.`);
  }
  return parsed.map((item, index) => {
    const row = item as Partial<ModelSchemaRow>;
    if (!row.modelId || typeof row.modelId !== "string") {
      throw new Error(`${sectionLabel}[${index}] missing string modelId.`);
    }
    return {
      modelId: normalizeModelId(row.modelId),
      label: typeof row.label === "string" ? row.label : normalizeModelId(row.modelId),
      description: typeof row.description === "string" ? row.description : undefined,
      extendsModelId: typeof row.extendsModelId === "string" ? normalizeModelId(row.extendsModelId) : undefined,
      attachedStatModelIds: Array.isArray(row.attachedStatModelIds)
        ? row.attachedStatModelIds.filter((v): v is string => typeof v === "string").map((v) => normalizeModelId(v))
        : undefined,
      statModifiers: Array.isArray((row as { statModifiers?: unknown }).statModifiers)
        ? ((row as { statModifiers?: unknown }).statModifiers as unknown[])
            .map((modifier) => modifier as {
              modifierStatModelId?: unknown;
              mappings?: unknown;
            })
            .filter((modifier) => typeof modifier.modifierStatModelId === "string")
            .map((modifier) => ({
              modifierStatModelId: normalizeModelId(modifier.modifierStatModelId as string),
              mappings: Array.isArray(modifier.mappings)
                ? modifier.mappings
                    .map((mapping) => mapping as { modifierFeatureId?: unknown; targetFeatureId?: unknown })
                    .filter(
                      (mapping): mapping is { modifierFeatureId: string; targetFeatureId: string } =>
                        typeof mapping.modifierFeatureId === "string" &&
                        typeof mapping.targetFeatureId === "string",
                    )
                    .map((mapping) => ({
                      modifierFeatureId: mapping.modifierFeatureId,
                      targetFeatureId: mapping.targetFeatureId,
                    }))
                : [],
            }))
        : undefined,
      featureRefs: Array.isArray(row.featureRefs)
        ? row.featureRefs.reduce<ModelSchemaRow["featureRefs"]>((acc, ref) => {
            const next = ref as ModelSchemaRow["featureRefs"][number];
            if (!next?.featureId || typeof next.featureId !== "string") return acc;
            acc.push({
              featureId: next.featureId,
              spaces: Array.isArray(next.spaces) ? next.spaces.filter((v): v is string => typeof v === "string") : ["entity"],
              required: Boolean(next.required),
              defaultValue: typeof next.defaultValue === "number" ? next.defaultValue : undefined,
            });
            return acc;
          }, [])
        : [],
    };
  });
}

export function parseCanonicalAssets(
  raw: string,
  normalizeModelId: (value: string) => string,
  formatModelIdForUi: (value: string) => string,
): CanonicalAssetRow[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("canonical assets JSON must be an array.");
  }
  return parsed
    .map((item) => item as Partial<CanonicalAssetRow>)
    .filter((item) => typeof item.id === "string" && typeof item.modelId === "string")
    .map((item) => ({
      id: item.id as string,
      modelId: normalizeModelId(item.modelId as string),
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : formatModelIdForUi(item.modelId as string),
      canonical: true,
    }));
}
