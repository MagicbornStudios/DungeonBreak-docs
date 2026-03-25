import traitLookup from "../../../engine/src/escape-the-dungeon/contracts/data/lookup_narrative_traits.json";

type TraitRow = (typeof traitLookup.traits)[number];

const ENTITY_TO_TRAIT = new Map<string, TraitRow>(
  traitLookup.traits.map((row) => [row.entityKey, row])
);

export function narrativeTraitDisplay(entityKey: string): {
  label: string;
  iconSpriteUrl?: string;
} {
  const row = ENTITY_TO_TRAIT.get(entityKey);
  if (!row) {
    return { label: entityKey, iconSpriteUrl: undefined };
  }
  const withIcon = row as TraitRow & { iconSpriteUrl?: string };
  const iconSpriteUrl =
    typeof withIcon.iconSpriteUrl === "string"
      ? withIcon.iconSpriteUrl
      : undefined;
  return { label: row.name, iconSpriteUrl };
}

export function labelForNarrativeTraitKey(entityKey: string): string {
  return narrativeTraitDisplay(entityKey).label;
}
