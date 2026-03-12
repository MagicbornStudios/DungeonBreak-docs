import { ARCHETYPE_PACK, ITEM_PACK, SKILL_PACK } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";

interface VisualRecord {
  spriteCollection: string;
  frontSpriteUrl?: string;
  backSpriteUrl?: string;
  iconSpriteUrl?: string;
}

const DEFAULT_ARCHETYPE_BY_ENTITY_KIND = {
  player: "wanderer",
  dungeoneer: "delver",
  boss: "warden",
  hostile: "hunter",
} as const;

const loadedSpriteNames = new Set<string>();

const archetypeVisuals = new Map(
  ARCHETYPE_PACK.archetypes.map((entry) => [entry.archetypeId, entry.visual ?? null] as const),
);
const itemVisuals = new Map(ITEM_PACK.items.map((entry) => [entry.itemId, entry.visual ?? null] as const));
const spellVisuals = new Map(SKILL_PACK.skills.map((entry) => [entry.skillId, entry.visual ?? null] as const));

const toSpriteName = (group: string, id: string, slot: "front" | "back" | "icon"): string => {
  const safeId = id.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `${group}-${safeId || "unknown"}-${slot}`;
};

const loadVisualSprite = (
  k: KAPLAYCtx,
  group: string,
  id: string,
  slot: "front" | "back" | "icon",
  url: string | undefined,
): void => {
  if (!url) {
    return;
  }
  const spriteName = toSpriteName(group, id, slot);
  if (loadedSpriteNames.has(spriteName)) {
    return;
  }
  loadedSpriteNames.add(spriteName);
  k.loadSprite(spriteName, url);
};

const archetypeForEntity = (entityKind: string, archetypeHeading?: string): string => {
  if (archetypeHeading && archetypeVisuals.has(archetypeHeading)) {
    return archetypeHeading;
  }
  return DEFAULT_ARCHETYPE_BY_ENTITY_KIND[entityKind as keyof typeof DEFAULT_ARCHETYPE_BY_ENTITY_KIND] ?? "wanderer";
};

const visualSpriteName = (
  group: string,
  id: string,
  visual: VisualRecord | null | undefined,
  preferredSlot: "front" | "back" | "icon",
): string | null => {
  if (!visual) {
    return null;
  }
  if (preferredSlot === "back" && visual.backSpriteUrl) {
    return toSpriteName(group, id, "back");
  }
  if (preferredSlot === "front" && visual.frontSpriteUrl) {
    return toSpriteName(group, id, "front");
  }
  if (visual.iconSpriteUrl) {
    return toSpriteName(group, id, "icon");
  }
  if (visual.frontSpriteUrl) {
    return toSpriteName(group, id, "front");
  }
  if (visual.backSpriteUrl) {
    return toSpriteName(group, id, "back");
  }
  return null;
};

export function preloadContentSprites(k: KAPLAYCtx): void {
  for (const [archetypeId, visual] of archetypeVisuals) {
    loadVisualSprite(k, "archetype", archetypeId, "front", visual?.frontSpriteUrl);
    loadVisualSprite(k, "archetype", archetypeId, "back", visual?.backSpriteUrl);
    loadVisualSprite(k, "archetype", archetypeId, "icon", visual?.iconSpriteUrl);
  }
  for (const [itemId, visual] of itemVisuals) {
    loadVisualSprite(k, "item", itemId, "icon", visual?.iconSpriteUrl);
    loadVisualSprite(k, "item", itemId, "front", visual?.frontSpriteUrl);
  }
  for (const [skillId, visual] of spellVisuals) {
    loadVisualSprite(k, "spell", skillId, "icon", visual?.iconSpriteUrl);
    loadVisualSprite(k, "spell", skillId, "front", visual?.frontSpriteUrl);
  }
}

export function resolveEntityCombatSprite(entityKind: string, archetypeHeading: string | undefined, isPlayer: boolean): string | null {
  const archetypeId = archetypeForEntity(entityKind, archetypeHeading);
  return visualSpriteName("archetype", archetypeId, archetypeVisuals.get(archetypeId), isPlayer ? "back" : "front");
}

export function resolveItemSprite(itemId: string): string | null {
  return visualSpriteName("item", itemId, itemVisuals.get(itemId), "icon");
}

export function resolveSpellSprite(skillId: string): string | null {
  return visualSpriteName("spell", skillId, spellVisuals.get(skillId), "icon");
}
