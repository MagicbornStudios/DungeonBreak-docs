import combatLookup from "../../../engine/src/escape-the-dungeon/contracts/data/lookup_combat_stats.json";
import skillLookup from "../../../engine/src/escape-the-dungeon/contracts/data/lookup_skill_stats.json";

type CombatRow = (typeof combatLookup.stats)[number];
type SkillRow = (typeof skillLookup.stats)[number];

const COMBAT_BY_ENTITY = new Map<string, CombatRow>(
  combatLookup.stats.map((row) => [row.entityKey, row])
);

const SKILL_BY_ENTITY = new Map<string, SkillRow>(
  skillLookup.stats.map((row) => [row.entityKey, row])
);

function optionalIcon(row: unknown): string | undefined {
  if (!row || typeof row !== "object") {
    return undefined;
  }
  const url = (row as { iconSpriteUrl?: unknown }).iconSpriteUrl;
  return typeof url === "string" ? url : undefined;
}

export function combatStatDisplay(entityKey: string): {
  label: string;
  iconSpriteUrl?: string;
} {
  const row = COMBAT_BY_ENTITY.get(entityKey);
  return {
    label: row?.name ?? entityKey,
    iconSpriteUrl: optionalIcon(row),
  };
}

export function skillStatDisplay(entityKey: string): {
  label: string;
  iconSpriteUrl?: string;
} {
  const row = SKILL_BY_ENTITY.get(entityKey);
  return {
    label: row?.name ?? entityKey,
    iconSpriteUrl: optionalIcon(row),
  };
}
