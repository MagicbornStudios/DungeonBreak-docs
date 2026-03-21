import {
  createCombatStats,
  createNarrativeStats,
  createSkillStats,
  createTransform,
  type EntityState,
  type GameConfig,
  type RoomNode,
  type SkillState,
} from "../core/types";
import {
  canonicalEntityTypeId,
  canonicalOccupationId,
  canonicalPartyRoleId,
  defaultEntityTypeIdForKind,
  occupationLabel,
  partyRoleLabel,
} from "./game-runtime-helpers";
import { roomCenterPosition } from "../world/map";

export const createPlayerEntity = (input: {
  config: GameConfig;
  startRoom: RoomNode;
  starterSkills: Record<string, SkillState>;
  starterPreparedSlots: Array<string | null>;
}): EntityState => {
  const { config, startRoom, starterSkills, starterPreparedSlots } = input;
  const occupationId = canonicalOccupationId(null, "player");
  const partyRoleId = canonicalPartyRoleId(null, "player");
  return {
    entityId: "kael",
    name: config.playerName,
    isPlayer: true,
    entityKind: "player",
    entityTypeId: defaultEntityTypeIdForKind("player"),
    occupationId,
    occupationName: occupationLabel(occupationId),
    partyRoleId,
    partyRoleName: partyRoleLabel(partyRoleId),
    depth: startRoom.depth,
    roomId: startRoom.roomId,
    transform: createTransform({ position: roomCenterPosition(startRoom) }),
    combatStats: createCombatStats({
      might: 6,
      agility: 5,
      insight: 5,
      willpower: 6,
      maxHp: config.defaultPlayerHealth,
      currentHp: config.defaultPlayerHealth,
      maxMana: config.defaultPlayerMana,
      currentMana: config.defaultPlayerMana,
    }),
    skillStats: createSkillStats(),
    narrativeStats: createNarrativeStats({ Effort: 100 }),
    runeStats: {},
    baseFaction: "freelancer",
    faction: "freelancer",
    hostileUntilTurn: null,
    reputation: 0,
    archetypeHeading: "wanderer",
    baseLevel: 1,
    xp: 0,
    inventory: [],
    skills: starterSkills,
    spellUseCounts: {},
    deeds: [],
    rumors: [],
    effects: [],
    companionTo: null,
    summonedBySkillId: null,
    equippedWeaponItemId: null,
    equippedArmorItemId: null,
    equippedAccessoryItemId: null,
    equippedSkillSlots: starterPreparedSlots,
  };
};

export const createDungeoneerEntity = (input: {
  depth: number;
  roomId: string;
  room: RoomNode;
  entityId: string;
  inventory: EntityState["inventory"];
  name: string;
  faction: string;
  baseLevel: number;
  reputation: number;
  entityTypeId?: string | null;
  occupationId: string | null;
  partyRoleId: string | null;
  archetypeHeading?: string;
}): EntityState => ({
  entityId: input.entityId,
  name: input.name,
  isPlayer: false,
  entityKind: "dungeoneer",
  entityTypeId: canonicalEntityTypeId(input.entityTypeId, "dungeoneer"),
  occupationId: canonicalOccupationId(input.occupationId, "dungeoneer"),
  occupationName: occupationLabel(
    canonicalOccupationId(input.occupationId, "dungeoneer")
  ),
  partyRoleId: canonicalPartyRoleId(input.partyRoleId, "dungeoneer"),
  partyRoleName: partyRoleLabel(
    canonicalPartyRoleId(input.partyRoleId, "dungeoneer")
  ),
  depth: input.depth,
  roomId: input.roomId,
  transform: createTransform({ position: roomCenterPosition(input.room) }),
  combatStats: createCombatStats({
    maxHp: 94,
    currentHp: 94,
    maxMana: 1,
    currentMana: 1,
  }),
  skillStats: createSkillStats(),
  narrativeStats: createNarrativeStats({ Effort: 80 }),
  runeStats: {},
  baseFaction: input.faction,
  faction: input.faction,
  hostileUntilTurn: null,
  reputation: input.reputation,
  archetypeHeading: input.archetypeHeading ?? "delver",
  baseLevel: input.baseLevel,
  xp: 0,
  inventory: input.inventory,
  skills: {},
  spellUseCounts: {},
  deeds: [],
  rumors: [],
  effects: [],
  companionTo: null,
  summonedBySkillId: null,
  equippedWeaponItemId: null,
  equippedArmorItemId: null,
  equippedAccessoryItemId: null,
  equippedSkillSlots: [],
});

export const createBossEntity = (input: {
  config: GameConfig;
  depth: number;
  room: RoomNode;
  entityTypeId?: string | null;
  archetypeHeading?: string;
  name?: string;
}): EntityState => {
  const depthOffset = Math.max(0, input.config.totalLevels - input.depth);
  const occupationId = canonicalOccupationId(null, "boss");
  return {
    entityId: `boss_${input.depth.toString().padStart(2, "0")}`,
    name: input.name ?? `Depth ${input.depth} Warden`,
    isPlayer: false,
    entityKind: "boss",
    entityTypeId: canonicalEntityTypeId(input.entityTypeId, "boss"),
    occupationId,
    occupationName: occupationLabel(occupationId),
    partyRoleId: null,
    partyRoleName: null,
    depth: input.depth,
    roomId: input.room.roomId,
    transform: createTransform({ position: roomCenterPosition(input.room) }),
    combatStats: createCombatStats({
      might: 7 + depthOffset,
      agility: 6 + Math.floor(depthOffset / 2),
      insight: 5 + Math.floor(depthOffset / 3),
      willpower: 7 + Math.floor(depthOffset / 2),
      maxHp: 120,
      currentHp: 120,
      maxMana: 1,
      currentMana: 1,
    }),
    skillStats: createSkillStats(),
    narrativeStats: createNarrativeStats({ Effort: 100 }),
    runeStats: {},
    baseFaction: "dungeon_legion",
    faction: "dungeon_legion",
    hostileUntilTurn: null,
    reputation: -5,
    archetypeHeading: input.archetypeHeading ?? "warden",
    baseLevel: Math.max(
      2,
      input.config.totalLevels - input.depth + 1 + input.config.bossLevelBonus
    ),
    xp: 0,
    inventory: [
      {
        itemId: `boss_weapon_${input.depth.toString().padStart(2, "0")}`,
        name: "Gatekeeper Halberd",
        rarity: "epic",
        description: "A heavy weapon used by gatekeepers.",
        tags: ["weapon", "epic"],
        narrativeStatDelta: { Direction: 0.1, Survival: 0.1 },
        transform: null,
      },
    ],
    skills: {},
    spellUseCounts: {},
    deeds: [],
    rumors: [],
    effects: [],
    companionTo: null,
    summonedBySkillId: null,
    equippedWeaponItemId: null,
    equippedArmorItemId: null,
    equippedAccessoryItemId: null,
    equippedSkillSlots: [],
  };
};

export const createHostileEntity = (input: {
  config: GameConfig;
  depth: number;
  roomId: string;
  room: RoomNode;
  hostileSpawnIndex: number;
  globalEnemyLevelBonus: number;
  entityTypeId?: string | null;
  archetypeHeading: string;
  name: string;
}): EntityState => {
  const levelBonus = input.globalEnemyLevelBonus;
  return {
    entityId: `hostile_${String(input.hostileSpawnIndex).padStart(5, "0")}`,
    name: input.name,
    isPlayer: false,
    entityKind: "hostile",
    entityTypeId: canonicalEntityTypeId(input.entityTypeId, "hostile"),
    occupationId: null,
    occupationName: null,
    partyRoleId: null,
    partyRoleName: null,
    depth: input.depth,
    roomId: input.roomId,
    transform: createTransform({ position: roomCenterPosition(input.room) }),
    combatStats: createCombatStats({
      might: 5 + levelBonus,
      agility: 5 + Math.floor(levelBonus / 2),
      insight: 4,
      willpower: 5 + Math.floor(levelBonus / 2),
      maxHp: 70 + levelBonus * 6,
      currentHp: 70 + levelBonus * 6,
      maxMana: 1,
      currentMana: 1,
    }),
    skillStats: createSkillStats(),
    narrativeStats: createNarrativeStats({ Effort: 100 }),
    runeStats: {},
    baseFaction: "dungeon_legion",
    faction: "dungeon_legion",
    hostileUntilTurn: null,
    reputation: -4,
    archetypeHeading: input.archetypeHeading,
    baseLevel: Math.max(
      1,
      input.config.totalLevels -
        input.depth +
        1 +
        input.config.hostileLevelBonus
    ),
    xp: 0,
    inventory: [],
    skills: {},
    spellUseCounts: {},
    deeds: [],
    rumors: [],
    effects: [],
    companionTo: null,
    summonedBySkillId: null,
    equippedWeaponItemId: null,
    equippedArmorItemId: null,
    equippedAccessoryItemId: null,
    equippedSkillSlots: [],
  };
};

export const createSummonEntity = (input: {
  owner: EntityState;
  room: RoomNode;
  skillId: string;
  skillName: string;
  spellName: string;
  spellPower: number;
}): EntityState => {
  const { owner, room, skillId, skillName, spellName, spellPower } = input;
  const basePower = Math.max(8, spellPower);
  const maxHp = 36 + basePower * 2;
  const levelBias = Math.max(0, owner.baseLevel - 1);
  const occupationId = canonicalOccupationId(null, "summon");
  return {
    entityId: `summon_${owner.entityId}`,
    name: spellName,
    isPlayer: false,
    entityKind: "summon",
    entityTypeId: defaultEntityTypeIdForKind("summon"),
    occupationId,
    occupationName: occupationLabel(occupationId),
    partyRoleId: null,
    partyRoleName: null,
    depth: room.depth,
    roomId: room.roomId,
    transform: createTransform({ position: roomCenterPosition(room) }),
    combatStats: createCombatStats({
      might: 4 + Math.floor(basePower / 8) + levelBias,
      agility: 4 + Math.floor(basePower / 10),
      insight: 4 + Math.floor(basePower / 12),
      willpower: 4 + Math.floor(basePower / 9),
      maxHp,
      currentHp: maxHp,
      maxMana: 99,
      currentMana: 99,
    }),
    skillStats: createSkillStats({ ...owner.skillStats }),
    narrativeStats: createNarrativeStats({ ...owner.narrativeStats }),
    runeStats: { ...owner.runeStats },
    baseFaction: "party",
    faction: "party",
    hostileUntilTurn: null,
    reputation: owner.reputation,
    archetypeHeading: owner.archetypeHeading,
    baseLevel: owner.baseLevel,
    xp: 0,
    inventory: [],
    skills: {
      [skillId]: {
        skillId,
        name: skillName,
        unlocked: true,
        mastery: 0,
      },
    },
    spellUseCounts: {
      [skillId]: Number(owner.spellUseCounts[skillId] ?? 0),
    },
    deeds: [],
    rumors: [],
    effects: [],
    companionTo: owner.entityId,
    summonedBySkillId: skillId,
    equippedWeaponItemId: null,
    equippedArmorItemId: null,
    equippedAccessoryItemId: null,
    equippedSkillSlots: [skillId],
  };
};
