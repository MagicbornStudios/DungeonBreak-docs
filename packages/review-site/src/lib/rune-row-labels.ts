import runeLookup from "../../../engine/src/escape-the-dungeon/contracts/data/lookup_runes.json";

type RuneRow = (typeof runeLookup.runes)[number];

const RUNE_BY_ID = new Map<string, RuneRow>(
  runeLookup.runes.map((row) => [row.runeId, row])
);

function optionalIcon(row: unknown): string | undefined {
  if (!row || typeof row !== "object") {
    return undefined;
  }
  const url = (row as { iconSpriteUrl?: unknown }).iconSpriteUrl;
  return typeof url === "string" ? url : undefined;
}

/** Labels for entity.runeStats keys (runeId → display name + optional icon). */
export function runeAffinityRowDisplay(runeId: string): {
  label: string;
  iconSpriteUrl?: string;
} {
  const row = RUNE_BY_ID.get(runeId);
  return {
    label: row?.name ?? runeId,
    iconSpriteUrl: optionalIcon(row),
  };
}
