import {
  RARITY_PACK,
  SPELL_CATEGORY_PACK,
  SPELL_EVOLUTION_PACK,
  SPELL_PACK,
} from "../../engine/src/escape-the-dungeon/contracts";

export type SpellbookTab = "loadout" | "pool" | "codex";

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
}

export interface SpellbookCategoryOption {
  categoryId: string;
  label: string;
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

const evolutionHintLinesForSpell = (spellId: string): string[] => {
  const evolutions = evolutionRowsBySpellId.get(spellId) ?? [];
  if (evolutions.length === 0) {
    return [
      "Evolution path: no authored evolution row currently targets this spell.",
    ];
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

export const buildSpellbookLoadoutEntries = (
  slots: PreparedSpellSlotView[]
): SpellbookEntry[] => {
  return slots.map((slot) => {
    if (!slot.skillId) {
      return {
        id: `loadout-slot-${slot.slotIndex}`,
        title: `Slot ${slot.slotIndex + 1}`,
        subtitle: "Empty",
        detailLines: [
          slot.description,
          "Prepare this slot at a rune forge interaction.",
        ],
        tone: "warn",
        spellId: null,
        categoryId: "empty",
        rarityId: null,
        available: false,
        isEquipped: false,
        slotIndex: slot.slotIndex,
      };
    }

    const authored = authoredSpellById.get(slot.skillId);
    const rarityLabel = authored
      ? (rarityLabelById.get(authored.rarityId) ?? titleCase(authored.rarityId))
      : "Runtime Skill";
    const categoryLabel = authored
      ? (categoryById.get(authored.categoryId)?.name ??
        titleCase(authored.categoryId))
      : "Prepared";

    return {
      id: `loadout-slot-${slot.slotIndex}-${slot.skillId}`,
      title: `Slot ${slot.slotIndex + 1}: ${slot.name}`,
      subtitle: `${categoryLabel} | ${rarityLabel}`,
      detailLines: [
        slot.description,
        formatBlockedReasons(slot.blockedReasons),
        authored
          ? `Mana Cost: ${authored.manaCost}`
          : "Backed by the current runtime skill system.",
        ...(authored ? evolutionHintLinesForSpell(authored.spellId) : []),
      ],
      tone: slot.available ? toneForRarity(authored?.rarityId) : "warn",
      spellId: slot.skillId,
      categoryId: authored?.categoryId ?? "prepared",
      rarityId: authored?.rarityId ?? null,
      available: slot.available,
      isEquipped: true,
      slotIndex: slot.slotIndex,
    };
  });
};

export const buildSpellbookPoolEntries = (
  pool: RuntimeSpellPoolView[]
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
        ...(authored ? evolutionHintLinesForSpell(authored.spellId) : []),
      ],
      tone: spell.isEquipped ? "good" : toneForRarity(authored?.rarityId),
      spellId: spell.skillId,
      categoryId: authored?.categoryId ?? spell.branch,
      rarityId: authored?.rarityId ?? null,
      available: spell.available,
      isEquipped: spell.isEquipped,
      slotIndex: spell.slotIndex,
    };
  });
};

export const buildSpellbookCodexEntries = (
  categoryId: string
): SpellbookEntry[] => {
  return SPELL_PACK.spells
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
      const categoryLabel =
        categoryById.get(spell.categoryId)?.name ?? titleCase(spell.categoryId);
      const rarityLabel =
        rarityLabelById.get(spell.rarityId) ?? titleCase(spell.rarityId);
      const runeLine =
        spell.runeCombo && spell.runeCombo.length > 0
          ? `Runes: ${spell.runeCombo.join(", ")}`
          : "Runes: not authored on this entry yet.";
      const powerLine =
        typeof spell.power === "number"
          ? `Power: ${spell.power}`
          : "Power: utility or non-damage effect.";

      return {
        id: `codex-${spell.spellId}`,
        title: spell.name,
        subtitle: `${categoryLabel} | ${rarityLabel}`,
        detailLines: [
          spell.description ?? "No authored description yet.",
          `Mana Cost: ${spell.manaCost}`,
          powerLine,
          runeLine,
          ...evolutionHintLinesForSpell(spell.spellId),
        ],
        tone: toneForRarity(spell.rarityId),
        spellId: spell.spellId,
        categoryId: spell.categoryId,
        rarityId: spell.rarityId,
        available: false,
        isEquipped: false,
        slotIndex: null,
      };
    });
};

export const buildSpellbookEntries = (
  tab: SpellbookTab,
  slots: PreparedSpellSlotView[],
  pool: RuntimeSpellPoolView[],
  categoryId = "all"
): SpellbookEntry[] => {
  if (tab === "loadout") {
    return buildSpellbookLoadoutEntries(slots);
  }
  if (tab === "pool") {
    return buildSpellbookPoolEntries(pool);
  }
  return buildSpellbookCodexEntries(categoryId);
};
