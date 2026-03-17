import {
  ARCHETYPE_PACK,
  CONTENT_SCHEMA_DOCUMENT,
  type GameSnapshot,
  RUNE_PACK,
} from "@dungeonbreak/engine";

export interface StatsEntry {
  id: string;
  title: string;
  subtitle: string;
  detailLines: string[];
  tone: "neutral" | "good" | "warn" | "danger" | "accent";
}

type StatusRecord = Record<string, unknown>;

const SIGNAL_FEATURE_IDS = [
  "Fame",
  "Effort",
  "Awareness",
  "Guile",
  "Momentum",
] as const;

const featureLabelById = new Map(
  CONTENT_SCHEMA_DOCUMENT.featureSchema.map((feature) => {
    return [feature.featureId, feature.label];
  })
);

const runeNameById = new Map(
  RUNE_PACK.runes.map((rune) => {
    return [rune.runeId, rune.name];
  })
);

const archetypeById = new Map(
  ARCHETYPE_PACK.archetypes.map((archetype) => {
    return [archetype.archetypeId, archetype];
  })
);

const asNumberRecord = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, amount]) => {
      return [key, Number(amount ?? 0)];
    })
  );
};

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const readNumber = (value: unknown, fallback: number): number => {
  const resolved = Number(value);
  return Number.isFinite(resolved) ? resolved : fallback;
};

const formatMetric = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  if (Math.abs(value) >= 10 || Number.isInteger(value)) {
    return String(Math.round(value));
  }
  return value.toFixed(2);
};

const topLabeledLines = (
  values: Record<string, number>,
  count: number,
  minimumMagnitude = 0.01
): string[] => {
  return Object.entries(values)
    .filter(([, value]) => Math.abs(value) >= minimumMagnitude)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .slice(0, count)
    .map(([key, value]) => {
      const label = featureLabelById.get(key) ?? key;
      return `${label}: ${formatMetric(value)}`;
    });
};

const signalLines = (values: Record<string, number>): string[] => {
  return SIGNAL_FEATURE_IDS.map((featureId) => {
    return `${featureLabelById.get(featureId) ?? featureId}: ${formatMetric(
      Number(values[featureId] ?? 0)
    )}`;
  });
};

const runeAffinityLines = (values: Record<string, number>): string[] => {
  return Object.entries(values)
    .filter(([, value]) => value > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([runeId, value]) => {
      const label = runeNameById.get(runeId) ?? runeId;
      return `${label}: ${formatMetric(value)}`;
    });
};

const preparedSpellNames = (snapshot: GameSnapshot): string[] => {
  const player = snapshot.entities[snapshot.playerId];
  if (!player) {
    return [];
  }

  return player.equippedSkillSlots
    .map((skillId) => {
      if (!skillId) {
        return null;
      }
      return player.skills[skillId]?.name ?? skillId;
    })
    .filter((name): name is string => Boolean(name));
};

export const buildStatsEntries = (
  snapshot: GameSnapshot,
  status: StatusRecord
): StatsEntry[] => {
  const player = snapshot.entities[snapshot.playerId];
  if (!player) {
    return [];
  }

  const level = readNumber(status.level, player.baseLevel);
  const fame = readNumber(status.fame, player.features.Fame ?? 0);
  const reputation = readNumber(status.reputation, player.reputation ?? 0);
  const mana = readNumber(status.mana ?? status.energy, player.energy);
  const totalQuests = Object.keys(snapshot.quests).length;
  const completeQuests = Object.values(snapshot.quests).filter((quest) => {
    return quest.isComplete;
  }).length;
  const currentArchetypeId = String(
    status.archetypeHeading ?? player.archetypeHeading ?? "wanderer"
  );
  const currentArchetype = archetypeById.get(currentArchetypeId) ?? null;
  const currentArchetypeLabel =
    readString(status.archetypeLabel) ??
    currentArchetype?.label ??
    currentArchetypeId;
  const currentOccupationName =
    readString(status.occupationName) ?? "Dungeoneer";
  const currentPartyRoleName =
    readString(status.partyRoleName) ?? "Jack of all trades";
  const currentTitleName = readString(status.titleName);
  const currentTitleRarityLabel = readString(status.titleRarityLabel);
  const preparedSpells = preparedSpellNames(snapshot);
  const narrativeLines = topLabeledLines(player.traits, 6);
  const signals = signalLines(player.features);
  const runeLines = runeAffinityLines(asNumberRecord(status.runeAffinities));

  return [
    {
      id: "identity",
      title: "Identity",
      subtitle: `${player.name} | ${currentArchetypeLabel}`,
      detailLines: [
        `Occupation: ${currentOccupationName}`,
        `Party role: ${currentPartyRoleName}`,
        currentTitleName
          ? `Title: ${currentTitleName}${currentTitleRarityLabel ? ` (${currentTitleRarityLabel})` : ""}`
          : "Title: none equipped",
        `Reputation: ${formatMetric(reputation)}`,
      ],
      tone: "accent",
    },
    {
      id: "vitals",
      title: "Vitals",
      subtitle: `HP ${player.health} | Mana ${mana}`,
      detailLines: [
        `Level: ${level}`,
        `XP: ${formatMetric(player.xp)}`,
        `Depth: ${player.depth}`,
        `Room: ${player.roomId}`,
      ],
      tone: player.health <= 30 ? "danger" : "good",
    },
    {
      id: "attributes",
      title: "Attributes",
      subtitle: "Core combat-facing aptitudes",
      detailLines: [
        `Might: ${formatMetric(player.attributes.might)}`,
        `Agility: ${formatMetric(player.attributes.agility)}`,
        `Insight: ${formatMetric(player.attributes.insight)}`,
        `Willpower: ${formatMetric(player.attributes.willpower)}`,
      ],
      tone: "neutral",
    },
    {
      id: "progression",
      title: "Progression",
      subtitle: `${completeQuests}/${totalQuests} quests | Fame ${formatMetric(fame)}`,
      detailLines: [
        `Prepared spells: ${preparedSpells.length}/${player.equippedSkillSlots.length}`,
        preparedSpells.length > 0
          ? `Loadout: ${preparedSpells.join(", ")}`
          : "Loadout: no spells prepared",
        `Deeds: ${player.deeds.length}`,
        `Rumors: ${player.rumors.length}`,
      ],
      tone: completeQuests > 0 ? "good" : "warn",
    },
    {
      id: "narrative-traits",
      title: "Narrative Traits",
      subtitle: "Strongest current directions",
      detailLines:
        narrativeLines.length > 0
          ? narrativeLines
          : ["No meaningful trait drift has been established yet."],
      tone: "neutral",
    },
    {
      id: "signals",
      title: "Status Signals",
      subtitle: "Live run-facing pressures and momentum",
      detailLines: signals,
      tone: "accent",
    },
    {
      id: "runes",
      title: "Rune Affinity",
      subtitle: "Mastery built through spell use",
      detailLines:
        runeLines.length > 0
          ? runeLines
          : ["No rune affinity has been earned in this run yet."],
      tone: "accent",
    },
  ];
};
