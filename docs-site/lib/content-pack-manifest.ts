export type ContentPackBundle = {
  schemaVersion?: string;
  generatedAt?: string;
  patchName?: string;
  enginePackage?: { name?: string; version?: string };
  hashes?: Record<string, string>;
  packs?: Record<string, unknown>;
};

type FeatureSchemaRow = {
  featureId?: string;
  label?: string;
  groups?: string[];
  spaces?: string[];
  defaultValue?: number;
};

type ModelFeatureRef = {
  featureId?: string;
  spaces?: string[];
  required?: boolean;
  defaultValue?: number;
};

type ModelSchemaRow = {
  modelId?: string;
  label?: string;
  description?: string;
  extendsModelId?: string;
  featureRefs?: ModelFeatureRef[];
};

type ContentBindings = {
  canonicalModelInstances?: Array<{
    id?: string;
    name?: string;
    modelId?: string;
    canonical?: boolean;
  }>;
};

export type ManifestStatClass = {
  statClassId: string;
  label: string;
  description?: string;
  featureIds: string[];
};

export type ManifestModel = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  statClassRefs: string[];
  featureRefs: Array<{
    featureId: string;
    spaces: string[];
    required: boolean;
    defaultValue?: number;
  }>;
};

export type ManifestCanonicalAsset = {
  assetId: string;
  name: string;
  modelId: string;
  canonical: true;
};

export type ManifestSpace = {
  spaceId: string;
  label: string;
  featureIds: string[];
  modelIds: string[];
};

export type ContentPackManifest = {
  schemaVersion: "content-pack.manifest.v1";
  generatedAt: string;
  packIdentity: {
    packId: string;
    packVersion: string;
    packHash: string;
    schemaVersion: string;
    engineVersion: string;
  };
  statClasses: ManifestStatClass[];
  models: ManifestModel[];
  canonicalAssets: ManifestCanonicalAsset[];
  spaces: ManifestSpace[];
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asFeatureRows(value: unknown): FeatureSchemaRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => !!row && typeof row === "object") as FeatureSchemaRow[];
}

function asModelRows(value: unknown): ModelSchemaRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => !!row && typeof row === "object") as ModelSchemaRow[];
}

function asContentBindings(value: unknown): ContentBindings {
  return asObject(value) as ContentBindings;
}

function toLabel(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function collectStatClassRefs(modelId: string, modelsById: Map<string, ModelSchemaRow>): string[] {
  const refs: string[] = [];
  const visited = new Set<string>();
  let cursor = modelsById.get(modelId);
  while (cursor) {
    const id = String(cursor.modelId ?? "");
    if (!id || visited.has(id)) break;
    visited.add(id);
    if (id.endsWith("stats")) refs.push(id);
    const parent = String(cursor.extendsModelId ?? "");
    cursor = parent ? modelsById.get(parent) : undefined;
  }
  return uniqueSorted(refs);
}

export function buildContentPackManifest(bundle: ContentPackBundle, now: Date = new Date()): ContentPackManifest {
  const packs = asObject(bundle.packs);
  const spaceVectors = asObject(packs.spaceVectors);
  const featureRows = asFeatureRows(spaceVectors.featureSchema);
  const modelRows = asModelRows(spaceVectors.modelSchemas);
  const contentBindings = asContentBindings(spaceVectors.contentBindings);
  const modelsById = new Map(modelRows.map((row) => [String(row.modelId ?? ""), row] as const).filter(([id]) => !!id));

  const statClassRows = modelRows
    .filter((row) => String(row.modelId ?? "").endsWith("stats"))
    .map((row) => ({
      statClassId: String(row.modelId ?? ""),
      label: String(row.label ?? toLabel(String(row.modelId ?? ""))),
      description: row.description ? String(row.description) : undefined,
      featureIds: uniqueSorted((row.featureRefs ?? []).map((ref) => String(ref.featureId ?? ""))),
    }));

  const models = modelRows
    .filter((row) => !String(row.modelId ?? "").endsWith("stats"))
    .map((row) => {
      const modelId = String(row.modelId ?? "");
      return {
        modelId,
        label: String(row.label ?? toLabel(modelId)),
        description: row.description ? String(row.description) : undefined,
        extendsModelId: row.extendsModelId ? String(row.extendsModelId) : undefined,
        statClassRefs: collectStatClassRefs(modelId, modelsById),
        featureRefs: (row.featureRefs ?? []).map((ref) => ({
          featureId: String(ref.featureId ?? ""),
          spaces: uniqueSorted((ref.spaces ?? []).map((space) => String(space))),
          required: Boolean(ref.required),
          defaultValue: typeof ref.defaultValue === "number" ? ref.defaultValue : undefined,
        })),
      };
    });

  const canonicalAssets = (contentBindings.canonicalModelInstances ?? [])
    .filter((row) => row && row.canonical !== false)
    .map((row) => ({
      assetId: String(row.id ?? ""),
      name: String(row.name ?? row.id ?? "asset"),
      modelId: String(row.modelId ?? ""),
      canonical: true as const,
    }))
    .filter((row) => row.assetId.length > 0 && row.modelId.length > 0);

  const featuresBySpace = new Map<string, Set<string>>();
  for (const row of featureRows) {
    const featureId = String(row.featureId ?? "");
    for (const space of row.spaces ?? []) {
      const key = String(space);
      if (!featuresBySpace.has(key)) featuresBySpace.set(key, new Set<string>());
      if (featureId) featuresBySpace.get(key)!.add(featureId);
    }
  }
  const modelsBySpace = new Map<string, Set<string>>();
  for (const model of models) {
    for (const ref of model.featureRefs) {
      for (const space of ref.spaces) {
        if (!modelsBySpace.has(space)) modelsBySpace.set(space, new Set<string>());
        modelsBySpace.get(space)!.add(model.modelId);
      }
    }
  }
  const spaceIds = uniqueSorted([...featuresBySpace.keys(), ...modelsBySpace.keys()]);
  const spaces = spaceIds.map((spaceId) => ({
    spaceId,
    label: toLabel(spaceId),
    featureIds: uniqueSorted([...(featuresBySpace.get(spaceId) ?? new Set<string>())]),
    modelIds: uniqueSorted([...(modelsBySpace.get(spaceId) ?? new Set<string>())]),
  }));

  return {
    schemaVersion: "content-pack.manifest.v1",
    generatedAt: now.toISOString(),
    packIdentity: {
      packId: String(bundle.patchName ?? "content-pack.bundle.v1"),
      packVersion: String(bundle.generatedAt ?? "unknown"),
      packHash: String(bundle.hashes?.overall ?? "unknown"),
      schemaVersion: String(bundle.schemaVersion ?? "content-pack.bundle.v1"),
      engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
    },
    statClasses: statClassRows,
    models,
    canonicalAssets,
    spaces,
  };
}
