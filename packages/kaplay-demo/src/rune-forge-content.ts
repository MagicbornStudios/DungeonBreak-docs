import type { ActionItem } from "@dungeonbreak/engine";
import {
  RUNE_AFFINITY_PACK,
  RUNE_PACK,
  SPELL_CATEGORY_PACK,
  SPELL_PACK,
} from "../../engine/src/escape-the-dungeon/contracts";
import { spellForgeCostForSpellId } from "./spell-forge-meta";

export interface RuneForgeEngine {
  authoredSpellStatus: (spellId: string) => RuneForgeAuthoredSpellStatus | null;
}

interface RuneForgeEvolutionStatus {
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

interface RuneForgeAuthoredSpellStatus {
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
  evolutions: RuneForgeEvolutionStatus[];
}

export interface RuneForgeSpellDetail {
  title: string;
  subtitle: string;
  detailLines: string[];
  evolutionRows: Array<{
    id: string;
    label: string;
    detail: string;
    available: boolean;
    blockedReasons: string[];
    actionItem: ActionItem | null;
  }>;
}

export interface RuneForgeRecipePreview {
  title: string;
  subtitle: string;
  detailLines: string[];
  recipeSpellId: string | null;
  recipeKnown: boolean;
  evolutionMatch: {
    evolutionId: string;
    sourceSpellId: string;
    resultName: string;
    available: boolean;
    blockedReasons: string[];
    discovered: boolean;
  } | null;
}

const categoryLabelById = new Map(
  SPELL_CATEGORY_PACK.categories.map((category) => [
    category.categoryId,
    category.name,
  ])
);
const runeNameById = new Map(
  RUNE_PACK.runes.map((rune) => [rune.runeId, rune.name])
);
const authoredSpellByComboKey = new Map(
  SPELL_PACK.spells
    .filter((spell) => (spell.runeCombo?.length ?? 0) > 0)
    .map((spell) => [spell.runeCombo!.join("|"), spell] as const)
);

export const RUNE_FORGE_RUNES = [...RUNE_PACK.runes];

const titleCase = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const blockedReasonLabel = (reason: string): string => {
  if (reason === "already_in_form") {
    return "Already in current form";
  }
  if (reason === "companion_slot_filled") {
    return "Dismiss companion first";
  }
  if (reason.startsWith("requires_level_")) {
    return `Requires level ${reason.replace("requires_level_", "")}`;
  }
  if (reason.startsWith("requires_affinity_")) {
    return `Requires affinity ${reason.replace("requires_affinity_", "")}+`;
  }
  return titleCase(reason);
};

const evolutionDetailLine = (evolution: RuneForgeEvolutionStatus): string => {
  const summonLabel = evolution.isSummon ? "summon" : "spell";
  const levelLine =
    typeof evolution.minLevel === "number"
      ? `Lvl ${evolution.minLevel}+`
      : "No level gate";
  const affinityLine =
    typeof evolution.minAffinityPerRune === "number"
      ? `Affinity ${evolution.minAffinityPerRune}+ per rune`
      : "No affinity gate";
  return `${summonLabel} | ${levelLine} | ${affinityLine}`;
};

const formatRuneCombo = (runeCombo: string[]): string => {
  if (runeCombo.length === 0) {
    return "None";
  }
  return runeCombo
    .map((runeId) => runeNameById.get(runeId) ?? runeId)
    .join(" -> ");
};

export const buildRuneForgeSpellDetail = (
  engine: RuneForgeEngine,
  spellId: string | null,
  evolveActions: ActionItem[],
  discoveredEvolutionIds: ReadonlySet<string>
): RuneForgeSpellDetail => {
  if (!spellId) {
    return {
      title: "No spell selected",
      subtitle: "Pick a slotted spell or a pool spell to inspect the forge.",
      detailLines: [
        "Prepared slots stay on the left so loadout management remains compact.",
        "The forge panel shows authored rune combos, affinity growth, levels, and evolution gates.",
      ],
      evolutionRows: [],
    };
  }

  const authored = engine.authoredSpellStatus(spellId);
  if (!authored) {
    return {
      title: spellId,
      subtitle: "Legacy runtime spell",
      detailLines: [
        "This spell still comes from the older runtime skill bridge.",
        "Authored rune affinity, spell levels, and forge evolutions apply only to rune-backed spell content.",
      ],
      evolutionRows: [],
    };
  }

  const categoryLabel =
    categoryLabelById.get(authored.categoryId) ??
    titleCase(authored.categoryId);
  const affinityLine =
    authored.affinities.length > 0
      ? authored.affinities
          .map((row) => `${row.name}: ${row.affinity}`)
          .join(" | ")
      : "No authored rune combo on this spell.";
  const evolutionHint =
    RUNE_AFFINITY_PACK.spellCrafting.evolutionUnlockDisplay ??
    "Use the forge to meet level and affinity gates.";
  const actionByEvolutionId = new Map<string, ActionItem>(
    evolveActions
      .map((action) => {
        const evolutionId = String(
          action.action.kind === "player"
            ? (action.action.playerAction.payload.evolutionId ?? "")
            : ""
        );
        return evolutionId ? [evolutionId, action] : null;
      })
      .filter((entry): entry is [string, ActionItem] => entry !== null)
  );
  const visibleEvolutions = authored.evolutions.filter((evolution) => {
    return discoveredEvolutionIds.has(evolution.evolutionId);
  });

  return {
    title: authored.name,
    subtitle: `${categoryLabel} | ${titleCase(authored.rarityId)}`,
    detailLines: [
      `Runes: ${formatRuneCombo(authored.runeCombo)}`,
      `Level ${authored.level} | Uses ${authored.useCount} | Mana ${authored.manaCost}`,
      `Forge power bonus: +${authored.affinityBonus}`,
      affinityLine,
      visibleEvolutions.length === 0
        ? "Hidden evolutions remain undiscovered."
        : evolutionHint,
    ],
    evolutionRows: visibleEvolutions.map((evolution) => ({
      id: evolution.evolutionId,
      label: evolution.resultName,
      detail: evolutionDetailLine(evolution),
      available: evolution.available,
      blockedReasons: evolution.blockedReasons,
      actionItem: actionByEvolutionId.get(evolution.evolutionId) ?? null,
    })),
  };
};

export const buildRuneRecipePreview = (
  engine: RuneForgeEngine,
  runeCombo: string[],
  selectedSpellId: string | null,
  discoveredSpellIds: ReadonlySet<string>,
  discoveredEvolutionIds: ReadonlySet<string>
): RuneForgeRecipePreview => {
  const normalizedCombo = runeCombo.filter((runeId) =>
    runeNameById.has(runeId)
  );
  if (normalizedCombo.length === 0) {
    return {
      title: "Rune board empty",
      subtitle: "Arrange runes to craft or evolve a spell.",
      detailLines: [
        "Exact rune order matters.",
        "Crafting spends mana crystals on new recipes.",
        "Evolution uses the selected spell plus the matching rune pattern.",
      ],
      recipeSpellId: null,
      recipeKnown: false,
      evolutionMatch: null,
    };
  }

  const authoredSpell =
    authoredSpellByComboKey.get(normalizedCombo.join("|")) ?? null;
  const authoredStatus = authoredSpell
    ? engine.authoredSpellStatus(authoredSpell.spellId)
    : null;
  const selectedSpell = selectedSpellId
    ? engine.authoredSpellStatus(selectedSpellId)
    : null;
  const matchingEvolution =
    selectedSpell?.evolutions.find((evolution) => {
      return evolution.runeCombo.join("|") === normalizedCombo.join("|");
    }) ?? null;
  const affinityLine = authoredStatus?.affinities.length
    ? authoredStatus.affinities
        .map((row) => `${row.name}: ${row.affinity}`)
        .join(" | ")
    : normalizedCombo
        .map((runeId) => runeNameById.get(runeId) ?? runeId)
        .join(" | ");
  const exactRecipeLine = authoredSpell
    ? discoveredSpellIds.has(authoredSpell.spellId)
      ? `Known recipe: ${authoredStatus?.name ?? authoredSpell.name}`
      : `Hidden recipe found: ${authoredSpell.name}`
    : "No exact authored spell recipe matches this rune order yet.";
  const evolutionLine = matchingEvolution
    ? discoveredEvolutionIds.has(matchingEvolution.evolutionId)
      ? `Known evolution: ${matchingEvolution.resultName}`
      : `Hidden evolution resonance: ${matchingEvolution.resultName}`
    : selectedSpell
      ? `No evolution path from ${selectedSpell.name} matches this exact rune order.`
      : "Select a spell from the pool to check for evolution paths.";

  return {
    title: authoredSpell?.name ?? "Unstable Pattern",
    subtitle: authoredSpell
      ? `${titleCase(authoredSpell.rarityId)} | ${categoryLabelById.get(authoredSpell.categoryId) ?? titleCase(authoredSpell.categoryId)}`
      : "Experiment",
    detailLines: [
      `Runes: ${formatRuneCombo(normalizedCombo)}`,
      exactRecipeLine,
      authoredSpell
        ? `Forge Cost: ${spellForgeCostForSpellId(authoredSpell.spellId) ?? 0} mana crystals`
        : "Forge Cost: unknown until a stable recipe is found.",
      authoredSpell
        ? `Mana Cost: ${authoredSpell.manaCost}`
        : "Mana Cost: unresolved.",
      evolutionLine,
      `Affinities: ${affinityLine}`,
    ],
    recipeSpellId: authoredSpell?.spellId ?? null,
    recipeKnown: authoredSpell
      ? discoveredSpellIds.has(authoredSpell.spellId)
      : false,
    evolutionMatch: matchingEvolution
      ? {
          evolutionId: matchingEvolution.evolutionId,
          sourceSpellId: matchingEvolution.sourceSpellId,
          resultName: matchingEvolution.resultName,
          available: matchingEvolution.available,
          blockedReasons: matchingEvolution.blockedReasons,
          discovered: discoveredEvolutionIds.has(matchingEvolution.evolutionId),
        }
      : null,
  };
};

export const formatRuneForgeBlockedReasons = (
  blockedReasons: string[]
): string => {
  if (blockedReasons.length === 0) {
    return "Ready";
  }
  return blockedReasons.map(blockedReasonLabel).join(" | ");
};
