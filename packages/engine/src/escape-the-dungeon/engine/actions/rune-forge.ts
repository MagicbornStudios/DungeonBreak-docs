import { type EntityState, type PlayerAction, type RoomNode } from "../../core/types";
import { runeComboKey } from "../game-runtime-helpers";
import type { ActionAvailabilityResult, ActionOutcome } from "./action-types";

export const availabilityForRuneForgeAction = (input: {
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
  authoredSpellEvolutionCandidates: (
    actor: EntityState,
    sourceSkillId: string,
  ) => Array<{ evolutionId: string; available: boolean; blockedReasons: string[] }>;
  availableSkillEvolutions: (
    actor: EntityState,
    room: RoomNode,
  ) => Array<{ skillId: string; available: boolean; blockedReasons: string[] }>;
}): ActionAvailabilityResult | null => {
  const { actor, action, room, authoredSpellEvolutionCandidates, availableSkillEvolutions } =
    input;

  if (action.actionType !== "evolve_skill") {
    return null;
  }

  const evolutionId = String(action.payload.evolutionId ?? "");
  const sourceSkillId = String(
    action.payload.sourceSkillId ?? action.payload.skillId ?? "",
  );
  if (evolutionId) {
    if (room.feature !== "rune_forge") {
      return { available: false, blockedReasons: ["Need rune forge room"] };
    }
    const evolution = authoredSpellEvolutionCandidates(
      actor,
      sourceSkillId,
    ).find((row) => row.evolutionId === evolutionId);
    return evolution?.available
      ? { available: true, blockedReasons: [] }
      : {
          available: false,
          blockedReasons: evolution?.blockedReasons ?? [
            "Evolution unavailable",
          ],
        };
  }

  const skillId = String(action.payload.skillId ?? "");
  if (!skillId) {
    return { available: false, blockedReasons: ["Missing skill id"] };
  }
  const evolution = availableSkillEvolutions(actor, room).find(
    (row) => row.skillId === skillId,
  );
  return evolution?.available
    ? { available: true, blockedReasons: [] }
    : {
        available: false,
        blockedReasons: evolution?.blockedReasons ?? ["Evolution unavailable"],
      };
};

export const performRuneForgeAction = (input: {
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
  evolveKnownSkill: (
    actor: EntityState,
    room: RoomNode,
    skillId: string,
  ) => { ok: boolean; reason: string };
  performAuthoredEvolution: (
    actor: EntityState,
    room: RoomNode,
    sourceSkillId: string,
    evolutionId: string,
  ) => {
    ok: boolean;
    reason: string;
    message: string;
    resultSpellId: string | null;
    isSummon: boolean;
  };
}): ActionOutcome | null => {
  const { actor, action, room, evolveKnownSkill, performAuthoredEvolution } =
    input;

  if (action.actionType !== "evolve_skill") {
    return null;
  }

  const evolutionId = String(action.payload.evolutionId ?? "");
  const sourceSkillId = String(
    action.payload.sourceSkillId ?? action.payload.skillId ?? "",
  );
  if (evolutionId) {
    const authoredOutcome = performAuthoredEvolution(
      actor,
      room,
      sourceSkillId,
      evolutionId,
    );
    if (!authoredOutcome.ok) {
      return {
        message: `${actor.name} cannot evolve ${sourceSkillId}: ${authoredOutcome.reason}.`,
        warnings: [authoredOutcome.reason],
        narrativeStatDelta: {},
        metadata: {
          skillId: sourceSkillId,
          evolutionId,
          reason: authoredOutcome.reason,
        },
        foundItemTags: [],
      };
    }
    return {
      message: authoredOutcome.message,
      warnings: [],
      narrativeStatDelta: { Momentum: 0.05 },
      metadata: {
        skillId: sourceSkillId,
        evolutionId,
        resultSpellId: authoredOutcome.resultSpellId,
        isSummon: authoredOutcome.isSummon,
      },
      foundItemTags: [],
    };
  }

  const skillId = String(action.payload.skillId ?? "");
  const outcome = evolveKnownSkill(actor, room, skillId);
  if (!outcome.ok) {
    return {
      message: `${actor.name} cannot evolve ${skillId}: ${outcome.reason}.`,
      warnings: [outcome.reason],
      narrativeStatDelta: {},
      metadata: { skillId, reason: outcome.reason },
      foundItemTags: [],
    };
  }
  return {
    message: `${actor.name} evolves skill ${skillId}.`,
    warnings: [],
    narrativeStatDelta: {},
    metadata: { skillId },
    foundItemTags: [],
  };
};

export const performForgeCraftAction = (input: {
  actor: EntityState;
  room: RoomNode;
  runeCombo: string[];
  options: { customName?: string | null; slotIndex?: number | null };
  normalizeRuneCombo: (runeCombo: string[]) => string[];
  authoredSpellForRuneCombo: (runeCombo: string[]) => {
    spellId: string;
    name: string;
    rarityId?: string;
    forgeCostManaCrystals?: number;
  } | null;
  hasDiscoveredSpell: (spellId: string) => boolean;
  spellForgeCost: (spell: {
    rarityId?: string;
    forgeCostManaCrystals?: number;
  }) => number;
  countCurrencyTokens: (actor: EntityState) => number;
  consumeCurrencyTokens: (actor: EntityState, count: number) => number;
  createUnlockedSkillState: (skillId: string) => {
    skillId: string;
    name: string;
    unlocked: boolean;
    mastery: number;
  };
  discoverSpell: (spellId: string) => void;
  prepareSpellInSlot: (actor: EntityState, slotIndex: number, skillId: string) => void;
}): ActionOutcome => {
  const {
    actor,
    room,
    runeCombo,
    options,
    normalizeRuneCombo,
    authoredSpellForRuneCombo,
    hasDiscoveredSpell,
    spellForgeCost,
    countCurrencyTokens,
    consumeCurrencyTokens,
    createUnlockedSkillState,
    discoverSpell,
    prepareSpellInSlot,
  } = input;
  const normalizedCombo = normalizeRuneCombo(runeCombo);

  if (room.feature !== "rune_forge") {
    return {
      message: `${actor.name} needs a rune forge to shape spells.`,
      warnings: ["needs_rune_forge"],
      narrativeStatDelta: {},
      metadata: { runeCombo: normalizedCombo },
      foundItemTags: [],
    };
  }
  if (normalizedCombo.length === 0) {
    return {
      message: `${actor.name} arranges no runes, so the forge stays dark.`,
      warnings: ["missing_rune_recipe"],
      narrativeStatDelta: {},
      metadata: {},
      foundItemTags: [],
    };
  }

  const authoredSpell = authoredSpellForRuneCombo(normalizedCombo);
  if (!authoredSpell) {
    return {
      message: `${actor.name} tests ${normalizedCombo.join(" -> ")} but the forge finds no stable spell recipe.`,
      warnings: ["unknown_spell_recipe"],
      narrativeStatDelta: { Comprehension: 0.01, Awareness: 0.02 },
      metadata: {
        runeCombo: normalizedCombo,
        runeRecipeKey: runeComboKey(normalizedCombo),
      },
      foundItemTags: [],
    };
  }

  const alreadyKnown = Boolean(actor.skills[authoredSpell.spellId]?.unlocked);
  const wasDiscovered = hasDiscoveredSpell(authoredSpell.spellId);
  const forgeCost = alreadyKnown ? 0 : spellForgeCost(authoredSpell);
  if (!alreadyKnown && countCurrencyTokens(actor) < forgeCost) {
    return {
      message: `${actor.name} needs ${forgeCost} mana crystals to forge ${authoredSpell.name}.`,
      warnings: ["insufficient_currency"],
      narrativeStatDelta: {},
      metadata: {
        spellId: authoredSpell.spellId,
        forgeCost,
        runeCombo: normalizedCombo,
      },
      foundItemTags: [],
    };
  }

  if (!alreadyKnown) {
    const consumed = consumeCurrencyTokens(actor, forgeCost);
    if (consumed < forgeCost) {
      return {
        message: `${actor.name} cannot complete the forge cost for ${authoredSpell.name}.`,
        warnings: ["insufficient_currency"],
        narrativeStatDelta: {},
        metadata: {
          spellId: authoredSpell.spellId,
          forgeCost,
          consumed,
        },
        foundItemTags: [],
      };
    }
    actor.skills[authoredSpell.spellId] = createUnlockedSkillState(
      authoredSpell.spellId,
    );
  }

  discoverSpell(authoredSpell.spellId);
  const requestedName = String(options.customName ?? "").trim();
  if (requestedName.length > 0) {
    actor.skills[authoredSpell.spellId]!.name = requestedName;
  }
  if (typeof options.slotIndex === "number") {
    prepareSpellInSlot(actor, options.slotIndex, authoredSpell.spellId);
  }

  const displayName =
    actor.skills[authoredSpell.spellId]?.name ?? authoredSpell.name;
  const discoveryClause = wasDiscovered
    ? "The pattern settles into a known formula."
    : "A hidden recipe locks into place.";
  const prepareClause =
    typeof options.slotIndex === "number"
      ? ` Prepared in slot ${options.slotIndex + 1}.`
      : "";

  return {
    message: alreadyKnown
      ? `${actor.name} reinscribes ${displayName}. ${discoveryClause}${prepareClause}`
      : `${actor.name} forges ${displayName} from ${normalizedCombo.join(" -> ")}. ${discoveryClause}${prepareClause}`,
    warnings: [],
    narrativeStatDelta: {
      Comprehension: 0.03,
      Direction: 0.02,
      Awareness: alreadyKnown ? 0.03 : 0.06,
      Momentum: alreadyKnown ? 0.02 : 0.08,
    },
    metadata: {
      spellId: authoredSpell.spellId,
      runeCombo: normalizedCombo,
      forgeCost,
      discoveredRecipe: !wasDiscovered,
      preparedSlotIndex:
        typeof options.slotIndex === "number" ? options.slotIndex : null,
    },
    foundItemTags: ["spellcraft"],
  };
};

export const performForgeEvolutionAction = (input: {
  actor: EntityState;
  room: RoomNode;
  sourceSkillId: string;
  runeCombo: string[];
  normalizeRuneCombo: (runeCombo: string[]) => string[];
  authoredSpellEvolutionCandidates: (
    actor: EntityState,
    sourceSkillId: string,
  ) => Array<{
    evolutionId: string;
    runeCombo: string[];
    resultSpellId: string | null;
    isSummon: boolean;
  }>;
  performAuthoredEvolution: (
    actor: EntityState,
    room: RoomNode,
    sourceSkillId: string,
    evolutionId: string,
  ) => {
    ok: boolean;
    reason: string;
    message: string;
    resultSpellId: string | null;
    isSummon: boolean;
  };
  discoverEvolution: (evolutionId: string) => void;
}): ActionOutcome => {
  const {
    actor,
    room,
    sourceSkillId,
    runeCombo,
    normalizeRuneCombo,
    authoredSpellEvolutionCandidates,
    performAuthoredEvolution,
    discoverEvolution,
  } = input;
  const normalizedCombo = normalizeRuneCombo(runeCombo);
  if (room.feature !== "rune_forge") {
    return {
      message: `${actor.name} needs a rune forge to evolve spells.`,
      warnings: ["needs_rune_forge"],
      narrativeStatDelta: {},
      metadata: { sourceSkillId, runeCombo: normalizedCombo },
      foundItemTags: [],
    };
  }
  const evolution = authoredSpellEvolutionCandidates(actor, sourceSkillId).find(
    (row) => runeComboKey(row.runeCombo) === runeComboKey(normalizedCombo),
  );
  if (!evolution) {
    return {
      message: `${actor.name} finds no evolution path from ${sourceSkillId} for ${normalizedCombo.join(" -> ")}.`,
      warnings: ["evolution_unavailable"],
      narrativeStatDelta: {},
      metadata: { sourceSkillId, runeCombo: normalizedCombo },
      foundItemTags: [],
    };
  }
  const outcome = performAuthoredEvolution(
    actor,
    room,
    sourceSkillId,
    evolution.evolutionId,
  );
  if (!outcome.ok) {
    return {
      message: `${actor.name} cannot evolve ${sourceSkillId}: ${outcome.reason}.`,
      warnings: [outcome.reason],
      narrativeStatDelta: {},
      metadata: {
        sourceSkillId,
        evolutionId: evolution.evolutionId,
        runeCombo: normalizedCombo,
      },
      foundItemTags: [],
    };
  }
  discoverEvolution(evolution.evolutionId);
  return {
    message: outcome.message,
    warnings: [],
    narrativeStatDelta: {
      Comprehension: 0.02,
      Momentum: 0.05,
      Awareness: 0.03,
    },
    metadata: {
      sourceSkillId,
      evolutionId: evolution.evolutionId,
      resultSpellId: outcome.resultSpellId,
      isSummon: outcome.isSummon,
      runeCombo: normalizedCombo,
    },
    foundItemTags: ["spellcraft"],
  };
};
