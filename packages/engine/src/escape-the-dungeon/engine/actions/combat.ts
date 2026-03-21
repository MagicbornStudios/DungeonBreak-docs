import { ACTION_CONTRACTS, type SPELL_PACK } from "../../contracts";
import { currentMana, setCurrentMana } from "../../core/entity-stats";
import type {
  EntityState,
  GameState,
  MoveDirection,
  PlayerAction,
  RoomNode,
} from "../../core/types";
import type { SkillDefinition } from "../../narrative/skills";
import { dungeonStep, ROOM_FEATURE_RUNE_FORGE } from "../../world/map";
import { mergeDeltas, scaleVector, toNumberMap } from "../game-runtime-helpers";
import type { ActionAvailabilityResult, ActionOutcome } from "./action-types";

type AuthoredSpellDefinition = (typeof SPELL_PACK.spells)[number];

export const availabilityForCombatAction = (input: {
  state: GameState;
  actor: EntityState;
  action: PlayerAction;
  nearby: EntityState[];
  murderTraitGateMinSurvival: number;
  murderReputationGateMax: number;
  resolveTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[],
    enemyOnly: boolean
  ) => EntityState | null;
  isEnemy: (left: EntityState, right: EntityState) => boolean;
}): ActionAvailabilityResult | null => {
  const {
    state,
    actor,
    action,
    nearby,
    murderTraitGateMinSurvival,
    murderReputationGateMax,
    resolveTarget,
    isEnemy,
  } = input;

  if (action.actionType === "fight") {
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      true
    );
    return target
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["Need an enemy target"] };
  }

  if (action.actionType === "flee") {
    const nearbyEnemy = nearby.find((target) => isEnemy(actor, target));
    if (!nearbyEnemy) {
      return {
        available: false,
        blockedReasons: ["Need an active encounter"],
      };
    }
    const direction = String(action.payload.direction ?? "");
    if (!direction) {
      return { available: false, blockedReasons: ["Need flee direction"] };
    }
    const next = dungeonStep(
      state.dungeon,
      actor.depth,
      actor.roomId,
      direction as MoveDirection,
      actor.entityKind === "hostile" || actor.entityKind === "boss"
        ? [ROOM_FEATURE_RUNE_FORGE]
        : []
    );
    return next
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["flee_blocked"] };
  }

  if (action.actionType === "murder") {
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      true
    );
    if (!target) {
      return { available: false, blockedReasons: ["Need enemy target"] };
    }
    if (
      Number(actor.narrativeStats.Survival ?? 0) < murderTraitGateMinSurvival
    ) {
      return {
        available: false,
        blockedReasons: ["Trait gate failed (Survival too low)"],
      };
    }
    const factionGate =
      actor.faction === "laughing_face" ||
      actor.reputation <= murderReputationGateMax;
    return factionGate
      ? { available: true, blockedReasons: [] }
      : {
          available: false,
          blockedReasons: ["Faction/reputation gate failed"],
        };
  }

  return null;
};

export const availabilityForPreparedSpellAction = (input: {
  actor: EntityState;
  skillId: string;
  room: RoomNode;
  nearby: EntityState[];
  normalizePreparedSpellSlots: (actor: EntityState) => void;
  getSkillDefinition: (skillId: string) => SkillDefinition | null;
  getAuthoredSpell: (skillId: string) => AuthoredSpellDefinition | null;
  authoredSpellManaCost: (spell: AuthoredSpellDefinition) => number;
  canUseSkill: (
    actor: EntityState,
    room: RoomNode,
    skillId: string,
    nearby: EntityState[]
  ) => { available: boolean; blockedReasons: string[] };
  resolveTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[],
    enemyOnly: boolean
  ) => EntityState | null;
}): {
  available: boolean;
  blockedReasons: string[];
  definition: SkillDefinition | null;
} => {
  const {
    actor,
    skillId,
    room,
    nearby,
    normalizePreparedSpellSlots,
    getSkillDefinition,
    getAuthoredSpell,
    authoredSpellManaCost,
    canUseSkill,
    resolveTarget,
  } = input;

  normalizePreparedSpellSlots(actor);
  if (!actor.equippedSkillSlots.includes(skillId)) {
    return {
      available: false,
      blockedReasons: ["spell_not_prepared"],
      definition: null,
    };
  }

  const definition = getSkillDefinition(skillId);
  const authored = getAuthoredSpell(skillId);
  if (!(definition || authored)) {
    return {
      available: false,
      blockedReasons: ["unknown_skill"],
      definition: null,
    };
  }

  if (authored) {
    const blockedReasons: string[] = [];
    if (currentMana(actor) < authoredSpellManaCost(authored)) {
      blockedReasons.push("Need more mana");
    }
    if (!resolveTarget(actor, undefined, nearby, true)) {
      blockedReasons.push("Need an enemy target");
    }
    return {
      available: blockedReasons.length === 0,
      blockedReasons,
      definition,
    };
  }

  const useState = canUseSkill(actor, room, skillId, nearby);
  const blockedReasons = [...useState.blockedReasons];
  if (currentMana(actor) <= 0) {
    blockedReasons.push("Need more mana");
  }
  if (!resolveTarget(actor, undefined, nearby, true)) {
    blockedReasons.push("Need an enemy target");
  }
  return {
    available: blockedReasons.length === 0,
    blockedReasons,
    definition,
  };
};

export const performCombatAction = (input: {
  state: GameState;
  actor: EntityState;
  action: PlayerAction;
  nearby: EntityState[];
  resolveTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[],
    enemyOnly: boolean
  ) => EntityState | null;
  selectWeapon: (actor: EntityState) => { name: string; power: number };
  combatSpar: (
    actor: EntityState,
    target: EntityState,
    options: { weaponPower: number; weaponName: string; lethal: boolean }
  ) => {
    message: string;
    damage: number;
    weaponUsed: string;
    defenderDefeated?: boolean;
  };
  combatCrystalRewardForTarget: (target: EntityState) => number;
  buildManaCrystalItems: (
    count: number,
    source: string,
    rarity?: EntityState["inventory"][number]["rarity"]
  ) => EntityState["inventory"];
  onPlayerMoved?: (input: {
    actor: EntityState;
    previousDepth: number;
    previousRoomId: string;
    direction: MoveDirection;
    escaped: boolean;
  }) =>
    | {
        rewardMessage?: string | null;
        foundItemTags?: string[];
        metadata?: Record<string, unknown>;
      }
    | null
    | undefined;
}): ActionOutcome | null => {
  const {
    state,
    actor,
    action,
    nearby,
    resolveTarget,
    selectWeapon,
    combatSpar,
    combatCrystalRewardForTarget,
    buildManaCrystalItems,
    onPlayerMoved,
  } = input;
  const formulas = ACTION_CONTRACTS.actions;

  if (action.actionType === "fight") {
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      true
    );
    if (!target) {
      return {
        message: `${actor.name} has nobody to fight here.`,
        warnings: ["fight_no_target"],
        narrativeStatDelta: {},
        metadata: {},
        foundItemTags: [],
      };
    }
    const weapon = selectWeapon(actor);
    const result = combatSpar(actor, target, {
      weaponPower: weapon.power,
      weaponName: weapon.name,
      lethal: false,
    });
    const crystalReward =
      actor.isPlayer && result.defenderDefeated
        ? combatCrystalRewardForTarget(target)
        : 0;
    const crystalItems = buildManaCrystalItems(
      crystalReward,
      `fight_${target.entityId}`,
      target.entityKind === "boss" ? "epic" : "common"
    );
    actor.inventory.push(...crystalItems);
    actor.xp += Number(formulas.fight?.xpDelta ?? 4);
    return {
      message:
        crystalItems.length > 0
          ? `${result.message} ${actor.name} secures ${crystalItems.length} mana crystal${crystalItems.length === 1 ? "" : "s"}.`
          : result.message,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.fight?.traitDelta ?? {
          Survival: 0.03,
          Direction: 0.03,
        },
        formulas.fight?.featureDelta ?? { Momentum: 0.1 }
      ),
      metadata: {
        targetId: target.entityId,
        damage: result.damage,
        weapon: result.weaponUsed,
        manaCrystalCount: crystalItems.length,
        defenderDefeated: result.defenderDefeated ?? false,
      },
      foundItemTags: crystalItems.flatMap((item) => item.tags),
      subjectEntityId: target.entityId,
    };
  }

  if (action.actionType === "flee") {
    const direction = String(
      action.payload.direction ?? ""
    ).toLowerCase() as MoveDirection;
    const next = dungeonStep(
      state.dungeon,
      actor.depth,
      actor.roomId,
      direction,
      actor.entityKind === "hostile" || actor.entityKind === "boss"
        ? [ROOM_FEATURE_RUNE_FORGE]
        : []
    );
    if (!next) {
      return {
        message: `${actor.name} cannot flee ${direction} from here.`,
        warnings: ["flee_blocked"],
        narrativeStatDelta: {},
        metadata: { direction },
        foundItemTags: [],
      };
    }
    const previousRoomId = actor.roomId;
    const previousDepth = actor.depth;
    actor.depth = next.depth;
    actor.roomId = next.roomId;
    const escaped = false;
    const moveResolution = actor.isPlayer
      ? (onPlayerMoved?.({
          actor,
          previousDepth,
          previousRoomId,
          direction,
          escaped,
        }) ?? null)
      : null;
    return {
      message: [
        `${actor.name} flees ${direction} to ${actor.roomId}.`,
        moveResolution?.rewardMessage ?? null,
      ]
        .filter(Boolean)
        .join(" "),
      warnings: [],
      narrativeStatDelta: toNumberMap(
        formulas.flee?.traitDelta ?? { Survival: 0.01 }
      ),
      metadata: {
        direction,
        fromRoomId: previousRoomId,
        fromDepth: previousDepth,
        toDepth: actor.depth,
        ...(moveResolution?.metadata ?? {}),
      },
      foundItemTags: [...(moveResolution?.foundItemTags ?? [])],
    };
  }

  if (action.actionType === "murder") {
    const target = resolveTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby,
      true
    );
    if (!target) {
      return {
        message: `${actor.name} cannot carry out murder without a target.`,
        warnings: ["murder_no_target"],
        narrativeStatDelta: {},
        metadata: {},
        foundItemTags: [],
      };
    }
    const weapon = selectWeapon(actor);
    const result = combatSpar(actor, target, {
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
      narrativeStatDelta: mergeDeltas(
        formulas.murder?.traitDelta ?? {
          Survival: 0.06,
          Constraint: -0.04,
        },
        formulas.murder?.featureDelta ?? { Momentum: 0.2 }
      ),
      metadata: {
        targetId: target.entityId,
        lethal: true,
        damage: result.damage,
      },
      foundItemTags: [],
      subjectEntityId: target.entityId,
    };
  }

  return null;
};

export const performPreparedSpellAction = (input: {
  actor: EntityState;
  skillId: string;
  definition: SkillDefinition | null;
  nearby: EntityState[];
  getAuthoredSpell: (skillId: string) => AuthoredSpellDefinition | null;
  resolveTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[],
    enemyOnly: boolean
  ) => EntityState | null;
  selectWeapon: (actor: EntityState) => { name: string; power: number };
  combatSpar: (
    actor: EntityState,
    target: EntityState,
    options: { weaponPower: number; weaponName: string; lethal: boolean }
  ) => { message: string; damage: number; defenderDefeated?: boolean };
  spellBranchFlavor: (branch?: string) => string;
  spellPowerBonus: (definition: SkillDefinition) => number;
  authoredSpellManaCost: (spell: AuthoredSpellDefinition) => number;
  authoredSpellWeaponBonus: (
    actor: EntityState,
    spell: AuthoredSpellDefinition
  ) => number;
  authoredSpellAffinityBonus: (
    actor: EntityState,
    spell: AuthoredSpellDefinition
  ) => number;
  applyAuthoredSpellProgress: (
    actor: EntityState,
    spell: AuthoredSpellDefinition
  ) => void;
  spellUseCount: (actor: EntityState, skillId: string) => number;
  spellLevelForUseCount: (useCount: number) => number;
  combatCrystalRewardForTarget: (target: EntityState) => number;
  buildManaCrystalItems: (
    count: number,
    source: string,
    rarity?: EntityState["inventory"][number]["rarity"]
  ) => EntityState["inventory"];
}): ActionOutcome => {
  const {
    actor,
    skillId,
    definition,
    nearby,
    getAuthoredSpell,
    resolveTarget,
    selectWeapon,
    combatSpar,
    spellBranchFlavor,
    spellPowerBonus,
    authoredSpellManaCost,
    authoredSpellWeaponBonus,
    authoredSpellAffinityBonus,
    applyAuthoredSpellProgress,
    spellUseCount,
    spellLevelForUseCount,
    combatCrystalRewardForTarget,
    buildManaCrystalItems,
  } = input;
  const authored = getAuthoredSpell(skillId);
  if (authored) {
    const displayName = actor.skills[skillId]?.name ?? authored.name;
    const target = resolveTarget(actor, undefined, nearby, true);
    if (!target) {
      return {
        message: `${actor.name} cannot find a spell target for ${skillId}.`,
        warnings: ["spell_target_missing"],
        narrativeStatDelta: {},
        metadata: { skillId },
        foundItemTags: [],
      };
    }

    const slotIndex = actor.equippedSkillSlots.findIndex(
      (entry) => entry === skillId
    );
    const state = actor.skills[skillId];
    const manaCost = authoredSpellManaCost(authored);
    setCurrentMana(actor, Math.max(0, currentMana(actor) - manaCost));
    if (state) {
      state.mastery += 1;
    }
    applyAuthoredSpellProgress(actor, authored);

    const weapon = selectWeapon(actor);
    const affinityBonus = authoredSpellAffinityBonus(actor, authored);
    const combat = combatSpar(actor, target, {
      weaponPower: weapon.power + authoredSpellWeaponBonus(actor, authored),
      weaponName: displayName,
      lethal: false,
    });
    const crystalReward =
      actor.isPlayer && combat.defenderDefeated
        ? combatCrystalRewardForTarget(target)
        : 0;
    const crystalItems = buildManaCrystalItems(
      crystalReward,
      `spell_${target.entityId}`,
      target.entityKind === "boss" ? "epic" : "common"
    );
    actor.inventory.push(...crystalItems);
    actor.xp +=
      5 + Math.max(0, spellLevelForUseCount(spellUseCount(actor, skillId)) - 1);

    return {
      message:
        crystalItems.length > 0
          ? `${actor.name} casts ${displayName}. ${combat.message} ${actor.name} secures ${crystalItems.length} mana crystal${crystalItems.length === 1 ? "" : "s"}.`
          : `${actor.name} casts ${displayName}. ${combat.message}`,
      warnings: [],
      narrativeStatDelta: {
        Momentum: authored.categoryId === "combat" ? 0.12 : 0.06,
        Awareness: authored.categoryId === "detection" ? 0.04 : 0,
      },
      metadata: {
        skillId,
        skillName: displayName,
        slotIndex,
        targetId: target.entityId,
        damage: combat.damage,
        manaCost,
        categoryId: authored.categoryId,
        level: spellLevelForUseCount(spellUseCount(actor, skillId)),
        affinityBonus,
        manaCrystalCount: crystalItems.length,
        defenderDefeated: combat.defenderDefeated ?? false,
      },
      foundItemTags: crystalItems.flatMap((item) => item.tags),
      subjectEntityId: target.entityId,
    };
  }

  const target = resolveTarget(actor, undefined, nearby, true);
  if (!(definition && target)) {
    return {
      message: `${actor.name} cannot find a spell target for ${skillId}.`,
      warnings: ["spell_target_missing"],
      narrativeStatDelta: {},
      metadata: { skillId },
      foundItemTags: [],
    };
  }

  const slotIndex = actor.equippedSkillSlots.findIndex(
    (entry) => entry === skillId
  );
  const state = actor.skills[skillId];
  const manaCost = definition.evolvedFrom ? 2 : 1;
  setCurrentMana(actor, Math.max(0, currentMana(actor) - manaCost));
  if (state) {
    state.mastery += 1;
  }

  const weapon = selectWeapon(actor);
  const combat = combatSpar(actor, target, {
    weaponPower: weapon.power + spellPowerBonus(definition),
    weaponName: definition.name,
    lethal: false,
  });
  const crystalReward =
    actor.isPlayer && combat.defenderDefeated
      ? combatCrystalRewardForTarget(target)
      : 0;
  const crystalItems = buildManaCrystalItems(
    crystalReward,
    `skill_${target.entityId}`,
    target.entityKind === "boss" ? "epic" : "common"
  );
  actor.inventory.push(...crystalItems);
  actor.xp += 5 + (definition.evolvedFrom ? 2 : 0);

  return {
    message:
      crystalItems.length > 0
        ? `${actor.name} casts ${definition.name}. ${spellBranchFlavor(definition.branch)} ${combat.message} ${actor.name} secures ${crystalItems.length} mana crystal${crystalItems.length === 1 ? "" : "s"}.`
        : `${actor.name} casts ${definition.name}. ${spellBranchFlavor(definition.branch)} ${combat.message}`,
    warnings: [],
    narrativeStatDelta: mergeDeltas(
      scaleVector(definition.narrativeStatBonus, 0.45),
      {
        Momentum: definition.branch === "combat" ? 0.12 : 0.06,
      }
    ),
    metadata: {
      skillId,
      skillName: definition.name,
      slotIndex,
      targetId: target.entityId,
      damage: combat.damage,
      manaCost,
      branch: definition.branch ?? "general",
      manaCrystalCount: crystalItems.length,
      defenderDefeated: combat.defenderDefeated ?? false,
    },
    foundItemTags: crystalItems.flatMap((item) => item.tags),
    subjectEntityId: target.entityId,
  };
};
