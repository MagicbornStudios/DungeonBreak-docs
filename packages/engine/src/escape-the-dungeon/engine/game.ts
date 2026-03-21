import { CombatSystem } from "../combat/system";
import {
  ACTION_CONTRACTS,
  ACTION_INTENT_BY_ACTION_TYPE,
  ARCHETYPE_BY_ID,
  EVENT_PACK,
  GAME_STATS,
  ITEM_NAME_BY_ID,
  ITEM_PACK,
  OCCUPATION_BY_ID,
  QUEST_PACK,
  RARITY_PACK,
  RUNE_AFFINITY_PACK,
  RUNE_BY_ID,
  SKILL_BY_ID,
  SPAWN_TABLE_PACK,
  SPELL_BY_ID,
  SPELL_BY_RUNE_COMBO_KEY,
  SPELL_EVOLUTION_PACK,
  SPELL_FORGE_COSTS,
  type SPELL_LIST,
  SPELL_PROGRESSION_PACK,
  THE_MOUNT,
  TITLE_BY_ID,
  TITLE_PACK,
} from "../contracts";
import { normalizeEntityStats } from "../core/entity-stat-domains";
import {
  currentHp,
  currentMana,
  isAlive,
  runeStat,
  setCurrentMana,
  setRuneStat,
} from "../core/entity-stats";
import { DeterministicRng } from "../core/rng";
import {
  type ActionAvailability,
  cloneState,
  DEFAULT_GAME_CONFIG,
  type EntityState,
  type GameConfig,
  type GameEvent,
  type GameSnapshot,
  type GameState,
  type MoveDirection,
  type NumberMap,
  type PlayerAction,
  type QuestState,
  type RoomNode,
  type TurnResult,
} from "../core/types";
import {
  FORMULA_REGISTRY_VERSION,
  formulaRegistry,
} from "../formulas/registry";
import { buildDefaultArchetypeDirector } from "../narrative/archetypes";
import {
  buildDefaultCutsceneDirector,
  type CutsceneHit,
} from "../narrative/cutscenes";
import { type Deed, DeedVectorizer } from "../narrative/deeds";
import { buildDefaultDialogueDirector } from "../narrative/dialogue";
import {
  buildDefaultSkillDirector,
  type SkillDefinition,
} from "../narrative/skills";
import {
  buildDungeonWorld,
  chapterForDepth,
  effectiveRoomVector,
  getLevel,
  getRoom,
  ROOM_FEATURE_RUNE_FORGE,
  topRoomVector,
  weaponPowerForTier,
} from "../world/map";
import type { ActionOutcome } from "./actions/action-types";
import {
  availabilityForCombatAction,
  availabilityForPreparedSpellAction,
  performCombatAction,
  performPreparedSpellAction,
} from "./actions/combat";
import {
  availabilityForInventoryAction,
  performInventoryAction,
} from "./actions/inventory";
import {
  availabilityForNavigationAction,
  performNavigationAction,
} from "./actions/navigation";
import {
  availabilityForRuneForgeAction,
  performForgeCraftAction,
  performForgeEvolutionAction,
  performRuneForgeAction,
} from "./actions/rune-forge";
import {
  availabilityForSocialAction,
  performSocialAction,
} from "./actions/social";
import {
  createBossEntity,
  createDungeoneerEntity,
  createHostileEntity,
  createPlayerEntity,
  createSummonEntity,
} from "./game-entity-factories";
import {
  actFor,
  applyNarrativeStatDelta,
  archetypeLabel,
  authoredArchetypeIdForPreset,
  authoredEntityTypeIdForPreset,
  authoredHostileEntityTypeIdForArchetype,
  authoredPartyRoleIdForPreset,
  canonicalEntityTypeId,
  canonicalOccupationId,
  canonicalPartyRoleId,
  chapterFor,
  diffMap,
  entityTypeLabel,
  levelForEntity,
  mergeDeltas,
  normalizeNumberRecord,
  occupationLabel,
  partyRoleLabel,
  rarityLabel,
  requiredProgressForQuest,
  runeComboKey,
  scaleVector,
} from "./game-runtime-helpers";
import {
  buildAuthoredSpellProgressStatus,
  buildDialogueProgressStatus,
  buildEquippedSpellStatus,
  buildInventoryStatus,
  buildLookSummary,
  buildQuestStatus,
  buildSpellPoolStatus,
} from "./game-runtime-views";
import {
  captureSnapshotState,
  createEmptyDialogueProgress,
  restoreSnapshotState,
} from "./game-state-persistence";
import {
  applyDeedSemantics as applyDeedSemanticsState,
  crossPollinateRumors as crossPollinateRumorsState,
  ensureChapterPages as ensureChapterPagesState,
  recordCutsceneHits,
  recordDialogueProgress as recordDialogueProgressState,
  recordGameEvent,
  spreadRumor as spreadRumorState,
} from "./systems/history";
import {
  awardDocumentedDepthItem,
  createManaCrystalItems,
  discoveredRoomsForDepth,
  discoveryProgressForDepth,
  markRoomDiscovered,
  normalizeDiscoveredRoomsByDepth,
  normalizeDocumentedDepths,
} from "./systems/loot";
import { simulateNpcTurns as simulateNpcTurnsState } from "./systems/npc-turns";
import {
  enforcePressureCap as enforcePressureCapState,
  makeTemporarilyHostile,
  pressureEntityCount,
  restoreExpiredTemporaryHostility,
  spawnHostiles as spawnHostilesState,
  ticksUntilNextBossSpawn,
} from "./systems/pressure";
import {
  processGlobalEvents as processGlobalEventsState,
  refreshAllArchetypes as refreshAllArchetypesState,
  refreshEntityArchetype as refreshEntityArchetypeState,
  syncPlayerTitles as syncPlayerTitlesState,
  updateQuests as updateQuestsState,
} from "./systems/progression";

const DUNGEONEER_NAMES = [
  "Mira",
  "Dagan",
  "Yori",
  "Sable",
  "Fen",
  "Ibis",
  "Noel",
  "Rook",
  "Cora",
  "Jex",
  "Vale",
  "Ryn",
  "Lio",
  "Tamsin",
  "Orin",
  "Bram",
] as const;

type AuthoredSpellDefinition = (typeof SPELL_LIST)[number];
type SpellEvolutionDefinition =
  (typeof SPELL_EVOLUTION_PACK.evolutionTable)[number];
type EquipmentSlotId = "weapon" | "armor" | "accessory";

export interface AuthoredSpellEvolutionStatus {
  evolutionId: string;
  sourceSpellId: string;
  resultSpellId: string | null;
  resultName: string;
  runeCombo: string[];
  isSummon: boolean;
  minLevel: number | null;
  minAffinityPerRune: number | null;
  available: boolean;
  blockedReasons: string[];
}

export interface AuthoredSpellRuntimeStatus {
  spellId: string;
  name: string;
  categoryId: string;
  rarityId: string;
  type: string;
  manaCost: number;
  power: number | null;
  runeCombo: string[];
  useCount: number;
  level: number;
  affinityBonus: number;
  affinities: Array<{ runeId: string; name: string; affinity: number }>;
  evolutions: AuthoredSpellEvolutionStatus[];
}

const SPELL_PROGRESSION_LEVELS = [
  ...SPELL_PROGRESSION_PACK.levelUp.levels,
].sort((left, right) => left.minUseCount - right.minUseCount);

const FLOAT_EPSILON = 1e-9;
const COMBAT_RNG_SEED_OFFSET = 3;
const WORLD_RNG_SEED_OFFSET = 11;
const DUNGEONEER_LAUGHING_FACE_INTERVAL = 11;
const MURDER_TRAIT_GATE_MIN_SURVIVAL = 0.2;
const MURDER_REPUTATION_GATE_MAX = -6;
const DIALOGUE_HISTORY_LIMIT = 40;
const RUNE_FORGE_PURCHASE_COST = GAME_STATS.runeForgeOfferItemCost;
const PREPARED_SPELL_SLOT_COUNT = GAME_STATS.preparedSpellSlotCount;
const PLAYER_STARTER_SPELL_IDS = GAME_STATS.playerStarterSkillIds;
const PLAYER_AUTHORED_STARTER_SPELL_IDS =
  GAME_STATS.playerAuthoredStarterSpellIds;
const RUNE_FORGE_OFFER_ITEM_IDS = ITEM_PACK.items
  .filter(
    (item) =>
      item.tags.includes("armor") ||
      item.tags.includes("relic") ||
      item.tags.includes("fame")
  )
  .map((item) => item.itemId);
const RUNE_AFFINITY_PER_CAST = Math.max(
  0,
  Number(RUNE_AFFINITY_PACK.gain.amountPerRunePerCast ?? 0)
);
const RUNE_AFFINITY_CAP = Math.max(
  0,
  Number(RUNE_AFFINITY_PACK.gain.cap ?? 100)
);
const DEFAULT_MOVE_TICK_COST = GAME_STATS.defaultMoveTickCost;
const TREASURE_CRYSTAL_REWARDS_BY_RARITY =
  GAME_STATS.treasureCrystalRewardsByRarity;
const COMBAT_CRYSTAL_REWARDS_BY_ENTITY_KIND =
  GAME_STATS.combatCrystalRewardsByEntityKind;
const DARK_MAP_REPUTATION_PENALTY = GAME_STATS.darkMapReputationPenalty;
const MERCHANT_BUY_PRICE_BY_RARITY = GAME_STATS.merchantBuyPriceByRarity;
const MERCHANT_SELL_PRICE_BY_RARITY = GAME_STATS.merchantSellPriceByRarity;
const TEMPORARY_HOSTILITY_DURATION_TICKS =
  GAME_STATS.temporaryHostilityDurationTicks;
const BOSS_SPAWN_INTERVAL_TICKS = SPAWN_TABLE_PACK.spawnIntervalTicks;
const BOSS_SPAWN_CAP_PER_ROOM = SPAWN_TABLE_PACK.capPerRoom;
const BOSS_SPAWN_CAP_PER_LEVEL = SPAWN_TABLE_PACK.capPerLevel;
const rarityIdSet = new Set(
  RARITY_PACK.rarities.map((rarity) => rarity.rarityId)
);
const rarityOrderById = Object.fromEntries(
  RARITY_PACK.rarities.map((rarity) => [rarity.rarityId, rarity.order])
);

const itemRarityForDefinition = (
  definition: (typeof ITEM_PACK.items)[number]
): EntityState["inventory"][number]["rarity"] => {
  const rarity =
    definition.rarityId ??
    definition.tags.find((tag) => rarityIdSet.has(tag)) ??
    "common";
  return rarity as EntityState["inventory"][number]["rarity"];
};

const createInventoryItemFromDefinition = (input: {
  definition: (typeof ITEM_PACK.items)[number];
  instanceId: string;
  tags?: string[];
  description?: string;
}): EntityState["inventory"][number] => {
  const { definition, instanceId, tags = [], description } = input;
  const name = ITEM_NAME_BY_ID[definition.itemId] ?? definition.itemId;
  return {
    itemId: instanceId,
    name,
    rarity: itemRarityForDefinition(definition),
    description: description ?? `Trade stock: ${name}.`,
    tags: [...new Set([...definition.tags, ...tags])],
    narrativeStatDelta: { ...definition.vectorDelta },
    transform: null,
  };
};

const createUnlockedSkillState = (skillId: string) => {
  const definition = SKILL_BY_ID[skillId];
  const authored = SPELL_BY_ID[skillId];
  return {
    skillId,
    name: definition?.name ?? authored?.name ?? skillId,
    unlocked: true,
    mastery: 0,
  };
};

const createStarterSkillState = () =>
  Object.fromEntries(
    [...PLAYER_STARTER_SPELL_IDS, ...PLAYER_AUTHORED_STARTER_SPELL_IDS].map(
      (skillId) => [skillId, createUnlockedSkillState(skillId)]
    )
  );

export class GameEngine {
  readonly dialogue = buildDefaultDialogueDirector();
  readonly skills = buildDefaultSkillDirector();
  readonly archetypes = buildDefaultArchetypeDirector();
  readonly cutscenes = buildDefaultCutsceneDirector();
  readonly combat: CombatSystem;
  readonly deedVectorizer = new DeedVectorizer();
  readonly rng: DeterministicRng;

  state: GameState;

  constructor(state: GameState) {
    this.state = state;
    this.normalizeDiscoveryState();
    this.normalizeSpellDiscoveryState();
    this.normalizeSummonState();
    this.normalizeTitleProgressionState();
    this.state.lastHostileSpawnTurn = Math.max(
      0,
      Math.floor(Number(this.state.lastHostileSpawnTurn ?? 0))
    );
    for (const entity of Object.values(this.state.entities)) {
      entity.entityTypeId = canonicalEntityTypeId(
        entity.entityTypeId,
        entity.entityKind
      );
      entity.occupationId = canonicalOccupationId(
        entity.occupationId,
        entity.entityKind
      );
      entity.occupationName = occupationLabel(entity.occupationId);
      entity.partyRoleId = canonicalPartyRoleId(
        entity.partyRoleId,
        entity.entityKind
      );
      entity.partyRoleName = partyRoleLabel(entity.partyRoleId);
      entity.baseFaction = entity.baseFaction ?? entity.faction;
      entity.hostileUntilTurn =
        typeof entity.hostileUntilTurn === "number"
          ? entity.hostileUntilTurn
          : null;
      entity.summonedBySkillId = entity.summonedBySkillId ?? null;
      normalizeEntityStats(entity);
      this.normalizeEquippedItems(entity);
      this.normalizeSpellProgressState(entity);
      this.normalizePreparedSpellSlots(entity);
    }
    restoreExpiredTemporaryHostility(this.state.entities, this.state.turnIndex);
    this.syncPlayerTitles();
    this.rng = new DeterministicRng(state.config.randomSeed);
    this.rng.setState(state.rngState);
    this.cutscenes.setSeen(state.seenCutscenes);
    this.combat = new CombatSystem(
      state.config.randomSeed + COMBAT_RNG_SEED_OFFSET
    );
  }

  static create(seed = DEFAULT_GAME_CONFIG.randomSeed): GameEngine {
    const config: GameConfig = {
      ...DEFAULT_GAME_CONFIG,
      randomSeed: seed,
      canonicalSeed: ACTION_CONTRACTS.canonicalSeedV1,
      entityPressureCap: ACTION_CONTRACTS.entityPressure.cap,
      countItemsAsEntitiesForPressure:
        ACTION_CONTRACTS.entityPressure.countItemsAsEntities,
    };
    const rng = new DeterministicRng(seed + WORLD_RNG_SEED_OFFSET);
    const dungeon = buildDungeonWorld(config, new DeterministicRng(seed));
    const startRoom = getRoom(dungeon, dungeon.startDepth, dungeon.startRoomId);

    const player = createPlayerEntity({
      config,
      startRoom,
      starterSkills: createStarterSkillState(),
      starterPreparedSlots: [...PLAYER_STARTER_SPELL_IDS, null, null],
    });

    const entities: Record<string, EntityState> = { [player.entityId]: player };
    let dungeoneerCounter = 0;
    const tradeStockDefinitions = ITEM_PACK.items.filter((item) => {
      return (
        !item.tags.includes("currency") && item.itemId !== "treasure_cache"
      );
    });

    for (let depth = config.totalLevels; depth >= 1; depth -= 1) {
      const level = getLevel(dungeon, depth);
      const candidateRooms = Object.values(level.rooms)
        .filter((room) => room.feature !== ROOM_FEATURE_RUNE_FORGE)
        .map((room) => room.roomId);
      const shuffledRooms = rng.shuffle(candidateRooms);

      for (let index = 0; index < config.dungeoneersPerLevel; index += 1) {
        const roomId = shuffledRooms[index];
        if (!roomId) {
          break;
        }
        dungeoneerCounter += 1;
        const npcRoom = getRoom(dungeon, depth, roomId);
        const faction =
          dungeoneerCounter % DUNGEONEER_LAUGHING_FACE_INTERVAL === 0
            ? "laughing_face"
            : "freelancer";
        const isMerchant = index === 0;
        const presetId = isMerchant ? "merchant" : "dungeoneer";
        const seedIndex = dungeoneerCounter - 1;
        const occupationId = isMerchant ? "merchant" : "dungeoneer";
        const partyRoleId = isMerchant
          ? null
          : authoredPartyRoleIdForPreset(
              "dungeoneer",
              seedIndex,
              "jack_of_all_trades"
            );
        const archetypeHeading = authoredArchetypeIdForPreset(
          presetId,
          seedIndex,
          isMerchant ? "tactician" : "delver"
        );
        const entityTypeId = authoredEntityTypeIdForPreset(
          presetId,
          seedIndex,
          "dungeoneer"
        );
        const inventory = isMerchant
          ? rng
              .shuffle(tradeStockDefinitions)
              .slice(0, 3)
              .map((definition, merchantIndex) => {
                return createInventoryItemFromDefinition({
                  definition,
                  instanceId: `${definition.itemId}_merchant_${depth}_${merchantIndex + 1}`,
                  tags: ["merchant_stock"],
                  description: `Merchant stock for depth ${depth}.`,
                });
              })
          : [
              {
                itemId: `loot_${depth}_${index + 1}`,
                name: "Worn Pouch",
                rarity: "common",
                description: "A pouch with mixed salvage.",
                tags: ["loot", "currency"],
                narrativeStatDelta: { Projection: 0.03 },
                transform: null,
              } satisfies EntityState["inventory"][number],
            ];
        const npc = createDungeoneerEntity({
          depth,
          roomId,
          room: npcRoom,
          entityId: `dungeoneer_${depth.toString().padStart(2, "0")}_${String(index + 1).padStart(2, "0")}`,
          inventory,
          name: DUNGEONEER_NAMES[
            (dungeoneerCounter - 1) % DUNGEONEER_NAMES.length
          ] as string,
          faction,
          reputation: faction === "laughing_face" ? -2 : 0,
          baseLevel: Math.max(1, config.totalLevels - depth + 1),
          entityTypeId,
          occupationId,
          partyRoleId,
          archetypeHeading,
        });
        entities[npc.entityId] = npc;
      }

      const bossSeedIndex = config.totalLevels - depth;
      const bossArchetypeHeading = authoredArchetypeIdForPreset(
        "boss",
        bossSeedIndex,
        "warden"
      );
      const boss = createBossEntity({
        config,
        depth,
        room: level.rooms[level.exitRoomId],
        entityTypeId: authoredEntityTypeIdForPreset(
          "boss",
          bossSeedIndex,
          "boss"
        ),
        archetypeHeading: bossArchetypeHeading,
        name: `Depth ${depth} ${ARCHETYPE_BY_ID[bossArchetypeHeading]?.label ?? "Warden"}`,
      });
      entities[boss.entityId] = boss;
    }

    const quests: Record<string, QuestState> = Object.fromEntries(
      QUEST_PACK.quests.map((quest) => [
        quest.questId,
        {
          questId: quest.questId,
          title: quest.title,
          description: quest.description,
          requiredProgress: requiredProgressForQuest(quest, config),
          progress: 0,
          isComplete: false,
        },
      ])
    );

    const firstChapter = chapterForDepth(dungeon, dungeon.startDepth);
    const chapterPages = {
      [firstChapter]: {
        chapter: [] as string[],
        entities: Object.fromEntries(
          Object.keys(entities).map((id) => [id, [] as string[]])
        ),
      },
    };

    const state: GameState = {
      config,
      dungeon,
      entities,
      playerId: player.entityId,
      quests,
      eventLog: [],
      actionHistory: [],
      chapterPages,
      turnIndex: 0,
      rngState: rng.getState(),
      escaped: false,
      globalEnemyLevelBonus: 0,
      hostileSpawnIndex: 0,
      activeCompanionId: null,
      mountSummoned: false,
      runBranchChoice: null,
      globalEventFlags: [],
      seenCutscenes: [],
      dialogueProgress: createEmptyDialogueProgress(),
      discoveredRoomsByDepth: {
        [String(startRoom.depth)]: [startRoom.roomId],
      },
      documentedDepths: [],
      discoveredSpellIds: [...PLAYER_AUTHORED_STARTER_SPELL_IDS],
      discoveredEvolutionIds: [],
      summonFormSpellIds: [],
      unlockedTitleIds: [],
      equippedTitleId: null,
      lastHostileSpawnTurn: 0,
    };

    const game = new GameEngine(state);
    game.refreshAllArchetypes();
    game.syncPlayerTitles();
    game.record(
      player,
      "start",
      `${config.gameTitle} begins. ${player.name} wakes on depth ${player.depth}.`,
      [],
      {},
      {}
    );
    return game;
  }

  get player(): EntityState {
    return this.state.entities[this.state.playerId] as EntityState;
  }

  snapshot(): GameSnapshot {
    return captureSnapshotState(
      this.state,
      this.rng.getState(),
      this.cutscenes.seenIds()
    );
  }

  restore(snapshot: GameSnapshot): void {
    this.state = restoreSnapshotState(snapshot);
    this.normalizeDiscoveryState();
    this.normalizeSpellDiscoveryState();
    this.normalizeSummonState();
    this.normalizeTitleProgressionState();
    for (const entity of Object.values(this.state.entities)) {
      entity.entityTypeId = canonicalEntityTypeId(
        entity.entityTypeId,
        entity.entityKind
      );
      entity.occupationId = canonicalOccupationId(
        entity.occupationId,
        entity.entityKind
      );
      entity.occupationName = occupationLabel(entity.occupationId);
      entity.partyRoleId = canonicalPartyRoleId(
        entity.partyRoleId,
        entity.entityKind
      );
      entity.partyRoleName = partyRoleLabel(entity.partyRoleId);
      entity.summonedBySkillId = entity.summonedBySkillId ?? null;
      normalizeEntityStats(entity);
      this.normalizeEquippedItems(entity);
      this.normalizeSpellProgressState(entity);
      this.normalizePreparedSpellSlots(entity);
    }
    this.syncPlayerTitles();
    this.rng.setState(this.state.rngState);
    this.cutscenes.setSeen(this.state.seenCutscenes);
  }

  spellSlotCount(): number {
    return PREPARED_SPELL_SLOT_COUNT;
  }

  currentTraversalContext(): "dungeon" | "overworld" {
    return "dungeon";
  }

  mountMovementApplies(): boolean {
    if (!(this.state.mountSummoned && THE_MOUNT)) {
      return false;
    }
    const context = this.currentTraversalContext();
    return (
      THE_MOUNT.whereAllowed === "both" ||
      THE_MOUNT.whereAllowed === undefined ||
      THE_MOUNT.whereAllowed === context
    );
  }

  currentMoveTickCost(): number {
    if (!this.mountMovementApplies()) {
      return DEFAULT_MOVE_TICK_COST;
    }
    const mountCost = Number(THE_MOUNT?.movementModifier?.ticksPerMove ?? 0);
    if (mountCost > 0) {
      return mountCost;
    }
    return THE_MOUNT?.effectId === "effect_haste_dungeon" ? 0.5 : 1;
  }

  authoredSpellStatus(
    skillId: string,
    entity = this.player
  ): AuthoredSpellRuntimeStatus | null {
    this.normalizeSpellProgressState(entity);
    const spell = SPELL_BY_ID[skillId];
    if (!spell) {
      return null;
    }
    const useCount = this.spellUseCount(entity, skillId);
    return {
      spellId: spell.spellId,
      name: entity.skills[skillId]?.name ?? spell.name,
      categoryId: spell.categoryId,
      rarityId: spell.rarityId,
      type: spell.type,
      manaCost: spell.manaCost,
      power: typeof spell.power === "number" ? spell.power : null,
      runeCombo: [...(spell.runeCombo ?? [])],
      useCount,
      level: this.spellLevelForUseCount(useCount),
      affinityBonus: this.authoredSpellAffinityBonus(entity, spell),
      affinities: (spell.runeCombo ?? []).map((runeId) => ({
        runeId,
        name: RUNE_BY_ID[runeId]?.name ?? runeId,
        affinity: this.runeAffinityFor(entity, runeId),
      })),
      evolutions: this.authoredSpellEvolutionCandidates(entity, skillId),
    };
  }

  preparedSpellSlots(entity = this.player): Array<{
    slotIndex: number;
    skillId: string | null;
    name: string;
    description: string;
    available: boolean;
    blockedReasons: string[];
  }> {
    this.normalizePreparedSpellSlots(entity);
    const room = getRoom(this.state.dungeon, entity.depth, entity.roomId);
    const nearby = this.nearbyEntities(entity);
    return entity.equippedSkillSlots.map((skillId, slotIndex) => {
      if (!skillId) {
        return {
          slotIndex,
          skillId: null,
          name: "Empty Slot",
          description: "Prepare a spell at the rune forge.",
          available: false,
          blockedReasons: ["empty_slot"],
        };
      }
      const definition = this.skills.skills[skillId];
      const authored = SPELL_BY_ID[skillId];
      const availability = this.availabilityForPreparedSpell(entity, skillId);
      return {
        slotIndex,
        skillId,
        name:
          entity.skills[skillId]?.name ??
          definition?.name ??
          authored?.name ??
          skillId,
        description:
          definition?.description ??
          authored?.description ??
          "Prepared combat spell.",
        available: availability.available,
        blockedReasons: [...availability.blockedReasons],
      };
    });
  }

  spellPool(entity = this.player): Array<{
    skillId: string;
    name: string;
    description: string;
    branch: string;
    isEquipped: boolean;
    slotIndex: number | null;
    available: boolean;
    blockedReasons: string[];
  }> {
    this.normalizePreparedSpellSlots(entity);
    const equippedIndex = new Map<string, number>();
    entity.equippedSkillSlots.forEach((skillId, index) => {
      if (skillId) {
        equippedIndex.set(skillId, index);
      }
    });

    return Object.values(entity.skills)
      .filter((skill) => skill.unlocked)
      .map((skill) => {
        const definition = this.skills.skills[skill.skillId];
        const authored = SPELL_BY_ID[skill.skillId];
        const availability = this.availabilityForKnownSpell(
          entity,
          skill.skillId
        );
        return {
          skillId: skill.skillId,
          name:
            entity.skills[skill.skillId]?.name ??
            definition?.name ??
            authored?.name ??
            skill.name,
          description:
            definition?.description ??
            authored?.description ??
            "Prepared spell.",
          branch: definition?.branch ?? authored?.categoryId ?? "general",
          isEquipped: equippedIndex.has(skill.skillId),
          slotIndex: equippedIndex.get(skill.skillId) ?? null,
          available: availability.available,
          blockedReasons: [...availability.blockedReasons],
        };
      })
      .sort((left, right) => {
        if (left.isEquipped !== right.isEquipped) {
          return left.isEquipped ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
  }

  prepareSpell(
    slotIndex: number,
    skillId: string
  ): { ok: boolean; reason: string } {
    const actor = this.player;
    this.normalizePreparedSpellSlots(actor);
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    if (room.feature !== ROOM_FEATURE_RUNE_FORGE) {
      return { ok: false, reason: "needs_rune_forge" };
    }
    if (
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex >= PREPARED_SPELL_SLOT_COUNT
    ) {
      return { ok: false, reason: "invalid_slot" };
    }
    if (!actor.skills[skillId]?.unlocked) {
      return { ok: false, reason: "skill_locked" };
    }
    const priorIndex = actor.equippedSkillSlots.indexOf(skillId);
    if (priorIndex > -1) {
      actor.equippedSkillSlots[priorIndex] = null;
    }
    actor.equippedSkillSlots[slotIndex] = skillId;
    return { ok: true, reason: "prepared" };
  }

  clearPreparedSpellSlot(slotIndex: number): { ok: boolean; reason: string } {
    const actor = this.player;
    this.normalizePreparedSpellSlots(actor);
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    if (room.feature !== ROOM_FEATURE_RUNE_FORGE) {
      return { ok: false, reason: "needs_rune_forge" };
    }
    if (
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex >= PREPARED_SPELL_SLOT_COUNT
    ) {
      return { ok: false, reason: "invalid_slot" };
    }
    actor.equippedSkillSlots[slotIndex] = null;
    return { ok: true, reason: "cleared" };
  }

  castPreparedSpell(skillId: string): TurnResult {
    const start = this.state.eventLog.length;
    const player = this.player;

    this.executePreparedSpell(player, skillId, true);
    this.processGlobalEvents(player);
    this.spawnHostiles(player.depth);
    this.invokeSummonFollowThrough(player);
    this.simulateNpcTurns();
    restoreExpiredTemporaryHostility(this.state.entities, this.state.turnIndex);
    this.enforcePressureCap(player);

    this.state.rngState = this.rng.getState();
    this.state.seenCutscenes = this.cutscenes.seenIds();

    return {
      events: this.state.eventLog.slice(start),
      escaped: this.state.escaped,
    };
  }

  discoveredSpellIds(entity = this.player): string[] {
    this.normalizeSpellDiscoveryState(entity);
    return [...this.state.discoveredSpellIds];
  }

  discoveredEvolutionIds(): string[] {
    this.normalizeSpellDiscoveryState();
    return [...this.state.discoveredEvolutionIds];
  }

  forgeSpellRecipe(
    runeCombo: string[],
    options: { customName?: string | null; slotIndex?: number | null } = {}
  ): TurnResult {
    const start = this.state.eventLog.length;
    const player = this.player;

    this.executeForgeCraft(player, runeCombo, options, true);
    this.processGlobalEvents(player);
    this.spawnHostiles(player.depth);
    this.invokeSummonFollowThrough(player);
    this.simulateNpcTurns();
    restoreExpiredTemporaryHostility(this.state.entities, this.state.turnIndex);
    this.enforcePressureCap(player);

    this.state.rngState = this.rng.getState();
    this.state.seenCutscenes = this.cutscenes.seenIds();

    return {
      events: this.state.eventLog.slice(start),
      escaped: this.state.escaped,
    };
  }

  forgeSpellEvolution(sourceSkillId: string, runeCombo: string[]): TurnResult {
    const start = this.state.eventLog.length;
    const player = this.player;

    this.executeForgeEvolution(player, sourceSkillId, runeCombo, true);
    this.processGlobalEvents(player);
    this.spawnHostiles(player.depth);
    this.invokeSummonFollowThrough(player);
    this.simulateNpcTurns();
    restoreExpiredTemporaryHostility(this.state.entities, this.state.turnIndex);
    this.enforcePressureCap(player);

    this.state.rngState = this.rng.getState();
    this.state.seenCutscenes = this.cutscenes.seenIds();

    return {
      events: this.state.eventLog.slice(start),
      escaped: this.state.escaped,
    };
  }

  renameKnownSpell(
    skillId: string,
    requestedName: string | null | undefined
  ): { ok: boolean; reason: string; message: string } {
    const actor = this.player;
    const skill = actor.skills[skillId];
    if (!skill?.unlocked) {
      return {
        ok: false,
        reason: "skill_locked",
        message: `Cannot rename ${skillId}.`,
      };
    }
    const nextName = String(requestedName ?? "").trim();
    if (nextName.length === 0) {
      return {
        ok: false,
        reason: "name_required",
        message: "Spell name cannot be empty.",
      };
    }
    skill.name = nextName;
    return {
      ok: true,
      reason: "renamed",
      message: `${actor.name} records ${nextName} in the rune codex.`,
    };
  }

  status(): Record<string, unknown> {
    this.normalizeSummonState();
    const player = this.player;
    const room = getRoom(this.state.dungeon, player.depth, player.roomId);
    const activeCompanion = this.activeCompanionEntity();
    const activeSummon = this.activeSummonEntity();
    const currentTitle = this.state.equippedTitleId
      ? (TITLE_BY_ID[this.state.equippedTitleId] ?? null)
      : null;
    const fog = formulaRegistry.fogMetrics({
      level: levelForEntity(
        player,
        this.state.config,
        this.state.globalEnemyLevelBonus
      ),
      narrativeStats: player.narrativeStats,
    });
    return {
      turn: this.state.turnIndex,
      depth: player.depth,
      roomId: player.roomId,
      roomFeature: room.feature,
      chapter: chapterFor(this.state, player.depth),
      act: actFor(this.state, player.depth),
      health: currentHp(player),
      mana: currentMana(player),
      fame: player.narrativeStats.Fame,
      combatStats: { ...player.combatStats },
      skillStats: { ...player.skillStats },
      narrativeStats: { ...player.narrativeStats },
      runeStats: { ...player.runeStats },
      level: levelForEntity(
        player,
        this.state.config,
        this.state.globalEnemyLevelBonus
      ),
      faction: player.faction,
      reputation: player.reputation,
      archetypeHeading: player.archetypeHeading,
      archetypeLabel: archetypeLabel(player.archetypeHeading),
      entityTypeId: player.entityTypeId,
      entityTypeName: entityTypeLabel(player.entityTypeId),
      occupationId: player.occupationId,
      occupationName: player.occupationName,
      partyRoleId: player.partyRoleId,
      partyRoleName: player.partyRoleName,
      titleId: currentTitle?.titleId ?? null,
      titleName: currentTitle?.name ?? null,
      titleRarityId: currentTitle?.rarityId ?? null,
      titleRarityLabel: rarityLabel(currentTitle?.rarityId ?? null),
      unlockedTitleIds: [...this.state.unlockedTitleIds],
      unlockedTitles: this.state.unlockedTitleIds
        .map((titleId) => TITLE_BY_ID[titleId] ?? null)
        .filter((title): title is NonNullable<typeof title> => title !== null)
        .map((title) => ({
          titleId: title.titleId,
          name: title.name,
          archetypeId: title.archetypeId,
          rarityId: title.rarityId,
          rarityLabel: rarityLabel(title.rarityId),
        })),
      archetypeScores: this.archetypes.rank(player).slice(0, 3),
      skills: Object.values(player.skills)
        .filter((skill) => skill.unlocked)
        .map((skill) => skill.skillId),
      inventory: buildInventoryStatus(player, (itemId) =>
        this.equippedSlotForItem(player, itemId)
      ),
      equippedWeaponItemId: player.equippedWeaponItemId,
      equippedArmorItemId: player.equippedArmorItemId,
      equippedAccessoryItemId: player.equippedAccessoryItemId,
      equippedItems: {
        weapon: player.equippedWeaponItemId,
        armor: player.equippedArmorItemId,
        accessory: player.equippedAccessoryItemId,
      },
      mountSummoned: this.state.mountSummoned,
      mountName: THE_MOUNT?.name ?? null,
      mountContext: this.currentTraversalContext(),
      moveTickCost: this.currentMoveTickCost(),
      mountEffectId: THE_MOUNT?.effectId ?? null,
      spellSlotCount: PREPARED_SPELL_SLOT_COUNT,
      equippedSpells: buildEquippedSpellStatus(this.preparedSpellSlots(player)),
      spellPool: buildSpellPoolStatus(this.spellPool(player)),
      runeAffinities: { ...player.runeStats },
      authoredSpellProgress: buildAuthoredSpellProgressStatus(
        Object.values(player.skills)
          .filter((skill) => skill.unlocked)
          .map((skill) => skill.skillId),
        (skillId) => this.authoredSpellStatus(skillId, player)
      ),
      discoveredSpellIds: this.discoveredSpellIds(player),
      discoveredEvolutionIds: this.discoveredEvolutionIds(),
      summonFormSpellIds: [...this.state.summonFormSpellIds],
      quests: buildQuestStatus(this.state.quests),
      companion: this.state.activeCompanionId,
      companionName: activeCompanion?.name ?? null,
      activeSummonSkillId: activeSummon?.summonedBySkillId ?? null,
      activeSummonName: activeSummon?.name ?? null,
      rumors: player.rumors.length,
      deeds: player.deeds.length,
      pressure: pressureEntityCount(this.state, this.player.depth),
      pressureCap: this.state.config.entityPressureCap,
      bossSpawnIntervalTicks:
        this.state.config.hostileSpawnPerTurn > 0
          ? 1
          : BOSS_SPAWN_INTERVAL_TICKS,
      ticksUntilBossSpawn: ticksUntilNextBossSpawn(
        this.state.turnIndex,
        this.state.lastHostileSpawnTurn,
        this.state.config.hostileSpawnPerTurn > 0
          ? 1
          : BOSS_SPAWN_INTERVAL_TICKS
      ),
      hostileNpcCount: Object.values(this.state.entities).filter((entity) => {
        return (
          entity.depth === player.depth &&
          entity.hostileUntilTurn !== null &&
          entity.hostileUntilTurn > this.state.turnIndex
        );
      }).length,
      semanticCacheSize: this.deedVectorizer.cacheSize(),
      formulaRegistryVersion: FORMULA_REGISTRY_VERSION,
      fogMetrics: fog,
      manaCrystalCount: this.countCurrencyTokens(player),
      discoveredRoomIds: discoveredRoomsForDepth(this.state, player.depth),
      discoveredRoomCount: discoveryProgressForDepth(this.state, player.depth)
        .discoveredCount,
      totalRoomsOnDepth: discoveryProgressForDepth(this.state, player.depth)
        .totalRooms,
      documentedDepths: [...this.state.documentedDepths],
      dialogueProgress: buildDialogueProgressStatus(
        this.state.dialogueProgress
      ),
    };
  }

  look(): string {
    const player = this.player;
    const room = getRoom(this.state.dungeon, player.depth, player.roomId);
    const nearby = this.nearbyEntities(player).map(
      (entity) =>
        `${entity.name}(lvl ${levelForEntity(entity, this.state.config, this.state.globalEnemyLevelBonus)},${entity.faction})`
    );
    const actions = this.availableActions(player)
      .filter((row) => row.available)
      .slice(0, 10)
      .map((row) => row.label);

    return buildLookSummary({
      roomDescription: room.description,
      exits: Object.keys(room.exits),
      nearby,
      archetypeHeading: player.archetypeHeading,
      mountLabel:
        this.state.mountSummoned && THE_MOUNT
          ? `${THE_MOUNT.name} active`
          : "stabled",
      roomVector: topRoomVector(room, 3),
      availableActions: actions,
    });
  }

  availableDialogueOptions(
    entity = this.player
  ): Array<{ optionId: string; label: string; line: string }> {
    const room = getRoom(this.state.dungeon, entity.depth, entity.roomId);
    return this.dialogue
      .availableOptions(entity, room, this.state.dialogueProgress)
      .map((row) => ({
        optionId: row.optionId,
        label: row.label,
        line: row.line,
      }));
  }

  pagesForCurrentChapter(): {
    chapter: string[];
    entities: Record<string, string[]>;
  } {
    const chapter = chapterFor(this.state, this.player.depth);
    this.ensureChapterPages(chapter);
    return this.state.chapterPages[chapter] as {
      chapter: string[];
      entities: Record<string, string[]>;
    };
  }

  recentDeeds(limit = 10): Deed[] {
    return this.player.deeds.slice(-Math.max(1, limit)).map((deed) => ({
      deedId: deed.deedId,
      actorId: this.player.entityId,
      actorName: this.player.name,
      subjectId: deed.subjectEntityId,
      sourceEntityId: deed.sourceEntityId,
      beliefState: deed.beliefState,
      confidence: deed.confidence,
      deedType: deed.sourceAction,
      title: deed.summary,
      summary: deed.summary,
      depth: deed.depth,
      roomId: deed.roomId,
      tags: deed.tags,
      turnIndex: deed.turnIndex,
    }));
  }

  recentCutscenes(limit = 10): GameEvent[] {
    return this.state.eventLog
      .filter((event) => event.actionType === "cutscene")
      .slice(-Math.max(1, limit));
  }

  dispatch(action: PlayerAction): TurnResult {
    const start = this.state.eventLog.length;
    const player = this.player;

    this.executeAction(player, action, true);
    this.processRoomEntryEvents(player, action);
    this.processGlobalEvents(player);
    this.spawnHostiles(player.depth);
    this.invokeSummonFollowThrough(player);
    this.simulateNpcTurns();
    restoreExpiredTemporaryHostility(this.state.entities, this.state.turnIndex);
    this.enforcePressureCap(player);

    this.state.rngState = this.rng.getState();
    this.state.seenCutscenes = this.cutscenes.seenIds();

    return {
      events: this.state.eventLog.slice(start),
      escaped: this.state.escaped,
    };
  }

  availableActions(entity = this.player): ActionAvailability[] {
    const room = getRoom(this.state.dungeon, entity.depth, entity.roomId);
    const nearby = this.nearbyEntities(entity);
    const hasEnemyNearby = nearby.some((other) => this.isEnemy(entity, other));
    const rows: ActionAvailability[] = [];
    const withIntent = (
      row: Omit<ActionAvailability, "uiIntent" | "uiScreen" | "uiPriority">
    ): ActionAvailability => {
      const intent = ACTION_INTENT_BY_ACTION_TYPE[row.actionType];
      return {
        ...row,
        uiIntent: intent?.uiIntent,
        uiScreen: intent?.uiScreen,
        uiPriority: intent?.uiPriority,
      };
    };

    for (const direction of Object.keys(room.exits) as MoveDirection[]) {
      const action: PlayerAction = {
        actionType: "move",
        payload: { direction },
      };
      const availability = this.availabilityForAction(entity, action);
      rows.push(
        withIntent({
          actionType: "move",
          label: `go ${direction}`,
          available: availability.available,
          blockedReasons: availability.blockedReasons,
          payload: { direction },
        })
      );
    }

    const baseActions: Array<{ label: string; action: PlayerAction }> = [
      {
        label: this.state.mountSummoned
          ? `dismiss ${THE_MOUNT?.name ?? "mount"}`
          : `call ${THE_MOUNT?.name ?? "mount"}`,
        action: { actionType: "whistle", payload: {} },
      },
      { label: "train", action: { actionType: "train", payload: {} } },
      { label: "rest", action: { actionType: "rest", payload: {} } },
      { label: "talk", action: { actionType: "talk", payload: {} } },
      { label: "search", action: { actionType: "search", payload: {} } },
      {
        label: "say <text>",
        action: { actionType: "speak", payload: { intentText: "..." } },
      },
      { label: "fight", action: { actionType: "fight", payload: {} } },
      {
        label: "stream",
        action: {
          actionType: "live_stream",
          payload: {
            effort: Number(
              ACTION_CONTRACTS.actions.liveStream?.effortCost ?? 10
            ),
          },
        },
      },
      { label: "steal", action: { actionType: "steal", payload: {} } },
      { label: "recruit", action: { actionType: "recruit", payload: {} } },
      { label: "murder", action: { actionType: "murder", payload: {} } },
    ];

    for (const row of baseActions) {
      const availability = this.availabilityForAction(entity, row.action);
      rows.push(
        withIntent({
          actionType: row.action.actionType,
          label: row.label,
          available: availability.available,
          blockedReasons: availability.blockedReasons,
          payload: row.action.payload,
        })
      );
    }

    if (hasEnemyNearby) {
      for (const direction of Object.keys(room.exits) as MoveDirection[]) {
        const fleeAction: PlayerAction = {
          actionType: "flee",
          payload: { direction },
        };
        const availability = this.availabilityForAction(entity, fleeAction);
        rows.push(
          withIntent({
            actionType: "flee",
            label: `flee ${direction}`,
            available: availability.available,
            blockedReasons: availability.blockedReasons,
            payload: { direction },
          })
        );
      }
    }

    const dialogueRows = this.dialogue.availableOptions(
      entity,
      room,
      this.state.dialogueProgress
    );
    if (dialogueRows.length > 0) {
      rows.push(
        withIntent({
          actionType: "choose_dialogue",
          label: `choose ${dialogueRows[0]?.optionId ?? "option"}`,
          available: true,
          blockedReasons: [],
          payload: {
            options: dialogueRows.map((option) => ({
              optionId: option.optionId,
              label: option.label,
            })),
          },
        })
      );
    }

    for (const evolution of this.skills.availableEvolutions(entity, room)) {
      rows.push(
        withIntent({
          actionType: "evolve_skill",
          label: `evolve ${evolution.skillId}`,
          available: evolution.available,
          blockedReasons: evolution.blockedReasons,
          payload: { skillId: evolution.skillId },
        })
      );
    }

    if (room.feature === ROOM_FEATURE_RUNE_FORGE) {
      for (const skill of Object.values(entity.skills).filter(
        (entry) => entry.unlocked
      )) {
        for (const evolution of this.authoredSpellEvolutionCandidates(
          entity,
          skill.skillId
        )) {
          rows.push(
            withIntent({
              actionType: "evolve_skill",
              label: `evolve ${evolution.sourceSpellId} -> ${evolution.resultName}`,
              available: evolution.available,
              blockedReasons: [...evolution.blockedReasons],
              payload: {
                skillId: evolution.sourceSpellId,
                sourceSkillId: evolution.sourceSpellId,
                evolutionId: evolution.evolutionId,
              },
            })
          );
        }
      }
    }

    if (entity.isPlayer) {
      for (const trader of nearby.filter((candidate) =>
        this.canTrade(candidate)
      )) {
        for (const traderItem of trader.inventory.filter((item) =>
          this.isTradeItem(item)
        )) {
          const buyAction: PlayerAction = {
            actionType: "buy_item",
            payload: {
              itemId: traderItem.itemId,
              targetId: trader.entityId,
            },
          };
          const buyAvailability = this.availabilityForAction(entity, buyAction);
          rows.push(
            withIntent({
              actionType: "buy_item",
              label: traderItem.tags.includes("buyback")
                ? `buy back ${traderItem.name} from ${trader.name}`
                : `buy ${traderItem.name} from ${trader.name}`,
              available: buyAvailability.available,
              blockedReasons: buyAvailability.blockedReasons,
              payload: {
                itemId: traderItem.itemId,
                targetId: trader.entityId,
              },
            })
          );
        }
      }

      if (room.feature === ROOM_FEATURE_RUNE_FORGE) {
        for (const offerItemId of RUNE_FORGE_OFFER_ITEM_IDS) {
          const purchaseAction: PlayerAction = {
            actionType: "purchase",
            payload: { itemId: offerItemId },
          };
          const purchaseAvailability = this.availabilityForAction(
            entity,
            purchaseAction
          );
          rows.push(
            withIntent({
              actionType: "purchase",
              label: `purchase ${offerItemId}`,
              available: purchaseAvailability.available,
              blockedReasons: purchaseAvailability.blockedReasons,
              payload: { itemId: offerItemId },
            })
          );
        }

        for (const inventoryItem of entity.inventory) {
          const reEquipAction: PlayerAction = {
            actionType: "re_equip",
            payload: { itemId: inventoryItem.itemId },
          };
          const reEquipAvailability = this.availabilityForAction(
            entity,
            reEquipAction
          );
          rows.push(
            withIntent({
              actionType: "re_equip",
              label: `re-equip ${inventoryItem.name}`,
              available: reEquipAvailability.available,
              blockedReasons: reEquipAvailability.blockedReasons,
              payload: { itemId: inventoryItem.itemId },
            })
          );
        }
      }

      for (const item of entity.inventory) {
        const useAction: PlayerAction = {
          actionType: "use_item",
          payload: { itemId: item.itemId },
        };
        const useAvailability = this.availabilityForAction(entity, useAction);
        rows.push(
          withIntent({
            actionType: "use_item",
            label: `use ${item.name}`,
            available: useAvailability.available,
            blockedReasons: useAvailability.blockedReasons,
            payload: { itemId: item.itemId },
          })
        );

        const equipAction: PlayerAction = {
          actionType: "equip_item",
          payload: { itemId: item.itemId },
        };
        const equipAvailability = this.availabilityForAction(
          entity,
          equipAction
        );
        rows.push(
          withIntent({
            actionType: "equip_item",
            label: `equip ${item.name}`,
            available: equipAvailability.available,
            blockedReasons: equipAvailability.blockedReasons,
            payload: { itemId: item.itemId },
          })
        );

        const dropAction: PlayerAction = {
          actionType: "drop_item",
          payload: { itemId: item.itemId },
        };
        const dropAvailability = this.availabilityForAction(entity, dropAction);
        rows.push(
          withIntent({
            actionType: "drop_item",
            label: `drop ${item.name}`,
            available: dropAvailability.available,
            blockedReasons: dropAvailability.blockedReasons,
            payload: { itemId: item.itemId },
          })
        );

        const tradeTarget = this.resolveTradeTarget(entity, undefined, nearby);
        if (tradeTarget) {
          const sellAction: PlayerAction = {
            actionType: "sell_item",
            payload: { itemId: item.itemId, targetId: tradeTarget.entityId },
          };
          const sellAvailability = this.availabilityForAction(
            entity,
            sellAction
          );
          rows.push(
            withIntent({
              actionType: "sell_item",
              label: `sell ${item.name} to ${tradeTarget.name}`,
              available: sellAvailability.available,
              blockedReasons: sellAvailability.blockedReasons,
              payload: { itemId: item.itemId, targetId: tradeTarget.entityId },
            })
          );
        }
      }
    }

    return rows;
  }

  private executeAction(
    actor: EntityState,
    action: PlayerAction,
    allowCutscenes: boolean
  ): GameEvent {
    const availability = this.availabilityForAction(actor, action);
    if (!availability.available) {
      const event = this.record(
        actor,
        action.actionType,
        `${actor.name} cannot use '${action.actionType}' right now.`,
        availability.blockedReasons,
        {},
        {}
      );
      this.state.actionHistory.push(action.actionType);
      return event;
    }

    const beforeNarrativeStats = cloneState(actor.narrativeStats);
    const beforeArchetype = actor.archetypeHeading;
    const nearby = this.nearbyEntities(actor);
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const result = this.performAction(actor, action, nearby);
    this.recordDialogueProgress(actor, action, result);
    return this.finalizeActorAction(
      actor,
      action.actionType,
      result,
      room,
      nearby,
      allowCutscenes,
      beforeNarrativeStats,
      beforeArchetype
    );
  }

  private executePreparedSpell(
    actor: EntityState,
    skillId: string,
    allowCutscenes: boolean,
    turnCostOverride?: number
  ): GameEvent {
    const availability = this.availabilityForPreparedSpell(actor, skillId);
    if (!availability.available) {
      const event = this.record(
        actor,
        "cast_spell",
        `${actor.name} cannot cast '${skillId}' right now.`,
        availability.blockedReasons,
        {},
        { skillId }
      );
      this.state.actionHistory.push("cast_spell");
      return event;
    }

    const beforeNarrativeStats = cloneState(actor.narrativeStats);
    const beforeArchetype = actor.archetypeHeading;
    const nearby = this.nearbyEntities(actor);
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const result = this.performPreparedSpell(
      actor,
      skillId,
      availability.definition,
      nearby
    );
    if (typeof turnCostOverride === "number") {
      result.turnCost = turnCostOverride;
    }
    return this.finalizeActorAction(
      actor,
      "cast_spell",
      result,
      room,
      nearby,
      allowCutscenes,
      beforeNarrativeStats,
      beforeArchetype
    );
  }

  private executeForgeCraft(
    actor: EntityState,
    runeCombo: string[],
    options: { customName?: string | null; slotIndex?: number | null },
    allowCutscenes: boolean
  ): GameEvent {
    const beforeNarrativeStats = cloneState(actor.narrativeStats);
    const beforeArchetype = actor.archetypeHeading;
    const nearby = this.nearbyEntities(actor);
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const result = this.performForgeCraft(actor, room, runeCombo, options);
    return this.finalizeActorAction(
      actor,
      "craft_spell",
      result,
      room,
      nearby,
      allowCutscenes,
      beforeNarrativeStats,
      beforeArchetype
    );
  }

  private executeForgeEvolution(
    actor: EntityState,
    sourceSkillId: string,
    runeCombo: string[],
    allowCutscenes: boolean
  ): GameEvent {
    const beforeNarrativeStats = cloneState(actor.narrativeStats);
    const beforeArchetype = actor.archetypeHeading;
    const nearby = this.nearbyEntities(actor);
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const result = this.performForgeEvolution(
      actor,
      room,
      sourceSkillId,
      runeCombo
    );
    return this.finalizeActorAction(
      actor,
      "evolve_skill",
      result,
      room,
      nearby,
      allowCutscenes,
      beforeNarrativeStats,
      beforeArchetype
    );
  }

  private finalizeActorAction(
    actor: EntityState,
    actionType: string,
    result: ActionOutcome,
    room: RoomNode,
    nearby: EntityState[],
    allowCutscenes: boolean,
    beforeNarrativeStats: NumberMap,
    beforeArchetype: string
  ): GameEvent {
    applyNarrativeStatDelta(
      actor.narrativeStats,
      result.narrativeStatDelta,
      this.state.config.minTraitValue,
      this.state.config.maxTraitValue
    );

    applyNarrativeStatDelta(
      actor.narrativeStats,
      scaleVector(
        effectiveRoomVector(room),
        ACTION_CONTRACTS.roomInfluenceScale
      ),
      this.state.config.minTraitValue,
      this.state.config.maxTraitValue
    );

    const unlockedSkills = this.skills.unlockNewSkills(actor, room, nearby);
    const unlockedSkillIds = unlockedSkills.map((skill) => skill.skillId);
    if (
      unlockedSkillIds.includes("appraisal") ||
      unlockedSkillIds.includes("xray")
    ) {
      this.state.runBranchChoice = unlockedSkillIds.includes("appraisal")
        ? "appraisal"
        : "xray";
    }

    const deedMemory = this.applyDeedSemantics(
      actor,
      actionType,
      result.message,
      result.foundItemTags,
      result.subjectEntityId ?? actor.entityId,
      actor.entityId,
      "verified",
      1
    );
    applyNarrativeStatDelta(
      actor.narrativeStats,
      mergeDeltas(deedMemory.traitDelta, deedMemory.featureDelta),
      this.state.config.minTraitValue,
      this.state.config.maxTraitValue
    );

    if (
      ["live_stream", "murder", "fight", "search", "cast_spell"].includes(
        actionType
      )
    ) {
      this.spreadRumor(
        actor,
        result.message,
        actionType === "live_stream" ? 0.65 : 0.45,
        result.subjectEntityId ?? actor.entityId
      );
    }
    if (actionType === "talk") {
      this.crossPollinateRumors(actor, nearby);
    }

    const totalNarrativeDelta = diffMap(
      beforeNarrativeStats,
      actor.narrativeStats
    );
    this.refreshEntityArchetype(actor);
    const titleSync = actor.isPlayer
      ? this.syncPlayerTitles()
      : { newlyUnlockedTitleIds: [] as string[] };

    const event = this.record(
      actor,
      actionType,
      result.message,
      result.warnings,
      totalNarrativeDelta,
      {
        ...result.metadata,
        unlockedSkills: unlockedSkillIds,
        unlockedTitles: titleSync.newlyUnlockedTitleIds,
        equippedTitleId: this.state.equippedTitleId,
        archetypeBefore: beforeArchetype,
        archetypeAfter: actor.archetypeHeading,
      },
      result.turnCost
    );
    this.state.actionHistory.push(actionType);
    this.updateQuests(
      actor,
      actionType === "cast_spell" ? "fight" : actionType,
      result.chapterCompleted
    );

    if (actor.isPlayer) {
      for (const titleId of titleSync.newlyUnlockedTitleIds) {
        const title = TITLE_BY_ID[titleId];
        if (!title) {
          continue;
        }
        this.record(
          actor,
          "title_unlocked",
          `${actor.name} earns the title ${title.name}.`,
          [],
          {},
          {
            titleId: title.titleId,
            archetypeId: title.archetypeId,
            rarityId: title.rarityId,
            autoEquipped: this.state.equippedTitleId === title.titleId,
          },
          0
        );
      }
    }

    if (allowCutscenes && actor.isPlayer) {
      const cutsceneRoom = getRoom(
        this.state.dungeon,
        actor.depth,
        actor.roomId
      );
      const hits = this.cutscenes.trigger({
        actor,
        actionType: actionType === "cast_spell" ? "fight" : actionType,
        foundItemTags: result.foundItemTags,
        unlockedSkillIds,
        chapterCompleted: result.chapterCompleted,
        escaped: this.state.escaped,
        roomFeature: cutsceneRoom.feature,
        roomId: cutsceneRoom.roomId,
      });
      this.recordCutscenes(actor, hits);
    }

    return event;
  }

  private performAction(
    actor: EntityState,
    action: PlayerAction,
    nearby: EntityState[]
  ): ActionOutcome {
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    return (
      performNavigationAction({
        state: this.state,
        actor,
        action,
        room,
        currentMoveTickCost: () => this.currentMoveTickCost(),
        mountMovementApplies: () => this.mountMovementApplies(),
        defaultMoveTickCost: DEFAULT_MOVE_TICK_COST,
        onPlayerMoved: (movement) => this.onPlayerMoved(movement),
      }) ??
      performSocialAction({
        actor,
        action,
        room,
        nearby,
        lastActionType: this.state.actionHistory.at(-1) ?? null,
        setActiveCompanionId: (value) => {
          this.state.activeCompanionId = value;
        },
        resolveTarget: (
          currentActor,
          requestedTargetId,
          currentNearby,
          enemyOnly
        ) =>
          this.resolveTarget(
            currentActor,
            requestedTargetId,
            currentNearby,
            enemyOnly
          ),
        chooseDialogueOption: (currentActor, currentRoom, optionId) =>
          this.dialogue.chooseOption(
            currentActor,
            currentRoom,
            optionId,
            this.state.dialogueProgress
          ),
        projectIntent: (intentText) =>
          this.deedVectorizer.projectIntent(intentText),
        makeTargetTemporarilyHostile: (target) =>
          makeTemporarilyHostile(
            target,
            this.state.turnIndex,
            TEMPORARY_HOSTILITY_DURATION_TICKS
          ),
      }) ??
      performCombatAction({
        state: this.state,
        actor,
        action,
        nearby,
        resolveTarget: (
          currentActor,
          requestedTargetId,
          currentNearby,
          enemyOnly
        ) =>
          this.resolveTarget(
            currentActor,
            requestedTargetId,
            currentNearby,
            enemyOnly
          ),
        selectWeapon: (currentActor) => this.selectWeapon(currentActor),
        combatSpar: (currentActor, target, options) =>
          this.combat.spar(currentActor, target, options),
        combatCrystalRewardForTarget: (target) =>
          this.combatCrystalRewardForTarget(target),
        buildManaCrystalItems: (count, source, rarity) =>
          this.buildManaCrystalItems(count, source, rarity),
        onPlayerMoved: (movement) => this.onPlayerMoved(movement),
      }) ??
      performRuneForgeAction({
        actor,
        action,
        room,
        evolveKnownSkill: (currentActor, currentRoom, skillId) =>
          this.skills.evolveSkill(currentActor, currentRoom, skillId),
        performAuthoredEvolution: (
          currentActor,
          currentRoom,
          sourceSkillId,
          evolutionId
        ) =>
          this.performAuthoredEvolution(
            currentActor,
            currentRoom,
            sourceSkillId,
            evolutionId
          ),
      }) ??
      performInventoryAction({
        actor,
        action,
        room,
        nearby,
        runeForgePurchaseCost: RUNE_FORGE_PURCHASE_COST,
        findInventoryItem: (currentActor, itemId) =>
          this.findInventoryItem(currentActor, itemId),
        isConsumable: (item) => this.isConsumable(item),
        clearEquippedItem: (currentActor, itemId) =>
          this.clearEquippedItem(currentActor, itemId),
        setEquippedItem: (currentActor, item) =>
          this.setEquippedItem(currentActor, item),
        isEquippable: (item) => this.isEquippable(item),
        consumeCurrencyTokens: (currentActor, count) =>
          this.consumeCurrencyTokens(currentActor, count),
        buildPurchasedItem: (itemId) => this.buildPurchasedItem(itemId),
        resolveTradeTarget: (currentActor, requestedTargetId, currentNearby) =>
          this.resolveTradeTarget(
            currentActor,
            requestedTargetId,
            currentNearby
          ),
        isTradeItem: (item) => this.isTradeItem(item),
        merchantBuyPriceForItem: (item) => this.merchantBuyPriceForItem(item),
        merchantSellPriceForItem: (item) => this.merchantSellPriceForItem(item),
        treasureCrystalRewardForRoom: (currentRoom) =>
          this.treasureCrystalRewardForRoom(currentRoom),
        buildManaCrystalItems: (count, source, rarity) =>
          this.buildManaCrystalItems(count, source, rarity),
      }) ?? {
        message: `Unknown action ${action.actionType}.`,
        warnings: ["unknown_action"],
        narrativeStatDelta: {},
        metadata: {},
        foundItemTags: [],
      }
    );
  }

  private performAuthoredEvolution(
    actor: EntityState,
    room: RoomNode,
    sourceSkillId: string,
    evolutionId: string
  ): {
    ok: boolean;
    reason: string;
    message: string;
    resultSpellId: string | null;
    isSummon: boolean;
  } {
    const evolution = this.authoredSpellEvolutionCandidates(
      actor,
      sourceSkillId
    ).find((row) => row.evolutionId === evolutionId);
    if (!evolution) {
      return {
        ok: false,
        reason: "evolution_unavailable",
        message: "",
        resultSpellId: null,
        isSummon: false,
      };
    }
    if (room.feature !== ROOM_FEATURE_RUNE_FORGE) {
      return {
        ok: false,
        reason: "needs_rune_forge",
        message: "",
        resultSpellId: evolution.resultSpellId,
        isSummon: evolution.isSummon,
      };
    }
    if (!evolution.available) {
      return {
        ok: false,
        reason: evolution.blockedReasons[0] ?? "evolution_unavailable",
        message: "",
        resultSpellId: evolution.resultSpellId,
        isSummon: evolution.isSummon,
      };
    }

    const resultSpellId = evolution.resultSpellId ?? sourceSkillId;
    const sourceName = actor.skills[sourceSkillId]?.name?.trim() ?? "";
    if (!actor.skills[resultSpellId]?.unlocked) {
      actor.skills[resultSpellId] = createUnlockedSkillState(resultSpellId);
    }
    const resultSkill = actor.skills[resultSpellId];
    if (sourceName.length > 0 && resultSkill) {
      resultSkill.name = sourceName;
    }
    actor.spellUseCounts[resultSpellId] = Math.max(
      this.spellUseCount(actor, resultSpellId),
      this.spellUseCount(actor, sourceSkillId)
    );
    this.discoverSpell(resultSpellId);
    if (evolution.isSummon) {
      this.unlockSummonForm(resultSpellId);
    }
    if (resultSpellId !== sourceSkillId) {
      this.replacePreparedSpell(actor, sourceSkillId, resultSpellId);
    }

    return {
      ok: true,
      reason: "evolved",
      message:
        resultSpellId === sourceSkillId
          ? `${actor.name} stabilizes ${evolution.resultName} at the rune forge.`
          : `${actor.name} evolves ${sourceSkillId} into ${evolution.resultName}.`,
      resultSpellId,
      isSummon: evolution.isSummon,
    };
  }

  private performForgeCraft(
    actor: EntityState,
    room: RoomNode,
    runeCombo: string[],
    options: { customName?: string | null; slotIndex?: number | null }
  ): ActionOutcome {
    return performForgeCraftAction({
      actor,
      room,
      runeCombo,
      options,
      normalizeRuneCombo: (currentRuneCombo) =>
        this.normalizeRuneCombo(currentRuneCombo),
      authoredSpellForRuneCombo: (currentRuneCombo) =>
        this.authoredSpellForRuneCombo(currentRuneCombo),
      hasDiscoveredSpell: (spellId) => this.hasDiscoveredSpell(spellId),
      spellForgeCost: (spell) =>
        this.spellForgeCost(spell as AuthoredSpellDefinition),
      countCurrencyTokens: (currentActor) =>
        this.countCurrencyTokens(currentActor),
      consumeCurrencyTokens: (currentActor, count) =>
        this.consumeCurrencyTokens(currentActor, count),
      createUnlockedSkillState: (skillId) => createUnlockedSkillState(skillId),
      discoverSpell: (spellId) => this.discoverSpell(spellId),
      prepareSpellInSlot: (currentActor, slotIndex, skillId) =>
        this.prepareSpellInSlot(currentActor, slotIndex, skillId),
    });
  }

  private performForgeEvolution(
    actor: EntityState,
    room: RoomNode,
    sourceSkillId: string,
    runeCombo: string[]
  ): ActionOutcome {
    return performForgeEvolutionAction({
      actor,
      room,
      sourceSkillId,
      runeCombo,
      normalizeRuneCombo: (currentRuneCombo) =>
        this.normalizeRuneCombo(currentRuneCombo),
      authoredSpellEvolutionCandidates: (currentActor, currentSourceSkillId) =>
        this.authoredSpellEvolutionCandidates(
          currentActor,
          currentSourceSkillId
        ),
      performAuthoredEvolution: (
        currentActor,
        currentRoom,
        currentSourceSkillId,
        evolutionId
      ) =>
        this.performAuthoredEvolution(
          currentActor,
          currentRoom,
          currentSourceSkillId,
          evolutionId
        ),
      discoverEvolution: (evolutionId) => this.discoverEvolution(evolutionId),
    });
  }

  private performPreparedSpell(
    actor: EntityState,
    skillId: string,
    definition: SkillDefinition | null,
    nearby: EntityState[]
  ): ActionOutcome {
    if (actor.isPlayer && this.isSummonForm(skillId)) {
      const authored = SPELL_BY_ID[skillId];
      if (!authored) {
        return {
          message: `${actor.name} cannot stabilize the summon form for ${skillId}.`,
          warnings: ["unknown_skill"],
          narrativeStatDelta: {},
          metadata: { skillId },
          foundItemTags: [],
        };
      }

      const manaCost = this.authoredSpellManaCost(authored);
      setCurrentMana(actor, Math.max(0, currentMana(actor) - manaCost));
      this.applyAuthoredSpellProgress(actor, authored);
      const summon = this.createOrRefreshSummon(actor, skillId);
      if (!summon) {
        return {
          message: `${actor.name} cannot call ${authored.name} while a companion is already active.`,
          warnings: ["companion_slot_filled"],
          narrativeStatDelta: {},
          metadata: { skillId, manaCost },
          foundItemTags: [],
        };
      }

      return {
        message: `${actor.name} binds ${summon.name} into the room as a living summon.`,
        warnings: [],
        narrativeStatDelta: {
          Momentum: 0.08,
          Awareness: authored.categoryId === "detection" ? 0.04 : 0,
        },
        metadata: {
          skillId,
          summonEntityId: summon.entityId,
          summonSkillId: skillId,
          manaCost,
          summon: true,
        },
        foundItemTags: [],
        subjectEntityId: summon.entityId,
      };
    }

    return performPreparedSpellAction({
      actor,
      skillId,
      definition,
      nearby,
      getAuthoredSpell: (currentSkillId) => SPELL_BY_ID[currentSkillId] ?? null,
      resolveTarget: (
        currentActor,
        requestedTargetId,
        currentNearby,
        enemyOnly
      ) =>
        this.resolveTarget(
          currentActor,
          requestedTargetId,
          currentNearby,
          enemyOnly
        ),
      selectWeapon: (currentActor) => this.selectWeapon(currentActor),
      combatSpar: (currentActor, target, options) =>
        this.combat.spar(currentActor, target, options),
      spellBranchFlavor: (branch) => this.spellBranchFlavor(branch),
      spellPowerBonus: (currentDefinition) =>
        this.spellPowerBonus(currentDefinition),
      authoredSpellManaCost: (spell) => this.authoredSpellManaCost(spell),
      authoredSpellWeaponBonus: (currentActor, spell) =>
        this.authoredSpellWeaponBonus(currentActor, spell),
      authoredSpellAffinityBonus: (currentActor, spell) =>
        this.authoredSpellAffinityBonus(currentActor, spell),
      applyAuthoredSpellProgress: (currentActor, spell) =>
        this.applyAuthoredSpellProgress(currentActor, spell),
      spellUseCount: (currentActor, currentSkillId) =>
        this.spellUseCount(currentActor, currentSkillId),
      spellLevelForUseCount: (useCount) => this.spellLevelForUseCount(useCount),
      combatCrystalRewardForTarget: (target) =>
        this.combatCrystalRewardForTarget(target),
      buildManaCrystalItems: (count, source, rarity) =>
        this.buildManaCrystalItems(count, source, rarity),
    });
  }

  private availabilityForPreparedSpell(
    actor: EntityState,
    skillId: string
  ): {
    available: boolean;
    blockedReasons: string[];
    definition: SkillDefinition | null;
  } {
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const nearby = this.nearbyEntities(actor);
    const availability = availabilityForPreparedSpellAction({
      actor,
      skillId,
      room,
      nearby,
      normalizePreparedSpellSlots: (currentActor) =>
        this.normalizePreparedSpellSlots(currentActor),
      getSkillDefinition: (currentSkillId) =>
        this.skills.skills[currentSkillId] ?? null,
      getAuthoredSpell: (currentSkillId) => SPELL_BY_ID[currentSkillId] ?? null,
      authoredSpellManaCost: (spell) => this.authoredSpellManaCost(spell),
      canUseSkill: (currentActor, currentRoom, currentSkillId, currentNearby) =>
        this.skills.canUse(
          currentActor,
          currentRoom,
          currentSkillId,
          currentNearby
        ),
      resolveTarget: (
        currentActor,
        requestedTargetId,
        currentNearby,
        enemyOnly
      ) =>
        this.resolveTarget(
          currentActor,
          requestedTargetId,
          currentNearby,
          enemyOnly
        ),
    });
    const activeCompanion = this.activeCompanionEntity();
    if (
      actor.isPlayer &&
      this.isSummonForm(skillId) &&
      activeCompanion &&
      activeCompanion.entityKind !== "summon"
    ) {
      availability.blockedReasons.push("companion_slot_filled");
      availability.available = false;
    }
    return availability;
  }

  private availabilityForKnownSpell(
    actor: EntityState,
    skillId: string
  ): {
    available: boolean;
    blockedReasons: string[];
    definition: SkillDefinition | null;
  } {
    const definition = this.skills.skills[skillId] ?? null;
    const authored = SPELL_BY_ID[skillId];
    if (!(definition || authored)) {
      return {
        available: false,
        blockedReasons: ["unknown_skill"],
        definition: null,
      };
    }

    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const nearby = this.nearbyEntities(actor);
    if (authored) {
      const blockedReasons: string[] = [];
      if (currentMana(actor) < this.authoredSpellManaCost(authored)) {
        blockedReasons.push("Need more mana");
      }
      const activeCompanion = this.activeCompanionEntity();
      if (
        actor.isPlayer &&
        this.isSummonForm(skillId) &&
        activeCompanion &&
        activeCompanion.entityKind !== "summon"
      ) {
        blockedReasons.push("companion_slot_filled");
      }
      if (!this.resolveTarget(actor, undefined, nearby, true)) {
        blockedReasons.push("Need an enemy target");
      }
      return {
        available: blockedReasons.length === 0,
        blockedReasons,
        definition,
      };
    }

    const useState = this.skills.canUse(actor, room, skillId, nearby);
    return {
      available: useState.available,
      blockedReasons: [...useState.blockedReasons],
      definition,
    };
  }

  private normalizeSpellDiscoveryState(entity = this.player): void {
    const discoveredSpellIds = Array.isArray(this.state.discoveredSpellIds)
      ? this.state.discoveredSpellIds
      : [];
    const discoveredEvolutionIds = Array.isArray(
      this.state.discoveredEvolutionIds
    )
      ? this.state.discoveredEvolutionIds
      : [];
    const nextSpellIds = new Set(
      discoveredSpellIds.filter(
        (value): value is string => typeof value === "string"
      )
    );
    for (const skill of Object.values(entity.skills)) {
      if (skill.unlocked && Object.hasOwn(SPELL_BY_ID, skill.skillId)) {
        nextSpellIds.add(skill.skillId);
      }
    }
    this.state.discoveredSpellIds = [...nextSpellIds].sort((left, right) =>
      left.localeCompare(right)
    );
    this.state.discoveredEvolutionIds = [
      ...new Set(
        discoveredEvolutionIds.filter(
          (value): value is string => typeof value === "string"
        )
      ),
    ].sort((left, right) => left.localeCompare(right));
  }

  private normalizeRuneCombo(runeCombo: string[]): string[] {
    return runeCombo
      .map((runeId) => String(runeId ?? "").trim())
      .filter(
        (runeId) => runeId.length > 0 && Object.hasOwn(RUNE_BY_ID, runeId)
      );
  }

  private authoredSpellForRuneCombo(
    runeCombo: string[]
  ): AuthoredSpellDefinition | null {
    return SPELL_BY_RUNE_COMBO_KEY[runeComboKey(runeCombo)] ?? null;
  }

  private spellForgeCost(spell: AuthoredSpellDefinition): number {
    if (typeof spell.forgeCostManaCrystals === "number") {
      return spell.forgeCostManaCrystals;
    }
    return (
      SPELL_FORGE_COSTS.overrides[spell.spellId] ??
      SPELL_FORGE_COSTS.defaultByRarity[spell.rarityId] ??
      0
    );
  }

  private hasDiscoveredSpell(spellId: string): boolean {
    this.normalizeSpellDiscoveryState();
    return this.state.discoveredSpellIds.includes(spellId);
  }

  private discoverSpell(spellId: string): void {
    this.normalizeSpellDiscoveryState();
    if (!this.state.discoveredSpellIds.includes(spellId)) {
      this.state.discoveredSpellIds = [
        ...this.state.discoveredSpellIds,
        spellId,
      ].sort((left, right) => left.localeCompare(right));
    }
  }

  private discoverEvolution(evolutionId: string): void {
    this.normalizeSpellDiscoveryState();
    if (!this.state.discoveredEvolutionIds.includes(evolutionId)) {
      this.state.discoveredEvolutionIds = [
        ...this.state.discoveredEvolutionIds,
        evolutionId,
      ].sort((left, right) => left.localeCompare(right));
    }
  }

  private normalizeSummonState(): void {
    const summonFormSpellIds = Array.isArray(this.state.summonFormSpellIds)
      ? this.state.summonFormSpellIds
      : [];
    this.state.summonFormSpellIds = [...new Set(summonFormSpellIds)]
      .filter(
        (skillId): skillId is string =>
          typeof skillId === "string" && Object.hasOwn(SPELL_BY_ID, skillId)
      )
      .sort((left, right) => left.localeCompare(right));

    const activeCompanionId =
      typeof this.state.activeCompanionId === "string"
        ? this.state.activeCompanionId
        : null;
    if (!activeCompanionId) {
      this.state.activeCompanionId = null;
      return;
    }
    const activeCompanion = this.state.entities[activeCompanionId];
    if (
      !(
        activeCompanion &&
        isAlive(activeCompanion) &&
        activeCompanion.companionTo === this.state.playerId
      )
    ) {
      this.state.activeCompanionId = null;
    }
  }

  private isSummonForm(skillId: string): boolean {
    this.normalizeSummonState();
    return this.state.summonFormSpellIds.includes(skillId);
  }

  private unlockSummonForm(skillId: string): void {
    this.normalizeSummonState();
    if (this.state.summonFormSpellIds.includes(skillId)) {
      return;
    }
    this.state.summonFormSpellIds = [
      ...this.state.summonFormSpellIds,
      skillId,
    ].sort((left, right) => left.localeCompare(right));
  }

  private activeCompanionEntity(): EntityState | null {
    this.normalizeSummonState();
    const activeCompanionId = this.state.activeCompanionId;
    if (!activeCompanionId) {
      return null;
    }
    return this.state.entities[activeCompanionId] ?? null;
  }

  private activeSummonEntity(): EntityState | null {
    const companion = this.activeCompanionEntity();
    if (companion?.entityKind !== "summon") {
      return null;
    }
    return companion;
  }

  private syncActiveCompanionPosition(owner: EntityState): void {
    const companion = this.activeCompanionEntity();
    if (!(companion && companion.companionTo === owner.entityId)) {
      return;
    }
    companion.depth = owner.depth;
    companion.roomId = owner.roomId;
    companion.transform = cloneState(owner.transform);
  }

  private createOrRefreshSummon(
    owner: EntityState,
    skillId: string
  ): EntityState | null {
    const activeCompanion = this.activeCompanionEntity();
    if (activeCompanion && activeCompanion.entityKind !== "summon") {
      return null;
    }
    const spell = SPELL_BY_ID[skillId];
    if (!spell) {
      return null;
    }
    const room = getRoom(this.state.dungeon, owner.depth, owner.roomId);
    const summon = createSummonEntity({
      owner,
      room,
      skillId,
      skillName: owner.skills[skillId]?.name ?? spell.name,
      spellName: owner.skills[skillId]?.name ?? spell.name,
      spellPower: spell.power ?? this.authoredSpellBasePower(spell),
    });
    this.state.entities[summon.entityId] = summon;
    this.state.activeCompanionId = summon.entityId;
    return summon;
  }

  private invokeSummonFollowThrough(owner: EntityState): void {
    const summon = this.activeSummonEntity();
    if (!(summon && summon.companionTo === owner.entityId && isAlive(summon))) {
      return;
    }
    this.syncActiveCompanionPosition(owner);
    const skillId =
      summon.summonedBySkillId ??
      summon.equippedSkillSlots.find(
        (entry): entry is string =>
          typeof entry === "string" && entry.length > 0
      ) ??
      null;
    if (!skillId) {
      return;
    }
    const availability = this.availabilityForPreparedSpell(summon, skillId);
    if (!availability.available) {
      return;
    }
    const event = this.executePreparedSpell(summon, skillId, false, 0);
    const ownerSpellLevel = this.spellLevelForUseCount(
      this.spellUseCount(owner, skillId)
    );
    owner.xp += 5 + Math.max(0, ownerSpellLevel - 1);
    this.updateQuests(owner, "fight");
    const targetId =
      typeof event.metadata.targetId === "string"
        ? event.metadata.targetId
        : "";
    const defeated = Boolean(event.metadata.defenderDefeated);
    if (!(defeated && targetId)) {
      this.normalizeSummonState();
      return;
    }
    const target = this.state.entities[targetId];
    if (!target) {
      this.normalizeSummonState();
      return;
    }
    const crystalReward = this.combatCrystalRewardForTarget(target);
    const crystalItems = this.buildManaCrystalItems(
      crystalReward,
      `summon_${target.entityId}`,
      target.entityKind === "boss" ? "epic" : "common"
    );
    owner.inventory.push(...crystalItems);
    if (crystalItems.length > 0) {
      this.record(
        owner,
        "summon_reward",
        `${owner.name} gathers ${crystalItems.length} mana crystal${crystalItems.length === 1 ? "" : "s"} from ${summon.name}'s kill.`,
        [],
        {},
        {
          summonEntityId: summon.entityId,
          targetId: target.entityId,
          manaCrystalCount: crystalItems.length,
        },
        0
      );
    }
    this.normalizeSummonState();
  }

  private prepareSpellInSlot(
    actor: EntityState,
    slotIndex: number,
    skillId: string
  ): void {
    if (
      !Number.isInteger(slotIndex) ||
      slotIndex < 0 ||
      slotIndex >= PREPARED_SPELL_SLOT_COUNT
    ) {
      return;
    }
    const priorIndex = actor.equippedSkillSlots.indexOf(skillId);
    if (priorIndex > -1) {
      actor.equippedSkillSlots[priorIndex] = null;
    }
    actor.equippedSkillSlots[slotIndex] = skillId;
    this.normalizePreparedSpellSlots(actor);
  }

  private normalizeSpellProgressState(actor: EntityState): void {
    actor.runeStats = normalizeNumberRecord(actor.runeStats);
    actor.spellUseCounts = normalizeNumberRecord(actor.spellUseCounts);
  }

  private normalizeDiscoveryState(): void {
    this.state.discoveredRoomsByDepth = normalizeDiscoveredRoomsByDepth(
      this.state.discoveredRoomsByDepth
    );
    this.state.documentedDepths = normalizeDocumentedDepths(
      this.state.documentedDepths
    );
    const player = this.state.entities[this.state.playerId];
    if (player) {
      markRoomDiscovered(this.state, player.depth, player.roomId);
    }
  }

  private normalizeTitleProgressionState(): void {
    const unlocked = Array.isArray(this.state.unlockedTitleIds)
      ? this.state.unlockedTitleIds
      : [];
    this.state.unlockedTitleIds = [...new Set(unlocked)]
      .filter((titleId) => typeof titleId === "string" && titleId.length > 0)
      .sort((left, right) => left.localeCompare(right));
    const equippedTitleId =
      typeof this.state.equippedTitleId === "string"
        ? this.state.equippedTitleId
        : null;
    this.state.equippedTitleId =
      equippedTitleId && this.state.unlockedTitleIds.includes(equippedTitleId)
        ? equippedTitleId
        : null;
  }

  private syncPlayerTitles(): { newlyUnlockedTitleIds: string[] } {
    this.normalizeTitleProgressionState();
    const sync = syncPlayerTitlesState({
      currentEquippedTitleId: this.state.equippedTitleId,
      currentUnlockedTitleIds: this.state.unlockedTitleIds,
      entities: this.state.entities,
      player: this.player,
      rarityOrderById,
      state: this.state,
      titles: TITLE_PACK.titles,
    });
    this.state.unlockedTitleIds = sync.unlockedTitleIds;
    this.state.equippedTitleId = sync.equippedTitleId;
    return {
      newlyUnlockedTitleIds: sync.newlyUnlockedTitleIds,
    };
  }

  private onPlayerMoved(input: {
    actor: EntityState;
    previousDepth: number;
    previousRoomId: string;
    direction: MoveDirection;
    escaped: boolean;
  }): {
    rewardMessage?: string | null;
    foundItemTags?: string[];
    metadata?: Record<string, unknown>;
  } | null {
    const { actor, previousDepth, escaped } = input;
    this.syncActiveCompanionPosition(actor);
    markRoomDiscovered(this.state, actor.depth, actor.roomId);
    const leftDepthUpward =
      previousDepth > actor.depth || (escaped && previousDepth === 1);
    if (!leftDepthUpward) {
      return null;
    }
    const mapReward = awardDocumentedDepthItem({
      actor,
      state: this.state,
      depth: previousDepth,
      turnIndex: this.state.turnIndex,
      darkMapReputationPenalty: DARK_MAP_REPUTATION_PENALTY,
    });
    if (!mapReward) {
      return null;
    }
    return {
      rewardMessage: mapReward.isDarkMap
        ? `${actor.name} records a dark map for depth ${previousDepth} (${mapReward.discoveredCount}/${mapReward.totalRooms}).`
        : `${actor.name} records a survey map for depth ${previousDepth}.`,
      foundItemTags: [...mapReward.item.tags],
      metadata: {
        documentedDepth: previousDepth,
        documentedMapItemId: mapReward.item.itemId,
        documentedMapIsDark: mapReward.isDarkMap,
        documentedMapDiscoveredCount: mapReward.discoveredCount,
        documentedMapTotalRooms: mapReward.totalRooms,
        reputationDeltaFromMap: mapReward.reputationDelta,
      },
    };
  }

  private buildManaCrystalItems(
    count: number,
    source: string,
    rarity: EntityState["inventory"][number]["rarity"] = "common"
  ): EntityState["inventory"] {
    return createManaCrystalItems({
      count,
      source,
      rarity,
      turnIndex: this.state.turnIndex,
    });
  }

  private treasureCrystalRewardForRoom(room: RoomNode): number {
    const rarityWeights = room.items
      .filter((item) => item.isPresent)
      .map((item) => TREASURE_CRYSTAL_REWARDS_BY_RARITY[item.rarity] ?? 0);
    const highestReward = rarityWeights.reduce(
      (best, value) => Math.max(best, value),
      0
    );
    if (highestReward > 0) {
      return highestReward;
    }
    if (room.feature === "treasure") {
      return 1;
    }
    return 0;
  }

  private combatCrystalRewardForTarget(target: EntityState): number {
    return COMBAT_CRYSTAL_REWARDS_BY_ENTITY_KIND[target.entityKind] ?? 0;
  }

  private runeAffinityFor(actor: EntityState, runeId: string): number {
    this.normalizeSpellProgressState(actor);
    return runeStat(actor, runeId);
  }

  private spellUseCount(actor: EntityState, skillId: string): number {
    this.normalizeSpellProgressState(actor);
    return Number(actor.spellUseCounts[skillId] ?? 0);
  }

  private spellLevelForUseCount(useCount: number): number {
    let level = 1;
    for (const row of SPELL_PROGRESSION_LEVELS) {
      if (useCount >= row.minUseCount) {
        level = row.level;
      }
    }
    return level;
  }

  private authoredSpellBasePower(spell: AuthoredSpellDefinition): number {
    if (typeof spell.power === "number") {
      return spell.power;
    }
    if (!spell.runeCombo || spell.runeCombo.length === 0) {
      return 12;
    }
    return spell.runeCombo.reduce((total, runeId) => {
      return total + Number(RUNE_BY_ID[runeId]?.basePower ?? 6);
    }, 0);
  }

  private authoredSpellAffinityBonus(
    actor: EntityState,
    spell: AuthoredSpellDefinition
  ): number {
    return (spell.runeCombo ?? []).reduce((total, runeId) => {
      return total + Math.floor(this.runeAffinityFor(actor, runeId) / 10);
    }, 0);
  }

  private authoredSpellWeaponBonus(
    actor: EntityState,
    spell: AuthoredSpellDefinition
  ): number {
    const basePower = this.authoredSpellBasePower(spell);
    return Math.max(
      2,
      Math.round(basePower / 10) + this.authoredSpellAffinityBonus(actor, spell)
    );
  }

  private authoredSpellManaCost(spell: AuthoredSpellDefinition): number {
    if ((spell.runeCombo?.length ?? 0) >= 3 || (spell.power ?? 0) >= 30) {
      return 2;
    }
    return 1;
  }

  private applyAuthoredSpellProgress(
    actor: EntityState,
    spell: AuthoredSpellDefinition
  ): void {
    this.normalizeSpellProgressState(actor);
    actor.spellUseCounts[spell.spellId] =
      this.spellUseCount(actor, spell.spellId) + 1;
    for (const runeId of spell.runeCombo ?? []) {
      setRuneStat(
        actor,
        runeId,
        Math.min(
          RUNE_AFFINITY_CAP,
          this.runeAffinityFor(actor, runeId) + RUNE_AFFINITY_PER_CAST
        )
      );
    }
  }

  private isRuneComboPrefix(source: string[], target: string[]): boolean {
    if (source.length === 0 || source.length > target.length) {
      return false;
    }
    return source.every((runeId, index) => target[index] === runeId);
  }

  private authoredSpellEvolutionCandidates(
    actor: EntityState,
    skillId: string
  ): AuthoredSpellEvolutionStatus[] {
    const spell = SPELL_BY_ID[skillId];
    const sourceCombo = spell?.runeCombo ?? [];
    if (!spell || sourceCombo.length === 0) {
      return [];
    }
    return SPELL_EVOLUTION_PACK.evolutionTable
      .filter((evolution) =>
        this.isRuneComboPrefix(sourceCombo, evolution.runeCombo)
      )
      .map((evolution) =>
        this.authoredEvolutionStatus(actor, spell, evolution)
      );
  }

  private authoredEvolutionStatus(
    actor: EntityState,
    spell: AuthoredSpellDefinition,
    evolution: SpellEvolutionDefinition
  ): AuthoredSpellEvolutionStatus {
    const blockedReasons: string[] = [];
    const useCount = this.spellUseCount(actor, spell.spellId);
    const level = this.spellLevelForUseCount(useCount);
    if (typeof evolution.minLevel === "number" && level < evolution.minLevel) {
      blockedReasons.push(`requires_level_${evolution.minLevel}`);
    }
    if (typeof evolution.minAffinityPerRune === "number") {
      const minAffinityPerRune = evolution.minAffinityPerRune;
      const missingRune = evolution.runeCombo.find(
        (runeId) => this.runeAffinityFor(actor, runeId) < minAffinityPerRune
      );
      if (missingRune) {
        blockedReasons.push(`requires_affinity_${minAffinityPerRune}`);
      }
    }
    if (
      evolution.resultSpellId === spell.spellId &&
      !evolution.isSummon &&
      evolution.runeCombo.length === (spell.runeCombo?.length ?? 0)
    ) {
      blockedReasons.push("already_in_form");
    }
    return {
      evolutionId: evolution.evolutionId,
      sourceSpellId: spell.spellId,
      resultSpellId: evolution.resultSpellId ?? null,
      resultName: evolution.resultName,
      runeCombo: [...evolution.runeCombo],
      isSummon: evolution.isSummon,
      minLevel: evolution.minLevel ?? null,
      minAffinityPerRune: evolution.minAffinityPerRune ?? null,
      available: blockedReasons.length === 0,
      blockedReasons,
    };
  }

  private replacePreparedSpell(
    actor: EntityState,
    sourceSkillId: string,
    resultSpellId: string
  ): void {
    actor.equippedSkillSlots = actor.equippedSkillSlots.map((skillId) =>
      skillId === sourceSkillId ? resultSpellId : skillId
    );
    this.normalizePreparedSpellSlots(actor);
  }

  private normalizePreparedSpellSlots(actor: EntityState): void {
    if (!actor.isPlayer && actor.entityKind !== "summon") {
      actor.equippedSkillSlots = [];
      return;
    }

    const raw = Array.isArray(actor.equippedSkillSlots)
      ? actor.equippedSkillSlots
      : [];
    const seen = new Set<string>();
    const next: Array<string | null> = [];
    for (let index = 0; index < PREPARED_SPELL_SLOT_COUNT; index += 1) {
      const value = raw[index];
      if (
        typeof value === "string" &&
        actor.skills[value]?.unlocked &&
        !seen.has(value)
      ) {
        next.push(value);
        seen.add(value);
        continue;
      }
      next.push(null);
    }
    actor.equippedSkillSlots = next;
  }

  private normalizeEquippedItems(actor: EntityState): void {
    const inventoryIds = new Set(actor.inventory.map((item) => item.itemId));
    if (!inventoryIds.has(actor.equippedWeaponItemId ?? "")) {
      actor.equippedWeaponItemId = null;
    }
    if (!inventoryIds.has(actor.equippedArmorItemId ?? "")) {
      actor.equippedArmorItemId = null;
    }
    if (!inventoryIds.has(actor.equippedAccessoryItemId ?? "")) {
      actor.equippedAccessoryItemId = null;
    }
  }

  private spellPowerBonus(definition: SkillDefinition): number {
    if (definition.branch === "combat") {
      return definition.evolvedFrom ? 4 : 3;
    }
    if (definition.branch === "craft" || definition.branch === "guile") {
      return definition.evolvedFrom ? 3.5 : 2.5;
    }
    if (definition.branch === "fame" || definition.branch === "social") {
      return definition.evolvedFrom ? 3 : 2.2;
    }
    return definition.evolvedFrom ? 2.8 : 2;
  }

  private spellBranchFlavor(branch?: string): string {
    if (branch === "combat") {
      return "Kael commits to the clash.";
    }
    if (branch === "craft") {
      return "Forged sigils spark across the chamber.";
    }
    if (branch === "guile") {
      return "The strike lands from a blind angle.";
    }
    if (branch === "fame") {
      return "The room flashes like a staged reveal.";
    }
    if (branch === "social") {
      return "The words cut before the blow lands.";
    }
    return "Instinct turns into motion.";
  }

  private availabilityForAction(
    actor: EntityState,
    action: PlayerAction
  ): { available: boolean; blockedReasons: string[] } {
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const nearby = this.nearbyEntities(actor);
    return (
      availabilityForNavigationAction({
        state: this.state,
        actor,
        action,
        room,
      }) ??
      availabilityForSocialAction({
        actor,
        action,
        room,
        nearby,
        activeCompanionId: this.state.activeCompanionId,
        resolveTarget: (
          currentActor,
          requestedTargetId,
          currentNearby,
          enemyOnly
        ) =>
          this.resolveTarget(
            currentActor,
            requestedTargetId,
            currentNearby,
            enemyOnly
          ),
        availableDialogueOptions: (currentActor, currentRoom) =>
          this.dialogue.availableOptions(
            currentActor,
            currentRoom,
            this.state.dialogueProgress
          ),
      }) ??
      availabilityForCombatAction({
        state: this.state,
        actor,
        action,
        nearby,
        murderTraitGateMinSurvival: MURDER_TRAIT_GATE_MIN_SURVIVAL,
        murderReputationGateMax: MURDER_REPUTATION_GATE_MAX,
        resolveTarget: (
          currentActor,
          requestedTargetId,
          currentNearby,
          enemyOnly
        ) =>
          this.resolveTarget(
            currentActor,
            requestedTargetId,
            currentNearby,
            enemyOnly
          ),
        isEnemy: (left, right) => this.isEnemy(left, right),
      }) ??
      availabilityForInventoryAction({
        actor,
        action,
        room,
        nearby,
        runeForgePurchaseCost: RUNE_FORGE_PURCHASE_COST,
        runeForgeOfferItemIds: RUNE_FORGE_OFFER_ITEM_IDS,
        findInventoryItem: (currentActor, itemId) =>
          this.findInventoryItem(currentActor, itemId),
        isEquippable: (item) => this.isEquippable(item),
        countCurrencyTokens: (currentActor) =>
          this.countCurrencyTokens(currentActor),
        resolveTradeTarget: (currentActor, requestedTargetId, currentNearby) =>
          this.resolveTradeTarget(
            currentActor,
            requestedTargetId,
            currentNearby
          ),
        isTradeItem: (item) => this.isTradeItem(item),
        merchantBuyPriceForItem: (item) => this.merchantBuyPriceForItem(item),
        merchantSellPriceForItem: (item) => this.merchantSellPriceForItem(item),
      }) ??
      availabilityForRuneForgeAction({
        actor,
        action,
        room,
        authoredSpellEvolutionCandidates: (currentActor, sourceSkillId) =>
          this.authoredSpellEvolutionCandidates(currentActor, sourceSkillId),
        availableSkillEvolutions: (currentActor, currentRoom) =>
          this.skills.availableEvolutions(currentActor, currentRoom),
      }) ?? { available: true, blockedReasons: [] }
    );
  }

  private recordDialogueProgress(
    actor: EntityState,
    action: PlayerAction,
    result: ActionOutcome
  ): void {
    recordDialogueProgressState({
      actor,
      action,
      historyLimit: DIALOGUE_HISTORY_LIMIT,
      result,
      state: this.state,
    });
  }

  private ensureChapterPages(chapter: number): void {
    ensureChapterPagesState(this.state, chapter);
  }

  private record(
    actor: EntityState,
    actionType: string,
    message: string,
    warnings: string[],
    narrativeStatDelta: NumberMap,
    metadata: Record<string, unknown>,
    turnCost = 1
  ): GameEvent {
    return recordGameEvent({
      actor,
      actionType,
      message,
      metadata,
      narrativeStatDelta,
      state: this.state,
      turnCost,
      warnings,
    });
  }

  private recordCutscenes(actor: EntityState, hits: CutsceneHit[]): void {
    recordCutsceneHits({
      actor,
      hits,
      recordEvent: (input) =>
        this.record(
          input.actor,
          input.actionType,
          input.message,
          input.warnings,
          input.narrativeStatDelta,
          input.metadata
        ),
    });
  }

  private nearbyEntities(actor: EntityState): EntityState[] {
    return Object.values(this.state.entities).filter((entity) => {
      if (entity.entityId === actor.entityId || !isAlive(entity)) {
        return false;
      }
      return entity.depth === actor.depth && entity.roomId === actor.roomId;
    });
  }

  private isEnemy(a: EntityState, b: EntityState): boolean {
    if (a.entityId === b.entityId) {
      return false;
    }
    if (a.faction === "party" && b.faction === "party") {
      return false;
    }
    if (a.companionTo && a.companionTo === b.entityId) {
      return false;
    }
    if (b.companionTo && b.companionTo === a.entityId) {
      return false;
    }
    return a.faction !== b.faction;
  }

  private resolveTarget(
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[],
    enemyOnly: boolean
  ): EntityState | null {
    if (requestedTargetId) {
      const requested = nearby.find(
        (entity) => entity.entityId === requestedTargetId
      );
      if (!requested) {
        return null;
      }
      if (enemyOnly && !this.isEnemy(actor, requested)) {
        return null;
      }
      return requested;
    }
    for (const entity of nearby) {
      if (!enemyOnly || this.isEnemy(actor, entity)) {
        return entity;
      }
    }
    return null;
  }

  private findInventoryItem(
    actor: EntityState,
    itemId: string
  ): EntityState["inventory"][number] | null {
    if (!itemId) {
      return null;
    }
    return actor.inventory.find((item) => item.itemId === itemId) ?? null;
  }

  private canTrade(entity: EntityState): boolean {
    if (!entity.occupationId) {
      return false;
    }
    return Boolean(OCCUPATION_BY_ID[entity.occupationId]?.canTrade);
  }

  private resolveTradeTarget(
    _actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[]
  ): EntityState | null {
    if (requestedTargetId) {
      const requested = nearby.find(
        (entity) => entity.entityId === requestedTargetId
      );
      return requested && this.canTrade(requested) ? requested : null;
    }
    return nearby.find((entity) => this.canTrade(entity)) ?? null;
  }

  private isTradeItem(item: EntityState["inventory"][number]): boolean {
    return !item.tags.includes("currency");
  }

  private merchantBuyPriceForItem(
    item: EntityState["inventory"][number]
  ): number {
    return Math.max(0, MERCHANT_BUY_PRICE_BY_RARITY[item.rarity] ?? 0);
  }

  private merchantSellPriceForItem(
    item: EntityState["inventory"][number]
  ): number {
    return Math.max(0, MERCHANT_SELL_PRICE_BY_RARITY[item.rarity] ?? 0);
  }

  private itemEquipmentSlot(
    item: EntityState["inventory"][number]
  ): EquipmentSlotId | null {
    if (item.tags.includes("weapon")) {
      return "weapon";
    }
    if (item.tags.includes("armor")) {
      return "armor";
    }
    if (
      item.tags.includes("accessory") ||
      item.tags.includes("relic") ||
      item.tags.includes("fame") ||
      item.tags.includes("utility") ||
      item.tags.includes("guile")
    ) {
      return "accessory";
    }
    return null;
  }

  private equippedSlotForItem(
    actor: EntityState,
    itemId: string
  ): EquipmentSlotId | null {
    if (actor.equippedWeaponItemId === itemId) {
      return "weapon";
    }
    if (actor.equippedArmorItemId === itemId) {
      return "armor";
    }
    if (actor.equippedAccessoryItemId === itemId) {
      return "accessory";
    }
    return null;
  }

  private setEquippedItem(
    actor: EntityState,
    item: EntityState["inventory"][number]
  ): void {
    const slot = this.itemEquipmentSlot(item);
    if (!slot) {
      return;
    }
    this.clearEquippedItem(actor, item.itemId);
    if (slot === "weapon") {
      actor.equippedWeaponItemId = item.itemId;
      return;
    }
    if (slot === "armor") {
      actor.equippedArmorItemId = item.itemId;
      return;
    }
    actor.equippedAccessoryItemId = item.itemId;
  }

  private clearEquippedItem(actor: EntityState, itemId: string): void {
    if (actor.equippedWeaponItemId === itemId) {
      actor.equippedWeaponItemId = null;
    }
    if (actor.equippedArmorItemId === itemId) {
      actor.equippedArmorItemId = null;
    }
    if (actor.equippedAccessoryItemId === itemId) {
      actor.equippedAccessoryItemId = null;
    }
  }

  private isEquippable(item: EntityState["inventory"][number]): boolean {
    return this.itemEquipmentSlot(item) !== null;
  }

  private isConsumable(item: EntityState["inventory"][number]): boolean {
    if (item.tags.includes("consumable") || item.tags.includes("potion")) {
      return true;
    }
    return !this.isEquippable(item);
  }

  private countCurrencyTokens(actor: EntityState): number {
    return actor.inventory.filter((item) => item.tags.includes("currency"))
      .length;
  }

  private consumeCurrencyTokens(actor: EntityState, count: number): number {
    const take = Math.max(0, count);
    if (take === 0) {
      return 0;
    }
    let remaining = take;
    const next = [] as EntityState["inventory"];
    for (const item of actor.inventory) {
      if (remaining > 0 && item.tags.includes("currency")) {
        this.clearEquippedItem(actor, item.itemId);
        remaining -= 1;
        continue;
      }
      next.push(item);
    }
    actor.inventory = next;
    return take - remaining;
  }

  private buildPurchasedItem(
    itemId: string
  ): EntityState["inventory"][number] | null {
    const definition = ITEM_PACK.items.find((item) => item.itemId === itemId);
    if (!definition) {
      return null;
    }
    const rarityIds = new Set(RARITY_PACK.rarities.map((r) => r.rarityId));
    const rarity =
      definition.rarityId ??
      definition.tags.find((tag) => rarityIds.has(tag)) ??
      "common";
    return {
      itemId: `${definition.itemId}_shop_${this.state.turnIndex}`,
      name: definition.itemId.replaceAll("_", " "),
      rarity: rarity as EntityState["inventory"][number]["rarity"],
      description: `Rune Forge purchase: ${definition.itemId}.`,
      tags: [...definition.tags],
      narrativeStatDelta: { ...definition.vectorDelta },
    };
  }

  private selectWeapon(actor: EntityState): { name: string; power: number } {
    const equipped = actor.equippedWeaponItemId
      ? actor.inventory.find(
          (item) =>
            item.itemId === actor.equippedWeaponItemId &&
            item.tags.includes("weapon")
        )
      : null;
    const weapon =
      equipped ?? actor.inventory.find((item) => item.tags.includes("weapon"));
    if (!weapon) {
      return { name: "bare hands", power: 1 };
    }
    return { name: weapon.name, power: weaponPowerForTier(weapon.tags) };
  }

  private updateQuests(
    actor: EntityState,
    actionType: string,
    chapterCompleted?: number
  ): void {
    updateQuestsState({
      actionType,
      actor,
      chapterCompleted,
      questDefinitions: QUEST_PACK.quests,
      state: this.state,
    });
  }

  private refreshEntityArchetype(entity: EntityState): void {
    refreshEntityArchetypeState({
      classify: (candidate, currentHeading) =>
        this.archetypes.classify(candidate, currentHeading),
      entity,
    });
  }

  private refreshAllArchetypes(): void {
    refreshAllArchetypesState({
      classify: (candidate, currentHeading) =>
        this.archetypes.classify(candidate, currentHeading),
      entities: this.state.entities,
    });
  }

  private applyDeedSemantics(
    actor: EntityState,
    actionType: string,
    message: string,
    foundItemTags: string[],
    subjectEntityId: string,
    sourceEntityId: string,
    beliefState: "verified" | "rumor" | "misinformed",
    confidence: number
  ): {
    traitDelta: NumberMap;
    featureDelta: NumberMap;
  } {
    return applyDeedSemanticsState({
      actor,
      actionType,
      message,
      foundItemTags,
      subjectEntityId,
      sourceEntityId,
      beliefState,
      confidence,
      deedVectorizer: this.deedVectorizer,
      turnIndex: this.state.turnIndex,
    });
  }

  private spreadRumor(
    actor: EntityState,
    summary: string,
    baseConfidence: number,
    subjectEntityId: string
  ): void {
    spreadRumorState({
      actor,
      summary,
      baseConfidence,
      subjectEntityId,
      deedVectorizer: this.deedVectorizer,
      entities: this.state.entities,
      nextFloat: () => this.rng.nextFloat(),
      turnIndex: this.state.turnIndex,
    });
  }

  private crossPollinateRumors(
    actor: EntityState,
    nearby: EntityState[]
  ): void {
    crossPollinateRumorsState({
      actor,
      nearby,
      deedVectorizer: this.deedVectorizer,
      nextFloat: () => this.rng.nextFloat(),
      turnIndex: this.state.turnIndex,
    });
  }

  private enforcePressureCap(actor: EntityState): void {
    enforcePressureCapState({
      actor,
      state: this.state,
      recordEvent: (input) => {
        this.record(
          input.actor,
          input.actionType,
          input.message,
          input.warnings,
          input.narrativeStatDelta,
          input.metadata
        );
      },
    });
  }

  private processGlobalEvents(player: EntityState): void {
    processGlobalEventsState({
      actionType: "global",
      applyEventNarrativeDelta: (delta) =>
        applyNarrativeStatDelta(
          player.narrativeStats,
          delta,
          this.state.config.minTraitValue,
          this.state.config.maxTraitValue
        ),
      events: EVENT_PACK.events,
      nextFloat: () => this.rng.nextFloat(),
      player,
      recordEvent: (input) => {
        this.record(
          input.actor,
          input.actionType,
          input.message,
          input.warnings,
          input.narrativeStatDelta,
          input.metadata
        );
      },
      state: this.state,
    });
  }

  private processRoomEntryEvents(
    player: EntityState,
    action: PlayerAction
  ): void {
    if (action.actionType !== "move") {
      return;
    }
    const room = getRoom(this.state.dungeon, player.depth, player.roomId);
    processGlobalEventsState({
      actionType: "move",
      applyEventNarrativeDelta: (delta) =>
        applyNarrativeStatDelta(
          player.narrativeStats,
          delta,
          this.state.config.minTraitValue,
          this.state.config.maxTraitValue
        ),
      events: EVENT_PACK.events,
      nextFloat: () => this.rng.nextFloat(),
      player,
      recordEvent: (input) => {
        this.record(
          input.actor,
          input.actionType,
          input.message,
          input.warnings,
          input.narrativeStatDelta,
          input.metadata
        );
      },
      roomFeature: room.feature,
      roomId: room.roomId,
      state: this.state,
    });
  }

  private spawnHostiles(depth: number): void {
    spawnHostilesState({
      capPerLevel: BOSS_SPAWN_CAP_PER_LEVEL,
      capPerRoom: BOSS_SPAWN_CAP_PER_ROOM,
      depth,
      entries: SPAWN_TABLE_PACK.entries,
      nextFloat: () => this.rng.nextFloat(),
      state: this.state,
      createHostile: ({ archetypeId, depth, hostileSpawnIndex, roomId }) => {
        const hostileRoom = getRoom(this.state.dungeon, depth, roomId);
        return createHostileEntity({
          config: this.state.config,
          depth,
          roomId,
          room: hostileRoom,
          hostileSpawnIndex,
          globalEnemyLevelBonus: this.state.globalEnemyLevelBonus,
          entityTypeId: authoredHostileEntityTypeIdForArchetype(
            archetypeId,
            hostileSpawnIndex
          ),
          archetypeHeading: archetypeId,
          name:
            ARCHETYPE_BY_ID[archetypeId]?.label ??
            `Crawler ${hostileSpawnIndex}`,
        });
      },
      refreshEntityArchetype: (entity) => {
        this.refreshEntityArchetype(entity);
      },
      recordEvent: (input) => {
        this.record(
          input.actor,
          input.actionType,
          input.message,
          input.warnings,
          input.narrativeStatDelta,
          input.metadata
        );
      },
    });
  }

  private simulateNpcTurns(
    policyOverrides: Partial<Record<EntityState["entityKind"], string>> = this
      .state.config.npcActionPolicyIds
  ): void {
    simulateNpcTurnsState({
      availableActions: (actor) => this.availableActions(actor),
      entities: this.state.entities,
      executeAction: (actor, action) => {
        this.executeAction(actor, action, false);
      },
      isEnemy: (actor, target) => this.isEnemy(actor, target),
      nearbyEntities: (actor) => this.nearbyEntities(actor),
      playerId: this.state.playerId,
      policyOverrides,
      rng: this.rng,
      state: this.state,
    });
  }
}
