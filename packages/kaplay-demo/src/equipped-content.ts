import {
  ARCHETYPE_PACK,
  ENTITY_TYPE_NAME_BY_ID,
  type EntityState,
  type GameSnapshot,
  OCCUPATION_NAME_BY_ID,
  PARTY_ROLE_NAME_BY_ID,
  RARITY_PACK,
  SPELL_PACK,
  TITLE_PACK,
} from "@dungeonbreak/engine";

export interface EquippedEntry {
  id: string;
  title: string;
  subtitle: string;
  detailLines: string[];
  tone: "neutral" | "good" | "warn" | "danger" | "accent";
}

type StatusRecord = Record<string, unknown>;
type ExtendedEntityState = EntityState & {
  entityTypeId?: string;
  equippedArmorItemId?: string | null;
  equippedAccessoryItemId?: string | null;
};

interface ArchetypeScoreView {
  archetypeId: string;
  label: string;
  score: number;
}

interface UnlockCondition {
  type: string;
  [key: string]: unknown;
}

const rarityLabelById = new Map(
  RARITY_PACK.rarities.map((rarity) => [rarity.rarityId, rarity.label])
);

const spellById = new Map(
  SPELL_PACK.spells.map((spell) => [spell.spellId, spell] as const)
);

const archetypeById = new Map(
  ARCHETYPE_PACK.archetypes.map(
    (archetype) => [archetype.archetypeId, archetype] as const
  )
);

const asArchetypeScores = (value: unknown): ArchetypeScoreView[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }
      const row = entry as Record<string, unknown>;
      return {
        archetypeId: String(row.archetypeId ?? ""),
        label: String(row.label ?? row.archetypeId ?? ""),
        score: Number(row.score ?? 0),
      };
    })
    .filter((entry): entry is ArchetypeScoreView => entry !== null);
};

const formatDecimal = (value: number): string => {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
};

const readString = (value: unknown): string | null => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const formatUnlockCondition = (condition: UnlockCondition): string => {
  switch (condition.type) {
    case "bossDefeated":
      return `Defeat ${String(condition.count ?? 1)} boss`;
    case "castSpell":
      return `Cast ${String(condition.spellId ?? "a spell")} x${String(condition.count ?? 1)}`;
    case "evolveSpell":
      return `Evolve ${String(condition.count ?? 1)} spells`;
    case "fameReached":
      return `Reach ${String(condition.value ?? 0)} Fame`;
    case "fleeCount":
      return `Flee ${String(condition.count ?? 1)} times`;
    case "reachDepth":
      return `Reach depth ${String(condition.depth ?? "?")}`;
    case "restCount":
      return `Rest ${String(condition.count ?? 1)} times`;
    case "roomsDiscovered":
      return `Discover ${String(condition.count ?? 1)} rooms`;
    case "searchCount":
      return `Search ${String(condition.count ?? 1)} times`;
    case "talkToNpc":
      return `Talk to ${String(condition.count ?? 1)} NPCs`;
    case "winCombat":
      return `Win ${String(condition.count ?? 1)} combats`;
    default: {
      const extraBits = Object.entries(condition)
        .filter(([key]) => key !== "type")
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(", ");
      return extraBits.length > 0
        ? `${condition.type}: ${extraBits}`
        : condition.type;
    }
  }
};

export const buildEquippedEntries = (
  snapshot: GameSnapshot,
  status: StatusRecord
): EquippedEntry[] => {
  const player = snapshot.entities[snapshot.playerId] as
    | ExtendedEntityState
    | undefined;
  if (!player) {
    return [];
  }

  const equippedWeapon =
    player.inventory.find(
      (item) => item.itemId === player.equippedWeaponItemId
    ) ?? null;
  const equippedArmor =
    player.inventory.find(
      (item) => item.itemId === player.equippedArmorItemId
    ) ?? null;
  const equippedAccessory =
    player.inventory.find(
      (item) => item.itemId === player.equippedAccessoryItemId
    ) ?? null;
  const equippedCount = player.equippedSkillSlots.filter(Boolean).length;
  const archetypeId = String(
    status.archetypeHeading ?? player.archetypeHeading
  );
  const archetype = archetypeById.get(archetypeId);
  const archetypeLabel =
    readString(status.archetypeLabel) ?? archetype?.label ?? archetypeId;
  const entityTypeId = String(
    status.entityTypeId ?? player.entityTypeId ?? "human"
  );
  const entityTypeName =
    readString(status.entityTypeName) ??
    ENTITY_TYPE_NAME_BY_ID[entityTypeId] ??
    entityTypeId;
  const currentTitleName = readString(status.titleName);
  const currentTitleRarityLabel = readString(status.titleRarityLabel);
  const currentOccupationName =
    readString(status.occupationName) ??
    OCCUPATION_NAME_BY_ID[player.occupationId ?? ""] ??
    "Dungeoneer";
  const currentPartyRoleName =
    readString(status.partyRoleName) ??
    PARTY_ROLE_NAME_BY_ID[player.partyRoleId ?? ""] ??
    "Jack of all trades";
  const matchingTitles = TITLE_PACK.titles.filter(
    (title) => title.archetypeId === archetypeId
  );
  const archetypeScores = asArchetypeScores(status.archetypeScores).slice(0, 3);

  const entries: EquippedEntry[] = [
    {
      id: "loadout-summary",
      title: "Loadout Summary",
      subtitle: `${equippedCount}/${player.equippedSkillSlots.length} prepared slots`,
      detailLines: [
        `Entity type: ${entityTypeName}`,
        `Role: ${currentOccupationName} | ${currentPartyRoleName}`,
        currentTitleName
          ? `Title: ${currentTitleName}${currentTitleRarityLabel ? ` (${currentTitleRarityLabel})` : ""}`
          : "Title: none equipped",
        `Weapon: ${equippedWeapon?.name ?? "None equipped"}`,
        `Armor: ${equippedArmor?.name ?? "None equipped"}`,
        `Accessory: ${equippedAccessory?.name ?? "None equipped"}`,
        `Inventory items: ${player.inventory.length}`,
        `Unlocked skills: ${Object.values(player.skills).filter((skill) => skill.unlocked).length}`,
        `Companion link: ${player.companionTo ?? "None"}`,
      ],
      tone: equippedCount > 0 ? "good" : "warn",
    },
    {
      id: "weapon",
      title: "Weapon",
      subtitle: equippedWeapon?.name ?? "No equipped weapon",
      detailLines: equippedWeapon
        ? [
            `Rarity: ${equippedWeapon.rarity}`,
            `Tags: ${equippedWeapon.tags.join(", ") || "-"}`,
            equippedWeapon.description,
          ]
        : [
            "The current runtime loadout does not have a weapon equipped.",
            "Bag still handles actual equip / use actions.",
          ],
      tone: equippedWeapon ? "accent" : "warn",
    },
    {
      id: "armor",
      title: "Armor",
      subtitle: equippedArmor?.name ?? "No equipped armor",
      detailLines: equippedArmor
        ? [
            `Rarity: ${equippedArmor.rarity}`,
            `Tags: ${equippedArmor.tags.join(", ") || "-"}`,
            equippedArmor.description,
          ]
        : [
            "Armor now has a dedicated runtime slot.",
            "Equip armor directly from the bag to fill this slot.",
          ],
      tone: equippedArmor ? "good" : "warn",
    },
    {
      id: "accessory",
      title: "Accessory",
      subtitle: equippedAccessory?.name ?? "No equipped accessory",
      detailLines: equippedAccessory
        ? [
            `Rarity: ${equippedAccessory.rarity}`,
            `Tags: ${equippedAccessory.tags.join(", ") || "-"}`,
            equippedAccessory.description,
          ]
        : [
            "Accessories cover relics, fame items, and utility charms.",
            "Equip one from the bag to complete the side-slot loadout.",
          ],
      tone: equippedAccessory ? "accent" : "warn",
    },
  ];

  player.equippedSkillSlots.forEach((skillId, slotIndex) => {
    const runtimeSkill = skillId ? player.skills[skillId] : null;
    const authoredSpell = skillId ? spellById.get(skillId) : null;
    entries.push({
      id: `slot-${slotIndex}`,
      title: `Prepared Slot ${slotIndex + 1}`,
      subtitle: runtimeSkill?.name ?? "Empty",
      detailLines: skillId
        ? [
            `Skill ID: ${skillId}`,
            authoredSpell
              ? `Mana Cost: ${authoredSpell.manaCost} | Category: ${authoredSpell.categoryId}`
              : "Backed by the current runtime skill system.",
            authoredSpell?.description ??
              "No authored spell description is available for this runtime skill.",
          ]
        : [
            "No spell is currently prepared in this slot.",
            "Prepare slots at the rune forge interaction view.",
          ],
      tone: skillId ? "good" : "warn",
    });
  });

  entries.push({
    id: "archetype-profile",
    title: "Archetype Profile",
    subtitle: archetypeLabel,
    detailLines: [
      archetype?.description ??
        "No authored archetype description is available for the current heading.",
      archetype && archetype.preferredSkills.length > 0
        ? `Preferred skills: ${archetype.preferredSkills.join(", ")}`
        : "Preferred skills: none authored yet.",
      ...(archetypeScores.length > 0
        ? archetypeScores.map(
            (entry) => `${entry.label}: ${formatDecimal(entry.score)}`
          )
        : [
            "No ranked archetype scores are exposed in the current status payload.",
          ]),
    ],
    tone: "accent",
  });

  entries.push({
    id: "title-track",
    title: "Title Track",
    subtitle:
      currentTitleName ??
      (matchingTitles.length > 0
        ? `${matchingTitles.length} authored title matches`
        : "No authored title match"),
    detailLines:
      matchingTitles.length > 0
        ? [
            currentTitleName
              ? "Current title comes from runtime status; the lines below show other authored titles tied to this archetype."
              : "Runtime title equip is not persisted yet; this screen shows authored title options for the current archetype.",
            ...matchingTitles.slice(0, 4).map((title) => {
              const rarity =
                rarityLabelById.get(title.rarityId) ?? title.rarityId;
              const unlockText =
                title.unlockCondition.length > 0
                  ? title.unlockCondition
                      .map((condition) =>
                        formatUnlockCondition(condition as UnlockCondition)
                      )
                      .join(" | ")
                  : "No unlock condition authored.";
              return `${title.name} (${rarity}) -> ${unlockText}`;
            }),
          ]
        : [
            "No authored title currently maps to this archetype heading.",
            "A later runtime slice should persist the actual equipped title separately from archetype classification.",
          ],
    tone: matchingTitles.length > 0 ? "good" : "warn",
  });

  return entries;
};
