import {
  COMBAT_STAT_DEFAULTS,
  type COMBAT_STAT_KEYS,
  NARRATIVE_STAT_DEFAULTS,
  type NARRATIVE_STAT_NAMES,
  type RUNE_IDS,
  SKILL_STAT_DEFAULTS,
  type SKILL_STAT_KEYS,
} from "../contracts/generated/stat-keys";

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

export const LEGACY_NARRATIVE_SECONDARY_STAT_NAMES = [
  "Fame",
  "Effort",
  "Awareness",
  "Guile",
  "Momentum",
] as const;

export type LegacyNarrativeSecondaryStatName =
  (typeof LEGACY_NARRATIVE_SECONDARY_STAT_NAMES)[number];

export type CombatStatKey = (typeof COMBAT_STAT_KEYS)[number];
export type SkillStatKey = (typeof SKILL_STAT_KEYS)[number];
export type NarrativeStatName = (typeof NARRATIVE_STAT_NAMES)[number];
export type RuneStatId = (typeof RUNE_IDS)[number];

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
  "whistle",
  "train",
  "rest",
  "talk",
  "search",
  "speak",
  "fight",
  "flee",
  "choose_dialogue",
  "live_stream",
  "steal",
  "recruit",
  "murder",
  "evolve_skill",
  "use_item",
  "equip_item",
  "drop_item",
  "buy_item",
  "sell_item",
  "purchase",
  "re_equip",
] as const;

export type PlayerActionType = (typeof PLAYER_ACTION_TYPES)[number];

/** Canonical action type literals for consumers. Use instead of magic strings. */
export const ACTION_TYPE = {
  WHISTLE: "whistle",
  FIGHT: "fight",
  FLEE: "flee",
  EVOLVE_SKILL: "evolve_skill",
  REST: "rest",
  TALK: "talk",
  CHOOSE_DIALOGUE: "choose_dialogue",
  PURCHASE: "purchase",
  BUY_ITEM: "buy_item",
  SELL_ITEM: "sell_item",
  RE_EQUIP: "re_equip",
  SPEAK: "speak",
  SEARCH: "search",
} as const satisfies Record<string, PlayerActionType>;

export type MoveDirection = "north" | "south" | "east" | "west" | "up" | "down";

export type TraitVector = Record<TraitName, number>;

/** @deprecated Transitional compatibility view. Prefer NarrativeStatMap. */
export type FeatureVector = Record<LegacyNarrativeSecondaryStatName, number>;

export type CombatStatMap = Record<CombatStatKey, number>;

export type SkillStatMap = Record<SkillStatKey, number>;

export type NarrativeStatMap = Record<NarrativeStatName, number>;

export type NumberMap = Record<string, number>;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Transform3d {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

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
  actorEntityId: string;
  subjectEntityId: string;
  summary: string;
  canonicalText: string;
  sourceAction: string;
  turnIndex: number;
  depth: number;
  roomId: string;
  tags: string[];
  beliefState: "verified" | "rumor" | "misinformed";
  sourceEntityId: string;
  confidence: number;
  traitDelta: NumberMap;
  featureDelta: NumberMap;
  vector: number[];
}

export interface RumorMemory {
  rumorId: string;
  sourceEntityId: string;
  actorEntityId: string;
  subjectEntityId: string;
  summary: string;
  beliefState: "rumor" | "misinformed";
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
  narrativeStatDelta: NumberMap;
  transform?: Transform3d | null;
}

export interface RoomItemState {
  itemId: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  description: string;
  tags: string[];
  vectorDelta: NumberMap;
  isPresent: boolean;
  transform?: Transform3d | null;
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
  size: Vec3;
  transform: Transform3d;
}

export interface Level {
  depth: number;
  chapterNumber: number;
  rows: number;
  columns: number;
  rooms: Record<string, RoomNode>;
  startRoomId: string;
  exitRoomId: string;
  size: Vec3;
  transform: Transform3d;
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
  size: Vec3;
  transform: Transform3d;
}

export type EntityKind =
  | "player"
  | "dungeoneer"
  | "boss"
  | "hostile"
  | "summon";

export interface EntityState {
  entityId: string;
  name: string;
  isPlayer: boolean;
  entityKind: EntityKind;
  entityTypeId: string;
  occupationId: string | null;
  occupationName: string | null;
  partyRoleId: string | null;
  partyRoleName: string | null;
  depth: number;
  roomId: string;
  transform: Transform3d;
  combatStats: CombatStatMap;
  skillStats: SkillStatMap;
  narrativeStats: NarrativeStatMap;
  runeStats: NumberMap;
  baseFaction: string;
  faction: string;
  hostileUntilTurn: number | null;
  reputation: number;
  archetypeHeading: string;
  baseLevel: number;
  xp: number;
  inventory: ItemInstance[];
  skills: Record<string, SkillState>;
  spellUseCounts: NumberMap;
  deeds: DeedMemory[];
  rumors: RumorMemory[];
  effects: ActiveEffect[];
  companionTo: string | null;
  summonedBySkillId: string | null;
  equippedWeaponItemId: string | null;
  equippedArmorItemId: string | null;
  equippedAccessoryItemId: string | null;
  equippedSkillSlots: Array<string | null>;
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
  narrativeStatDelta: NumberMap;
  metadata: Record<string, unknown>;
}

export interface ActionAvailability {
  actionType: PlayerActionType;
  label: string;
  available: boolean;
  blockedReasons: string[];
  payload: Record<string, unknown>;
  uiIntent?: string;
  uiScreen?: string;
  uiPriority?: number;
}

export interface PlayerAction {
  actionType: PlayerActionType;
  payload: Record<string, unknown>;
}

export interface ChapterPages {
  chapter: string[];
  entities: Record<string, string[]>;
}

export interface DialogueProgressEntry {
  sequence: number;
  turnIndex: number;
  actionType: "talk" | "choose_dialogue";
  optionId: string | null;
  sceneId: string | null;
  label: string;
  responseText: string;
  depth: number;
  roomId: string;
  targetEntityId: string | null;
}

export interface DialogueProgressState {
  sequence: number;
  lastOptionId: string | null;
  lastSceneId: string | null;
  visitedOptionIds: string[];
  visitedSceneIds: string[];
  history: DialogueProgressEntry[];
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
  /** When true, the player's mount (Dolci) is active; movement benefit applies where content allows. */
  mountSummoned: boolean;
  runBranchChoice: string | null;
  globalEventFlags: string[];
  seenCutscenes: string[];
  dialogueProgress: DialogueProgressState;
  discoveredRoomsByDepth: Record<string, string[]>;
  documentedDepths: number[];
  discoveredSpellIds: string[];
  discoveredEvolutionIds: string[];
  summonFormSpellIds: string[];
  unlockedTitleIds: string[];
  equippedTitleId: string | null;
  lastHostileSpawnTurn: number;
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
  defaultPlayerMana: number;
  dungeoneersPerLevel: number;
  treasureRoomsPerLevel: number;
  runeForgeRoomsPerLevel: number;
  hostileSpawnPerTurn: number;
  companionsMax: number;
  baseXpPerLevel: number;
  bossLevelBonus: number;
  hostileLevelBonus: number;
  canonicalSeed: number;
  entityPressureCap: number;
  countItemsAsEntitiesForPressure: boolean;
  npcActionPolicyIds: Partial<Record<EntityKind, string>>;
  dungeonOrigin: Vec3;
  roomSize: Vec3;
  levelSpacing: number;
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
  defaultPlayerMana: 1,
  dungeoneersPerLevel: 4,
  treasureRoomsPerLevel: 20,
  runeForgeRoomsPerLevel: 5,
  hostileSpawnPerTurn: 1,
  companionsMax: 1,
  baseXpPerLevel: 30,
  bossLevelBonus: 2,
  hostileLevelBonus: 1,
  canonicalSeed: 20_260_227,
  entityPressureCap: 120,
  countItemsAsEntitiesForPressure: true,
  npcActionPolicyIds: {},
  dungeonOrigin: { x: 0, y: 0, z: 0 },
  roomSize: { x: 14, y: 10, z: 6 },
  levelSpacing: 12,
};

export const createVec3 = (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z });

export const createTransform = (
  overrides: Partial<Transform3d> = {}
): Transform3d => ({
  position: overrides.position ?? createVec3(),
  rotation: overrides.rotation ?? createVec3(),
  scale: overrides.scale ?? createVec3(1, 1, 1),
});

export const createCombatStats = (
  overrides: Partial<Record<CombatStatKey, number>> = {}
): CombatStatMap => ({
  ...COMBAT_STAT_DEFAULTS,
  ...overrides,
});

export const createSkillStats = (
  overrides: Partial<Record<SkillStatKey, number>> = {}
): SkillStatMap => ({
  ...SKILL_STAT_DEFAULTS,
  ...overrides,
});

export const createNarrativeStats = (
  overrides: Partial<Record<NarrativeStatName, number>> = {}
): NarrativeStatMap => ({
  ...NARRATIVE_STAT_DEFAULTS,
  ...overrides,
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
  keys: readonly string[]
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
