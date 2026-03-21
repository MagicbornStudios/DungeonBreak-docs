import { SPELL_PACK } from "../../engine/src/escape-the-dungeon/contracts";

const DEFAULT_FORGE_COST_BY_RARITY: Record<string, number> = {
  common: 500,
  uncommon: 1500,
  rare: 4000,
  legendary: 10000,
};

const authoredSpellById = new Map(
  SPELL_PACK.spells.map((spell) => [spell.spellId, spell] as const)
);

export function spellForgeCostForSpellId(
  spellId: string | null | undefined
): number | null {
  if (!spellId) {
    return null;
  }
  const spell = authoredSpellById.get(spellId);
  if (!spell) {
    return null;
  }
  if (typeof spell.forgeCostManaCrystals === "number") {
    return spell.forgeCostManaCrystals;
  }
  return DEFAULT_FORGE_COST_BY_RARITY[spell.rarityId] ?? null;
}

export function countCurrencyInventoryItems(
  inventory: Array<{ tags?: string[] }>
): number {
  return inventory.filter((item) => item.tags?.includes("currency")).length;
}
