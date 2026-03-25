import {
  RARITY_PACK,
  SPELL_CATEGORY_PACK,
  SPELL_EVOLUTION_PACK,
  SPELL_PACK,
} from "../../engine/src/escape-the-dungeon/contracts";
import { spellForgeCostForSpellId } from "./spell-forge-meta";

export type SpellbookTab = "pool" | "codex";

export interface PreparedSpellSlotView {
  slotIndex: number;
  skillId: string | null;
  name: string;
  description: string;
  available: boolean;
  blockedReasons: string[];
}

export interface RuntimeSpellPoolView {
  skillId: string;
  name: string;
  description: string;
  branch: string;
  isEquipped: boolean;
  slotIndex: number | null;
  available: boolean;
  blockedReasons: string[];
}

export interface SpellbookEntry {
  id: string;
  title: string;
  subtitle: string;
  detailLines: string[];
  tone: "neutral" | "good" | "warn" | "danger" | "accent";
  spellId: string | null;
  categoryId: string;
  rarityId: string | null;
  available: boolean;
  isEquipped: boolean;
  slotIndex: number | null;
  forgeCostManaCrystals: number | null;
  knownInPool: boolean;
}

export interface SpellbookCategoryOption {
  categoryId: string;
  label: string;
}

export interface SpellbookDiscoveryState {
  discoveredSpellIds: ReadonlySet<string>;
  discoveredEvolutionIds: ReadonlySet<string>;
}

const rarityLabelById = new Map(
  RARITY_PACK.rarities.map((rarity) => [rarity.rarityId, rarity.label])
);
const categoryById = new Map(
  SPELL_CATEGORY_PACK.categories.map((category) => [
    category.categoryId,
    category,
  ])
);
const authoredSpellById = new Map(
  SPELL_PACK.spells.map((spell) => [spell.spellId, spell])
);
const evolutionRowsBySpellId = new Map<
  string,
  (typeof SPELL_EVOLUTION_PACK.evolutionTable)[number][]
>();
for (const evolution of SPELL_EVOLUTION_PACK.evolutionTable) {
  if (!evolution.resultSpellId) {
    continue;
  }
  const existing = evolutionRowsBySpellId.get(evolution.resultSpellId) ?? [];
  existing.push(evolution);
  evolutionRowsBySpellId.set(evolution.resultSpellId, existing);
}

export const SPELLBOOK_CATEGORY_OPTIONS: SpellbookCategoryOption[] = [
  { categoryId: "all", label: "All" },
  ...[...SPELL_CATEGORY_PACK.categories]
    .sort((left, right) => left.order - right.order)
    .map((category) => ({
      categoryId: category.categoryId,
      label: category.name,
    })),
];

const titleCase = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
};

const toneForRarity = (
  rarityId: string | undefined
): "neutral" | "good" | "warn" | "danger" | "accent" => {
  if (rarityId === "legendary") {
    return "danger";
  }
  if (rarityId === "rare") {
    return "accent";
  }
  if (rarityId === "uncommon") {
    return "warn";
  }
  return "neutral";
};

const formatBlockedReasons = (blockedReasons: string[]): string => {
  if (blockedReasons.length === 0) {
    return "Ready in current context.";
  }
  return `Blocked: ${blockedReasons.join(", ")}`;
};

const evolutionHintLinesForSpell = (
  spellId: string,
  discovery: SpellbookDiscoveryState
): string[] => {
  const evolutions = (evolutionRowsBySpellId.get(spellId) ?? []).filter(
    (evolution) => discovery.discoveredEvolutionIds.has(evolution.evolutionId)
  );
  if (evolutions.length === 0) {
    return ["Evolution path: hidden until discovered at the rune forge."];
  }
  return evolutions.slice(0, 2).map((evolution) => {
    const summonLabel = evolution.isSummon ? "summon" : "spell";
    const affinityClause =
      typeof evolution.minAffinityPerRune === "number"
        ? ` | affinity ${evolution.minAffinityPerRune}+ per rune`
        : "";
    const levelClause =
      typeof evolution.minLevel === "number"
        ? ` | level ${evolution.minLevel}+`
        : "";
    return `Evolution: ${evolution.runeCombo.join(" -> ")} => ${evolution.resultName} (${summonLabel})${levelClause}${affinityClause}`;
  });
};

export const buildSpellbookPoolEntries = (
  pool: RuntimeSpellPoolView[],
  discovery: SpellbookDiscoveryState
): SpellbookEntry[] => {
  return pool.map((spell) => {
    const authored = authoredSpellById.get(spell.skillId);
    const categoryLabel = authored
      ? (categoryById.get(authored.categoryId)?.name ??
        titleCase(authored.categoryId))
      : titleCase(spell.branch);
    const rarityLabel = authored
      ? (rarityLabelById.get(authored.rarityId) ?? titleCase(authored.rarityId))
      : "Runtime Skill";
    const equippedLine =
      spell.slotIndex === null
        ? "Not currently prepared."
        : `Prepared in slot ${spell.slotIndex + 1}.`;

    return {
      id: `pool-${spell.skillId}`,
      title: spell.name,
      subtitle: `${categoryLabel} | ${rarityLabel}`,
      detailLines: [
        spell.description,
        equippedLine,
        formatBlockedReasons(spell.blockedReasons),
        ...(authored
          ? evolutionHintLinesForSpell(authored.spellId, discovery)
          : []),
      ],
      tone: spell.isEquipped ? "good" : toneForRarity(authored?.rarityId),
      spellId: spell.skillId,
      categoryId: authored?.categoryId ?? spell.branch,
      rarityId: authored?.rarityId ?? null,
      available: spell.available,
      isEquipped: spell.isEquipped,
      slotIndex: spell.slotIndex,
      forgeCostManaCrystals: spellForgeCostForSpellId(spell.skillId),
      knownInPool: true,
    };
  });
};

export const buildSpellbookCodexEntries = (
  categoryId: string,
  pool: RuntimeSpellPoolView[],
  discovery: SpellbookDiscoveryState
): SpellbookEntry[] => {
  const poolById = new Map(
    pool.map((spell) => [spell.skillId, spell] as const)
  );
  return SPELL_PACK.spells
    .filter((spell) => {
      return (
        discovery.discoveredSpellIds.has(spell.spellId) ||
        poolById.has(spell.spellId)
      );
    })
    .filter((spell) => categoryId === "all" || spell.categoryId === categoryId)
    .sort((left, right) => {
      const leftCategoryOrder =
        categoryById.get(left.categoryId)?.order ?? Number.MAX_SAFE_INTEGER;
      const rightCategoryOrder =
        categoryById.get(right.categoryId)?.order ?? Number.MAX_SAFE_INTEGER;
      if (leftCategoryOrder !== rightCategoryOrder) {
        return leftCategoryOrder - rightCategoryOrder;
      }
      return left.name.localeCompare(right.name);
    })
    .map((spell) => {
      const poolEntry = poolById.get(spell.spellId) ?? null;
      const categoryLabel =
        categoryById.get(spell.categoryId)?.name ?? titleCase(spell.categoryId);
      const rarityLabel =
        rarityLabelById.get(spell.rarityId) ?? titleCase(spell.rarityId);
      const forgeCost = spellForgeCostForSpellId(spell.spellId);
      const runeLine =
        spell.runeCombo && spell.runeCombo.length > 0
          ? `Runes: ${spell.runeCombo.join(", ")}`
          : "Runes: not authored on this entry yet.";
      const powerLine =
        typeof spell.power === "number"
          ? `Power: ${spell.power}`
          : "Power: utility or non-damage effect.";
      let ownershipLine = "Unknown: craft or evolve it at the rune forge.";
      if (poolEntry) {
        ownershipLine =
          poolEntry.slotIndex === null
            ? "Known: already in your pool."
            : `Known: prepared in slot ${poolEntry.slotIndex + 1}.`;
      }

      return {
        id: `codex-${spell.spellId}`,
        title: spell.name,
        subtitle: `${categoryLabel} | ${rarityLabel}`,
        detailLines: [
          spell.description ?? "No authored description yet.",
          ownershipLine,
          forgeCost === null
            ? "Forge Cost: n/a"
            : `Forge Cost: ${forgeCost} mana crystals`,
          `Mana Cost: ${spell.manaCost}`,
          powerLine,
          runeLine,
          ...evolutionHintLinesForSpell(spell.spellId, discovery),
        ],
        tone: toneForRarity(spell.rarityId),
        spellId: spell.spellId,
        categoryId: spell.categoryId,
        rarityId: spell.rarityId,
        available: false,
        isEquipped: false,
        slotIndex: null,
        forgeCostManaCrystals: forgeCost,
        knownInPool: poolEntry !== null,
      };
    });
};

export const buildSpellbookEntries = (
  tab: SpellbookTab,
  _slots: PreparedSpellSlotView[],
  pool: RuntimeSpellPoolView[],
  discovery: SpellbookDiscoveryState,
  categoryId = "all"
): SpellbookEntry[] => {
  if (tab === "pool") {
    return buildSpellbookPoolEntries(pool, discovery);
  }
  return buildSpellbookCodexEntries(categoryId, pool, discovery);
};
