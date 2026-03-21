import type { DialogueProgressState, EntityState, NumberMap, QuestState } from "../core/types";

type AuthoredSpellProgressView = {
  level: number;
  useCount: number;
  affinityBonus: number;
  runeCombo: string[];
  evolutions: Array<{
    evolutionId: string;
    sourceSpellId: string;
    resultSpellId: string | null;
    available: boolean;
    blockedReasons: string[];
  }>;
};

export const buildInventoryStatus = (
  player: EntityState,
  equippedSlotForItem: (itemId: string) => string | null,
) => {
  return player.inventory.map((item) => ({
    itemId: item.itemId,
    name: item.name,
    rarity: item.rarity,
    tags: [...item.tags],
    equipped: equippedSlotForItem(item.itemId) !== null,
    equippedSlot: equippedSlotForItem(item.itemId),
  }));
};

export const buildEquippedSpellStatus = (
  slots: Array<{ slotIndex: number; skillId: string | null; name: string }>,
) => {
  return slots.map((slot) => ({
    slotIndex: slot.slotIndex,
    skillId: slot.skillId,
    name: slot.name,
  }));
};

export const buildSpellPoolStatus = (
  spells: Array<{
    skillId: string;
    name: string;
    branch: string;
    isEquipped: boolean;
    slotIndex: number | null;
  }>,
) => {
  return spells.map((spell) => ({
    skillId: spell.skillId,
    name: spell.name,
    branch: spell.branch,
    isEquipped: spell.isEquipped,
    slotIndex: spell.slotIndex,
  }));
};

export const buildAuthoredSpellProgressStatus = (
  skillIds: string[],
  authoredSpellStatus: (skillId: string) => AuthoredSpellProgressView | null,
) => {
  return Object.fromEntries(
    skillIds.map((skillId) => {
      const runtime = authoredSpellStatus(skillId);
      return [
        skillId,
        runtime
          ? {
              level: runtime.level,
              useCount: runtime.useCount,
              affinityBonus: runtime.affinityBonus,
              runeCombo: runtime.runeCombo,
              evolutions: runtime.evolutions.map((evolution) => ({
                evolutionId: evolution.evolutionId,
                sourceSpellId: evolution.sourceSpellId,
                resultSpellId: evolution.resultSpellId,
                available: evolution.available,
                blockedReasons: evolution.blockedReasons,
              })),
            }
          : null,
      ];
    }),
  );
};

export const buildQuestStatus = (quests: Record<string, QuestState>) => {
  return Object.fromEntries(
    Object.entries(quests).map(([key, quest]) => [
      key,
      {
        progress: quest.progress,
        required: quest.requiredProgress,
        complete: quest.isComplete,
      },
    ]),
  );
};

export const buildDialogueProgressStatus = (
  dialogueProgress: DialogueProgressState,
) => {
  return {
    sequence: dialogueProgress.sequence,
    lastOptionId: dialogueProgress.lastOptionId,
    lastSceneId: dialogueProgress.lastSceneId,
    visitedOptionCount: dialogueProgress.visitedOptionIds.length,
    visitedSceneCount: dialogueProgress.visitedSceneIds.length,
    recent: dialogueProgress.history.slice(-5),
  };
};

export const buildLookSummary = (input: {
  roomDescription: string;
  exits: string[];
  nearby: string[];
  archetypeHeading: string;
  mountLabel: string;
  roomVector: Array<{ trait: string; value: number }>;
  availableActions: string[];
}): string => {
  const roomVector = input.roomVector
    .map(
      (row) =>
        `${row.trait}${row.value >= 0 ? "+" : ""}${row.value.toFixed(2)}`,
    )
    .join(", ");

  return [
    input.roomDescription,
    `Exits: ${input.exits.join(", ") || "none"}`,
    `Nearby: ${input.nearby.join(", ") || "none"}`,
    `Archetype: ${input.archetypeHeading}`,
    `Mount: ${input.mountLabel}`,
    `Room vector: ${roomVector || "neutral"}`,
    `Available actions: ${input.availableActions.join(", ") || "none"}`,
  ].join("\n");
};

export const scaleFogMetrics = (fogMetrics: NumberMap) => {
  return { ...fogMetrics };
};
