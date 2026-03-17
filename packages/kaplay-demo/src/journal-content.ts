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
};

const BESTIARY_RUNTIME_NOTES = [
  "Authored catalog entry from the shared content pack.",
  "Exact runtime entity-type binding is still being wired; unlocks here use the demo's current heuristics.",
];

const titleCase = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
};

const seenActorNames = (snapshot: GameSnapshot): Set<string> => {
  const names = new Set<string>();
  for (const entity of Object.values(snapshot.entities)) {
    if (!entity.isPlayer) {
      names.add(entity.name.toLowerCase());
    }
  }
  for (const event of snapshot.eventLog) {
    if (event.actorId !== snapshot.playerId) {
      names.add(event.actorName.toLowerCase());
    }
  }
  return names;
};

const seenKinds = (snapshot: GameSnapshot): Set<string> => {
  return new Set(
    Object.values(snapshot.entities).map((entity) => entity.entityKind)
  );
};

const isBestiaryEntryObserved = (
  entityTypeId: string,
  snapshot: GameSnapshot,
  observedNames: Set<string>,
  observedKinds: Set<string>
): boolean => {
  if (entityTypeId === "human") {
    return observedKinds.has("player") || observedKinds.has("dungeoneer");
  }
  if (entityTypeId === "knight") {
    return observedKinds.has("boss") || observedNames.has("depth 12 warden");
  }
  if (entityTypeId === "summon") {
    return snapshot.activeCompanionId !== null;
  }
  return false;
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
      return {
        id: quest.questId,
        title: quest.title,
        subtitle: quest.isComplete
          ? `Complete • ${progressLine}`
          : `In Progress • ${progressLine}`,
        detailLines: [
          quest.description,
          `Progress: ${progressLine}`,
          quest.isComplete
            ? "This objective is complete for the current run."
            : "Keep pushing the room loop forward to advance this objective.",
        ],
        tone: quest.isComplete ? "good" : "accent",
      };
    });
};

export const buildBestiaryJournalEntries = (
  snapshot: GameSnapshot
): JournalEntry[] => {
  const observedNames = seenActorNames(snapshot);
  const observedKinds = seenKinds(snapshot);
  return ENTITY_TYPE_PACK.entityTypes.map((entry: {
    entityTypeId: string;
    name: string;
  }) => {
    const observed = isBestiaryEntryObserved(
      entry.entityTypeId,
      snapshot,
      observedNames,
      observedKinds
    );
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
