import {
  ARCHETYPE_PACK,
  type ContentPackBundle,
  ENTITY_TYPE_PACK,
  ITEM_PACK,
  MOUNT_PACK,
  SKILL_PACK,
  THE_MOUNT,
} from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import {
  pokespritePublicUrl,
  POKESPRITE_SLOT_PLACEHOLDERS,
  type InventoryPlaceholderSlotId,
} from "./pokesprite-inventory";

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

const defaultArchetypeVisuals = new Map(
  ARCHETYPE_PACK.archetypes.map(
    (entry) => [entry.archetypeId, entry.visual ?? null] as const
  )
);
const defaultEntityTypeVisuals = new Map(
  ENTITY_TYPE_PACK.entityTypes.map((entry) => [
    entry.entityTypeId,
    entry.visualRef
      ? {
          spriteCollection: entry.visualRef.spriteCollection ?? "entity-type",
          frontSpriteUrl: entry.visualRef.frontSpriteUrl,
          backSpriteUrl: entry.visualRef.backSpriteUrl,
          iconSpriteUrl: entry.visualRef.iconSpriteUrl,
        }
      : null,
  ])
);
const defaultItemVisuals = new Map(
  ITEM_PACK.items.map((entry) => [entry.itemId, entry.visual ?? null] as const)
);
const mountVisuals = new Map<string, VisualRecord | null>(
  MOUNT_PACK.mounts.map((entry) => [
    entry.mountId,
    entry.visualRef
      ? {
          spriteCollection: entry.visualRef.spriteCollection ?? "mounts",
          iconSpriteUrl: entry.visualRef.iconSpriteUrl,
        }
      : null,
  ])
);
const defaultSpellVisuals = new Map(
  SKILL_PACK.skills.map(
    (entry) => [entry.skillId, entry.visual ?? null] as const
  )
);
let archetypeVisuals = new Map(defaultArchetypeVisuals);
let entityTypeVisuals = new Map(defaultEntityTypeVisuals);
let itemVisuals = new Map(defaultItemVisuals);
let spellVisuals = new Map(defaultSpellVisuals);

const toSpriteName = (
  group: string,
  id: string,
  slot: "front" | "back" | "icon"
): string => {
  const safeId = id
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${group}-${safeId || "unknown"}-${slot}`;
};

const loadVisualSprite = (
  k: KAPLAYCtx,
  group: string,
  id: string,
  slot: "front" | "back" | "icon",
  url: string | undefined
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

const loadNamedSprite = (
  k: KAPLAYCtx,
  spriteName: string,
  url: string | undefined
): void => {
  if (!url || loadedSpriteNames.has(spriteName)) {
    return;
  }
  loadedSpriteNames.add(spriteName);
  k.loadSprite(spriteName, url);
};

const archetypeForEntity = (
  entityKind: string,
  archetypeHeading?: string
): string => {
  if (archetypeHeading && archetypeVisuals.has(archetypeHeading)) {
    return archetypeHeading;
  }
  return (
    DEFAULT_ARCHETYPE_BY_ENTITY_KIND[
      entityKind as keyof typeof DEFAULT_ARCHETYPE_BY_ENTITY_KIND
    ] ?? "wanderer"
  );
};

const visualSpriteName = (
  group: string,
  id: string,
  visual: VisualRecord | null | undefined,
  preferredSlot: "front" | "back" | "icon"
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

export function applyContentBundleVisualOverrides(
  bundle: ContentPackBundle | null
): void {
  archetypeVisuals = new Map(defaultArchetypeVisuals);
  entityTypeVisuals = new Map(defaultEntityTypeVisuals);
  itemVisuals = new Map(defaultItemVisuals);
  spellVisuals = new Map(defaultSpellVisuals);

  if (!bundle) {
    return;
  }

  for (const entry of bundle.packs?.archetypePack?.archetypes ?? []) {
    archetypeVisuals.set(entry.archetypeId, entry.visual ?? null);
  }
  for (const entry of bundle.packs?.itemPack?.items ?? []) {
    itemVisuals.set(entry.itemId, entry.visual ?? null);
  }
  for (const entry of bundle.packs?.skillPack?.skills ?? []) {
    spellVisuals.set(entry.skillId, entry.visual ?? null);
  }
}

export function preloadContentSprites(k: KAPLAYCtx): void {
  for (const [archetypeId, visual] of archetypeVisuals) {
    loadVisualSprite(
      k,
      "archetype",
      archetypeId,
      "front",
      visual?.frontSpriteUrl
    );
    loadVisualSprite(
      k,
      "archetype",
      archetypeId,
      "back",
      visual?.backSpriteUrl
    );
    loadVisualSprite(
      k,
      "archetype",
      archetypeId,
      "icon",
      visual?.iconSpriteUrl
    );
  }
  for (const [entityTypeId, visual] of entityTypeVisuals) {
    loadVisualSprite(
      k,
      "entity-type",
      entityTypeId,
      "front",
      visual?.frontSpriteUrl
    );
    loadVisualSprite(
      k,
      "entity-type",
      entityTypeId,
      "back",
      visual?.backSpriteUrl
    );
    loadVisualSprite(
      k,
      "entity-type",
      entityTypeId,
      "icon",
      visual?.iconSpriteUrl
    );
  }
  for (const [itemId, visual] of itemVisuals) {
    loadVisualSprite(k, "item", itemId, "icon", visual?.iconSpriteUrl);
    loadVisualSprite(k, "item", itemId, "front", visual?.frontSpriteUrl);
  }
  for (const [mountId, visual] of mountVisuals) {
    loadVisualSprite(k, "mount", mountId, "icon", visual?.iconSpriteUrl);
  }
  for (const [skillId, visual] of spellVisuals) {
    loadVisualSprite(k, "spell", skillId, "icon", visual?.iconSpriteUrl);
    loadVisualSprite(k, "spell", skillId, "front", visual?.frontSpriteUrl);
  }
  for (const placeholder of Object.values(POKESPRITE_SLOT_PLACEHOLDERS)) {
    loadNamedSprite(
      k,
      placeholder.spriteName,
      pokespritePublicUrl(placeholder.publicPath)
    );
  }
}

export function resolveEntityCombatSprite(
  entityTypeId: string | undefined,
  entityKind: string,
  archetypeHeading: string | undefined,
  isPlayer: boolean
): string | null {
  if (entityTypeId && entityTypeVisuals.has(entityTypeId)) {
    return visualSpriteName(
      "entity-type",
      entityTypeId,
      entityTypeVisuals.get(entityTypeId),
      isPlayer ? "back" : "front"
    );
  }
  const archetypeId = archetypeForEntity(entityKind, archetypeHeading);
  return visualSpriteName(
    "archetype",
    archetypeId,
    archetypeVisuals.get(archetypeId),
    isPlayer ? "back" : "front"
  );
}

export function resolveItemSprite(itemId: string): string | null {
  return visualSpriteName("item", itemId, itemVisuals.get(itemId), "icon");
}

export function resolveSpellSprite(skillId: string): string | null {
  return visualSpriteName("spell", skillId, spellVisuals.get(skillId), "icon");
}

export function resolveMountSprite(): string | null {
  if (!THE_MOUNT) {
    return null;
  }
  return visualSpriteName(
    "mount",
    THE_MOUNT.mountId,
    mountVisuals.get(THE_MOUNT.mountId),
    "icon"
  );
}

export function resolveInventoryPlaceholderSprite(
  slotId: InventoryPlaceholderSlotId
): string {
  return POKESPRITE_SLOT_PLACEHOLDERS[slotId].spriteName;
}

export function resolveInventoryItemSprite(
  itemId: string,
  slotId: Exclude<InventoryPlaceholderSlotId, "all">
): string {
  return resolveItemSprite(itemId) ?? resolveInventoryPlaceholderSprite(slotId);
}
