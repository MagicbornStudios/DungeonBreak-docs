import {
  ACTION_CATALOG,
  ACTION_CONTRACTS,
  EVENT_PACK,
  ROOM_TEMPLATE_BY_FEATURE,
  SPACE_VECTOR_PACK,
  type SpaceVectorPack,
} from "../contracts";
import {
  PLAYER_ACTION_TYPES,
  ROOM_FEATURES,
  type NumberMap,
  type PlayerActionType,
  type RoomFeature,
} from "../core/types";

export interface UnifiedSpaceVector {
  traits: Record<string, number>;
  features: Record<string, number>;
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

const chooseArray = <T>(base: T[], override: T[] | undefined): T[] => {
  return Array.isArray(override) && override.length > 0 ? override : base;
};

export const resolveSpaceVectorPack = (overrides?: SpaceVectorPackOverrides): SpaceVectorPack => {
  const base = SPACE_VECTOR_PACK;
  if (!overrides) {
    return base;
  }

  const resolvedContentFeatures = chooseArray(
    base.contentFeatures,
    chooseArray(overrides.contentFeatures ?? [], overrides.thematicBasisTraits),
  );

  return {
    ...base,
    ...overrides,
    featureSchema: chooseArray(base.featureSchema, overrides.featureSchema),
    modelSchemas: chooseArray(base.modelSchemas, overrides.modelSchemas),
    contentBindings: {
      modelInstances: chooseArray(base.contentBindings.modelInstances, overrides.contentBindings?.modelInstances),
      canonicalModelInstances: chooseArray(
        base.contentBindings.canonicalModelInstances,
        overrides.contentBindings?.canonicalModelInstances,
      ),
    },
    contentFeatures: resolvedContentFeatures,
    powerFeatures: chooseArray(base.powerFeatures, overrides.powerFeatures),
    thematicBasisTraits: resolvedContentFeatures,
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
      manaRecoveryScale: overrides.entityProjection?.manaRecoveryScale ?? base.entityProjection.manaRecoveryScale,
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

export const getFeatureSchema = (overrides?: SpaceVectorPackOverrides): RuntimeFeatureDefinition[] => {
  return resolveSpaceVectorPack(overrides).featureSchema;
};

export const getModelSchemas = (overrides?: SpaceVectorPackOverrides): RuntimeModelDefinition[] => {
  return resolveSpaceVectorPack(overrides).modelSchemas;
};

export const getSpaceFeatureIds = (_spaceId: string, overrides?: SpaceVectorPackOverrides): string[] => {
  const ids = getFeatureSchema(overrides).map((row) => row.featureId);
  return [...new Set(ids)];
};

export const getModelFeatureRefs = (
  modelId: string,
  overrides?: SpaceVectorPackOverrides,
): RuntimeModelDefinition["featureRefs"] => {
  const model = getModelSchemas(overrides).find((row) => row.modelId === modelId);
  return model?.featureRefs ?? [];
};

export const getModelFeatureIds = (
  modelId: string,
  options?: { overrides?: SpaceVectorPackOverrides },
): string[] => {
  const refs = getModelFeatureRefs(modelId, options?.overrides);
  return [...new Set(refs.map((ref) => ref.featureId))];
};

export const buildModelFeatureVector = (
  modelId: string,
  values: Record<string, number>,
  options?: { overrides?: SpaceVectorPackOverrides },
): Record<string, number> => {
  const ids = getModelFeatureIds(modelId, options);
  return Object.fromEntries(ids.map((id) => [id, Number(values[id] ?? 0)]));
};

const clamp = (value: number, min = -1, max = 1): number => Math.max(min, Math.min(max, value));

const getPrimaryVectorFeatureIds = (config: SpaceVectorPack): string[] => {
  const ids = config.featureSchema
    .filter((row) => row.groups.includes("content_features"))
    .map((row) => row.featureId);
  return ids.length > 0 ? ids : config.featureSchema.map((row) => row.featureId);
};

const getSecondaryVectorFeatureIds = (config: SpaceVectorPack): string[] => {
  return config.featureSchema
    .filter((row) => row.groups.includes("power_features"))
    .map((row) => row.featureId);
};

const emptyNumberMap = (keys: string[]): Record<string, number> => {
  return Object.fromEntries(keys.map((key) => [key, 0]));
};

const toNumberMap = (value: unknown): NumberMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const next: NumberMap = {};
  for (const [key, amount] of Object.entries(value)) {
    if (typeof amount === "number" && Number.isFinite(amount)) {
      next[key] = amount;
    }
  }
  return next;
};

const mergeIntoVector = (target: Record<string, number>, patch: unknown, scale = 1): void => {
  if (!patch) {
    return;
  }
  const numberMap = toNumberMap(patch);
  for (const key of Object.keys(target)) {
    const raw = numberMap[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      target[key] = clamp(target[key] + raw * scale, -2, 2);
    }
  }
};

const totalMagnitude = (traits: Record<string, number>, features: Record<string, number>): number => {
  const traitMagnitude = Object.values(traits).reduce((sum, value) => sum + Math.abs(value), 0);
  const featureMagnitude = Object.values(features).reduce((sum, value) => sum + Math.abs(value), 0);
  return traitMagnitude + featureMagnitude;
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

const actionSpace = (config: SpaceVectorPack): ActionSpacePoint[] => {
  const primaryFeatureIds = getPrimaryVectorFeatureIds(config);
  const secondaryFeatureIds = getSecondaryVectorFeatureIds(config);
  const supportedActions = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));
  return PLAYER_ACTION_TYPES.filter((actionType) => supportedActions.has(actionType)).map((actionType) => {
    const traits = emptyNumberMap(primaryFeatureIds);
    const features = emptyNumberMap(secondaryFeatureIds);

    const formulaKey = ACTION_TO_FORMULA_KEY[actionType];
    if (formulaKey) {
      const formula = ACTION_CONTRACTS.actions[formulaKey];
      const formulaRecord = (formula ?? {}) as unknown as Record<string, unknown>;
      mergeIntoVector(traits, formulaRecord.traitDelta);
      mergeIntoVector(features, formulaRecord.featureDelta);
    }

    return {
      actionType,
      vector: { traits, features },
    };
  });
};

const roomSpace = (config: SpaceVectorPack): RoomSpacePoint[] => {
  const primaryFeatureIds = getPrimaryVectorFeatureIds(config);
  const secondaryFeatureIds = getSecondaryVectorFeatureIds(config);
  return ROOM_FEATURES.map((roomFeature) => {
    const traits = emptyNumberMap(primaryFeatureIds);
    const features = emptyNumberMap(secondaryFeatureIds);
    mergeIntoVector(traits, ROOM_TEMPLATE_BY_FEATURE[roomFeature]?.baseVector);
    return {
      roomFeature,
      vector: { traits, features },
    };
  });
};

const eventSpace = (config: SpaceVectorPack): EventSpacePoint[] => {
  const primaryFeatureIds = getPrimaryVectorFeatureIds(config);
  const secondaryFeatureIds = getSecondaryVectorFeatureIds(config);
  return EVENT_PACK.events.map((event) => {
    const traits = emptyNumberMap(primaryFeatureIds);
    const features = emptyNumberMap(secondaryFeatureIds);

    const threshold = event.trigger.gte;
    mergeIntoVector(traits, event.narrativeStatDelta);
    mergeIntoVector(features, event.narrativeStatDelta);

    return {
      eventId: event.eventId,
      kind: event.kind as EventSpacePoint["kind"],
      triggerMetric: event.trigger.metric as EventSpacePoint["triggerMetric"],
      triggerThreshold: threshold,
      triggerFeatureKey: event.trigger.metric === "player_feature" ? event.trigger.key : undefined,
      probability: event.kind === "emergent" ? event.probability ?? 0.1 : 1,
      vector: { traits, features },
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
    const strength = Math.max(0.1, totalMagnitude(action.vector.traits, action.vector.features));
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
    const strength = Math.max(0.1, totalMagnitude(event.vector.traits, event.vector.features));
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
    const strength = Math.max(0.08, totalMagnitude(room.vector.traits, room.vector.features) * 0.6);
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
export const THEMATIC_BASIS_TRAITS_V1 = CONTENT_FEATURES_V1;

export const projectItemSpaceVector = (
  input: {
    traitDelta?: NumberMap;
    featureDelta?: NumberMap;
    narrativeStatDelta?: NumberMap;
    tags?: string[];
    rarity?: "common" | "rare" | "epic" | "legendary";
  },
  overrides?: SpaceVectorPackOverrides,
): UnifiedSpaceVector => {
  const config = resolveSpaceVectorPack(overrides);
  const traits = emptyNumberMap(getPrimaryVectorFeatureIds(config));
  const features = emptyNumberMap(getSecondaryVectorFeatureIds(config));
  mergeIntoVector(traits, input.traitDelta);
  mergeIntoVector(features, input.featureDelta);
  mergeIntoVector(traits, input.narrativeStatDelta);
  mergeIntoVector(features, input.narrativeStatDelta);
  return { traits, features };
};

export const projectEntitySpaceVector = (
  input: {
    traits: NumberMap;
    features: NumberMap;
    health?: number;
    mana?: number;
    reputation?: number;
  },
  overrides?: SpaceVectorPackOverrides,
): UnifiedSpaceVector => {
  const config = resolveSpaceVectorPack(overrides);
  const traits = emptyNumberMap(getPrimaryVectorFeatureIds(config));
  const features = emptyNumberMap(getSecondaryVectorFeatureIds(config));
  mergeIntoVector(traits, input.traits);
  mergeIntoVector(features, input.features);
  return { traits, features };
};

export const projectLevelSpaceVector = (
  roomFeatureCounts: Partial<Record<RoomFeature, number>>,
  overrides?: SpaceVectorPackOverrides,
): UnifiedSpaceVector => {
  const config = resolveSpaceVectorPack(overrides);
  const traits = emptyNumberMap(getPrimaryVectorFeatureIds(config));
  const features = emptyNumberMap(getSecondaryVectorFeatureIds(config));

  let totalRooms = 0;
  for (const roomFeature of ROOM_FEATURES) {
    totalRooms += roomFeatureCounts[roomFeature] ?? 0;
  }
  if (totalRooms <= 0) {
    return { traits, features };
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
    mergeIntoVector(traits, roomVector.traits as NumberMap, weight);
    mergeIntoVector(features, roomVector.features as NumberMap, weight);
  }

  return { traits, features };
};

type GeneratedFeatureSlice = {
  records?: Array<{ asset_name?: string | null; asset_kind?: string | null }>;
};

const toOneHotPrimaryVectorMap = (featureId: string): NumberMap => ({ [featureId]: 1 });

export const thematicBasisTraitsFromGeneratedSlice = (
  slice: GeneratedFeatureSlice,
): SpaceVectorPack["contentFeatures"] => {
  const primaryFeatureIds = new Set(getPrimaryVectorFeatureIds(SPACE_VECTOR_PACK));
  const rows: SpaceVectorPack["contentFeatures"] = [];
  for (const record of slice.records ?? []) {
    const name = typeof record.asset_name === "string" ? record.asset_name.trim() : "";
    if (!name || !primaryFeatureIds.has(name)) {
      continue;
    }
    rows.push({
      basisId: `basis_${name.toLowerCase()}`,
      label: `${name} Basis`,
      description: `Imported content feature from generated slice (${record.asset_kind ?? "unknown_kind"}).`,
      traits: toOneHotPrimaryVectorMap(name),
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
