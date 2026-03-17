import type { ActionItem } from "@dungeonbreak/engine";
import {
  RUNE_AFFINITY_PACK,
  SPELL_CATEGORY_PACK,
} from "../../engine/src/escape-the-dungeon/contracts";

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

const categoryLabelById = new Map(
  SPELL_CATEGORY_PACK.categories.map((category) => [
    category.categoryId,
    category.name,
  ])
);

const titleCase = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const blockedReasonLabel = (reason: string): string => {
  if (reason === "summon_runtime_pending") {
    return "Summon runtime pending";
  }
  if (reason === "already_in_form") {
    return "Already in current form";
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

export const buildRuneForgeSpellDetail = (
  engine: RuneForgeEngine,
  spellId: string | null,
  evolveActions: ActionItem[]
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

  return {
    title: authored.name,
    subtitle: `${categoryLabel} | ${titleCase(authored.rarityId)}`,
    detailLines: [
      `Runes: ${authored.runeCombo.join(" -> ") || "None"}`,
      `Level ${authored.level} | Uses ${authored.useCount} | Mana ${authored.manaCost}`,
      `Forge power bonus: +${authored.affinityBonus}`,
      affinityLine,
      evolutionHint,
    ],
    evolutionRows: authored.evolutions.map((evolution) => ({
      id: evolution.evolutionId,
      label: evolution.resultName,
      detail: evolutionDetailLine(evolution),
      available: evolution.available,
      blockedReasons: evolution.blockedReasons,
      actionItem: actionByEvolutionId.get(evolution.evolutionId) ?? null,
    })),
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
