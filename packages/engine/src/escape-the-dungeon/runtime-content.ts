import {
  ACTION_CATALOG,
  ACTION_CONTRACTS,
  ACTION_INTENTS,
  ACTION_POLICIES,
  ARCHETYPE_PACK,
  CUTSCENE_PACK,
  DIALOGUE_PACK,
  DUNGEON_LAYOUT_PACK,
  EVENT_PACK,
  ITEM_PACK,
  LEVEL_CONTENT_PACK,
  QUEST_PACK,
  ROOM_TEMPLATES,
  SKILL_PACK,
  SPACE_VECTOR_PACK,
} from "./contracts";
import type { SpaceVectorPackOverrides } from "./spaces/model";

export type RuntimeContentPacks = {
  actionCatalog: typeof ACTION_CATALOG;
  actionContracts: typeof ACTION_CONTRACTS;
  actionIntents: typeof ACTION_INTENTS;
  actionPolicies: typeof ACTION_POLICIES;
  roomTemplates: typeof ROOM_TEMPLATES;
  itemPack: typeof ITEM_PACK;
  skillPack: typeof SKILL_PACK;
  archetypePack: typeof ARCHETYPE_PACK;
  dialoguePack: typeof DIALOGUE_PACK;
  cutscenePack: typeof CUTSCENE_PACK;
  questPack: typeof QUEST_PACK;
  eventPack: typeof EVENT_PACK;
  levelContent: typeof LEVEL_CONTENT_PACK;
  dungeonLayouts: typeof DUNGEON_LAYOUT_PACK;
  spaceVectors: typeof SPACE_VECTOR_PACK;
};

export type RuntimeContentPackOverrides = Partial<
  Omit<RuntimeContentPacks, "spaceVectors">
> & {
  spaceVectors?: typeof SPACE_VECTOR_PACK | SpaceVectorPackOverrides;
};

type RuntimeContentSource =
  | RuntimeContentPackOverrides
  | {
      packs?: RuntimeContentPackOverrides | null;
    }
  | null
  | undefined;

const DEFAULT_RUNTIME_CONTENT_PACKS: RuntimeContentPacks = {
  actionCatalog: ACTION_CATALOG,
  actionContracts: ACTION_CONTRACTS,
  actionIntents: ACTION_INTENTS,
  actionPolicies: ACTION_POLICIES,
  roomTemplates: ROOM_TEMPLATES,
  itemPack: ITEM_PACK,
  skillPack: SKILL_PACK,
  archetypePack: ARCHETYPE_PACK,
  dialoguePack: DIALOGUE_PACK,
  cutscenePack: CUTSCENE_PACK,
  questPack: QUEST_PACK,
  eventPack: EVENT_PACK,
  levelContent: LEVEL_CONTENT_PACK,
  dungeonLayouts: DUNGEON_LAYOUT_PACK,
  spaceVectors: SPACE_VECTOR_PACK,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function resolveRuntimeContentPacks(
  source?: RuntimeContentSource
): RuntimeContentPacks {
  const direct = asRecord(source);
  const nestedPacks = asRecord(direct?.packs);
  const overrides = (nestedPacks ?? direct ?? {}) as RuntimeContentPackOverrides;
  return {
    actionCatalog: overrides.actionCatalog ?? DEFAULT_RUNTIME_CONTENT_PACKS.actionCatalog,
    actionContracts:
      overrides.actionContracts ?? DEFAULT_RUNTIME_CONTENT_PACKS.actionContracts,
    actionIntents: overrides.actionIntents ?? DEFAULT_RUNTIME_CONTENT_PACKS.actionIntents,
    actionPolicies:
      overrides.actionPolicies ?? DEFAULT_RUNTIME_CONTENT_PACKS.actionPolicies,
    roomTemplates: overrides.roomTemplates ?? DEFAULT_RUNTIME_CONTENT_PACKS.roomTemplates,
    itemPack: overrides.itemPack ?? DEFAULT_RUNTIME_CONTENT_PACKS.itemPack,
    skillPack: overrides.skillPack ?? DEFAULT_RUNTIME_CONTENT_PACKS.skillPack,
    archetypePack:
      overrides.archetypePack ?? DEFAULT_RUNTIME_CONTENT_PACKS.archetypePack,
    dialoguePack: overrides.dialoguePack ?? DEFAULT_RUNTIME_CONTENT_PACKS.dialoguePack,
    cutscenePack: overrides.cutscenePack ?? DEFAULT_RUNTIME_CONTENT_PACKS.cutscenePack,
    questPack: overrides.questPack ?? DEFAULT_RUNTIME_CONTENT_PACKS.questPack,
    eventPack: overrides.eventPack ?? DEFAULT_RUNTIME_CONTENT_PACKS.eventPack,
    levelContent:
      overrides.levelContent ?? DEFAULT_RUNTIME_CONTENT_PACKS.levelContent,
    dungeonLayouts:
      overrides.dungeonLayouts ?? DEFAULT_RUNTIME_CONTENT_PACKS.dungeonLayouts,
    spaceVectors: overrides.spaceVectors
      ? {
          ...DEFAULT_RUNTIME_CONTENT_PACKS.spaceVectors,
          ...overrides.spaceVectors,
        }
      : DEFAULT_RUNTIME_CONTENT_PACKS.spaceVectors,
  };
}

export const RUNTIME_CONTENT_PACKS = DEFAULT_RUNTIME_CONTENT_PACKS;
