import type { ContentDimensionLayerId } from "@/lib/content-dimension";
import type { PackIdentity } from "@/lib/space-explorer-shared";
export const TEST_MODE_LOADING_STATES = [
  { text: "Building content pack bundle" },
  { text: "Resolving object overrides" },
  { text: "Running browser playthrough" },
  { text: "Binding pack + report identity" },
  { text: "Refreshing explorer visualization" },
] as const;
export const NO_MODEL_SELECTED = "__none__";

export const DIMENSION_LAYER_CONFIG: Record<
  ContentDimensionLayerId,
  { label: string; color: string; enabledByDefault: boolean }
> = {
  "schema-model": {
    label: "Schema Models",
    color: "#60a5fa",
    enabledByDefault: true,
  },
  "canonical-asset": {
    label: "Canonical Assets",
    color: "#34d399",
    enabledByDefault: true,
  },
};

export type SpaceVectorPackOverrides = Record<string, unknown>;

export type RuntimeFeatureSchemaRow = {
  featureId: string;
  label: string;
  groups: string[];
  defaultValue?: number;
};

export type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  statModifiers?: Array<{
    modifierStatModelId: string;
    mappings: Array<{ modifierFeatureId: string; targetFeatureId: string }>;
  }>;
  featureRefs: Array<{
    featureId: string;
    required?: boolean;
    defaultValue?: number;
  }>;
};

export type SpaceVectorsPatchPayload = {
  featureSchema: RuntimeFeatureSchemaRow[];
  modelSchemas: RuntimeModelSchemaRow[];
};

export type PatchDraft = {
  id: string;
  name: string;
  createdAt: string;
  patch: SpaceVectorsPatchPayload;
};

export type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

export type ModelMigrationOp = {
  id: string;
  instanceId: string;
  fromModelId: string;
  toModelId: string;
  at: string;
};

export type ModelSpaceOverlayPoint = {
  id: string;
  name: string;
  coords: { x: number; y: number; z: number };
  vector: number[];
};

export type PackScopeTreeNode = {
  id: string;
  modelId: string;
  label: string;
  depth: number;
  children: PackScopeTreeNode[];
  canonicalAssets: ModelInstanceBinding[];
};

export const PATCH_DRAFTS_STORAGE_KEY = "dungeonbreak.spacevectors.patch.drafts.v1";

export function validatePatchSchema(patch: SpaceVectorsPatchPayload): string[] {
  const errors: string[] = [];
  const featureIds = patch.featureSchema
    .map((row) => row.featureId.trim())
    .filter((id) => id.length > 0);
  const modelIds = patch.modelSchemas
    .map((row) => row.modelId.trim())
    .filter((id) => id.length > 0);
  const uniqueFeatureIds = new Set(featureIds);
  const uniqueModelIds = new Set(modelIds);
  if (featureIds.length !== uniqueFeatureIds.size) {
    errors.push("Duplicate featureId detected in featureSchema.");
  }
  if (modelIds.length !== uniqueModelIds.size) {
    errors.push("Duplicate modelId detected in modelSchemas.");
  }
  for (const model of patch.modelSchemas) {
    if (!model.modelId.trim()) {
      errors.push("modelSchemas contains an empty modelId.");
      continue;
    }
    if (model.featureRefs.length === 0 && !model.extendsModelId) {
      errors.push(`Model '${model.modelId}' has no featureRefs.`);
      continue;
    }
    for (const ref of model.featureRefs) {
      if (!uniqueFeatureIds.has(ref.featureId)) {
        errors.push(
          `Model '${model.modelId}' references unknown featureId '${ref.featureId}'.`
        );
      }
    }
  }
  return [...new Set(errors)];
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ContentPoint = {
  type: string;
  id: string;
  name: string;
  branch: string;
  vector: number[];
  vectorCombined?: number[];
  x: number;
  y: number;
  z: number;
  xCombined?: number;
  yCombined?: number;
  zCombined?: number;
  cluster?: number;
  unlockRadius?: number;
};

export type SpaceData = {
  schemaVersion: string;
  vectorNames: string[];
  combinedVectorExtensionNames: string[];
  pca?: { mean: number[]; components: number[][] };
  projections?: {
    vector?: { pca: { mean: number[]; components: number[][] } };
    combined?: { pca: { mean: number[]; components: number[][] } };
  };
  content: ContentPoint[];
};

export const EMPTY_SPACE_DATA: SpaceData = {
  schemaVersion: "space-data.empty.v1",
  vectorNames: [],
  combinedVectorExtensionNames: [],
  content: [],
};

export type RuntimeVizPoint = {
  id: string;
  name: string;
  type: "action" | "event" | "effect";
  branch: string;
  vector: number[];
  coords: { x: number; y: number; z: number };
  similarity: number;
  netImpact?: number;
  behaviorStyle?: string;
};

export type ReportIdentity = {
  source: string;
  reportId?: string;
  packId?: string;
  packVersion?: string;
  packHash?: string;
  schemaVersion?: string;
  engineVersion?: string;
};

export type PackSelectOption = {
  id: string;
  label: string;
  timestamp?: string;
  kind: "bundle" | "content-pack-report" | "uploaded";
  reportId?: string;
  overrides?: SpaceVectorPackOverrides;
  identity?: PackIdentity;
};

export type ReportSelectOption = {
  id: string;
  label: string;
  kind: "api" | "session";
};

export type BuiltBundlePayload = {
  schemaVersion?: string;
  patchName?: string;
  generatedAt?: string;
  hashes?: { overall?: string };
  enginePackage?: { version?: string };
  packs?: { spaceVectors?: SpaceVectorPackOverrides };
};
