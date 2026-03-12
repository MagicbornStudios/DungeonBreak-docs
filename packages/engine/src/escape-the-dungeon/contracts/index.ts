import contentSourceJson from "../contracts/source/content-source.json";
import {
  Convert as ContentPackBundleConvert,
  type ContentPackBundle as GeneratedContentPackBundle,
} from "../contracts/generated/content-pack-bundle";
import { Convert as ContentSourceConvert, type ContentSource } from "../contracts/generated/content-source";

export type NumberMap = Record<string, number>;

export type RuntimeFeatureDefinition = {
  featureId: string;
  label: string;
  description?: string;
  groups: string[];
  defaultValue: number;
};

export type RuntimeModelFeatureRef = {
  featureId: string;
  required?: boolean;
  defaultValue?: number;
};

export type StatModifierMapping = {
  modifierFeatureId: string;
  targetFeatureId: string;
};

export type StatModifier = {
  modifierStatModelId: string;
  mappings: StatModifierMapping[];
};

export type RuntimeModelDefinition = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  statModifiers?: StatModifier[];
  featureRefs: RuntimeModelFeatureRef[];
};

export type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

export type ContentBindings = {
  modelInstances: ModelInstanceBinding[];
  canonicalModelInstances: ModelInstanceBinding[];
};

export type FeaturePack = {
  basisId: string;
  label: string;
  description?: string;
  traits: NumberMap;
};

export type SpaceVectorPack = {
  featureSchema: RuntimeFeatureDefinition[];
  modelSchemas: RuntimeModelDefinition[];
  contentBindings: ContentBindings;
  contentFeatures: FeaturePack[];
  powerFeatures: FeaturePack[];
  thematicBasisTraits: FeaturePack[];
  actionSemantics: Record<string, NumberMap>;
  roomSemantics: Record<string, NumberMap>;
  eventSemantics: {
    metric: Record<string, NumberMap>;
    kind: Record<string, NumberMap>;
  };
  itemSemantics: {
    tagWeights: Record<string, NumberMap>;
    rarityWeights: Record<string, NumberMap>;
  };
  behaviorDefaults: {
    windowSeconds: number;
    stepSeconds: number;
    actionStyle: Record<string, string>;
    eventStyle: Record<string, string>;
    roomStyle: Record<string, string>;
  };
  entityProjection: {
    healthRiskScale: number;
    energyRecoveryScale: number;
    reputationVisibilityScale: number;
    pressureHealthScale: number;
    pressureReputationScale: number;
  };
  levelSemantics: {
    combatRoomPressureScale: number;
    restRoomRecoveryScale: number;
  };
};

export type ContentSchemaDocument = {
  $schema?: string;
  schemaVersion: string;
  featureSchema: RuntimeFeatureDefinition[];
  modelSchemas: RuntimeModelDefinition[];
  contentBindings?: ContentBindings;
};

export type ContentPackBundle = GeneratedContentPackBundle;
export type ContentSourceDocument = ContentSource;

const parseGenerated = <T>(value: unknown, decode: (json: string) => T): T => {
  return decode(typeof value === "string" ? value : JSON.stringify(value));
};

const contentSourceDocument = parseGenerated(contentSourceJson, ContentSourceConvert.toContentSource);

const normalizeContentBindings = (value: Partial<ContentBindings> | undefined): ContentBindings => ({
  modelInstances: Array.isArray(value?.modelInstances) ? value.modelInstances : [],
  canonicalModelInstances: Array.isArray(value?.canonicalModelInstances) ? value.canonicalModelInstances : [],
});

const normalizeFeatureSchema = (value: unknown): RuntimeFeatureDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    return {
      featureId: String(record.featureId ?? ""),
      label: String(record.label ?? record.featureId ?? ""),
      description: typeof record.description === "string" ? record.description : undefined,
      groups: Array.isArray(record.groups) ? record.groups.map((group) => String(group)) : [],
      defaultValue: typeof record.defaultValue === "number" ? record.defaultValue : 0,
    };
  });
};

const normalizeModelSchemas = (value: unknown): RuntimeModelDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    const featureRefs = Array.isArray(record.featureRefs)
      ? record.featureRefs.map((ref) => {
          const refRecord = (ref ?? {}) as Record<string, unknown>;
          return {
            featureId: String(refRecord.featureId ?? ""),
            required: typeof refRecord.required === "boolean" ? refRecord.required : undefined,
            defaultValue: typeof refRecord.defaultValue === "number" ? refRecord.defaultValue : undefined,
          };
        })
      : [];
    const statModifiers = Array.isArray(record.statModifiers)
      ? record.statModifiers.map((modifier) => {
          const modifierRecord = (modifier ?? {}) as Record<string, unknown>;
          const mappings = Array.isArray(modifierRecord.mappings)
            ? modifierRecord.mappings.map((mapping) => {
                const mappingRecord = (mapping ?? {}) as Record<string, unknown>;
                return {
                  modifierFeatureId: String(mappingRecord.modifierFeatureId ?? ""),
                  targetFeatureId: String(mappingRecord.targetFeatureId ?? ""),
                };
              })
            : [];
          return {
            modifierStatModelId: String(modifierRecord.modifierStatModelId ?? ""),
            mappings,
          };
        })
      : undefined;
    return {
      modelId: String(record.modelId ?? ""),
      label: String(record.label ?? record.modelId ?? ""),
      description: typeof record.description === "string" ? record.description : undefined,
      extendsModelId: typeof record.extendsModelId === "string" ? record.extendsModelId : undefined,
      attachedStatModelIds: Array.isArray(record.attachedStatModelIds)
        ? record.attachedStatModelIds.map((item) => String(item))
        : undefined,
      statModifiers,
      featureRefs,
    };
  });
};

const normalizeFeaturePacks = (value: unknown): FeaturePack[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    const traits =
      record.traits && typeof record.traits === "object" && !Array.isArray(record.traits)
        ? Object.fromEntries(
            Object.entries(record.traits as Record<string, unknown>).map(([key, amount]) => [key, Number(amount ?? 0)]),
          )
        : {};
    return {
      basisId: String(record.basisId ?? ""),
      label: String(record.label ?? record.basisId ?? ""),
      description: typeof record.description === "string" ? record.description : undefined,
      traits,
    };
  });
};

const contentSchemaRecord = contentSourceDocument.contentSchema as unknown as Record<string, unknown>;
const vectorRuntimeRecord = contentSourceDocument.vectorRuntime as unknown as Record<string, unknown>;

export const CONTENT_SOURCE_DOCUMENT: ContentSourceDocument = contentSourceDocument;

export const CONTENT_SCHEMA_DOCUMENT: ContentSchemaDocument = {
  $schema: typeof contentSchemaRecord.$schema === "string" ? contentSchemaRecord.$schema : undefined,
  schemaVersion: String(contentSchemaRecord.schemaVersion ?? "content-schema.v1"),
  featureSchema: normalizeFeatureSchema(contentSchemaRecord.featureSchema),
  modelSchemas: normalizeModelSchemas(contentSchemaRecord.modelSchemas),
  contentBindings: contentSchemaRecord.contentBindings
    ? normalizeContentBindings(contentSchemaRecord.contentBindings as Partial<ContentBindings>)
    : undefined,
};

const resolvedContentFeatures = normalizeFeaturePacks(vectorRuntimeRecord.contentFeatures);

export const SPACE_VECTOR_PACK: SpaceVectorPack = {
  featureSchema: CONTENT_SCHEMA_DOCUMENT.featureSchema,
  modelSchemas: CONTENT_SCHEMA_DOCUMENT.modelSchemas,
  contentBindings: normalizeContentBindings(CONTENT_SCHEMA_DOCUMENT.contentBindings),
  contentFeatures: resolvedContentFeatures,
  powerFeatures: normalizeFeaturePacks(vectorRuntimeRecord.powerFeatures),
  thematicBasisTraits: resolvedContentFeatures,
  actionSemantics:
    vectorRuntimeRecord.actionSemantics && typeof vectorRuntimeRecord.actionSemantics === "object"
      ? (vectorRuntimeRecord.actionSemantics as Record<string, NumberMap>)
      : {},
  roomSemantics:
    vectorRuntimeRecord.roomSemantics && typeof vectorRuntimeRecord.roomSemantics === "object"
      ? (vectorRuntimeRecord.roomSemantics as Record<string, NumberMap>)
      : {},
  eventSemantics: {
    metric:
      vectorRuntimeRecord.eventSemantics &&
      typeof vectorRuntimeRecord.eventSemantics === "object" &&
      (vectorRuntimeRecord.eventSemantics as Record<string, unknown>).metric &&
      typeof (vectorRuntimeRecord.eventSemantics as Record<string, unknown>).metric === "object"
        ? ((vectorRuntimeRecord.eventSemantics as Record<string, unknown>).metric as Record<string, NumberMap>)
        : {},
    kind:
      vectorRuntimeRecord.eventSemantics &&
      typeof vectorRuntimeRecord.eventSemantics === "object" &&
      (vectorRuntimeRecord.eventSemantics as Record<string, unknown>).kind &&
      typeof (vectorRuntimeRecord.eventSemantics as Record<string, unknown>).kind === "object"
        ? ((vectorRuntimeRecord.eventSemantics as Record<string, unknown>).kind as Record<string, NumberMap>)
        : {},
  },
  itemSemantics: {
    tagWeights:
      vectorRuntimeRecord.itemSemantics &&
      typeof vectorRuntimeRecord.itemSemantics === "object" &&
      (vectorRuntimeRecord.itemSemantics as Record<string, unknown>).tagWeights &&
      typeof (vectorRuntimeRecord.itemSemantics as Record<string, unknown>).tagWeights === "object"
        ? ((vectorRuntimeRecord.itemSemantics as Record<string, unknown>).tagWeights as Record<string, NumberMap>)
        : {},
    rarityWeights:
      vectorRuntimeRecord.itemSemantics &&
      typeof vectorRuntimeRecord.itemSemantics === "object" &&
      (vectorRuntimeRecord.itemSemantics as Record<string, unknown>).rarityWeights &&
      typeof (vectorRuntimeRecord.itemSemantics as Record<string, unknown>).rarityWeights === "object"
        ? ((vectorRuntimeRecord.itemSemantics as Record<string, unknown>).rarityWeights as Record<string, NumberMap>)
        : {},
  },
  behaviorDefaults: {
    windowSeconds:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).windowSeconds === "number"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).windowSeconds as number)
        : 5,
    stepSeconds:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).stepSeconds === "number"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).stepSeconds as number)
        : 1,
    actionStyle:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).actionStyle &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).actionStyle === "object"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).actionStyle as Record<string, string>)
        : {},
    eventStyle:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).eventStyle &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).eventStyle === "object"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).eventStyle as Record<string, string>)
        : {},
    roomStyle:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).roomStyle &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).roomStyle === "object"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>).roomStyle as Record<string, string>)
        : {},
  },
  entityProjection:
    vectorRuntimeRecord.entityProjection && typeof vectorRuntimeRecord.entityProjection === "object"
      ? {
          healthRiskScale: Number((vectorRuntimeRecord.entityProjection as Record<string, unknown>).healthRiskScale ?? 1),
          energyRecoveryScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>).energyRecoveryScale ?? 1,
          ),
          reputationVisibilityScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>).reputationVisibilityScale ?? 0.02,
          ),
          pressureHealthScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>).pressureHealthScale ?? 0.8333333333,
          ),
          pressureReputationScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>).pressureReputationScale ?? 0.005,
          ),
        }
      : {
          healthRiskScale: 1,
          energyRecoveryScale: 1,
          reputationVisibilityScale: 0.02,
          pressureHealthScale: 0.8333333333,
          pressureReputationScale: 0.005,
        },
  levelSemantics:
    vectorRuntimeRecord.levelSemantics && typeof vectorRuntimeRecord.levelSemantics === "object"
      ? {
          combatRoomPressureScale: Number(
            (vectorRuntimeRecord.levelSemantics as Record<string, unknown>).combatRoomPressureScale ?? 4,
          ),
          restRoomRecoveryScale: Number(
            (vectorRuntimeRecord.levelSemantics as Record<string, unknown>).restRoomRecoveryScale ?? 5,
          ),
        }
      : {
          combatRoomPressureScale: 4,
          restRoomRecoveryScale: 5,
        },
};

export const ACTION_CATALOG = contentSourceDocument.packs.actionCatalog;
export const ACTION_INTENTS = contentSourceDocument.packs.actionIntents;
export const ACTION_POLICIES = contentSourceDocument.packs.actionPolicies;
export const ACTION_CONTRACTS = contentSourceDocument.packs.actionContracts;
export const ROOM_TEMPLATES = contentSourceDocument.packs.roomTemplates;
export const DUNGEON_LAYOUT_PACK = contentSourceDocument.packs.dungeonLayouts;
export const ITEM_PACK = contentSourceDocument.packs.itemPack;
export const SKILL_PACK = contentSourceDocument.packs.skillPack;
export const ARCHETYPE_PACK = contentSourceDocument.packs.archetypePack;
export const DIALOGUE_PACK = contentSourceDocument.packs.dialoguePack;
export const CUTSCENE_PACK = contentSourceDocument.packs.cutscenePack;
export const QUEST_PACK = contentSourceDocument.packs.questPack;
export const EVENT_PACK = contentSourceDocument.packs.eventPack;

export const decodeContentSourceDocument = (value: string | unknown): ContentSourceDocument => {
  return parseGenerated(value, ContentSourceConvert.toContentSource);
};

export const decodeContentPackBundle = (value: string | unknown): ContentPackBundle => {
  return parseGenerated(value, ContentPackBundleConvert.toContentPackBundle);
};

export const CANONICAL_SEED_V1 = ACTION_CONTRACTS.canonicalSeedV1;
