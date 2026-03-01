import { CombatSystem } from "../combat/system";
import { DeterministicRng } from "../core/rng";
import { ACTION_CONTRACTS, ACTION_INTENTS, ACTION_POLICIES, EVENT_PACK, ITEM_PACK, QUEST_PACK } from "../contracts";
import {
  clamp,
  cloneState,
  createAttributes,
  createFeatureVector,
  createTraitVector,
  DEFAULT_GAME_CONFIG,
  type ActionAvailability,
  type EntityState,
  type FeatureVector,
  type GameConfig,
  type GameEvent,
  type GameSnapshot,
  type GameState,
  type MoveDirection,
  type NumberMap,
  type PlayerAction,
  type QuestState,
  TRAIT_NAMES,
  type TurnResult,
} from "../core/types";
import { FORMULA_REGISTRY_VERSION, formulaRegistry } from "../formulas/registry";
import { chooseFromLegalActions } from "../entities/simulation";
import { buildDefaultCutsceneDirector, type CutsceneHit } from "../narrative/cutscenes";
import { DeedVectorizer, type Deed } from "../narrative/deeds";
import { buildDefaultDialogueDirector } from "../narrative/dialogue";
import { computeFameGain } from "../narrative/fame";
import { buildDefaultArchetypeDirector } from "../narrative/archetypes";
import { buildDefaultSkillDirector } from "../narrative/skills";
import {
  actForDepth,
  buildDungeonWorld,
  chapterForDepth,
  dungeonStep,
  effectiveRoomVector,
  getLevel,
  getRoom,
  ROOM_FEATURE_COMBAT,
  ROOM_FEATURE_REST,
  ROOM_FEATURE_RUNE_FORGE,
  ROOM_FEATURE_TRAINING,
  takeFirstPresentItem,
  topRoomVector,
  weaponPowerForTier,
} from "../world/map";

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

type QuestDefinition = (typeof QUEST_PACK.quests)[number];
type EventDefinition = (typeof EVENT_PACK.events)[number];
type ActionPolicy = (typeof ACTION_POLICIES.policies)[number];

const ACTION_POLICY_BY_ID = new Map<string, ActionPolicy>(
  ACTION_POLICIES.policies.map((policy) => [policy.policyId, policy]),
);
const ACTION_INTENT_BY_TYPE = new Map<string, { uiIntent: string; uiScreen: string; uiPriority: number }>(
  ACTION_INTENTS.intents.map((row) => [row.actionType, { uiIntent: row.uiIntent, uiScreen: row.uiScreen, uiPriority: row.uiPriority }]),
);

const RUNE_FORGE_PURCHASE_COST = 1;
const RUNE_FORGE_OFFER_ITEM_IDS = ITEM_PACK.items
  .filter((item) => item.tags.includes("armor") || item.tags.includes("relic") || item.tags.includes("fame"))
  .map((item) => item.itemId);


const requiredProgressForQuest = (quest: QuestDefinition, config: GameConfig): number => {
  if (quest.requiredProgress.mode === "total_levels") {
    return config.totalLevels;
  }
  return Math.max(1, Number(quest.requiredProgress.value ?? 1));
};

const toNumberMap = (delta: NumberMap): NumberMap => {
  const next: NumberMap = {};
  for (const [key, value] of Object.entries(delta)) {
    if (Math.abs(Number(value)) > 1e-9) {
      next[key] = Number(value);
    }
  }
  return next;
};

const applyTraitDelta = (
  traits: Record<string, number>,
  delta: NumberMap,
  minValue: number,
  maxValue: number,
): NumberMap => {
  const applied: NumberMap = {};
  for (const [key, value] of Object.entries(delta)) {
    const before = Number(traits[key] ?? 0);
    const after = clamp(before + Number(value), minValue, maxValue);
    traits[key] = after;
    const diff = after - before;
    if (Math.abs(diff) > 1e-9) {
      applied[key] = diff;
    }
  }
  return applied;
};

const applyFeatureDelta = (features: Record<string, number>, delta: NumberMap): NumberMap => {
  const applied: NumberMap = {};
  for (const [key, value] of Object.entries(delta)) {
    const before = Number(features[key] ?? 0);
    const after = before + Number(value);
    features[key] = after;
    const diff = after - before;
    if (Math.abs(diff) > 1e-9) {
      applied[key] = diff;
    }
  }
  return applied;
};

const mergeDeltas = (...parts: NumberMap[]): NumberMap => {
  const merged: NumberMap = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(part)) {
      merged[key] = Number(merged[key] ?? 0) + Number(value);
    }
  }
  return toNumberMap(merged);
};

const levelForEntity = (entity: EntityState, config: GameConfig, globalEnemyBonus: number): number => {
  const byXp = Math.floor(entity.xp / config.baseXpPerLevel);
  const hostileBonus = entity.entityKind === "hostile" || entity.entityKind === "boss" ? globalEnemyBonus : 0;
  return Math.max(1, entity.baseLevel + byXp + hostileBonus);
};

const chapterFor = (state: GameState, depth: number): number => chapterForDepth(state.dungeon, depth);
const actFor = (state: GameState, depth: number): number => actForDepth(state.dungeon, depth);

type ActionOutcome = {
  message: string;
  warnings: string[];
  traitDelta: NumberMap;
  featureDelta: NumberMap;
  metadata: Record<string, unknown>;
  foundItemTags: string[];
  chapterCompleted?: number;
  subjectEntityId?: string;
};

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
    this.rng = new DeterministicRng(state.config.randomSeed);
    this.rng.setState(state.rngState);
    this.cutscenes.setSeen(state.seenCutscenes);
    this.combat = new CombatSystem(state.config.randomSeed + 3);
  }

  static create(seed = DEFAULT_GAME_CONFIG.randomSeed): GameEngine {
    const config: GameConfig = {
      ...DEFAULT_GAME_CONFIG,
      randomSeed: seed,
      canonicalSeed: ACTION_CONTRACTS.canonicalSeedV1,
      entityPressureCap: ACTION_CONTRACTS.entityPressure.cap,
      countItemsAsEntitiesForPressure: ACTION_CONTRACTS.entityPressure.countItemsAsEntities,
    };
    const rng = new DeterministicRng(seed + 11);
    const dungeon = buildDungeonWorld(config, new DeterministicRng(seed));

    const player: EntityState = {
      entityId: "kael",
      name: config.playerName,
      isPlayer: true,
      entityKind: "player",
      depth: dungeon.startDepth,
      roomId: dungeon.startRoomId,
      traits: createTraitVector(0),
      attributes: { might: 6, agility: 5, insight: 5, willpower: 6 },
      features: createFeatureVector(),
      faction: "freelancer",
      reputation: 0,
      archetypeHeading: "wanderer",
      baseLevel: 1,
      xp: 0,
      health: config.defaultPlayerHealth,
      energy: config.defaultPlayerEnergy,
      inventory: [],
      skills: {},
      deeds: [],
      rumors: [],
      effects: [],
      companionTo: null,
      equippedWeaponItemId: null,
    };

    const entities: Record<string, EntityState> = { [player.entityId]: player };
    let dungeoneerCounter = 0;

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
        const faction = dungeoneerCounter % 11 === 0 ? "laughing_face" : "freelancer";
        const npc: EntityState = {
          entityId: `dungeoneer_${depth.toString().padStart(2, "0")}_${String(index + 1).padStart(2, "0")}`,
          name: DUNGEONEER_NAMES[(dungeoneerCounter - 1) % DUNGEONEER_NAMES.length] as string,
          isPlayer: false,
          entityKind: "dungeoneer",
          depth,
          roomId,
          traits: createTraitVector(0),
          attributes: createAttributes(),
          features: createFeatureVector(),
          faction,
          reputation: faction === "laughing_face" ? -2 : 0,
          archetypeHeading: "delver",
          baseLevel: Math.max(1, config.totalLevels - depth + 1),
          xp: 0,
          health: 94,
          energy: 1,
          inventory: [
            {
              itemId: `loot_${depth}_${index + 1}`,
              name: "Worn Pouch",
              rarity: "common",
              description: "A pouch with mixed salvage.",
              tags: ["loot", "currency"],
              traitDelta: { Projection: 0.03 },
            },
          ],
          skills: {},
          deeds: [],
          rumors: [],
          effects: [],
          companionTo: null,
          equippedWeaponItemId: null,
        };
        npc.features.Effort = 80;
        entities[npc.entityId] = npc;
      }

      const boss: EntityState = {
        entityId: `boss_${depth.toString().padStart(2, "0")}`,
        name: `Depth ${depth} Warden`,
        isPlayer: false,
        entityKind: "boss",
        depth,
        roomId: level.exitRoomId,
        traits: createTraitVector(0),
        attributes: {
          might: 7 + Math.max(0, config.totalLevels - depth),
          agility: 6 + Math.max(0, Math.floor((config.totalLevels - depth) / 2)),
          insight: 5 + Math.max(0, Math.floor((config.totalLevels - depth) / 3)),
          willpower: 7 + Math.max(0, Math.floor((config.totalLevels - depth) / 2)),
        },
        features: createFeatureVector(),
        faction: "dungeon_legion",
        reputation: -5,
        archetypeHeading: "warden",
        baseLevel: Math.max(2, config.totalLevels - depth + 1 + config.bossLevelBonus),
        xp: 0,
        health: 120,
        energy: 1,
        inventory: [
          {
            itemId: `boss_weapon_${depth.toString().padStart(2, "0")}`,
            name: "Gatekeeper Halberd",
            rarity: "epic",
            description: "A heavy weapon used by gatekeepers.",
            tags: ["weapon", "epic"],
            traitDelta: { Direction: 0.1, Survival: 0.1 },
          },
        ],
        skills: {},
        deeds: [],
        rumors: [],
        effects: [],
        companionTo: null,
        equippedWeaponItemId: null,
      };
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
      ]),
    );

    const firstChapter = chapterForDepth(dungeon, dungeon.startDepth);
    const chapterPages = {
      [firstChapter]: {
        chapter: [] as string[],
        entities: Object.fromEntries(Object.keys(entities).map((id) => [id, [] as string[]])),
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
      runBranchChoice: null,
      globalEventFlags: [],
      seenCutscenes: [],
      dialogueProgress: {
        sequence: 0,
        lastOptionId: null,
        lastClusterId: null,
        visitedOptionIds: [],
        visitedClusterIds: [],
        history: [],
      },
    };

    const game = new GameEngine(state);
    game.refreshAllArchetypes();
    game.record(player, "start", `${config.gameTitle} begins. ${player.name} wakes on depth ${player.depth}.`, [], {}, {}, {});
    return game;
  }

  get player(): EntityState {
    return this.state.entities[this.state.playerId] as EntityState;
  }

  snapshot(): GameSnapshot {
    this.state.rngState = this.rng.getState();
    this.state.seenCutscenes = this.cutscenes.seenIds();
    return cloneState(this.state);
  }

  restore(snapshot: GameSnapshot): void {
    this.state = cloneState(snapshot);
    if (!this.state.dialogueProgress) {
      this.state.dialogueProgress = {
        sequence: 0,
        lastOptionId: null,
        lastClusterId: null,
        visitedOptionIds: [],
        visitedClusterIds: [],
        history: [],
      };
    }
    this.rng.setState(this.state.rngState);
    this.cutscenes.setSeen(this.state.seenCutscenes);
  }

  status(): Record<string, unknown> {
    const player = this.player;
    const dialogueHistory = this.state.dialogueProgress.history;
    const fog = formulaRegistry.fogMetrics({
      level: levelForEntity(player, this.state.config, this.state.globalEnemyLevelBonus),
      traits: player.traits,
      features: player.features,
    });
    return {
      turn: this.state.turnIndex,
      depth: player.depth,
      roomId: player.roomId,
      chapter: chapterFor(this.state, player.depth),
      act: actFor(this.state, player.depth),
      health: player.health,
      energy: player.energy,
      level: levelForEntity(player, this.state.config, this.state.globalEnemyLevelBonus),
      faction: player.faction,
      reputation: player.reputation,
      archetypeHeading: player.archetypeHeading,
      archetypeScores: this.archetypes.rank(player).slice(0, 3),
      traits: { ...player.traits },
      features: { ...player.features },
      skills: Object.values(player.skills).filter((skill) => skill.unlocked).map((skill) => skill.skillId),
      inventory: player.inventory.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        rarity: item.rarity,
        tags: [...item.tags],
        equipped: player.equippedWeaponItemId === item.itemId,
      })),
      equippedWeaponItemId: player.equippedWeaponItemId,
      quests: Object.fromEntries(
        Object.entries(this.state.quests).map(([key, quest]) => [
          key,
          { progress: quest.progress, required: quest.requiredProgress, complete: quest.isComplete },
        ]),
      ),
      companion: this.state.activeCompanionId,
      rumors: player.rumors.length,
      deeds: player.deeds.length,
      pressure: this.pressureEntityCount(),
      pressureCap: this.state.config.entityPressureCap,
      semanticCacheSize: this.deedVectorizer.cacheSize(),
      formulaRegistryVersion: FORMULA_REGISTRY_VERSION,
      fogMetrics: fog,
      dialogueProgress: {
        sequence: this.state.dialogueProgress.sequence,
        lastOptionId: this.state.dialogueProgress.lastOptionId,
        lastClusterId: this.state.dialogueProgress.lastClusterId,
        visitedOptionCount: this.state.dialogueProgress.visitedOptionIds.length,
        visitedClusterCount: this.state.dialogueProgress.visitedClusterIds.length,
        recent: dialogueHistory.slice(-5),
      },
    };
  }

  look(): string {
    const player = this.player;
    const room = getRoom(this.state.dungeon, player.depth, player.roomId);
    const exits = Object.keys(room.exits).join(", ") || "none";
    const nearby = this.nearbyEntities(player).map(
      (entity) => `${entity.name}(lvl ${levelForEntity(entity, this.state.config, this.state.globalEnemyLevelBonus)},${entity.faction})`,
    );
    const actions = this.availableActions(player)
      .filter((row) => row.available)
      .slice(0, 10)
      .map((row) => row.label)
      .join(", ");
    const roomVector = topRoomVector(room, 3)
      .map((row) => `${row.trait}${row.value >= 0 ? "+" : ""}${row.value.toFixed(2)}`)
      .join(", ");

    return [
      room.description,
      `Exits: ${exits}`,
      `Nearby: ${nearby.join(", ") || "none"}`,
      `Archetype: ${player.archetypeHeading}`,
      `Room vector: ${roomVector || "neutral"}`,
      `Available actions: ${actions || "none"}`,
    ].join("\n");
  }

  availableDialogueOptions(entity = this.player): Array<{ optionId: string; label: string; line: string }> {
    const room = getRoom(this.state.dungeon, entity.depth, entity.roomId);
    return this.dialogue.availableOptions(entity, room, this.state.dialogueProgress).map((row) => ({
      optionId: row.optionId,
      label: row.label,
      line: row.line,
    }));
  }

  pagesForCurrentChapter(): { chapter: string[]; entities: Record<string, string[]> } {
    const chapter = chapterFor(this.state, this.player.depth);
    this.ensureChapterPages(chapter);
    return this.state.chapterPages[chapter] as { chapter: string[]; entities: Record<string, string[]> };
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
    return this.state.eventLog.filter((event) => event.actionType === "cutscene").slice(-Math.max(1, limit));
  }

  dispatch(action: PlayerAction): TurnResult {
    const start = this.state.eventLog.length;
    const player = this.player;

    this.executeAction(player, action, true);
    this.processGlobalEvents(player);
    this.spawnHostiles(player.depth);
    this.simulateNpcTurns();
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
      row: Omit<ActionAvailability, "uiIntent" | "uiScreen" | "uiPriority">,
    ): ActionAvailability => {
      const intent = ACTION_INTENT_BY_TYPE.get(row.actionType);
      return {
        ...row,
        uiIntent: intent?.uiIntent,
        uiScreen: intent?.uiScreen,
        uiPriority: intent?.uiPriority,
      };
    };

    for (const direction of Object.keys(room.exits) as MoveDirection[]) {
      const action: PlayerAction = { actionType: "move", payload: { direction } };
      const availability = this.availabilityForAction(entity, action);
      rows.push(withIntent({
        actionType: "move",
        label: `go ${direction}`,
        available: availability.available,
        blockedReasons: availability.blockedReasons,
        payload: { direction },
      }));
    }

    const baseActions: Array<{ label: string; action: PlayerAction }> = [
      { label: "train", action: { actionType: "train", payload: {} } },
      { label: "rest", action: { actionType: "rest", payload: {} } },
      { label: "talk", action: { actionType: "talk", payload: {} } },
      { label: "search", action: { actionType: "search", payload: {} } },
      { label: "say <text>", action: { actionType: "speak", payload: { intentText: "..." } } },
      { label: "fight", action: { actionType: "fight", payload: {} } },
      {
        label: "stream",
        action: {
          actionType: "live_stream",
          payload: { effort: Number(ACTION_CONTRACTS.actions.liveStream?.effortCost ?? 10) },
        },
      },
      { label: "steal", action: { actionType: "steal", payload: {} } },
      { label: "recruit", action: { actionType: "recruit", payload: {} } },
      { label: "murder", action: { actionType: "murder", payload: {} } },
    ];

    for (const row of baseActions) {
      const availability = this.availabilityForAction(entity, row.action);
      rows.push(withIntent({
        actionType: row.action.actionType,
        label: row.label,
        available: availability.available,
        blockedReasons: availability.blockedReasons,
        payload: row.action.payload,
      }));
    }

    if (hasEnemyNearby) {
      for (const direction of Object.keys(room.exits) as MoveDirection[]) {
        const fleeAction: PlayerAction = { actionType: "flee", payload: { direction } };
        const availability = this.availabilityForAction(entity, fleeAction);
        rows.push(withIntent({
          actionType: "flee",
          label: `flee ${direction}`,
          available: availability.available,
          blockedReasons: availability.blockedReasons,
          payload: { direction },
        }));
      }
    }

    const dialogueRows = this.dialogue.availableOptions(entity, room, this.state.dialogueProgress);
    if (dialogueRows.length > 0) {
      rows.push(withIntent({
        actionType: "choose_dialogue",
        label: `choose ${dialogueRows[0]?.optionId ?? "option"}`,
        available: true,
        blockedReasons: [],
        payload: { options: dialogueRows.map((option) => ({ optionId: option.optionId, label: option.label })) },
      }));
    }

    for (const evolution of this.skills.availableEvolutions(entity, room)) {
      rows.push(withIntent({
        actionType: "evolve_skill",
        label: `evolve ${evolution.skillId}`,
        available: evolution.available,
        blockedReasons: evolution.blockedReasons,
        payload: { skillId: evolution.skillId },
      }));
    }

    if (entity.isPlayer) {
      if (room.feature === ROOM_FEATURE_RUNE_FORGE) {
        for (const offerItemId of RUNE_FORGE_OFFER_ITEM_IDS) {
          const purchaseAction: PlayerAction = { actionType: "purchase", payload: { itemId: offerItemId } };
          const purchaseAvailability = this.availabilityForAction(entity, purchaseAction);
          rows.push(withIntent({
            actionType: "purchase",
            label: `purchase ${offerItemId}`,
            available: purchaseAvailability.available,
            blockedReasons: purchaseAvailability.blockedReasons,
            payload: { itemId: offerItemId },
          }));
        }

        for (const inventoryItem of entity.inventory) {
          const reEquipAction: PlayerAction = {
            actionType: "re_equip",
            payload: { itemId: inventoryItem.itemId },
          };
          const reEquipAvailability = this.availabilityForAction(entity, reEquipAction);
          rows.push(withIntent({
            actionType: "re_equip",
            label: `re-equip ${inventoryItem.name}`,
            available: reEquipAvailability.available,
            blockedReasons: reEquipAvailability.blockedReasons,
            payload: { itemId: inventoryItem.itemId },
          }));
        }
      }

      for (const item of entity.inventory) {
        const useAction: PlayerAction = { actionType: "use_item", payload: { itemId: item.itemId } };
        const useAvailability = this.availabilityForAction(entity, useAction);
        rows.push(withIntent({
          actionType: "use_item",
          label: `use ${item.name}`,
          available: useAvailability.available,
          blockedReasons: useAvailability.blockedReasons,
          payload: { itemId: item.itemId },
        }));

        const equipAction: PlayerAction = { actionType: "equip_item", payload: { itemId: item.itemId } };
        const equipAvailability = this.availabilityForAction(entity, equipAction);
        rows.push(withIntent({
          actionType: "equip_item",
          label: `equip ${item.name}`,
          available: equipAvailability.available,
          blockedReasons: equipAvailability.blockedReasons,
          payload: { itemId: item.itemId },
        }));

        const dropAction: PlayerAction = { actionType: "drop_item", payload: { itemId: item.itemId } };
        const dropAvailability = this.availabilityForAction(entity, dropAction);
        rows.push(withIntent({
          actionType: "drop_item",
          label: `drop ${item.name}`,
          available: dropAvailability.available,
          blockedReasons: dropAvailability.blockedReasons,
          payload: { itemId: item.itemId },
        }));
      }
    }

    return rows;
  }

  private executeAction(actor: EntityState, action: PlayerAction, allowCutscenes: boolean): GameEvent {
    const availability = this.availabilityForAction(actor, action);
    if (!availability.available) {
      const event = this.record(actor, action.actionType, `${actor.name} cannot use '${action.actionType}' right now.`, availability.blockedReasons, {}, {}, {});
      this.state.actionHistory.push(action.actionType);
      return event;
    }

    const beforeTraits = cloneState(actor.traits);
    const beforeFeatures = cloneState(actor.features);
    const beforeArchetype = actor.archetypeHeading;
    const nearby = this.nearbyEntities(actor);
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const result = this.performAction(actor, action, nearby);
    this.recordDialogueProgress(actor, action, result);

    const roomInfluence = applyTraitDelta(
      actor.traits,
      scaleVector(effectiveRoomVector(room), ACTION_CONTRACTS.roomInfluenceScale),
      this.state.config.minTraitValue,
      this.state.config.maxTraitValue,
    );

    const unlockedSkills = this.skills.unlockNewSkills(actor, room, nearby);
    const unlockedSkillIds = unlockedSkills.map((skill) => skill.skillId);
    if (unlockedSkillIds.includes("appraisal") || unlockedSkillIds.includes("xray")) {
      this.state.runBranchChoice = unlockedSkillIds.includes("appraisal") ? "appraisal" : "xray";
    }

    const deedMemory = this.applyDeedSemantics(
      actor,
      action.actionType,
      result.message,
      result.foundItemTags,
      result.subjectEntityId ?? actor.entityId,
      actor.entityId,
      "verified",
      1,
    );
    const deedTraitDelta = applyTraitDelta(
      actor.traits,
      deedMemory.traitDelta,
      this.state.config.minTraitValue,
      this.state.config.maxTraitValue,
    );
    const deedFeatureDelta = applyFeatureDelta(actor.features as FeatureVector, deedMemory.featureDelta);

    if (["live_stream", "murder", "fight", "search"].includes(action.actionType)) {
      this.spreadRumor(
        actor,
        result.message,
        action.actionType === "live_stream" ? 0.65 : 0.45,
        result.subjectEntityId ?? actor.entityId,
      );
    }
    if (action.actionType === "talk") {
      this.crossPollinateRumors(actor, nearby);
    }

    const traitDelta = mergeDeltas(diffMap(beforeTraits, actor.traits), roomInfluence, deedTraitDelta, result.traitDelta);
    const featureDelta = mergeDeltas(diffMap(beforeFeatures, actor.features), deedFeatureDelta, result.featureDelta);
    this.refreshEntityArchetype(actor);

    const event = this.record(actor, action.actionType, result.message, result.warnings, traitDelta, featureDelta, {
      ...result.metadata,
      unlockedSkills: unlockedSkillIds,
      archetypeBefore: beforeArchetype,
      archetypeAfter: actor.archetypeHeading,
    });
    this.state.actionHistory.push(action.actionType);
    this.updateQuests(actor, action.actionType, result.chapterCompleted);

    if (allowCutscenes && actor.isPlayer) {
      const hits = this.cutscenes.trigger({
        actor,
        actionType: action.actionType,
        foundItemTags: result.foundItemTags,
        unlockedSkillIds,
        chapterCompleted: result.chapterCompleted,
        escaped: this.state.escaped,
      });
      this.recordCutscenes(actor, hits);
    }

    return event;
  }

  private performAction(actor: EntityState, action: PlayerAction, nearby: EntityState[]): ActionOutcome {
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const formulas = ACTION_CONTRACTS.actions;

    if (action.actionType === "move") {
      const direction = String(action.payload.direction ?? "").toLowerCase() as MoveDirection;
      const next = dungeonStep(
        this.state.dungeon,
        actor.depth,
        actor.roomId,
        direction,
        actor.entityKind === "hostile" || actor.entityKind === "boss" ? [ROOM_FEATURE_RUNE_FORGE] : [],
      );
      if (!next) {
        return {
          message: `${actor.name} cannot go ${direction} from here.`,
          warnings: ["move_blocked"],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
          foundItemTags: [],
        };
      }
      const previousDepth = actor.depth;
      actor.depth = next.depth;
      actor.roomId = next.roomId;
      let chapterCompleted: number | undefined;
      if (previousDepth > actor.depth) {
        chapterCompleted = chapterFor(this.state, previousDepth);
      }
      if (actor.isPlayer && previousDepth === 1 && direction === "up") {
        this.state.escaped = true;
      }
      return {
        message: `${actor.name} moves ${direction} to ${actor.roomId}.`,
        warnings: [],
        traitDelta: {},
        featureDelta: {},
        metadata: { direction, fromDepth: previousDepth, toDepth: actor.depth },
        foundItemTags: [],
        chapterCompleted,
      };
    }

    if (action.actionType === "train") {
      actor.attributes.might += 1;
      actor.attributes.willpower += 1;
      actor.energy = clamp(actor.energy + Number(formulas.train?.energyDelta ?? -0.15), 0, 1);
      actor.xp += Number(formulas.train?.xpDelta ?? 5);
      return {
        message: `${actor.name} drills forms and gains strength.`,
        warnings: [],
        traitDelta: formulas.train?.traitDelta ?? { Constraint: 0.07, Direction: 0.05 },
        featureDelta: formulas.train?.featureDelta ?? { Momentum: 0.1 },
        metadata: {},
        foundItemTags: [],
      };
    }

    if (action.actionType === "rest") {
      const bonus =
        room.feature === ROOM_FEATURE_REST
          ? Number(formulas.rest?.energyDeltaRestRoom ?? 0.3)
          : Number(formulas.rest?.energyDeltaBase ?? 0.2);
      actor.energy = clamp(actor.energy + bonus, 0, 1);
      return {
        message: `${actor.name} takes a breath and recovers energy.`,
        warnings: [],
        traitDelta: formulas.rest?.traitDelta ?? { Equilibrium: 0.04, Levity: 0.02 },
        featureDelta: {},
        metadata: { restBonus: bonus },
        foundItemTags: [],
      };
    }

    if (action.actionType === "talk") {
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, false);
      if (!target) {
        return {
          message: `${actor.name} speaks into the dark. No one answers.`,
          warnings: ["talk_no_target"],
          traitDelta: formulas.talk?.noTargetTraitDelta ?? { Empathy: -0.01 },
          featureDelta: {},
          metadata: {},
          foundItemTags: [],
        };
      }
      return {
        message: `${actor.name} talks with ${target.name} and trades rumors.`,
        warnings: [],
        traitDelta: formulas.talk?.traitDelta ?? { Empathy: 0.05, Comprehension: 0.03 },
        featureDelta: formulas.talk?.featureDelta ?? { Awareness: 0.05 },
        metadata: { targetId: target.entityId, optionLabel: "talk", clusterId: "social_cluster" },
        foundItemTags: [],
        subjectEntityId: target.entityId,
      };
    }

    if (action.actionType === "search") {
      const takenItem = takeFirstPresentItem(room);
      if (!takenItem) {
        return {
          message: `${actor.name} searches the room but finds nothing new.`,
          warnings: ["search_empty"],
          traitDelta: formulas.searchEmpty?.traitDelta ?? { Comprehension: 0.01 },
          featureDelta: {},
          metadata: {},
          foundItemTags: [],
        };
      }
      actor.inventory.push({
        itemId: takenItem.itemId,
        name: takenItem.name,
        rarity: takenItem.rarity,
        description: takenItem.description,
        tags: [...takenItem.tags],
        traitDelta: { ...takenItem.vectorDelta },
      });
      const traitDelta = applyTraitDelta(
        actor.traits,
        takenItem.vectorDelta,
        this.state.config.minTraitValue,
        this.state.config.maxTraitValue,
      );
      return {
        message: `${actor.name} finds ${takenItem.name}.`,
        warnings: [],
        traitDelta,
        featureDelta: {},
        metadata: { itemId: takenItem.itemId, rarity: takenItem.rarity },
        foundItemTags: [...takenItem.tags],
      };
    }

    if (action.actionType === "speak") {
      const intentText = String(action.payload.intentText ?? "");
      const projection = this.deedVectorizer.projectIntent(intentText || "...");
      const traitDelta = applyTraitDelta(
        actor.traits,
        projection.traitDelta,
        this.state.config.minTraitValue,
        this.state.config.maxTraitValue,
      );
      const featureDelta = applyFeatureDelta(actor.features, projection.featureDelta);
      return {
        message: `${actor.name} speaks: "${intentText || "..."}"`,
        warnings: [],
        traitDelta,
        featureDelta,
        metadata: { intentText },
        foundItemTags: [],
      };
    }

    if (action.actionType === "fight") {
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, true);
      if (!target) {
        return {
          message: `${actor.name} has nobody to fight here.`,
          warnings: ["fight_no_target"],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
          foundItemTags: [],
        };
      }
      const weapon = this.selectWeapon(actor);
      const result = this.combat.spar(actor, target, {
        weaponPower: weapon.power,
        weaponName: weapon.name,
        lethal: false,
      });
      actor.xp += Number(formulas.fight?.xpDelta ?? 4);
      return {
        message: result.message,
        warnings: [],
        traitDelta: formulas.fight?.traitDelta ?? { Survival: 0.03, Direction: 0.03 },
        featureDelta: formulas.fight?.featureDelta ?? { Momentum: 0.1 },
        metadata: { targetId: target.entityId, damage: result.damage, weapon: result.weaponUsed },
        foundItemTags: [],
        subjectEntityId: target.entityId,
      };
    }

    if (action.actionType === "flee") {
      const direction = String(action.payload.direction ?? "").toLowerCase() as MoveDirection;
      const next = dungeonStep(
        this.state.dungeon,
        actor.depth,
        actor.roomId,
        direction,
        actor.entityKind === "hostile" || actor.entityKind === "boss" ? [ROOM_FEATURE_RUNE_FORGE] : [],
      );
      if (!next) {
        return {
          message: `${actor.name} cannot flee ${direction} from here.`,
          warnings: ["flee_blocked"],
          traitDelta: {},
          featureDelta: {},
          metadata: { direction },
          foundItemTags: [],
        };
      }
      const previousRoomId = actor.roomId;
      const previousDepth = actor.depth;
      actor.depth = next.depth;
      actor.roomId = next.roomId;
      return {
        message: `${actor.name} flees ${direction} to ${actor.roomId}.`,
        warnings: [],
        traitDelta: formulas.flee?.traitDelta ?? { Survival: 0.01 },
        featureDelta: {},
        metadata: { direction, fromRoomId: previousRoomId, fromDepth: previousDepth, toDepth: actor.depth },
        foundItemTags: [],
      };
    }

    if (action.actionType === "choose_dialogue") {
      const optionId = String(action.payload.optionId ?? "");
      const chosen = this.dialogue.chooseOption(actor, room, optionId, this.state.dialogueProgress);
      return {
        message: chosen.message,
        warnings: chosen.warnings,
        traitDelta: chosen.traitDelta,
        featureDelta: {},
        metadata: {
          optionId,
          takenItemId: chosen.takenItemId,
          optionLabel: chosen.optionLabel,
          optionLine: chosen.optionLine,
          clusterId: chosen.clusterId,
          nextOptionId: chosen.optionId ? this.dialogue.findNextOptionId(chosen.optionId) : null,
        },
        foundItemTags: chosen.takenItemId ? ["treasure"] : [],
      };
    }

    if (action.actionType === "live_stream") {
      const effort = Number(action.payload.effort ?? formulas.liveStream?.effortCost ?? 10);
      const roomVector = effectiveRoomVector(room);
      const fame = computeFameGain({
        currentFame: actor.features.Fame,
        effortSpent: effort,
        roomVector,
        actionNovelty: this.state.actionHistory[this.state.actionHistory.length - 1] === "live_stream" ? 0.75 : 1,
        riskLevel: room.feature === ROOM_FEATURE_COMBAT ? 1 : room.feature === "treasure" ? 0.6 : 0.35,
        momentum: actor.features.Momentum,
        hasBroadcastSkill: Boolean(actor.skills.battle_broadcast?.unlocked),
      });
      actor.features.Effort = Math.max(0, actor.features.Effort - effort);
      actor.features.Fame += fame.gain;
      actor.features.Momentum += Number(formulas.liveStream?.featureDelta?.Momentum ?? 0.2);
      return {
        message: `${actor.name} goes live and gains ${fame.gain.toFixed(2)} Fame.`,
        warnings: [],
        traitDelta: formulas.liveStream?.traitDelta ?? { Projection: 0.03 },
        featureDelta: {
          Fame: fame.gain,
          Effort: -effort,
          Momentum: Number(formulas.liveStream?.featureDelta?.Momentum ?? 0.2),
        },
        metadata: { fame },
        foundItemTags: [],
      };
    }

    if (action.actionType === "steal") {
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, false);
      if (!target) {
        return {
          message: `${actor.name} finds no valid target to steal from.`,
          warnings: ["steal_no_target"],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
          foundItemTags: [],
        };
      }
      const item = target.inventory.find((entry) => entry.tags.includes("loot"));
      if (!item) {
        return {
          message: `${target.name} has nothing worth stealing.`,
          warnings: ["steal_no_loot"],
          traitDelta: {},
          featureDelta: {},
          metadata: { targetId: target.entityId },
          foundItemTags: [],
        };
      }
      target.inventory = target.inventory.filter((entry) => entry.itemId !== item.itemId);
      actor.inventory.push(item);
      actor.features.Guile += Number(formulas.steal?.featureDelta?.Guile ?? 0.15);
      return {
        message: `${actor.name} steals ${item.name} from ${target.name}.`,
        warnings: [],
        traitDelta: formulas.steal?.traitDelta ?? { Constraint: 0.01, Survival: 0.02 },
        featureDelta: formulas.steal?.featureDelta ?? { Guile: 0.15 },
        metadata: { targetId: target.entityId, itemId: item.itemId },
        foundItemTags: [...item.tags],
        subjectEntityId: target.entityId,
      };
    }

    if (action.actionType === "recruit") {
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, false);
      if (!target) {
        return {
          message: `${actor.name} has no one to recruit here.`,
          warnings: ["recruit_no_target"],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
          foundItemTags: [],
        };
      }
      target.faction = "party";
      target.companionTo = actor.entityId;
      this.state.activeCompanionId = target.entityId;
      actor.features.Awareness += 0.1;
      return {
        message: `${target.name} joins ${actor.name} as a companion.`,
        warnings: [],
        traitDelta: formulas.recruit?.traitDelta ?? { Empathy: 0.04 },
        featureDelta: formulas.recruit?.featureDelta ?? { Awareness: 0.1 },
        metadata: { targetId: target.entityId },
        foundItemTags: [],
        subjectEntityId: target.entityId,
      };
    }

    if (action.actionType === "murder") {
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, true);
      if (!target) {
        return {
          message: `${actor.name} cannot carry out murder without a target.`,
          warnings: ["murder_no_target"],
          traitDelta: {},
          featureDelta: {},
          metadata: {},
          foundItemTags: [],
        };
      }
      const weapon = this.selectWeapon(actor);
      const result = this.combat.spar(actor, target, {
        weaponPower: weapon.power + 1,
        weaponName: weapon.name,
        lethal: true,
      });
      if (result.defenderDefeated) {
        target.faction = "fallen";
      }
      actor.reputation += Number(formulas.murder?.reputationDelta ?? -2);
      actor.xp += Number(formulas.murder?.xpDelta ?? 10);
      return {
        message: result.message,
        warnings: [],
        traitDelta: formulas.murder?.traitDelta ?? { Survival: 0.06, Constraint: -0.04 },
        featureDelta: formulas.murder?.featureDelta ?? { Momentum: 0.2 },
        metadata: { targetId: target.entityId, lethal: true, damage: result.damage },
        foundItemTags: [],
        subjectEntityId: target.entityId,
      };
    }

    if (action.actionType === "evolve_skill") {
      const skillId = String(action.payload.skillId ?? "");
      const outcome = this.skills.evolveSkill(actor, room, skillId);
      if (!outcome.ok) {
        return {
          message: `${actor.name} cannot evolve ${skillId}: ${outcome.reason}.`,
          warnings: [outcome.reason],
          traitDelta: {},
          featureDelta: {},
          metadata: { skillId, reason: outcome.reason },
          foundItemTags: [],
        };
      }
      return {
        message: `${actor.name} evolves skill ${skillId}.`,
        warnings: [],
        traitDelta: {},
        featureDelta: {},
        metadata: { skillId },
        foundItemTags: [],
      };
    }

    if (action.actionType === "use_item") {
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return {
          message: `${actor.name} cannot find item '${itemId}'.`,
          warnings: ["item_missing"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId },
          foundItemTags: [],
        };
      }
      const appliedTraitDelta = applyTraitDelta(
        actor.traits,
        item.traitDelta,
        this.state.config.minTraitValue,
        this.state.config.maxTraitValue,
      );
      const featureDelta = formulas.useItem?.featureDelta ?? { Awareness: 0.02 };
      applyFeatureDelta(actor.features, featureDelta);
      const consumed = this.isConsumable(item);
      if (consumed) {
        actor.inventory = actor.inventory.filter((entry) => entry.itemId !== item.itemId);
        if (actor.equippedWeaponItemId === item.itemId) {
          actor.equippedWeaponItemId = null;
        }
      }
      return {
        message: consumed
          ? `${actor.name} uses ${item.name} and consumes it.`
          : `${actor.name} uses ${item.name}.`,
        warnings: [],
        traitDelta: mergeDeltas(appliedTraitDelta, formulas.useItem?.traitDelta ?? {}),
        featureDelta,
        metadata: { itemId: item.itemId, consumed },
        foundItemTags: [...item.tags],
      };
    }

    if (action.actionType === "equip_item") {
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return {
          message: `${actor.name} cannot find item '${itemId}'.`,
          warnings: ["item_missing"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId },
          foundItemTags: [],
        };
      }
      if (!this.isEquippable(item)) {
        return {
          message: `${item.name} cannot be equipped.`,
          warnings: ["item_not_equippable"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId: item.itemId },
          foundItemTags: [],
        };
      }
      actor.equippedWeaponItemId = item.itemId;
      const featureDelta = formulas.equipItem?.featureDelta ?? { Momentum: 0.03 };
      applyFeatureDelta(actor.features, featureDelta);
      return {
        message: `${actor.name} equips ${item.name}.`,
        warnings: [],
        traitDelta: {},
        featureDelta,
        metadata: { itemId: item.itemId },
        foundItemTags: [...item.tags],
      };
    }

    if (action.actionType === "drop_item") {
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return {
          message: `${actor.name} cannot find item '${itemId}'.`,
          warnings: ["item_missing"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId },
          foundItemTags: [],
        };
      }
      actor.inventory = actor.inventory.filter((entry) => entry.itemId !== item.itemId);
      if (actor.equippedWeaponItemId === item.itemId) {
        actor.equippedWeaponItemId = null;
      }
      const featureDelta = formulas.dropItem?.featureDelta ?? { Momentum: -0.02 };
      applyFeatureDelta(actor.features, featureDelta);
      return {
        message: `${actor.name} drops ${item.name}.`,
        warnings: [],
        traitDelta: {},
        featureDelta,
        metadata: { itemId: item.itemId },
        foundItemTags: [],
      };
    }

    if (action.actionType === "purchase") {
      const itemId = String(action.payload.itemId ?? "");
      const purchasedItem = this.buildPurchasedItem(itemId);
      if (!purchasedItem) {
        return {
          message: `Rune Forge cannot sell '${itemId}'.`,
          warnings: ["unknown_purchase_item"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId },
          foundItemTags: [],
        };
      }
      const consumed = this.consumeCurrencyTokens(actor, RUNE_FORGE_PURCHASE_COST);
      if (consumed < RUNE_FORGE_PURCHASE_COST) {
        return {
          message: `${actor.name} lacks currency to purchase ${itemId}.`,
          warnings: ["insufficient_currency"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId, required: RUNE_FORGE_PURCHASE_COST, consumed },
          foundItemTags: [],
        };
      }
      actor.inventory.push(purchasedItem);
      const traitDelta = formulas.purchase?.traitDelta ?? { Comprehension: 0.02, Constraint: 0.02 };
      const featureDelta = formulas.purchase?.featureDelta ?? { Awareness: 0.05, Momentum: 0.03 };
      applyTraitDelta(actor.traits, traitDelta, this.state.config.minTraitValue, this.state.config.maxTraitValue);
      applyFeatureDelta(actor.features, featureDelta);
      return {
        message: `${actor.name} purchases ${purchasedItem.name} from the Rune Forge.`,
        warnings: [],
        traitDelta,
        featureDelta,
        metadata: { itemId: purchasedItem.itemId, purchasedFrom: itemId, currencySpent: consumed },
        foundItemTags: [...purchasedItem.tags],
      };
    }

    if (action.actionType === "re_equip") {
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return {
          message: `${actor.name} cannot re-equip missing item '${itemId}'.`,
          warnings: ["item_missing"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId },
          foundItemTags: [],
        };
      }
      if (!this.isEquippable(item)) {
        return {
          message: `${item.name} cannot be re-equipped.`,
          warnings: ["item_not_equippable"],
          traitDelta: {},
          featureDelta: {},
          metadata: { itemId: item.itemId },
          foundItemTags: [],
        };
      }
      actor.equippedWeaponItemId = item.itemId;
      const featureDelta = formulas.reEquip?.featureDelta ?? { Momentum: 0.04 };
      applyFeatureDelta(actor.features, featureDelta);
      return {
        message: `${actor.name} re-equips ${item.name} at the Rune Forge.`,
        warnings: [],
        traitDelta: {},
        featureDelta,
        metadata: { itemId: item.itemId },
        foundItemTags: [...item.tags],
      };
    }

    return {
      message: `Unknown action ${action.actionType}.`,
      warnings: ["unknown_action"],
      traitDelta: {},
      featureDelta: {},
      metadata: {},
      foundItemTags: [],
    };
  }

  private availabilityForAction(actor: EntityState, action: PlayerAction): { available: boolean; blockedReasons: string[] } {
    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const nearby = this.nearbyEntities(actor);

    if (action.actionType === "move") {
      const direction = String(action.payload.direction ?? "") as MoveDirection;
      const next = dungeonStep(
        this.state.dungeon,
        actor.depth,
        actor.roomId,
        direction,
        actor.entityKind === "hostile" || actor.entityKind === "boss" ? [ROOM_FEATURE_RUNE_FORGE] : [],
      );
      if (!next) {
        return { available: false, blockedReasons: ["move_blocked"] };
      }
      return { available: true, blockedReasons: [] };
    }

    if (action.actionType === "train" && room.feature !== ROOM_FEATURE_TRAINING) {
      return { available: false, blockedReasons: ["Need training room"] };
    }
    if (action.actionType === "talk" && nearby.length === 0) {
      return { available: false, blockedReasons: ["Need someone nearby"] };
    }
    if (action.actionType === "fight") {
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, true);
      if (!target) {
        return { available: false, blockedReasons: ["Need an enemy target"] };
      }
    }
    if (action.actionType === "flee") {
      const nearbyEnemy = nearby.find((target) => this.isEnemy(actor, target));
      if (!nearbyEnemy) {
        return { available: false, blockedReasons: ["Need an active encounter"] };
      }
      const direction = String(action.payload.direction ?? "");
      if (!direction) {
        return { available: false, blockedReasons: ["Need flee direction"] };
      }
      const next = dungeonStep(
        this.state.dungeon,
        actor.depth,
        actor.roomId,
        direction as MoveDirection,
        actor.entityKind === "hostile" || actor.entityKind === "boss" ? [ROOM_FEATURE_RUNE_FORGE] : [],
      );
      if (!next) {
        return { available: false, blockedReasons: ["flee_blocked"] };
      }
    }
    if (action.actionType === "choose_dialogue") {
      const optionId = String(action.payload.optionId ?? "");
      if (!optionId) {
        return { available: false, blockedReasons: ["Missing option id"] };
      }
      const option = this.dialogue.availableOptions(actor, room, this.state.dialogueProgress).find((row) => row.optionId === optionId);
      if (!option) {
        return { available: false, blockedReasons: ["Dialogue option unavailable"] };
      }
    }
    if (
      action.actionType === "live_stream" &&
      actor.features.Effort < Number(action.payload.effort ?? ACTION_CONTRACTS.actions.liveStream?.effortCost ?? 10)
    ) {
      return { available: false, blockedReasons: ["Need more Effort"] };
    }
    if (action.actionType === "steal") {
      if (!actor.skills.shadow_hand?.unlocked) {
        return { available: false, blockedReasons: ["Need shadow_hand"] };
      }
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, false);
      if (!target) {
        return { available: false, blockedReasons: ["Need target"] };
      }
      if (!target.inventory.some((item) => item.tags.includes("loot"))) {
        return { available: false, blockedReasons: ["Target has no loot"] };
      }
    }
    if (action.actionType === "recruit") {
      if (this.state.activeCompanionId) {
        return { available: false, blockedReasons: ["Companion slot already filled"] };
      }
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, false);
      if (!target) {
        return { available: false, blockedReasons: ["Need target"] };
      }
      if (["laughing_face", "dungeon_legion"].includes(target.faction)) {
        return { available: false, blockedReasons: ["Target faction refuses companionship"] };
      }
    }
    if (action.actionType === "murder") {
      const target = this.resolveTarget(actor, action.payload.targetId as string | undefined, nearby, true);
      if (!target) {
        return { available: false, blockedReasons: ["Need enemy target"] };
      }
      const traitGate = Number(actor.traits.Survival ?? 0) >= 0.2;
      const factionGate = actor.faction === "laughing_face" || actor.reputation <= -6;
      if (!traitGate) {
        return { available: false, blockedReasons: ["Trait gate failed (Survival too low)"] };
      }
      if (!factionGate) {
        return { available: false, blockedReasons: ["Faction/reputation gate failed"] };
      }
    }
    if (action.actionType === "use_item") {
      if (!actor.isPlayer) {
        return { available: false, blockedReasons: ["Player action only"] };
      }
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return { available: false, blockedReasons: ["Missing item"] };
      }
    }
    if (action.actionType === "equip_item") {
      if (!actor.isPlayer) {
        return { available: false, blockedReasons: ["Player action only"] };
      }
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return { available: false, blockedReasons: ["Missing item"] };
      }
      if (!this.isEquippable(item)) {
        return { available: false, blockedReasons: ["Item is not equippable"] };
      }
    }
    if (action.actionType === "drop_item") {
      if (!actor.isPlayer) {
        return { available: false, blockedReasons: ["Player action only"] };
      }
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return { available: false, blockedReasons: ["Missing item"] };
      }
    }
    if (action.actionType === "purchase") {
      if (!actor.isPlayer) {
        return { available: false, blockedReasons: ["Player action only"] };
      }
      if (room.feature !== ROOM_FEATURE_RUNE_FORGE) {
        return { available: false, blockedReasons: ["Need rune forge room"] };
      }
      const itemId = String(action.payload.itemId ?? "");
      if (!itemId) {
        return { available: false, blockedReasons: ["Missing item id"] };
      }
      if (!RUNE_FORGE_OFFER_ITEM_IDS.includes(itemId)) {
        return { available: false, blockedReasons: ["Item not sold at rune forge"] };
      }
      if (this.countCurrencyTokens(actor) < RUNE_FORGE_PURCHASE_COST) {
        return { available: false, blockedReasons: ["Need currency"] };
      }
    }
    if (action.actionType === "re_equip") {
      if (!actor.isPlayer) {
        return { available: false, blockedReasons: ["Player action only"] };
      }
      if (room.feature !== ROOM_FEATURE_RUNE_FORGE) {
        return { available: false, blockedReasons: ["Need rune forge room"] };
      }
      const itemId = String(action.payload.itemId ?? "");
      const item = this.findInventoryItem(actor, itemId);
      if (!item) {
        return { available: false, blockedReasons: ["Missing item"] };
      }
      if (!this.isEquippable(item)) {
        return { available: false, blockedReasons: ["Item is not equippable"] };
      }
    }
    if (action.actionType === "evolve_skill") {
      const skillId = String(action.payload.skillId ?? "");
      if (!skillId) {
        return { available: false, blockedReasons: ["Missing skill id"] };
      }
      const evolution = this.skills.availableEvolutions(actor, room).find((row) => row.skillId === skillId);
      if (!evolution?.available) {
        return { available: false, blockedReasons: evolution?.blockedReasons ?? ["Evolution unavailable"] };
      }
    }

    return { available: true, blockedReasons: [] };
  }

  private recordDialogueProgress(actor: EntityState, action: PlayerAction, result: ActionOutcome): void {
    if (!actor.isPlayer) {
      return;
    }
    if (action.actionType !== "talk" && action.actionType !== "choose_dialogue") {
      return;
    }

    const sequence = this.state.dialogueProgress.sequence + 1;
    const optionId =
      action.actionType === "choose_dialogue" ? String(action.payload.optionId ?? result.metadata.optionId ?? "") : "";
    const normalizedOptionId = optionId || null;
    const clusterId = String(result.metadata.clusterId ?? "") || null;
    const targetEntityId = String(result.metadata.targetId ?? "") || null;
    const label =
      action.actionType === "choose_dialogue"
        ? String(result.metadata.optionLabel ?? `choose ${normalizedOptionId ?? "dialogue"}`)
        : "talk";
    const responseText = String(result.message ?? "");

    const nextEntry = {
      sequence,
      turnIndex: this.state.turnIndex + 1,
      actionType: action.actionType,
      optionId: normalizedOptionId,
      clusterId,
      label,
      responseText,
      depth: actor.depth,
      roomId: actor.roomId,
      targetEntityId,
    };

    const visitedOptionIds =
      normalizedOptionId && !this.state.dialogueProgress.visitedOptionIds.includes(normalizedOptionId)
        ? [...this.state.dialogueProgress.visitedOptionIds, normalizedOptionId]
        : [...this.state.dialogueProgress.visitedOptionIds];
    const visitedClusterIds =
      clusterId && !this.state.dialogueProgress.visitedClusterIds.includes(clusterId)
        ? [...this.state.dialogueProgress.visitedClusterIds, clusterId]
        : [...this.state.dialogueProgress.visitedClusterIds];

    this.state.dialogueProgress = {
      sequence,
      lastOptionId: normalizedOptionId ?? this.state.dialogueProgress.lastOptionId,
      lastClusterId: clusterId ?? this.state.dialogueProgress.lastClusterId,
      visitedOptionIds,
      visitedClusterIds,
      history: [...this.state.dialogueProgress.history, nextEntry].slice(-40),
    };
  }

  private ensureChapterPages(chapter: number): void {
    if (!this.state.chapterPages[chapter]) {
      this.state.chapterPages[chapter] = { chapter: [], entities: {} };
    }
    const row = this.state.chapterPages[chapter] as { chapter: string[]; entities: Record<string, string[]> };
    for (const entityId of Object.keys(this.state.entities)) {
      if (!row.entities[entityId]) {
        row.entities[entityId] = [];
      }
    }
  }

  private record(
    actor: EntityState,
    actionType: string,
    message: string,
    warnings: string[],
    traitDelta: NumberMap,
    featureDelta: NumberMap,
    metadata: Record<string, unknown>,
  ): GameEvent {
    const chapter = chapterFor(this.state, actor.depth);
    this.ensureChapterPages(chapter);
    const act = actFor(this.state, actor.depth);
    const entry = `${actionType}@${actor.roomId}: ${message}`;
    const chapterPage = this.state.chapterPages[chapter] as { chapter: string[]; entities: Record<string, string[]> };
    chapterPage.chapter.push(`[${this.state.turnIndex}] ${entry}`);
    chapterPage.entities[actor.entityId]?.push(`[${this.state.turnIndex}] ${entry}`);

    const event: GameEvent = {
      turnIndex: this.state.turnIndex,
      actorId: actor.entityId,
      actorName: actor.name,
      actionType,
      depth: actor.depth,
      roomId: actor.roomId,
      chapterNumber: chapter,
      actNumber: act,
      message,
      warnings: [...warnings],
      traitDelta: toNumberMap(traitDelta),
      featureDelta: toNumberMap(featureDelta),
      metadata: { ...metadata },
    };
    this.state.eventLog.push(event);
    this.state.turnIndex += 1;
    return event;
  }

  private recordCutscenes(actor: EntityState, hits: CutsceneHit[]): void {
    for (const hit of hits) {
      this.record(actor, "cutscene", `${hit.title}: ${hit.text}`, [], {}, {}, { cutsceneId: hit.cutsceneId });
    }
  }

  private nearbyEntities(actor: EntityState): EntityState[] {
    return Object.values(this.state.entities).filter((entity) => {
      if (entity.entityId === actor.entityId || entity.health <= 0) {
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
    enemyOnly: boolean,
  ): EntityState | null {
    if (requestedTargetId) {
      const requested = nearby.find((entity) => entity.entityId === requestedTargetId);
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

  private findInventoryItem(actor: EntityState, itemId: string): EntityState["inventory"][number] | null {
    if (!itemId) {
      return null;
    }
    return actor.inventory.find((item) => item.itemId === itemId) ?? null;
  }

  private isEquippable(item: EntityState["inventory"][number]): boolean {
    return item.tags.includes("weapon") || item.tags.includes("armor");
  }

  private isConsumable(item: EntityState["inventory"][number]): boolean {
    if (item.tags.includes("consumable") || item.tags.includes("potion")) {
      return true;
    }
    return !this.isEquippable(item);
  }

  private countCurrencyTokens(actor: EntityState): number {
    return actor.inventory.filter((item) => item.tags.includes("currency")).length;
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
        if (actor.equippedWeaponItemId === item.itemId) {
          actor.equippedWeaponItemId = null;
        }
        remaining -= 1;
        continue;
      }
      next.push(item);
    }
    actor.inventory = next;
    return take - remaining;
  }

  private buildPurchasedItem(itemId: string): EntityState["inventory"][number] | null {
    const definition = ITEM_PACK.items.find((item) => item.itemId === itemId);
    if (!definition) {
      return null;
    }
    const rarity = definition.tags.find((tag) => ITEM_PACK.rarityTiers.includes(tag)) ?? "common";
    return {
      itemId: `${definition.itemId}_shop_${this.state.turnIndex}`,
      name: definition.itemId.replaceAll("_", " "),
      rarity: rarity as EntityState["inventory"][number]["rarity"],
      description: `Rune Forge purchase: ${definition.itemId}.`,
      tags: [...definition.tags],
      traitDelta: { ...definition.vectorDelta },
    };
  }

  private selectWeapon(actor: EntityState): { name: string; power: number } {
    const equipped =
      actor.equippedWeaponItemId
        ? actor.inventory.find((item) => item.itemId === actor.equippedWeaponItemId && item.tags.includes("weapon"))
        : null;
    const weapon = equipped ?? actor.inventory.find((item) => item.tags.includes("weapon"));
    if (!weapon) {
      return { name: "bare hands", power: 1 };
    }
    return { name: weapon.name, power: weaponPowerForTier(weapon.tags) };
  }

  private updateQuests(actor: EntityState, actionType: string, chapterCompleted?: number): void {
    if (!actor.isPlayer) {
      return;
    }

    for (const definition of QUEST_PACK.quests) {
      const quest = this.state.quests[definition.questId];
      if (!quest) {
        continue;
      }

      for (const rule of definition.progressRules) {
        if (rule.kind === "action") {
          if (actionType === rule.actionType) {
            quest.progress += Number(rule.amount ?? 1);
          }
          continue;
        }

        if (rule.kind === "chapter_completed") {
          if (chapterCompleted !== undefined) {
            quest.progress += Number(rule.amount ?? 1);
          }
          continue;
        }

        if (rule.kind === "escape" && this.state.escaped) {
          if (rule.setToRequired) {
            quest.progress = quest.requiredProgress;
          } else {
            quest.progress += Number(rule.amount ?? 1);
          }
        }
      }

      quest.progress = Math.min(quest.requiredProgress, quest.progress);
      quest.isComplete = quest.progress >= quest.requiredProgress;
    }
  }

  private refreshEntityArchetype(entity: EntityState): void {
    entity.archetypeHeading = this.archetypes.classify(entity, entity.archetypeHeading);
  }

  private refreshAllArchetypes(): void {
    for (const entity of Object.values(this.state.entities)) {
      this.refreshEntityArchetype(entity);
    }
  }

  private applyDeedSemantics(
    actor: EntityState,
    actionType: string,
    message: string,
    foundItemTags: string[],
    subjectEntityId: string,
    sourceEntityId: string,
    beliefState: "verified" | "rumor" | "misinformed",
    confidence: number,
  ): {
    traitDelta: NumberMap;
    featureDelta: NumberMap;
  } {
    const deed: Deed = {
      deedId: `${actor.entityId}_${this.state.turnIndex}_${actionType}`,
      actorId: actor.entityId,
      actorName: actor.name,
      subjectId: subjectEntityId,
      sourceEntityId,
      beliefState,
      confidence,
      deedType: actionType,
      title: `${actionType} at depth ${actor.depth}`,
      summary: message,
      depth: actor.depth,
      roomId: actor.roomId,
      tags: [...foundItemTags, actionType, actor.faction],
      turnIndex: this.state.turnIndex,
    };
    const memory = this.deedVectorizer.vectorize(deed);
    actor.deeds.push(memory);
    if (actor.deeds.length > 160) {
      actor.deeds.splice(0, actor.deeds.length - 160);
    }
    return {
      traitDelta: memory.traitDelta,
      featureDelta: memory.featureDelta,
    };
  }

  private spreadRumor(
    actor: EntityState,
    summary: string,
    baseConfidence: number,
    subjectEntityId: string,
  ): void {
    const baseBelief: "rumor" | "misinformed" = this.rng.nextFloat() < 0.18 ? "misinformed" : "rumor";
    const rumor = {
      rumorId: `rumor_${actor.entityId}_${this.state.turnIndex}`,
      sourceEntityId: actor.entityId,
      actorEntityId: actor.entityId,
      subjectEntityId,
      summary,
      beliefState: baseBelief,
      confidence: clamp(baseConfidence, 0, 1),
      turnIndex: this.state.turnIndex,
    };
    actor.rumors.push(rumor);

    for (const other of Object.values(this.state.entities)) {
      if (other.entityId === actor.entityId || other.health <= 0) {
        continue;
      }
      if (other.depth !== actor.depth) {
        continue;
      }
      const roll = this.rng.nextFloat();
      if (roll <= rumor.confidence) {
        const transformedBelief: "rumor" | "misinformed" =
          rumor.beliefState === "misinformed" || this.rng.nextFloat() < 0.22 ? "misinformed" : "rumor";
        const transformedSummary =
          transformedBelief === "misinformed" ? `${summary} (distorted by dungeon chatter)` : summary;
        other.rumors.push({
          ...rumor,
          rumorId: `${rumor.rumorId}_${other.entityId}`,
          summary: transformedSummary,
          beliefState: transformedBelief,
          confidence: clamp(rumor.confidence - (transformedBelief === "misinformed" ? 0.2 : 0.08), 0, 1),
        });
        this.applyDeedSemantics(
          other,
          "rumor_heard",
          transformedSummary,
          ["rumor"],
          rumor.subjectEntityId,
          rumor.sourceEntityId,
          transformedBelief,
          clamp(rumor.confidence - (transformedBelief === "misinformed" ? 0.2 : 0.08), 0, 1),
        );
      }
    }
  }

  private crossPollinateRumors(actor: EntityState, nearby: EntityState[]): void {
    const actorLatest = actor.rumors[actor.rumors.length - 1];
    for (const other of nearby) {
      const otherLatest = other.rumors[other.rumors.length - 1];
      if (actorLatest) {
        const beliefState: "rumor" | "misinformed" =
          actorLatest.beliefState === "misinformed" || this.rng.nextFloat() < 0.15 ? "misinformed" : "rumor";
        const confidence = clamp(actorLatest.confidence - 0.1, 0, 1);
        other.rumors.push({
          ...actorLatest,
          rumorId: `${actorLatest.rumorId}_shared_${other.entityId}_${this.state.turnIndex}`,
          beliefState,
          confidence,
        });
        this.applyDeedSemantics(
          other,
          "rumor_shared",
          actorLatest.summary,
          ["rumor"],
          actorLatest.subjectEntityId,
          actorLatest.sourceEntityId,
          beliefState,
          confidence,
        );
      }
      if (otherLatest) {
        const beliefState: "rumor" | "misinformed" =
          otherLatest.beliefState === "misinformed" || this.rng.nextFloat() < 0.15 ? "misinformed" : "rumor";
        const confidence = clamp(otherLatest.confidence - 0.1, 0, 1);
        actor.rumors.push({
          ...otherLatest,
          rumorId: `${otherLatest.rumorId}_shared_${actor.entityId}_${this.state.turnIndex}`,
          beliefState,
          confidence,
        });
        this.applyDeedSemantics(
          actor,
          "rumor_shared",
          otherLatest.summary,
          ["rumor"],
          otherLatest.subjectEntityId,
          otherLatest.sourceEntityId,
          beliefState,
          confidence,
        );
      }
    }
  }

  private pressureEntityCount(): number {
    const entities = Object.values(this.state.entities).filter((entity) => entity.health > 0).length;
    if (!this.state.config.countItemsAsEntitiesForPressure) {
      return entities;
    }

    const activeDepth = this.player.depth;
    const activeLevel = this.state.dungeon.levels[activeDepth];
    if (!activeLevel) {
      return entities;
    }

    let itemCount = 0;
    for (const room of Object.values(activeLevel.rooms)) {
      itemCount += room.items.filter((item) => item.isPresent).length;
    }
    return entities + itemCount;
  }

  private enforcePressureCap(actor: EntityState): void {
    const cap = this.state.config.entityPressureCap;
    let pressure = this.pressureEntityCount();
    if (pressure <= cap) {
      return;
    }

    const pruneCandidates = Object.values(this.state.entities)
      .filter((entity) => entity.entityKind === "hostile" && entity.health > 0)
      .sort((a, b) => a.entityId.localeCompare(b.entityId));
    let pruned = 0;
    for (const entity of pruneCandidates) {
      if (pressure <= cap) {
        break;
      }
      delete this.state.entities[entity.entityId];
      pruned += 1;
      pressure = this.pressureEntityCount();
    }

    if (pruned > 0) {
      this.record(
        actor,
        "pressure_control",
        `Pressure cap enforced at ${cap}. Pruned ${pruned} hostile entities.`,
        [],
        {},
        {},
        { cap, pruned, pressureAfter: pressure },
      );
    }
  }

  private eventTriggerSatisfied(event: EventDefinition, player: EntityState): boolean {
    if (event.trigger.metric === "turn_index") {
      return this.state.turnIndex >= event.trigger.gte;
    }
    if (event.trigger.metric === "player_feature") {
      const value = Number(player.features[event.trigger.key as keyof FeatureVector] ?? 0);
      return value >= event.trigger.gte;
    }
    return false;
  }

  private processGlobalEvents(player: EntityState): void {
    for (const event of EVENT_PACK.events) {
      if (this.state.globalEventFlags.includes(event.eventId)) {
        continue;
      }
      if (!this.eventTriggerSatisfied(event, player)) {
        continue;
      }
      if (event.kind === "emergent") {
        const probability = Number(event.probability ?? 0);
        if (this.rng.nextFloat() > probability) {
          continue;
        }
      }

      this.state.globalEventFlags.push(event.eventId);
      this.state.globalEnemyLevelBonus += Number(event.globalEnemyLevelBonusDelta ?? 0);

      const traitDelta = event.traitDelta
        ? applyTraitDelta(
            player.traits,
            event.traitDelta,
            this.state.config.minTraitValue,
            this.state.config.maxTraitValue,
          )
        : {};
      const featureDelta = event.featureDelta ? applyFeatureDelta(player.features, event.featureDelta) : {};

      this.record(
        player,
        "global_event",
        event.message,
        [],
        traitDelta,
        featureDelta,
        { globalEventId: event.eventId, eventKind: event.kind },
      );
    }
  }

  private spawnHostiles(depth: number): void {
    const level = getLevel(this.state.dungeon, depth);
    const exitRoomId = level.exitRoomId;

    for (let i = 0; i < this.state.config.hostileSpawnPerTurn; i += 1) {
      this.state.hostileSpawnIndex += 1;
      const hostileId = `hostile_${String(this.state.hostileSpawnIndex).padStart(5, "0")}`;
      const hostile: EntityState = {
        entityId: hostileId,
        name: `Crawler ${this.state.hostileSpawnIndex}`,
        isPlayer: false,
        entityKind: "hostile",
        depth,
        roomId: exitRoomId,
        traits: createTraitVector(0),
        attributes: {
          might: 5 + this.state.globalEnemyLevelBonus,
          agility: 5 + Math.floor(this.state.globalEnemyLevelBonus / 2),
          insight: 4,
          willpower: 5 + Math.floor(this.state.globalEnemyLevelBonus / 2),
        },
        features: createFeatureVector(),
        faction: "dungeon_legion",
        reputation: -4,
        archetypeHeading: "hunter",
        baseLevel: Math.max(1, this.state.config.totalLevels - depth + 1 + this.state.config.hostileLevelBonus),
        xp: 0,
        health: 70 + this.state.globalEnemyLevelBonus * 6,
        energy: 1,
        inventory: [],
        skills: {},
        deeds: [],
        rumors: [],
        effects: [],
        companionTo: null,
        equippedWeaponItemId: null,
      };
      this.state.entities[hostile.entityId] = hostile;
      this.refreshEntityArchetype(hostile);
      this.record(
        hostile,
        "spawn",
        `${hostile.name} emerges from ${exitRoomId} hunting survivors.`,
        [],
        {},
        {},
        { spawnRoomId: exitRoomId },
      );
    }
  }

  private resolveNpcPolicyId(
    entityKind: EntityState["entityKind"],
    policyOverrides: Partial<Record<EntityState["entityKind"], string>>,
  ): string | null {
    const override = policyOverrides[entityKind];
    if (override && ACTION_POLICY_BY_ID.has(override)) {
      return override;
    }
    return null;
  }

  private choosePolicyAction(legalActions: PlayerAction[], policyId: string | null): PlayerAction | null {
    if (!policyId) {
      return null;
    }
    const policy = ACTION_POLICY_BY_ID.get(policyId);
    if (!policy) {
      return null;
    }
    for (const actionType of policy.priorityOrder) {
      const found = legalActions.find((action) => action.actionType === actionType);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private simulateNpcTurns(
    policyOverrides: Partial<Record<EntityState["entityKind"], string>> = this.state.config.npcActionPolicyIds,
  ): void {
    const npcIds = Object.values(this.state.entities)
      .filter((entity) => !entity.isPlayer && entity.health > 0)
      .map((entity) => entity.entityId)
      .sort((a, b) => a.localeCompare(b));

    for (const entityId of npcIds) {
      const actor = this.state.entities[entityId];
      if (!actor || actor.health <= 0) {
        continue;
      }

      const legalActions = this.availableActions(actor)
        .filter((row) => row.available)
        .map((row): PlayerAction => {
          if (row.actionType === "choose_dialogue") {
            const options = (row.payload.options as Array<{ optionId: string }> | undefined) ?? [];
            const optionId = options[0]?.optionId;
            return {
              actionType: "choose_dialogue",
              payload: optionId ? { optionId } : {},
            };
          }
          if (row.actionType === "evolve_skill") {
            return {
              actionType: "evolve_skill",
              payload: { skillId: row.payload.skillId as string },
            };
          }
          if (row.actionType === "live_stream") {
            return {
              actionType: "live_stream",
              payload: { effort: Number(ACTION_CONTRACTS.actions.liveStream?.effortCost ?? 10) },
            };
          }
          if (row.actionType === "speak") {
            return {
              actionType: "speak",
              payload: { intentText: "I keep moving." },
            };
          }
          return {
            actionType: row.actionType,
            payload: { ...row.payload },
          };
        });

      if (legalActions.length === 0) {
        continue;
      }

      const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
      const nearbyEnemyCount = this.nearbyEntities(actor).filter((target) => this.isEnemy(actor, target)).length;

      let chosenAction: PlayerAction | null = null;
      if ((actor.entityKind === "hostile" || actor.entityKind === "boss") && nearbyEnemyCount === 0) {
        chosenAction = this.choosePredatorMove(actor, legalActions);
      }
      if (!chosenAction) {
        chosenAction = this.choosePolicyAction(
          legalActions,
          this.resolveNpcPolicyId(actor.entityKind, policyOverrides),
        );
      }
      if (!chosenAction) {
        chosenAction = chooseFromLegalActions(actor, legalActions, room.feature, nearbyEnemyCount, this.rng);
      }

      this.executeAction(actor, chosenAction, false);
    }
  }

  private choosePredatorMove(actor: EntityState, legalActions: PlayerAction[]): PlayerAction | null {
    const targets = Object.values(this.state.entities).filter((entity) => {
      if (entity.entityId === actor.entityId || entity.health <= 0) {
        return false;
      }
      if (entity.depth !== actor.depth) {
        return false;
      }
      return this.isEnemy(actor, entity);
    });
    if (targets.length === 0) {
      return null;
    }

    const room = getRoom(this.state.dungeon, actor.depth, actor.roomId);
    const sortedTargets = [...targets].sort((a, b) => {
      const roomA = getRoom(this.state.dungeon, a.depth, a.roomId);
      const roomB = getRoom(this.state.dungeon, b.depth, b.roomId);
      const distA = Math.abs(room.row - roomA.row) + Math.abs(room.column - roomA.column);
      const distB = Math.abs(room.row - roomB.row) + Math.abs(room.column - roomB.column);
      return distA - distB;
    });
    const nearest = sortedTargets[0] as EntityState;
    const targetRoom = getRoom(this.state.dungeon, nearest.depth, nearest.roomId);

    const preferredDirections: MoveDirection[] = [];
    if (targetRoom.row < room.row) {
      preferredDirections.push("north");
    } else if (targetRoom.row > room.row) {
      preferredDirections.push("south");
    }
    if (targetRoom.column < room.column) {
      preferredDirections.push("west");
    } else if (targetRoom.column > room.column) {
      preferredDirections.push("east");
    }

    for (const direction of preferredDirections) {
      const found = legalActions.find(
        (action) => action.actionType === "move" && String(action.payload.direction) === direction,
      );
      if (found) {
        return found;
      }
    }
    return null;
  }
}

const diffMap = (before: Record<string, number>, after: Record<string, number>): NumberMap => {
  const next: NumberMap = {};
  const keys = new Set<string>([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const diff = Number(after[key] ?? 0) - Number(before[key] ?? 0);
    if (Math.abs(diff) > 1e-9) {
      next[key] = diff;
    }
  }
  return next;
};

const scaleVector = (source: NumberMap, scale: number): NumberMap => {
  const next: NumberMap = {};
  for (const [key, value] of Object.entries(source)) {
    const scaled = Number(value) * scale;
    if (Math.abs(scaled) > 1e-9) {
      next[key] = scaled;
    }
  }
  return next;
};
