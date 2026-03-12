import type { SpaceVectorPack } from "./escape-the-dungeon/contracts";
import {
  LEVEL_CONTENT_DOCUMENT_VERSION,
  type LevelContentDocument,
  type LevelContentPack,
} from "./level-content";

export const CONTENT_SCHEMA_DOCUMENT_VERSION = "content-schema.document.v1";
export const CANONICAL_INSTANCES_DOCUMENT_VERSION =
  "canonical-instances.document.v1";
export const GAME_OVERLAY_DOCUMENT_VERSION = "game-overlay.document.v1";
export { LEVEL_CONTENT_DOCUMENT_VERSION } from "./level-content";

export const SPACE_VECTOR_SCHEMA_KEYS = [
  "featureSchema",
  "modelSchemas",
  "contentFeatures",
  "powerFeatures",
  "thematicBasisTraits",
  "actionSemantics",
  "roomSemantics",
  "eventSemantics",
  "itemSemantics",
  "behaviorDefaults",
  "entityProjection",
  "levelSemantics",
] as const;

type SpaceVectorSchemaKey = (typeof SPACE_VECTOR_SCHEMA_KEYS)[number];

export type SpaceVectorSchemaPatch = Partial<
  Pick<SpaceVectorPack, SpaceVectorSchemaKey>
>;

export type CanonicalInstancesPatch = Partial<
  SpaceVectorPack["contentBindings"]
>;

export type ContentSchemaDocumentMetadata = Omit<
  ContentSchemaDocument,
  "schemaVersion" | keyof SpaceVectorSchemaPatch
>;

export type CanonicalInstancesDocumentMetadata = Omit<
  CanonicalInstancesDocument,
  "schemaVersion" | "modelInstances" | "canonicalModelInstances"
>;

export type LevelContentDocumentMetadata = Omit<
  LevelContentDocument,
  "schemaVersion" | "levels" | "dungeonRuns"
>;

export type ContentSchemaDocument = {
  schemaVersion: typeof CONTENT_SCHEMA_DOCUMENT_VERSION;
  schemaId?: string;
  title?: string;
  description?: string;
  generatedAt?: string;
} & SpaceVectorSchemaPatch;

export type CanonicalInstancesDocument = {
  schemaVersion: typeof CANONICAL_INSTANCES_DOCUMENT_VERSION;
  documentId?: string;
  title?: string;
  description?: string;
  generatedAt?: string;
  modelInstances?: SpaceVectorPack["contentBindings"]["modelInstances"];
  canonicalModelInstances?: SpaceVectorPack["contentBindings"]["canonicalModelInstances"];
};

export type GameOverlayDocument = {
  schemaVersion: typeof GAME_OVERLAY_DOCUMENT_VERSION;
  overlayId: string;
  label: string;
  description?: string;
  warningCategories: string[];
};

const DOCUMENT_METADATA_KEYS = new Set([
  "schemaVersion",
  "schemaId",
  "title",
  "description",
  "generatedAt",
  "documentId",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStructuredValue(
  value: unknown
): value is Record<string, unknown> | unknown[] {
  return Array.isArray(value) || isRecord(value);
}

function copyStructuredValue<T extends Record<string, unknown> | unknown[]>(
  value: T
): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeSpaceVectorSchemaValue(
  key: SpaceVectorSchemaKey,
  value: unknown
): SpaceVectorPack[SpaceVectorSchemaKey] | undefined {
  if (!isStructuredValue(value)) {
    return undefined;
  }
  const expectedRecordKeys = new Set<SpaceVectorSchemaKey>([
    "actionSemantics",
    "roomSemantics",
    "eventSemantics",
    "itemSemantics",
    "behaviorDefaults",
    "entityProjection",
    "levelSemantics",
  ]);
  if (expectedRecordKeys.has(key) && !isRecord(value)) {
    return undefined;
  }
  if (!expectedRecordKeys.has(key) && !Array.isArray(value)) {
    return undefined;
  }
  return copyStructuredValue(value) as SpaceVectorPack[SpaceVectorSchemaKey];
}

function setSpaceVectorSchemaValue<K extends SpaceVectorSchemaKey>(
  target: SpaceVectorSchemaPatch,
  key: K,
  value: SpaceVectorPack[K]
): void {
  (target as SpaceVectorSchemaPatch & Pick<SpaceVectorPack, K>)[key] = value;
}

export function extractSpaceVectorSchemaPatch(
  value: unknown
): SpaceVectorSchemaPatch {
  if (!isRecord(value)) {
    return {};
  }
  const next: SpaceVectorSchemaPatch = {};
  for (const key of SPACE_VECTOR_SCHEMA_KEYS) {
    const normalized = normalizeSpaceVectorSchemaValue(key, value[key]);
    if (normalized !== undefined) {
      setSpaceVectorSchemaValue(next, key, normalized);
    }
  }
  return next;
}

export function extractCanonicalInstancesPatch(
  value: unknown
): CanonicalInstancesPatch | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const contentBindings = isRecord(value.contentBindings)
    ? value.contentBindings
    : value;
  const next: CanonicalInstancesPatch = {};
  if (Array.isArray(contentBindings.modelInstances)) {
    next.modelInstances = copyStructuredValue(contentBindings.modelInstances);
  }
  if (Array.isArray(contentBindings.canonicalModelInstances)) {
    next.canonicalModelInstances = copyStructuredValue(
      contentBindings.canonicalModelInstances
    );
  }
  return next.modelInstances || next.canonicalModelInstances ? next : undefined;
}

export function extractLevelContentPatch(
  value: unknown
): LevelContentPack | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const levels = Array.isArray(value.levels)
    ? copyStructuredValue(value.levels)
    : undefined;
  const dungeonRuns = Array.isArray(value.dungeonRuns)
    ? copyStructuredValue(value.dungeonRuns)
    : undefined;
  if (!levels && !dungeonRuns) {
    return undefined;
  }
  return {
    levels: (levels ?? []) as LevelContentPack["levels"],
    ...(dungeonRuns
      ? { dungeonRuns: dungeonRuns as LevelContentPack["dungeonRuns"] }
      : {}),
  };
}

export function isContentSchemaDocument(
  value: unknown
): value is ContentSchemaDocument {
  return (
    isRecord(value) && value.schemaVersion === CONTENT_SCHEMA_DOCUMENT_VERSION
  );
}

export function isCanonicalInstancesDocument(
  value: unknown
): value is CanonicalInstancesDocument {
  return (
    isRecord(value) &&
    value.schemaVersion === CANONICAL_INSTANCES_DOCUMENT_VERSION
  );
}

export function isGameOverlayDocument(
  value: unknown
): value is GameOverlayDocument {
  return (
    isRecord(value) && value.schemaVersion === GAME_OVERLAY_DOCUMENT_VERSION
  );
}

export function isLevelContentDocument(
  value: unknown
): value is LevelContentDocument {
  return (
    isRecord(value) && value.schemaVersion === LEVEL_CONTENT_DOCUMENT_VERSION
  );
}

export function buildContentSchemaDocument(
  source: unknown,
  metadata?: ContentSchemaDocumentMetadata
): ContentSchemaDocument {
  const patch = extractSpaceVectorSchemaPatch(source);
  return {
    schemaVersion: CONTENT_SCHEMA_DOCUMENT_VERSION,
    ...(metadata ?? {}),
    ...patch,
  };
}

export function buildCanonicalInstancesDocument(
  source: unknown,
  metadata?: CanonicalInstancesDocumentMetadata
): CanonicalInstancesDocument {
  const patch = extractCanonicalInstancesPatch(source) ?? {};
  return {
    schemaVersion: CANONICAL_INSTANCES_DOCUMENT_VERSION,
    ...(metadata ?? {}),
    ...(patch.modelInstances ? { modelInstances: patch.modelInstances } : {}),
    ...(patch.canonicalModelInstances
      ? { canonicalModelInstances: patch.canonicalModelInstances }
      : {}),
  };
}

export function buildLevelContentDocument(
  source: unknown,
  metadata?: LevelContentDocumentMetadata
): LevelContentDocument {
  const patch = extractLevelContentPatch(source) ?? { levels: [] };
  return {
    schemaVersion: LEVEL_CONTENT_DOCUMENT_VERSION,
    ...(metadata ?? {}),
    levels: patch.levels,
    ...(patch.dungeonRuns ? { dungeonRuns: patch.dungeonRuns } : {}),
  };
}

export function toSpaceVectorPackFromDocuments(input: {
  schema?: unknown;
  canonicalInstances?: unknown;
  levelContent?: unknown;
}): SpaceVectorSchemaPatch & {
  contentBindings?: CanonicalInstancesPatch;
  levelContent?: LevelContentPack;
} {
  const schemaPatch = extractSpaceVectorSchemaPatch(input.schema);
  const contentBindings = extractCanonicalInstancesPatch(
    input.canonicalInstances
  );
  const levelContent = extractLevelContentPatch(input.levelContent);
  return {
    ...schemaPatch,
    ...(contentBindings ? { contentBindings } : {}),
    ...(levelContent ? { levelContent } : {}),
  };
}

export function summarizeContentSchemaDocument(value: unknown): {
  kind:
    | "content-schema"
    | "canonical-instances"
    | "level-content"
    | "game-overlay"
    | "space-vector-patch"
    | "unknown";
  metadata: Record<string, unknown>;
} {
  if (isContentSchemaDocument(value)) {
    return {
      kind: "content-schema",
      metadata: Object.fromEntries(
        Object.entries(value).filter(([key]) => DOCUMENT_METADATA_KEYS.has(key))
      ),
    };
  }
  if (isCanonicalInstancesDocument(value)) {
    return {
      kind: "canonical-instances",
      metadata: Object.fromEntries(
        Object.entries(value).filter(([key]) => DOCUMENT_METADATA_KEYS.has(key))
      ),
    };
  }
  if (isLevelContentDocument(value)) {
    return {
      kind: "level-content",
      metadata: {
        ...Object.fromEntries(
          Object.entries(value).filter(([key]) =>
            DOCUMENT_METADATA_KEYS.has(key)
          )
        ),
        levelCount: Array.isArray(value.levels) ? value.levels.length : 0,
        dungeonRunCount: Array.isArray(value.dungeonRuns)
          ? value.dungeonRuns.length
          : 0,
      },
    };
  }
  if (isGameOverlayDocument(value)) {
    return {
      kind: "game-overlay",
      metadata: {
        overlayId: value.overlayId,
        label: value.label,
        warningCategories: [...value.warningCategories],
      },
    };
  }
  if (Object.keys(extractSpaceVectorSchemaPatch(value)).length > 0) {
    return {
      kind: "space-vector-patch",
      metadata: {},
    };
  }
  return {
    kind: "unknown",
    metadata: {},
  };
}
