import type { GameSnapshot } from "@dungeonbreak/engine";
import {
  ENTITY_TYPE_PACK,
  GUIDE_PACK,
} from "../../engine/src/escape-the-dungeon/contracts";

export type JournalTab = "quests" | "bestiary" | "guides";

export type JournalEntry = {
  id: string;
  title: string;
  subtitle: string;
  detailLines: string[];
  tone: "neutral" | "good" | "warn" | "danger" | "accent";
  /** Quest journal: content rarity id for tint / label. */
  rarityId?: string | null;
  /** Quest journal: optional icon URL from content. */
  iconSpriteUrl?: string | null;
};

const QUEST_RARITY_RGB: Record<string, [number, number, number]> = {
  common: [190, 198, 210],
  uncommon: [130, 210, 160],
  rare: [130, 170, 255],
  legendary: [255, 200, 120],
};

export function questJournalRarityTint(
  rarityId: string | null | undefined
): [number, number, number] | null {
  if (!rarityId) {
    return null;
  }
  return QUEST_RARITY_RGB[rarityId] ?? [160, 160, 175];
}

export function questJournalRarityLabel(
  rarityId: string | null | undefined
): string | null {
  if (!rarityId) {
    return null;
  }
  return rarityId.charAt(0).toUpperCase() + rarityId.slice(1);
}

type RuntimeIdentityEntity = GameSnapshot["entities"][string] & {
  entityTypeId?: string;
};

const BESTIARY_RUNTIME_NOTES = [
  "Authored catalog entry from the shared content pack.",
  "Runtime sightings are now driven by live entity type ids from the shared engine snapshot.",
];

const titleCase = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
};

const seenEntityTypes = (snapshot: GameSnapshot): Set<string> => {
  const entityTypeIds = new Set<string>();
  for (const entity of Object.values(snapshot.entities) as RuntimeIdentityEntity[]) {
    if (typeof entity.entityTypeId === "string" && entity.entityTypeId.length > 0) {
      entityTypeIds.add(entity.entityTypeId);
    }
  }
  return entityTypeIds;
};

const isBestiaryEntryObserved = (
  entityTypeId: string,
  observedEntityTypes: Set<string>
): boolean => {
  return observedEntityTypes.has(entityTypeId);
};

export const buildQuestJournalEntries = (
  snapshot: GameSnapshot
): JournalEntry[] => {
  return Object.values(snapshot.quests)
    .sort((left, right) => {
      if (left.isComplete !== right.isComplete) {
        return left.isComplete ? 1 : -1;
      }
      return left.title.localeCompare(right.title);
    })
    .map((quest) => {
      const progressLine = `${quest.progress}/${quest.requiredProgress}`;
      const rarity = questJournalRarityLabel(quest.rarityId);
      const status = quest.isComplete
        ? `Complete • ${progressLine}`
        : `In Progress • ${progressLine}`;
      const subtitle = rarity ? `${rarity} • ${status}` : status;
      return {
        id: quest.questId,
        title: quest.title,
        subtitle,
        detailLines: [
          quest.description,
          `Progress: ${progressLine}`,
          ...(rarity ? [`Rarity: ${rarity}`] : []),
          quest.isComplete
            ? "This objective is complete for the current run."
            : "Keep pushing the room loop forward to advance this objective.",
        ],
        tone: quest.isComplete ? "good" : "accent",
        rarityId: quest.rarityId ?? null,
        iconSpriteUrl: quest.iconSpriteUrl ?? null,
      };
    });
};

export const buildBestiaryJournalEntries = (
  snapshot: GameSnapshot
): JournalEntry[] => {
  const observedEntityTypes = seenEntityTypes(snapshot);
  return ENTITY_TYPE_PACK.entityTypes.map((entry: {
    entityTypeId: string;
    name: string;
  }) => {
    const observed = isBestiaryEntryObserved(entry.entityTypeId, observedEntityTypes);
    return {
      id: entry.entityTypeId,
      title: entry.name,
      subtitle: observed ? "Observed In This Run" : "Catalogued Entry",
      detailLines: [
        `Entity Type: ${titleCase(entry.entityTypeId)}`,
        observed
          ? "Field note: this run has positively identified this type."
          : "Field note: not positively identified in the current run yet.",
        ...BESTIARY_RUNTIME_NOTES,
      ],
      tone: observed ? "warn" : "neutral",
    };
  });
};

export const buildGuideJournalEntries = (): JournalEntry[] => {
  return GUIDE_PACK.guides.map((guide: { guideId: string; title: string; body: string[] }) => ({
    id: guide.guideId,
    title: guide.title,
    subtitle: "System Guide",
    detailLines: guide.body,
    tone: "neutral",
  }));
};

export const buildJournalEntries = (
  tab: JournalTab,
  snapshot: GameSnapshot
): JournalEntry[] => {
  if (tab === "quests") {
    return buildQuestJournalEntries(snapshot);
  }
  if (tab === "bestiary") {
    return buildBestiaryJournalEntries(snapshot);
  }
  return buildGuideJournalEntries();
};
