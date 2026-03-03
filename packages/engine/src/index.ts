export {
  ACTION_CATALOG,
  ACTION_CONTRACTS,
  ACTION_INTENTS,
  ACTION_POLICIES,
  ARCHETYPE_PACK,
  CANONICAL_SEED_V1,
  CUTSCENE_PACK,
  DIALOGUE_PACK,
  DUNGEON_LAYOUT_PACK,
  EVENT_PACK,
  ITEM_PACK,
  QUEST_PACK,
  ROOM_TEMPLATES,
  SPACE_VECTOR_PACK,
  SKILL_PACK,
} from "./escape-the-dungeon/contracts";
export { FORMULA_REGISTRY_VERSION, formulaRegistry } from "./escape-the-dungeon/formulas/registry";
export type { SpaceVectorPack } from "./escape-the-dungeon/contracts";
export type {
  ActionAvailability,
  GameEvent,
  DeedMemory,
  EntityState,
  GameConfig,
  GameSnapshot,
  GameState,
  NumberMap,
  PlayerAction,
  TurnResult,
  Vec3,
  Transform3d,
} from "./escape-the-dungeon/core/types";
export {
  ACTION_TYPE,
  DEFAULT_GAME_CONFIG,
  FEATURE_NAMES,
  PLAYER_ACTION_TYPES,
  ROOM_FEATURES,
  TRAIT_NAMES,
  createTransform,
  createVec3,
} from "./escape-the-dungeon/core/types";
export type { PlayerActionType, RoomFeature } from "./escape-the-dungeon/core/types";
export { DeterministicRng } from "./escape-the-dungeon/core/rng";
export {
  ROOM_FEATURE_RUNE_FORGE,
  buildDungeonWorld,
  getLevel,
  getRoom,
  roomCenterPosition,
} from "./escape-the-dungeon/world/map";
export {
  buildDungeonLayoutSnapshot,
  type DungeonLayoutSnapshot,
  type LayoutDungeon,
  type LayoutEntity,
  type LayoutLevel,
  type LayoutRoom,
} from "./escape-the-dungeon/world/layout";
export { GameEngine } from "./escape-the-dungeon/engine/game";
export { createPersistence } from "./escape-the-dungeon/persistence/indexeddb";
export type { PersistenceAdapter } from "./escape-the-dungeon/persistence/indexeddb";
export { buildActionGroups, extractCutsceneQueue, initialFeed, toFeedMessages } from "./escape-the-dungeon/ui/presenter";
export type { ActionGroup, ActionItem, CutsceneMessage, FeedMessage, PlayUiAction } from "./escape-the-dungeon/ui/types";
export { simulateBalanceBatch, simulateBalanceRun, simulateLongRunSuite } from "./escape-the-dungeon/simulation/harness";
export type {
  BalanceBatchMetrics,
  BalanceRunMetrics,
  LongRunSuiteMetrics,
  LongRunWindowMetrics,
} from "./escape-the-dungeon/simulation/harness";
export {
  SPACE_AXES,
  SEMANTIC_AXES,
  CONTENT_FEATURES_V1,
  POWER_FEATURES_V1,
  THEMATIC_BASIS_TRAITS_V1,
  UNIFIED_SPACE_MODEL_V1,
  buildModelFeatureVector,
  buildUnifiedSpaceModel,
  contentFeaturesFromGeneratedSlice,
  getFeatureSchema,
  getModelFeatureIds,
  getModelFeatureRefs,
  getModelSchemas,
  getSpaceFeatureIds,
  resolveSpaceVectorPack,
  thematicBasisTraitsFromGeneratedSlice,
  withContentFeaturesFromGeneratedSlice,
  withThematicBasisFromGeneratedSlice,
  projectEntitySpaceVector,
  projectItemSpaceVector,
  projectLevelSpaceVector,
  behaviorSimilarity,
} from "./escape-the-dungeon/spaces/model";
export type {
  SpaceAxis,
  SemanticAxis,
  UnifiedSpaceVector,
  ActionSpacePoint,
  RoomSpacePoint,
  EventSpacePoint,
  EffectSpacePoint,
  BehaviorStyle,
  BehaviorSignature,
  BehaviorTimelinePoint,
  UnifiedSpaceModel,
  SpaceVectorPackOverrides,
  RuntimeFeatureDefinition,
  RuntimeModelDefinition,
} from "./escape-the-dungeon/spaces/model";
export { DungeonBreakGame } from "./react/DungeonBreakGame";
export type { DungeonBreakGameProps } from "./react/DungeonBreakGame";
