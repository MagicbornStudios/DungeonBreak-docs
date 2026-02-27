export const TRAIT_NAMES = [
  "Comprehension",
  "Constraint",
  "Construction",
  "Direction",
  "Empathy",
  "Equilibrium",
  "Freedom",
  "Levity",
  "Projection",
  "Survival",
] as const;

export type TraitName = (typeof TRAIT_NAMES)[number];

export const FEATURE_NAMES = [
  "Fame",
  "Effort",
  "Awareness",
  "Guile",
  "Momentum",
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export const ROOM_FEATURES = [
  "corridor",
  "start",
  "exit",
  "stairs_up",
  "stairs_down",
  "escape_gate",
  "training",
  "dialogue",
  "rest",
  "treasure",
  "rune_forge",
  "combat",
] as const;

export type RoomFeature = (typeof ROOM_FEATURES)[number];

export const PLAYER_ACTION_TYPES = [
  "move",
  "train",
  "rest",
  "talk",
  "search",
  "speak",
  "fight",
  "choose_dialogue",
  "live_stream",
  "steal",
  "recruit",
  "murder",
  "evolve_skill",
] as const;

export type PlayerActionType = (typeof PLAYER_ACTION_TYPES)[number];

export type MoveDirection = "north" | "south" | "east" | "west" | "up" | "down";

export type TraitVector = Record<TraitName, number>;

export type FeatureVector = Record<FeatureName, number>;

export type NumberMap = Record<string, number>;

export interface AttributeBlock {
  might: number;
  agility: number;
  insight: number;
  willpower: number;
}

export interface SkillState {
  skillId: string;
  name: string;
  unlocked: boolean;
  mastery: number;
}

export interface DeedMemory {
  deedId: string;
  summary: string;
  sourceAction: string;
  turnIndex: number;
  depth: number;
  roomId: string;
  tags: string[];
  traitDelta: NumberMap;
  featureDelta: NumberMap;
  vector: number[];
}

export interface RumorMemory {
  rumorId: string;
  sourceEntityId: string;
  summary: string;
  confidence: number;
  turnIndex: number;
}

export interface ActiveEffect {
  effectId: string;
  name: string;
  traitDelta: NumberMap;
  featureDelta: NumberMap;
  turnsRemaining: number;
}

export interface ItemInstance {
  itemId: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  tags: string[];
  traitDelta: NumberMap;
}

export interface RoomItemState {
  itemId: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  tags: string[];
  vectorDelta: NumberMap;
  isPresent: boolean;
}

export interface RoomNode {
  roomId: string;
  depth: number;
  chapterNumber: number;
  row: number;
  column: number;
  index: number;
  feature: RoomFeature;
  description: string;
  baseVector: TraitVector;
  items: RoomItemState[];
  exits: Partial<Record<MoveDirection, { depth: number; roomId: string }>>;
}

export interface Level {
  depth: number;
  chapterNumber: number;
  rows: number;
  columns: number;
  rooms: Record<string, RoomNode>;
  startRoomId: string;
  exitRoomId: string;
}

export interface Dungeon {
  title: string;
  totalLevels: number;
  chaptersPerAct: number;
  levels: Record<number, Level>;
  startDepth: number;
  startRoomId: string;
  escapeDepth: number;
  escapeRoomId: string;
}

export type EntityKind = "player" | "dungeoneer" | "boss" | "hostile";

export interface EntityState {
  entityId: string;
  name: string;
  isPlayer: boolean;
  entityKind: EntityKind;
  depth: number;
  roomId: string;
  traits: TraitVector;
  attributes: AttributeBlock;
  features: FeatureVector;
  faction: string;
  reputation: number;
  archetypeHeading: string;
  baseLevel: number;
  xp: number;
  health: number;
  energy: number;
  inventory: ItemInstance[];
  skills: Record<string, SkillState>;
  deeds: DeedMemory[];
  rumors: RumorMemory[];
  effects: ActiveEffect[];
  companionTo: string | null;
}

export interface QuestState {
  questId: string;
  title: string;
  description: string;
  requiredProgress: number;
  progress: number;
  isComplete: boolean;
}

export interface GameEvent {
  turnIndex: number;
  actorId: string;
  actorName: string;
  actionType: string;
  depth: number;
  roomId: string;
  chapterNumber: number;
  actNumber: number;
  message: string;
  warnings: string[];
  traitDelta: NumberMap;
  featureDelta: NumberMap;
  metadata: Record<string, unknown>;
}

export interface ActionAvailability {
  actionType: PlayerActionType;
  label: string;
  available: boolean;
  blockedReasons: string[];
  payload: Record<string, unknown>;
}

export interface PlayerAction {
  actionType: PlayerActionType;
  payload: Record<string, unknown>;
}

export interface ChapterPages {
  chapter: string[];
  entities: Record<string, string[]>;
}

export interface GameState {
  config: GameConfig;
  dungeon: Dungeon;
  entities: Record<string, EntityState>;
  playerId: string;
  quests: Record<string, QuestState>;
  eventLog: GameEvent[];
  actionHistory: string[];
  chapterPages: Record<number, ChapterPages>;
  turnIndex: number;
  rngState: number;
  escaped: boolean;
  globalEnemyLevelBonus: number;
  hostileSpawnIndex: number;
  activeCompanionId: string | null;
  runBranchChoice: string | null;
  globalEventFlags: string[];
  seenCutscenes: string[];
}

export type GameSnapshot = GameState;

export interface TurnResult {
  events: GameEvent[];
  escaped: boolean;
}

export interface GameConfig {
  gameTitle: string;
  playerName: string;
  totalLevels: number;
  levelRows: number;
  levelColumns: number;
  roomsPerLevel: number;
  chaptersPerAct: number;
  randomSeed: number;
  minTraitValue: number;
  maxTraitValue: number;
  defaultPlayerHealth: number;
  defaultPlayerEnergy: number;
  dungeoneersPerLevel: number;
  treasureRoomsPerLevel: number;
  runeForgeRoomsPerLevel: number;
  hostileSpawnPerTurn: number;
  companionsMax: number;
  baseXpPerLevel: number;
  bossLevelBonus: number;
  hostileLevelBonus: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  gameTitle: "Escape the Dungeon",
  playerName: "Kael",
  totalLevels: 12,
  levelRows: 5,
  levelColumns: 10,
  roomsPerLevel: 50,
  chaptersPerAct: 4,
  randomSeed: 7,
  minTraitValue: -1,
  maxTraitValue: 1,
  defaultPlayerHealth: 100,
  defaultPlayerEnergy: 1,
  dungeoneersPerLevel: 4,
  treasureRoomsPerLevel: 20,
  runeForgeRoomsPerLevel: 5,
  hostileSpawnPerTurn: 1,
  companionsMax: 1,
  baseXpPerLevel: 30,
  bossLevelBonus: 2,
  hostileLevelBonus: 1,
};

export const createTraitVector = (value = 0): TraitVector => {
  const next = {} as TraitVector;
  for (const trait of TRAIT_NAMES) {
    next[trait] = value;
  }
  return next;
};

export const createFeatureVector = (): FeatureVector => ({
  Fame: 0,
  Effort: 100,
  Awareness: 0,
  Guile: 0,
  Momentum: 0,
});

export const createAttributes = (
  overrides: Partial<AttributeBlock> = {},
): AttributeBlock => ({
  might: overrides.might ?? 5,
  agility: overrides.agility ?? 5,
  insight: overrides.insight ?? 5,
  willpower: overrides.willpower ?? 5,
});

export const cloneState = <T>(value: T): T => {
  return structuredClone(value);
};

export const clamp = (value: number, low: number, high: number): number => {
  if (value < low) {
    return low;
  }
  if (value > high) {
    return high;
  }
  return value;
};

export const vectorMagnitude = (values: NumberMap): number => {
  let total = 0;
  for (const value of Object.values(values)) {
    total += value * value;
  }
  return Math.sqrt(total);
};

export const distanceBetween = (
  a: NumberMap,
  b: NumberMap,
  keys: readonly string[],
): number => {
  let total = 0;
  for (const key of keys) {
    const diff = (a[key] ?? 0) - (b[key] ?? 0);
    total += diff * diff;
  }
  return Math.sqrt(total);
};

export const mergeNumberMaps = (a: NumberMap, b: NumberMap): NumberMap => {
  const merged: NumberMap = { ...a };
  for (const [key, value] of Object.entries(b)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
};
