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

export type SchemaVersionSnapshot = {
  modelsHash: string;
  statsHash: string;
  canonicalHash: string;
};
export type SchemaSnapshotSection = "models" | "stats" | "canonical";

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function buildSchemaVersionSnapshot(input: {
  modelsJson: string;
  statsJson: string;
  canonicalJson: string;
}): SchemaVersionSnapshot {
  return {
    modelsHash: hashString(input.modelsJson),
    statsHash: hashString(input.statsJson),
    canonicalHash: hashString(input.canonicalJson),
  };
}

export function hasSchemaSnapshotChanged(
  current: SchemaVersionSnapshot,
  next: SchemaVersionSnapshot,
): boolean {
  return (
    current.modelsHash !== next.modelsHash ||
    current.statsHash !== next.statsHash ||
    current.canonicalHash !== next.canonicalHash
  );
}

export function hasSchemaSnapshotChangedForSections(
  current: SchemaVersionSnapshot,
  next: SchemaVersionSnapshot,
  sections: SchemaSnapshotSection[],
): boolean {
  for (const section of sections) {
    if (section === "models" && current.modelsHash !== next.modelsHash) return true;
    if (section === "stats" && current.statsHash !== next.statsHash) return true;
    if (section === "canonical" && current.canonicalHash !== next.canonicalHash) return true;
  }
  return false;
}

export function validateModelSchemaRows(rows: ModelSchemaRow[]): string[] {
  const errors: string[] = [];
  const modelIds = rows.map((row) => row.modelId);
  const uniqueModelIds = new Set(modelIds);
  if (uniqueModelIds.size !== modelIds.length) {
    errors.push("Duplicate modelId values detected.");
  }
  for (const row of rows) {
    if (row.extendsModelId && !uniqueModelIds.has(row.extendsModelId)) {
      errors.push(`Model '${row.modelId}' extends unknown model '${row.extendsModelId}'.`);
    }
    if (row.attachedStatModelIds?.length) {
      for (const attachedStatId of row.attachedStatModelIds) {
        if (!uniqueModelIds.has(attachedStatId)) {
          errors.push(`Model '${row.modelId}' attaches unknown stat set '${attachedStatId}'.`);
        }
      }
    }
    if (row.statModifiers?.length) {
      for (const modifier of row.statModifiers) {
        if (!uniqueModelIds.has(modifier.modifierStatModelId)) {
          errors.push(
            `Model '${row.modelId}' references unknown modifier stat set '${modifier.modifierStatModelId}'.`,
          );
        }
      }
    }
  }
  return [...new Set(errors)];
}

export function validateCanonicalAssets(
  assets: CanonicalAssetRow[],
  knownModelIds: Set<string>,
): string[] {
  const errors: string[] = [];
  const assetIds = assets.map((asset) => asset.id);
  if (new Set(assetIds).size !== assetIds.length) {
    errors.push("Duplicate canonical asset id values detected.");
  }
  for (const asset of assets) {
    if (!knownModelIds.has(asset.modelId)) {
      errors.push(`Canonical asset '${asset.id}' references unknown model '${asset.modelId}'.`);
    }
  }
  return [...new Set(errors)];
}
