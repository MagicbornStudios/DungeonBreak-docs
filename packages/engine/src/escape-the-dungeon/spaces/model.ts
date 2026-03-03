import {
  ACTION_CATALOG,
  ACTION_CONTRACTS,
  EVENT_PACK,
  ROOM_TEMPLATES,
  SPACE_VECTOR_PACK,
  type SpaceVectorPack,
} from "../contracts";
import {
  FEATURE_NAMES,
  PLAYER_ACTION_TYPES,
  ROOM_FEATURES,
  TRAIT_NAMES,
  type FeatureName,
  type NumberMap,
  type PlayerActionType,
  type RoomFeature,
  type TraitName,
} from "../core/types";

export const SPACE_AXES = [
  "combatIntensity",
  "socialIntensity",
  "explorationIntensity",
  "craftingIntensity",
  "recoveryIntensity",
  "risk",
  "pressure",
  "mobility",
  "visibility",
] as const;
// Backward compatibility alias.
export const SEMANTIC_AXES = SPACE_AXES;

export type SpaceAxis = (typeof SPACE_AXES)[number];
export type SemanticAxis = SpaceAxis;

export type TraitVectorMap = Record<TraitName, number>;
export type FeatureVectorMap = Record<FeatureName, number>;
export type SemanticVectorMap = Record<SpaceAxis, number>;

export interface UnifiedSpaceVector {
  traits: TraitVectorMap;
  features: FeatureVectorMap;
  semantics: SemanticVectorMap;
}

export interface ActionSpacePoint {
  actionType: PlayerActionType;
  vector: UnifiedSpaceVector;
}

export interface RoomSpacePoint {
  roomFeature: RoomFeature;
  vector: UnifiedSpaceVector;
}

export interface EventSpacePoint {
  eventId: string;
  kind: "deterministic" | "emergent";
  triggerMetric: "turn_index" | "player_feature";
  triggerThreshold: number;
  triggerFeatureKey?: string;
  probability: number;
  vector: UnifiedSpaceVector;
}

export interface BehaviorTimelinePoint {
  t: number;
  instantaneousImpact: number;
  cumulativeImpact: number;
}

export type BehaviorStyle = "burst" | "pulse" | "ramp" | "steady";

export interface BehaviorSignature {
  style: BehaviorStyle;
  windowSeconds: number;
  stepSeconds: number;
  points: BehaviorTimelinePoint[];
  aggregates: {
    netImpact: number;
    peakImpact: number;
    timeToPeak: number;
    variance: number;
    oscillationCount: number;
  };
}

export interface EffectSpacePoint {
  effectId: string;
  sourceType: "action" | "event" | "room";
  sourceId: string;
  targetScopes: Array<"entity" | "room" | "level" | "feature">;
  delta: UnifiedSpaceVector;
  behavior: BehaviorSignature;
}

export interface UnifiedSpaceModel {
  actionSpace: ActionSpacePoint[];
  roomSpace: RoomSpacePoint[];
  eventSpace: EventSpacePoint[];
  effectSpace: EffectSpacePoint[];
}

export type SpaceVectorPackOverrides = Partial<SpaceVectorPack>;
export type RuntimeFeatureDefinition = SpaceVectorPack["featureSchema"][number];
export type RuntimeModelDefinition = SpaceVectorPack["modelSchemas"][number];

const mergeNumberMapRecord = (
  base: Record<string, NumberMap>,
  override: Record<string, NumberMap> | undefined,
): Record<string, NumberMap> => {
  const next: Record<string, NumberMap> = { ...base };
  if (!override) {
    return next;
  }
  for (const [key, value] of Object.entries(override)) {
    next[key] = { ...(next[key] ?? {}), ...value };
  }
  return next;
};

export const resolveSpaceVectorPack = (overrides?: SpaceVectorPackOverrides): SpaceVectorPack => {
  const base = SPACE_VECTOR_PACK;
  if (!overrides) {
    return base;
  }
  const overrideContentFeatures =
    (Array.isArray((overrides as { contentFeatures?: unknown[] }).contentFeatures)
      ? ((overrides as { contentFeatures?: SpaceVectorPack["contentFeatures"] }).contentFeatures ?? [])
      : []) ||
    [];
  const overrideThematicBasisTraits =
    (Array.isArray((overrides as { thematicBasisTraits?: unknown[] }).thematicBasisTraits)
      ? ((overrides as { thematicBasisTraits?: SpaceVectorPack["thematicBasisTraits"] }).thematicBasisTraits ?? [])
      : []) ||
    [];
  const contentFeatures =
    overrideContentFeatures.length > 0
      ? overrideContentFeatures
      : overrideThematicBasisTraits.length > 0
        ? overrideThematicBasisTraits
        : base.contentFeatures;
  return {
    featureSchema:
      Array.isArray(overrides.featureSchema) && overrides.featureSchema.length > 0
        ? overrides.featureSchema
        : base.featureSchema,
    modelSchemas:
      Array.isArray(overrides.modelSchemas) && overrides.modelSchemas.length > 0
        ? overrides.modelSchemas
        : base.modelSchemas,
    contentBindings: {
      modelInstances:
        Array.isArray(overrides.contentBindings?.modelInstances) && overrides.contentBindings.modelInstances.length > 0
          ? overrides.contentBindings.modelInstances
          : base.contentBindings.modelInstances,
      canonicalModelInstances:
        Array.isArray(overrides.contentBindings?.canonicalModelInstances) &&
        overrides.contentBindings.canonicalModelInstances.length > 0
          ? overrides.contentBindings.canonicalModelInstances
          : base.contentBindings.canonicalModelInstances,
    },
    contentFeatures,
    powerFeatures:
      Array.isArray(overrides.powerFeatures) && overrides.powerFeatures.length > 0
        ? overrides.powerFeatures
        : base.powerFeatures,
    thematicBasisTraits: contentFeatures,
    actionSemantics: mergeNumberMapRecord(base.actionSemantics, overrides.actionSemantics),
    roomSemantics: mergeNumberMapRecord(base.roomSemantics, overrides.roomSemantics),
    eventSemantics: {
      metric: mergeNumberMapRecord(base.eventSemantics.metric, overrides.eventSemantics?.metric),
      kind: mergeNumberMapRecord(base.eventSemantics.kind, overrides.eventSemantics?.kind),
    },
    itemSemantics: {
      tagWeights: mergeNumberMapRecord(base.itemSemantics.tagWeights, overrides.itemSemantics?.tagWeights),
      rarityWeights: mergeNumberMapRecord(base.itemSemantics.rarityWeights, overrides.itemSemantics?.rarityWeights),
    },
    behaviorDefaults: {
      windowSeconds: overrides.behaviorDefaults?.windowSeconds ?? base.behaviorDefaults.windowSeconds,
      stepSeconds: overrides.behaviorDefaults?.stepSeconds ?? base.behaviorDefaults.stepSeconds,
      actionStyle: { ...base.behaviorDefaults.actionStyle, ...(overrides.behaviorDefaults?.actionStyle ?? {}) },
      eventStyle: { ...base.behaviorDefaults.eventStyle, ...(overrides.behaviorDefaults?.eventStyle ?? {}) },
      roomStyle: { ...base.behaviorDefaults.roomStyle, ...(overrides.behaviorDefaults?.roomStyle ?? {}) },
    },
    entityProjection: {
      healthRiskScale: overrides.entityProjection?.healthRiskScale ?? base.entityProjection.healthRiskScale,
      energyRecoveryScale: overrides.entityProjection?.energyRecoveryScale ?? base.entityProjection.energyRecoveryScale,
      reputationVisibilityScale:
        overrides.entityProjection?.reputationVisibilityScale ?? base.entityProjection.reputationVisibilityScale,
      pressureHealthScale: overrides.entityProjection?.pressureHealthScale ?? base.entityProjection.pressureHealthScale,
      pressureReputationScale:
        overrides.entityProjection?.pressureReputationScale ?? base.entityProjection.pressureReputationScale,
    },
    levelSemantics: {
      combatRoomPressureScale:
        overrides.levelSemantics?.combatRoomPressureScale ?? base.levelSemantics.combatRoomPressureScale,
      restRoomRecoveryScale: overrides.levelSemantics?.restRoomRecoveryScale ?? base.levelSemantics.restRoomRecoveryScale,
    },
  };
};

const DEFAULT_FEATURE_SCHEMA: RuntimeFeatureDefinition[] = [
  ...TRAIT_NAMES.map((name) => ({
    featureId: name,
    label: name,
    groups: ["core", "content_features"],
    spaces: ["dialogue", "skill", "archetype", "event"],
    defaultValue: 0,
  })),
  ...FEATURE_NAMES.map((name) => ({
    featureId: name,
    label: name,
    groups: ["power_features"],
    spaces: ["entity", "event", "level"],
    defaultValue: 0,
  })),
];

const DEFAULT_MODEL_SCHEMAS: RuntimeModelDefinition[] = [
  {
    modelId: "entity.base",
    label: "Entity Base",
    description: "Fallback shared entity model.",
    featureRefs: [
      { featureId: "Comprehension", spaces: ["dialogue", "skill"], required: false },
      { featureId: "Constraint", spaces: ["combat", "skill"], required: false },
      { featureId: "Survival", spaces: ["combat", "event"], required: false },
      { featureId: "Fame", spaces: ["entity", "event"], required: false },
      { featureId: "Effort", spaces: ["entity", "level"], required: false },
      { featureId: "Awareness", spaces: ["entity", "dialogue"], required: false },
      { featureId: "Guile", spaces: ["entity", "dialogue"], required: false },
      { featureId: "Momentum", spaces: ["entity", "combat"], required: false },
    ],
  },
  {
    modelId: "item.base",
    label: "Item Base",
    featureRefs: [
      { featureId: "Construction", spaces: ["skill", "event"], required: false },
      { featureId: "Constraint", spaces: ["combat", "skill"], required: false },
      { featureId: "Momentum", spaces: ["combat"], required: false },
    ],
  },
  {
    modelId: "room.base",
    label: "Room Base",
    featureRefs: [
      { featureId: "Equilibrium", spaces: ["room", "event"], required: false },
      { featureId: "Freedom", spaces: ["room"], required: false },
      { featureId: "Direction", spaces: ["room"], required: false },
      { featureId: "Survival", spaces: ["room", "combat"], required: false },
    ],
  },
  {
    modelId: "level.base",
    label: "Level Base",
    featureRefs: [
      { featureId: "Effort", spaces: ["level"], required: true },
      { featureId: "Momentum", spaces: ["level", "event"], required: false },
      { featureId: "Fame", spaces: ["level", "event"], required: false },
    ],
  },
];

export const getFeatureSchema = (overrides?: SpaceVectorPackOverrides): RuntimeFeatureDefinition[] => {
  const resolved = resolveSpaceVectorPack(overrides);
  if (resolved.featureSchema.length > 0) {
    return resolved.featureSchema;
  }
  return DEFAULT_FEATURE_SCHEMA;
};

export const getModelSchemas = (overrides?: SpaceVectorPackOverrides): RuntimeModelDefinition[] => {
  const resolved = resolveSpaceVectorPack(overrides);
  if (resolved.modelSchemas.length > 0) {
    return resolved.modelSchemas;
  }
  return DEFAULT_MODEL_SCHEMAS;
};

export const getSpaceFeatureIds = (spaceId: string, overrides?: SpaceVectorPackOverrides): string[] => {
  const ids = getFeatureSchema(overrides)
    .filter((row) => row.spaces.includes(spaceId))
    .map((row) => row.featureId);
  return [...new Set(ids)];
};

export const getModelFeatureRefs = (modelId: string, overrides?: SpaceVectorPackOverrides): RuntimeModelDefinition["featureRefs"] => {
  const model = getModelSchemas(overrides).find((row) => row.modelId === modelId);
  return model?.featureRefs ?? [];
};

export const getModelFeatureIds = (
  modelId: string,
  options?: { spaces?: string[]; overrides?: SpaceVectorPackOverrides },
): string[] => {
  const refs = getModelFeatureRefs(modelId, options?.overrides);
  const spaces = new Set(options?.spaces ?? []);
  const filtered = refs
    .filter((ref) => spaces.size === 0 || ref.spaces.some((space) => spaces.has(space)))
    .map((ref) => ref.featureId);
  return [...new Set(filtered)];
};

export const buildModelFeatureVector = (
  modelId: string,
  values: Record<string, number>,
  options?: { spaces?: string[]; overrides?: SpaceVectorPackOverrides },
): Record<string, number> => {
  const ids = getModelFeatureIds(modelId, options);
  return Object.fromEntries(ids.map((id) => [id, Number(values[id] ?? 0)]));
};

const clamp = (value: number, min = -1, max = 1): number => Math.max(min, Math.min(max, value));

const emptyTraits = (): TraitVectorMap =>
  Object.fromEntries(TRAIT_NAMES.map((trait) => [trait, 0])) as TraitVectorMap;

const emptyFeatures = (): FeatureVectorMap =>
  Object.fromEntries(FEATURE_NAMES.map((feature) => [feature, 0])) as FeatureVectorMap;

const emptySemantics = (): SemanticVectorMap =>
  Object.fromEntries(SPACE_AXES.map((axis) => [axis, 0])) as SemanticVectorMap;

const mergeIntoTraits = (target: TraitVectorMap, patch: NumberMap | undefined, scale = 1): void => {
  if (!patch) {
    return;
  }
  for (const trait of TRAIT_NAMES) {
    const raw = patch[trait];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      target[trait] = clamp(target[trait] + raw * scale, -2, 2);
    }
  }
};

const mergeIntoFeatures = (target: FeatureVectorMap, patch: NumberMap | undefined, scale = 1): void => {
  if (!patch) {
    return;
  }
  for (const feature of FEATURE_NAMES) {
    const raw = patch[feature];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      target[feature] = clamp(target[feature] + raw * scale, -2, 2);
    }
  }
};

const mergeIntoSemantics = (target: SemanticVectorMap, patch: Partial<SemanticVectorMap>, scale = 1): void => {
  for (const axis of SPACE_AXES) {
    const raw = patch[axis];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      target[axis] = clamp(target[axis] + raw * scale, -1.5, 1.5);
    }
  }
};

const totalMagnitude = (traits: TraitVectorMap, features: FeatureVectorMap, semantics: SemanticVectorMap): number => {
  const traitMagnitude = TRAIT_NAMES.reduce((sum, trait) => sum + Math.abs(traits[trait]), 0);
  const featureMagnitude = FEATURE_NAMES.reduce((sum, feature) => sum + Math.abs(features[feature]), 0);
  const semanticMagnitude = SPACE_AXES.reduce((sum, axis) => sum + Math.abs(semantics[axis]), 0);
  return traitMagnitude + featureMagnitude + semanticMagnitude;
};

const variance = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squared = values.map((value) => (value - mean) ** 2);
  return squared.reduce((sum, value) => sum + value, 0) / values.length;
};

const countOscillations = (values: number[]): number => {
  if (values.length < 3) {
    return 0;
  }
  let oscillations = 0;
  let prevSign = 0;
  for (let i = 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    const sign = diff === 0 ? 0 : diff > 0 ? 1 : -1;
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) {
      oscillations += 1;
    }
    if (sign !== 0) {
      prevSign = sign;
    }
  }
  return oscillations;
};

const buildBehaviorSignature = (
  style: BehaviorStyle,
  strength: number,
  windowSeconds = 5,
  stepSeconds = 1,
): BehaviorSignature => {
  const points: BehaviorTimelinePoint[] = [];
  let cumulative = 0;
  const steps = Math.max(1, Math.floor(windowSeconds / stepSeconds));
  for (let i = 0; i <= steps; i += 1) {
    const t = i * stepSeconds;
    const n = steps === 0 ? 0 : i / steps;
    let instantaneous = 0;
    switch (style) {
      case "burst":
        instantaneous = strength * Math.exp(-3 * n);
        break;
      case "pulse":
        instantaneous = strength * (i % 2 === 0 ? 1 : 0.35);
        break;
      case "ramp":
        instantaneous = strength * (0.2 + n);
        break;
      case "steady":
      default:
        instantaneous = strength * 0.6;
        break;
    }
    cumulative += instantaneous * stepSeconds;
    points.push({
      t,
      instantaneousImpact: instantaneous,
      cumulativeImpact: cumulative,
    });
  }

  const impacts = points.map((point) => point.instantaneousImpact);
  let peakImpact = Number.NEGATIVE_INFINITY;
  let timeToPeak = 0;
  for (const point of points) {
    if (point.instantaneousImpact > peakImpact) {
      peakImpact = point.instantaneousImpact;
      timeToPeak = point.t;
    }
  }

  return {
    style,
    windowSeconds,
    stepSeconds,
    points,
    aggregates: {
      netImpact: cumulative,
      peakImpact: Number.isFinite(peakImpact) ? peakImpact : 0,
      timeToPeak,
      variance: variance(impacts),
      oscillationCount: countOscillations(impacts),
    },
  };
};

const toSemanticPatch = (map: NumberMap | undefined): Partial<SemanticVectorMap> => {
  const patch: Partial<SemanticVectorMap> = {};
  if (!map) {
    return patch;
  }
  for (const axis of SPACE_AXES) {
    const raw = map[axis];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      patch[axis] = raw;
    }
  }
  return patch;
};

const ACTION_TO_FORMULA_KEY: Partial<Record<PlayerActionType, keyof typeof ACTION_CONTRACTS.actions>> = {
  train: "train",
  rest: "rest",
  talk: "talk",
  fight: "fight",
  flee: "flee",
  live_stream: "liveStream",
  steal: "steal",
  recruit: "recruit",
  murder: "murder",
  use_item: "useItem",
  equip_item: "equipItem",
  drop_item: "dropItem",
  purchase: "purchase",
  re_equip: "reEquip",
};

const eventSemanticsFromTrigger = (
  config: SpaceVectorPack,
  metric: "turn_index" | "player_feature",
  threshold: number,
  kind: "deterministic" | "emergent",
): Partial<SemanticVectorMap> => {
  const metricBase = toSemanticPatch(config.eventSemantics.metric[metric]);
  const kindBase = toSemanticPatch(config.eventSemantics.kind[kind]);
  const next: Partial<SemanticVectorMap> = {};
  mergeIntoSemantics(next as SemanticVectorMap, metricBase);
  mergeIntoSemantics(next as SemanticVectorMap, kindBase);
  if (metric === "turn_index") {
    next.pressure = clamp((next.pressure ?? 0) + (threshold / 60) * (kind === "emergent" ? 0.8 : 1), 0, 1);
    next.risk = clamp((next.risk ?? 0) + threshold / 120, 0, 0.6);
    next.explorationIntensity = clamp((next.explorationIntensity ?? 0) + (kind === "emergent" ? 0.2 : 0.1), -1, 1);
    return next;
  }
  next.visibility = clamp((next.visibility ?? 0) + 0.85, -1, 1);
  next.socialIntensity = clamp((next.socialIntensity ?? 0) + 0.25, -1, 1);
  next.pressure = clamp((next.pressure ?? 0) + 0.3, -1, 1);
  return next;
};

const actionSpace = (config: SpaceVectorPack): ActionSpacePoint[] => {
  const supportedActions = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));
  return PLAYER_ACTION_TYPES.filter((actionType) => supportedActions.has(actionType)).map((actionType) => {
    const traits = emptyTraits();
    const features = emptyFeatures();
    const semantics = emptySemantics();

    const formulaKey = ACTION_TO_FORMULA_KEY[actionType];
    if (formulaKey) {
      const formula = ACTION_CONTRACTS.actions[formulaKey];
      mergeIntoTraits(traits, formula?.traitDelta);
      mergeIntoFeatures(features, formula?.featureDelta);
    }
    mergeIntoSemantics(semantics, toSemanticPatch(config.actionSemantics[actionType] ?? {}));

    return {
      actionType,
      vector: { traits, features, semantics },
    };
  });
};

const roomSpace = (config: SpaceVectorPack): RoomSpacePoint[] => {
  const templateByFeature = new Map(
    ROOM_TEMPLATES.templates.map((template) => [template.feature as RoomFeature, template.baseVector]),
  );
  return ROOM_FEATURES.map((roomFeature) => {
    const traits = emptyTraits();
    const features = emptyFeatures();
    const semantics = emptySemantics();
    mergeIntoTraits(traits, templateByFeature.get(roomFeature));
    mergeIntoSemantics(semantics, toSemanticPatch(config.roomSemantics[roomFeature] ?? {}));
    return {
      roomFeature,
      vector: { traits, features, semantics },
    };
  });
};

const eventSpace = (config: SpaceVectorPack): EventSpacePoint[] => {
  return EVENT_PACK.events.map((event) => {
    const traits = emptyTraits();
    const features = emptyFeatures();
    const semantics = emptySemantics();

    const threshold = event.trigger.gte;
    mergeIntoTraits(traits, event.traitDelta);
    mergeIntoFeatures(features, event.featureDelta);
    mergeIntoSemantics(semantics, eventSemanticsFromTrigger(config, event.trigger.metric, threshold, event.kind));
    if (typeof event.globalEnemyLevelBonusDelta === "number" && event.globalEnemyLevelBonusDelta > 0) {
      mergeIntoSemantics(semantics, {
        pressure: clamp(event.globalEnemyLevelBonusDelta * 0.3, 0, 1),
        risk: clamp(event.globalEnemyLevelBonusDelta * 0.2, 0, 1),
        combatIntensity: clamp(event.globalEnemyLevelBonusDelta * 0.2, 0, 1),
      });
    }

    return {
      eventId: event.eventId,
      kind: event.kind,
      triggerMetric: event.trigger.metric,
      triggerThreshold: threshold,
      triggerFeatureKey: event.trigger.metric === "player_feature" ? event.trigger.key : undefined,
      probability: event.kind === "emergent" ? event.probability ?? 0.1 : 1,
      vector: { traits, features, semantics },
    };
  });
};

const effectSpace = (
  actions: ActionSpacePoint[],
  rooms: RoomSpacePoint[],
  events: EventSpacePoint[],
  config: SpaceVectorPack,
): EffectSpacePoint[] => {
  const actionEffects: EffectSpacePoint[] = actions.map((action) => {
    const style = (config.behaviorDefaults.actionStyle[action.actionType] ?? "steady") as BehaviorStyle;
    const strength = Math.max(0.1, totalMagnitude(action.vector.traits, action.vector.features, action.vector.semantics));
    return {
      effectId: `action:${action.actionType}`,
      sourceType: "action",
      sourceId: action.actionType,
      targetScopes: ["entity"],
      delta: action.vector,
      behavior: buildBehaviorSignature(style, strength, config.behaviorDefaults.windowSeconds, config.behaviorDefaults.stepSeconds),
    };
  });

  const eventEffects: EffectSpacePoint[] = events.map((event) => {
    const style = (config.behaviorDefaults.eventStyle[event.kind] ??
      (event.kind === "emergent" ? "pulse" : "ramp")) as BehaviorStyle;
    const strength = Math.max(0.1, totalMagnitude(event.vector.traits, event.vector.features, event.vector.semantics));
    return {
      effectId: `event:${event.eventId}`,
      sourceType: "event",
      sourceId: event.eventId,
      targetScopes: event.triggerMetric === "turn_index" ? ["level", "entity"] : ["entity", "feature"],
      delta: event.vector,
      behavior: buildBehaviorSignature(style, strength, config.behaviorDefaults.windowSeconds, config.behaviorDefaults.stepSeconds),
    };
  });

  const roomAuraEffects: EffectSpacePoint[] = rooms.map((room) => {
    const style = (config.behaviorDefaults.roomStyle[room.roomFeature] ??
      (room.roomFeature === "rest" ? "steady" : room.roomFeature === "combat" ? "burst" : "pulse")) as BehaviorStyle;
    const strength = Math.max(0.08, totalMagnitude(room.vector.traits, room.vector.features, room.vector.semantics) * 0.6);
    return {
      effectId: `room:${room.roomFeature}:aura`,
      sourceType: "room",
      sourceId: room.roomFeature,
      targetScopes: ["entity", "room"],
      delta: room.vector,
      behavior: buildBehaviorSignature(style, strength, config.behaviorDefaults.windowSeconds, config.behaviorDefaults.stepSeconds),
    };
  });

  return [...actionEffects, ...eventEffects, ...roomAuraEffects];
};

export const buildUnifiedSpaceModel = (overrides?: SpaceVectorPackOverrides): UnifiedSpaceModel => {
  const config = resolveSpaceVectorPack(overrides);
  const actions = actionSpace(config);
  const rooms = roomSpace(config);
  const events = eventSpace(config);
  const effects = effectSpace(actions, rooms, events, config);
  return {
    actionSpace: actions,
    roomSpace: rooms,
    eventSpace: events,
    effectSpace: effects,
  };
};

export const UNIFIED_SPACE_MODEL_V1 = buildUnifiedSpaceModel();
export const CONTENT_FEATURES_V1 = SPACE_VECTOR_PACK.contentFeatures;
export const POWER_FEATURES_V1 = SPACE_VECTOR_PACK.powerFeatures;
// Backward compatibility alias.
export const THEMATIC_BASIS_TRAITS_V1 = CONTENT_FEATURES_V1;

export const projectItemSpaceVector = (input: {
  traitDelta?: NumberMap;
  featureDelta?: NumberMap;
  tags?: string[];
  rarity?: "common" | "rare" | "epic" | "legendary";
}, overrides?: SpaceVectorPackOverrides): UnifiedSpaceVector => {
  const config = resolveSpaceVectorPack(overrides);
  const traits = emptyTraits();
  const features = emptyFeatures();
  const semantics = emptySemantics();
  mergeIntoTraits(traits, input.traitDelta);
  mergeIntoFeatures(features, input.featureDelta);

  const tags = new Set(input.tags ?? []);
  for (const tag of tags) {
    mergeIntoSemantics(semantics, toSemanticPatch(config.itemSemantics.tagWeights[tag]));
  }
  if (input.rarity) {
    mergeIntoSemantics(semantics, toSemanticPatch(config.itemSemantics.rarityWeights[input.rarity]));
  }

  return { traits, features, semantics };
};

export const projectEntitySpaceVector = (input: {
  traits: NumberMap;
  features: NumberMap;
  health?: number;
  energy?: number;
  reputation?: number;
}, overrides?: SpaceVectorPackOverrides): UnifiedSpaceVector => {
  const config = resolveSpaceVectorPack(overrides);
  const traits = emptyTraits();
  const features = emptyFeatures();
  const semantics = emptySemantics();
  mergeIntoTraits(traits, input.traits);
  mergeIntoFeatures(features, input.features);

  const health = input.health ?? 100;
  const energy = input.energy ?? 100;
  const reputation = input.reputation ?? 0;
  mergeIntoSemantics(semantics, {
    risk: clamp(((100 - health) / 100) * config.entityProjection.healthRiskScale, 0, 1),
    recoveryIntensity: clamp(((100 - energy) / 100) * config.entityProjection.energyRecoveryScale, 0, 1),
    visibility: clamp(reputation * config.entityProjection.reputationVisibilityScale, -0.4, 1),
    pressure: clamp(
      ((100 - health) / 100) * config.entityProjection.pressureHealthScale +
        Math.abs(reputation) * config.entityProjection.pressureReputationScale,
      0,
      1,
    ),
  });

  return { traits, features, semantics };
};

export const projectLevelSpaceVector = (
  roomFeatureCounts: Partial<Record<RoomFeature, number>>,
  overrides?: SpaceVectorPackOverrides,
): UnifiedSpaceVector => {
  const config = resolveSpaceVectorPack(overrides);
  const traits = emptyTraits();
  const features = emptyFeatures();
  const semantics = emptySemantics();

  let totalRooms = 0;
  for (const roomFeature of ROOM_FEATURES) {
    totalRooms += roomFeatureCounts[roomFeature] ?? 0;
  }
  if (totalRooms <= 0) {
    return { traits, features, semantics };
  }

  const roomByFeature = new Map(buildUnifiedSpaceModel(overrides).roomSpace.map((room) => [room.roomFeature, room.vector]));
  for (const roomFeature of ROOM_FEATURES) {
    const count = roomFeatureCounts[roomFeature] ?? 0;
    if (count <= 0) {
      continue;
    }
    const weight = count / totalRooms;
    const roomVector = roomByFeature.get(roomFeature);
    if (!roomVector) {
      continue;
    }
    mergeIntoTraits(traits, roomVector.traits as NumberMap, weight);
    mergeIntoFeatures(features, roomVector.features as NumberMap, weight);
    mergeIntoSemantics(semantics, roomVector.semantics, weight);
  }

  mergeIntoSemantics(semantics, {
    pressure: clamp(
      (roomFeatureCounts.combat ?? 0) / Math.max(1, totalRooms / config.levelSemantics.combatRoomPressureScale),
      -1,
      1,
    ),
    recoveryIntensity: clamp(
      (roomFeatureCounts.rest ?? 0) / Math.max(1, totalRooms / config.levelSemantics.restRoomRecoveryScale),
      -1,
      1,
    ),
  });
  return { traits, features, semantics };
};

type GeneratedFeatureSlice = {
  records?: Array<{ asset_name?: string | null; asset_kind?: string | null }>;
};

const toOneHotTraitMap = (trait: TraitName): NumberMap => ({ [trait]: 1 });

export const thematicBasisTraitsFromGeneratedSlice = (
  slice: GeneratedFeatureSlice,
): SpaceVectorPack["contentFeatures"] => {
  const traits = new Set(TRAIT_NAMES);
  const rows: SpaceVectorPack["contentFeatures"] = [];
  for (const record of slice.records ?? []) {
    const name = typeof record.asset_name === "string" ? record.asset_name.trim() : "";
    if (!name || !traits.has(name as TraitName)) {
      continue;
    }
    const trait = name as TraitName;
    rows.push({
      basisId: `basis_${trait.toLowerCase()}`,
      label: `${trait} Basis`,
      description: `Imported content feature from generated slice (${record.asset_kind ?? "unknown_kind"}).`,
      traits: toOneHotTraitMap(trait),
    });
  }
  return rows;
};

export const contentFeaturesFromGeneratedSlice = thematicBasisTraitsFromGeneratedSlice;

export const withThematicBasisFromGeneratedSlice = (
  slice: GeneratedFeatureSlice,
  overrides?: SpaceVectorPackOverrides,
): SpaceVectorPackOverrides => {
  const contentFeatures = thematicBasisTraitsFromGeneratedSlice(slice);
  if (contentFeatures.length === 0) {
    return overrides ?? {};
  }
  return {
    ...(overrides ?? {}),
    contentFeatures,
    thematicBasisTraits: contentFeatures,
  };
};

export const withContentFeaturesFromGeneratedSlice = withThematicBasisFromGeneratedSlice;

const dot = (a: number[], b: number[]): number => a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
const magnitude = (values: number[]): number => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

export const behaviorSimilarity = (left: BehaviorSignature, right: BehaviorSignature): number => {
  const leftVector = [
    left.aggregates.netImpact,
    left.aggregates.peakImpact,
    left.aggregates.timeToPeak,
    left.aggregates.variance,
    left.aggregates.oscillationCount,
  ];
  const rightVector = [
    right.aggregates.netImpact,
    right.aggregates.peakImpact,
    right.aggregates.timeToPeak,
    right.aggregates.variance,
    right.aggregates.oscillationCount,
  ];
  const denom = magnitude(leftVector) * magnitude(rightVector);
  if (denom <= 1e-8) {
    return 0;
  }
  return clamp(dot(leftVector, rightVector) / denom, -1, 1);
};
