import entityTypesJson from "../contracts/data/lookup_entity_types.json";
import gameStatsJson from "../contracts/data/config_game_stats.json";
import guidesJson from "../contracts/data/content_guides.json";
import mountsJson from "../contracts/data/content_mounts.json";
import presenterStringsJson from "../contracts/data/config_presenter_strings.json";
import raritiesJson from "../contracts/data/lookup_rarities.json";
import runeAffinityJson from "../contracts/data/config_rune_affinity.json";
import runesJson from "../contracts/data/lookup_runes.json";
import spellCategoriesJson from "../contracts/data/lookup_spell_categories.json";
import spellEvolutionJson from "../contracts/data/content_spell_evolution.json";
import spellProgressionJson from "../contracts/data/config_spell_progression.json";
import spellsJson from "../contracts/data/content_spells.json";
import titlesJson from "../contracts/data/content_titles.json";
import worldMapJson from "../contracts/data/content_world_map.json";
import {
  Convert as ContentPackBundleConvert,
  type ContentPackBundle as GeneratedContentPackBundle,
} from "../contracts/generated/content-pack-bundle";
import {
  type ContentSource,
  Convert as ContentSourceConvert,
} from "../contracts/generated/content-source";
import contentSourceJson from "../contracts/source/content-source.json";

export type NumberMap = Record<string, number>;

export interface RuntimeFeatureDefinition {
  featureId: string;
  label: string;
  description?: string;
  groups: string[];
  defaultValue: number;
}

export interface RuntimeModelFeatureRef {
  featureId: string;
  required?: boolean;
  defaultValue?: number;
}

export interface StatModifierMapping {
  modifierFeatureId: string;
  targetFeatureId: string;
}

export interface StatModifier {
  modifierStatModelId: string;
  mappings: StatModifierMapping[];
}

export interface RuntimeModelDefinition {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  statModifiers?: StatModifier[];
  featureRefs: RuntimeModelFeatureRef[];
}

export interface ModelInstanceBinding {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
}

export interface ContentBindings {
  modelInstances: ModelInstanceBinding[];
  canonicalModelInstances: ModelInstanceBinding[];
}

export interface FeaturePack {
  basisId: string;
  label: string;
  description?: string;
  traits: NumberMap;
}

export interface SpaceVectorPack {
  featureSchema: RuntimeFeatureDefinition[];
  modelSchemas: RuntimeModelDefinition[];
  contentBindings: ContentBindings;
  contentFeatures: FeaturePack[];
  powerFeatures: FeaturePack[];
  thematicBasisTraits: FeaturePack[];
  actionSemantics: Record<string, NumberMap>;
  roomSemantics: Record<string, NumberMap>;
  eventSemantics: {
    metric: Record<string, NumberMap>;
    kind: Record<string, NumberMap>;
  };
  itemSemantics: {
    tagWeights: Record<string, NumberMap>;
    rarityWeights: Record<string, NumberMap>;
  };
  behaviorDefaults: {
    windowSeconds: number;
    stepSeconds: number;
    actionStyle: Record<string, string>;
    eventStyle: Record<string, string>;
    roomStyle: Record<string, string>;
  };
  entityProjection: {
    healthRiskScale: number;
    energyRecoveryScale: number;
    reputationVisibilityScale: number;
    pressureHealthScale: number;
    pressureReputationScale: number;
  };
  levelSemantics: {
    combatRoomPressureScale: number;
    restRoomRecoveryScale: number;
  };
}

export interface ContentSchemaDocument {
  $schema?: string;
  schemaVersion: string;
  featureSchema: RuntimeFeatureDefinition[];
  modelSchemas: RuntimeModelDefinition[];
  contentBindings?: ContentBindings;
}

export interface PresenterStringsDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  actionGroupTitles: Record<string, string>;
  systemActionLabels: Record<string, string>;
  initialFeed: {
    "boot-1": string;
    "boot-2": string;
    "boot-3Prefix": string;
    "boot-3Suffix": string;
  };
  templates: {
    dialogueChoose: string;
    eventLine: string;
    warningLine: string;
  };
  defaults: {
    speakIntentText: string;
    cutsceneTitle: string;
  };
}

export interface EntityTypeVisualRef {
  spriteCollection?: string;
  frontSpriteUrl?: string;
  backSpriteUrl?: string;
  iconSpriteUrl?: string;
}

export interface EntityTypeDefinition {
  entityTypeId: string;
  name: string;
  visualRef?: EntityTypeVisualRef;
}

export interface EntityTypePackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  entityTypes: EntityTypeDefinition[];
}

export interface GuideEntry {
  guideId: string;
  title: string;
  body: string[];
}

export interface GuidePackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  guides: GuideEntry[];
}

export interface GameStatsDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  defaultMoveTickCost: number;
  preparedSpellSlotCount: number;
  runeForgeOfferItemCost: number;
  playerStarterSkillIds: string[];
  playerAuthoredStarterSpellIds: string[];
}

export interface RarityDefinition {
  rarityId: string;
  label: string;
  order: number;
}

export interface RarityPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  rarities: RarityDefinition[];
}

export interface SpellCategoryDefinition {
  categoryId: string;
  name: string;
  description?: string;
  order: number;
}

export interface SpellCategoryPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  categories: SpellCategoryDefinition[];
}

export interface RuneDefinition {
  runeId: string;
  name: string;
  basePower: number;
  type: string;
  visualRef?: string;
}

export interface RunePackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  runes: RuneDefinition[];
}

export interface AuthoredSpellDefinition {
  spellId: string;
  name: string;
  type: string;
  categoryId: string;
  rarityId: string;
  manaCost: number;
  /** Mana crystals to create at rune forge. If omitted, use spell-forge-costs defaultByRarity[rarityId] or overrides[spellId]. */
  forgeCostManaCrystals?: number;
  description?: string;
  runeCombo?: string[];
  power?: number;
  effectIds: string[];
  durationTicks?: number;
}

export interface SpellPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  spells: AuthoredSpellDefinition[];
}

export interface SpellEvolutionDefinition {
  evolutionId: string;
  runeCombo: string[];
  resultSpellId?: string;
  resultName: string;
  statBonuses?: NumberMap;
  effectIds: string[];
  isSummon: boolean;
  minLevel?: number;
  minAffinityPerRune?: number;
}

export interface SpellEvolutionPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  evolutionTable: SpellEvolutionDefinition[];
}

export interface RuneAffinityGainDocument {
  perCast?: string;
  amountPerRunePerCast: number;
  cap: number;
  decay?: string;
  note?: string;
}

export interface RuneAffinityEvolutionDocument {
  description?: string;
  conditionField?: string;
  example?: string;
}

export interface RuneAffinitySpellCraftingDocument {
  powerBonus?: string;
  formulaId?: string | null;
  evolutionUnlockDisplay?: string;
}

export interface RuneAffinityPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  gain: RuneAffinityGainDocument;
  evolution: RuneAffinityEvolutionDocument;
  spellCrafting: RuneAffinitySpellCraftingDocument;
}

export interface SpellProgressionLevelRow {
  level: number;
  minUseCount: number;
}

export interface SpellProgressionLevelUpDocument {
  mode: string;
  description?: string;
  levels: SpellProgressionLevelRow[];
}

export interface SpellProgressionEvolutionDocument {
  description?: string;
  conditionFields: string[];
}

export interface SpellProgressionPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  levelUp: SpellProgressionLevelUpDocument;
  evolution: SpellProgressionEvolutionDocument;
}

export interface TitleUnlockCondition {
  type: string;
  [key: string]: unknown;
}

export interface TitleDefinition {
  titleId: string;
  name: string;
  archetypeId: string;
  rarityId: string;
  unlockCondition: TitleUnlockCondition[];
}

export interface TitlePackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  titles: TitleDefinition[];
}

export interface MountVisualRef {
  spriteCollection?: string;
  iconSpriteUrl?: string;
  /** In-play view: sprite when mount faces camera or moves "forward". */
  frontSpriteUrl?: string;
  /** In-play view: sprite when mount faces away (e.g. moving into room). */
  backSpriteUrl?: string;
}

export interface MountDefinition {
  mountId: string;
  name: string;
  description?: string;
  whereAllowed?: "dungeon" | "overworld" | "both";
  effectId?: string;
  effectDurationMoves?: number;
  movementModifier?: { ticksPerMove?: number };
  visualRef?: MountVisualRef;
}

export interface MountPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  mounts: MountDefinition[];
}

export interface WorldMapExit {
  label: string;
  targetPlaceId?: string;
  targetRegionId?: string;
}

export interface WorldMapPlace {
  placeId: string;
  name: string;
  description?: string;
  exits: WorldMapExit[];
}

export interface WorldMapDungeonEntrance extends WorldMapPlace {
  inZone?: string;
}

export interface WorldMapRegion {
  regionId: string;
  name: string;
  kind: string;
  theme?: string;
  summary?: string;
  tags: string[];
  structure?: Record<string, number>;
  rules?: Record<string, boolean>;
  visualHints?: Record<string, string>;
  town?: WorldMapPlace;
  districts: WorldMapPlace[];
  wilderness: WorldMapPlace[];
  outskirts: WorldMapPlace[];
  dungeonEntrances: WorldMapDungeonEntrance[];
  connectionRegionIds: string[];
  dungeonRef?: string;
  startDepth?: number;
  escapeDepth?: number;
}

export interface WorldMapPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  worldId: string;
  title: string;
  regions: WorldMapRegion[];
  notes?: Record<string, string>;
}

export type ContentPackBundle = GeneratedContentPackBundle;
export type ContentSourceDocument = ContentSource;

const parseGenerated = <T>(value: unknown, decode: (json: string) => T): T => {
  return decode(typeof value === "string" ? value : JSON.stringify(value));
};

const contentSourceDocument = parseGenerated(
  contentSourceJson,
  ContentSourceConvert.toContentSource
);

const normalizeStringRecord = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      String(item ?? ""),
    ])
  );
};

const normalizePresenterStrings = (
  value: unknown
): PresenterStringsDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const initialFeed =
    record.initialFeed &&
    typeof record.initialFeed === "object" &&
    !Array.isArray(record.initialFeed)
      ? (record.initialFeed as Record<string, unknown>)
      : {};
  const templates =
    record.templates &&
    typeof record.templates === "object" &&
    !Array.isArray(record.templates)
      ? (record.templates as Record<string, unknown>)
      : {};
  const defaults =
    record.defaults &&
    typeof record.defaults === "object" &&
    !Array.isArray(record.defaults)
      ? (record.defaults as Record<string, unknown>)
      : {};

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "presenter-strings.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    actionGroupTitles: normalizeStringRecord(record.actionGroupTitles),
    systemActionLabels: normalizeStringRecord(record.systemActionLabels),
    initialFeed: {
      "boot-1": String(initialFeed["boot-1"] ?? ""),
      "boot-2": String(initialFeed["boot-2"] ?? ""),
      "boot-3Prefix": String(initialFeed["boot-3Prefix"] ?? ""),
      "boot-3Suffix": String(initialFeed["boot-3Suffix"] ?? ""),
    },
    templates: {
      dialogueChoose: String(templates.dialogueChoose ?? ""),
      eventLine: String(templates.eventLine ?? ""),
      warningLine: String(templates.warningLine ?? ""),
    },
    defaults: {
      speakIntentText: String(defaults.speakIntentText ?? ""),
      cutsceneTitle: String(defaults.cutsceneTitle ?? ""),
    },
  };
};

const normalizeEntityTypePack = (value: unknown): EntityTypePackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const entityTypes = Array.isArray(record.entityTypes)
    ? record.entityTypes
    : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "entity-types.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    entityTypes: entityTypes.map((entry) => {
      const entityType =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      const visualRef =
        entityType.visualRef &&
        typeof entityType.visualRef === "object" &&
        !Array.isArray(entityType.visualRef)
          ? (entityType.visualRef as Record<string, unknown>)
          : null;
      return {
        entityTypeId: String(entityType.entityTypeId ?? ""),
        name: String(entityType.name ?? entityType.entityTypeId ?? ""),
        visualRef: visualRef
          ? {
              spriteCollection:
                typeof visualRef.spriteCollection === "string"
                  ? visualRef.spriteCollection
                  : undefined,
              frontSpriteUrl:
                typeof visualRef.frontSpriteUrl === "string"
                  ? visualRef.frontSpriteUrl
                  : undefined,
              backSpriteUrl:
                typeof visualRef.backSpriteUrl === "string"
                  ? visualRef.backSpriteUrl
                  : undefined,
              iconSpriteUrl:
                typeof visualRef.iconSpriteUrl === "string"
                  ? visualRef.iconSpriteUrl
                  : undefined,
            }
          : undefined,
      };
    }),
  };
};

const normalizeGuidePack = (value: unknown): GuidePackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const guides = Array.isArray(record.guides) ? record.guides : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "guides.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    guides: guides.map((entry) => {
      const guide =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        guideId: String(guide.guideId ?? ""),
        title: String(guide.title ?? guide.guideId ?? ""),
        body: Array.isArray(guide.body)
          ? guide.body.map((line) => String(line))
          : [],
      };
    }),
  };
};

const normalizeGameStats = (value: unknown): GameStatsDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "game-stats.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    defaultMoveTickCost: Math.max(0, Number(record.defaultMoveTickCost ?? 1)),
    preparedSpellSlotCount: Math.max(
      1,
      Math.floor(Number(record.preparedSpellSlotCount ?? 4))
    ),
    runeForgeOfferItemCost: Math.max(
      0,
      Math.floor(Number(record.runeForgeOfferItemCost ?? 1))
    ),
    playerStarterSkillIds: Array.isArray(record.playerStarterSkillIds)
      ? record.playerStarterSkillIds
          .map((skillId) => String(skillId))
          .filter(Boolean)
      : [],
    playerAuthoredStarterSpellIds: Array.isArray(
      record.playerAuthoredStarterSpellIds
    )
      ? record.playerAuthoredStarterSpellIds
          .map((spellId) => String(spellId))
          .filter(Boolean)
      : [],
  };
};

const normalizeRarityPack = (value: unknown): RarityPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rarities = Array.isArray(record.rarities) ? record.rarities : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "rarities.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    rarities: rarities.map((entry) => {
      const rarity =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        rarityId: String(rarity.rarityId ?? ""),
        label: String(rarity.label ?? rarity.rarityId ?? ""),
        order:
          typeof rarity.order === "number"
            ? rarity.order
            : Number.MAX_SAFE_INTEGER,
      };
    }),
  };
};

const normalizeSpellCategoryPack = (
  value: unknown
): SpellCategoryPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const categories = Array.isArray(record.categories) ? record.categories : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "spell-categories.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    categories: categories.map((entry) => {
      const category =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        categoryId: String(category.categoryId ?? ""),
        name: String(category.name ?? category.categoryId ?? ""),
        description:
          typeof category.description === "string"
            ? category.description
            : undefined,
        order:
          typeof category.order === "number"
            ? category.order
            : Number.MAX_SAFE_INTEGER,
      };
    }),
  };
};

const normalizeRunePack = (value: unknown): RunePackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const runes = Array.isArray(record.runes) ? record.runes : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "runes.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    runes: runes.map((entry) => {
      const rune =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        runeId: String(rune.runeId ?? ""),
        name: String(rune.name ?? rune.runeId ?? ""),
        basePower: typeof rune.basePower === "number" ? rune.basePower : 0,
        type: String(rune.type ?? "neutral"),
        visualRef:
          typeof rune.visualRef === "string" ? rune.visualRef : undefined,
      };
    }),
  };
};

const normalizeSpellPack = (value: unknown): SpellPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const spells = Array.isArray(record.spells) ? record.spells : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "spells.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    spells: spells.map((entry) => {
      const spell =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        spellId: String(spell.spellId ?? ""),
        name: String(spell.name ?? spell.spellId ?? ""),
        type: String(spell.type ?? "utility"),
        categoryId: String(spell.categoryId ?? ""),
        rarityId: String(spell.rarityId ?? "common"),
        manaCost: typeof spell.manaCost === "number" ? spell.manaCost : 0,
        forgeCostManaCrystals:
          typeof spell.forgeCostManaCrystals === "number" &&
          spell.forgeCostManaCrystals >= 0
            ? spell.forgeCostManaCrystals
            : undefined,
        description:
          typeof spell.description === "string" ? spell.description : undefined,
        runeCombo: Array.isArray(spell.runeCombo)
          ? spell.runeCombo.map((runeId) => String(runeId))
          : undefined,
        power: typeof spell.power === "number" ? spell.power : undefined,
        effectIds: Array.isArray(spell.effectIds)
          ? spell.effectIds.map((effectId) => String(effectId))
          : [],
        durationTicks:
          typeof spell.durationTicks === "number"
            ? spell.durationTicks
            : undefined,
      };
    }),
  };
};

const normalizeSpellEvolutionPack = (
  value: unknown
): SpellEvolutionPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const evolutionTable = Array.isArray(record.evolutionTable)
    ? record.evolutionTable
    : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "spell-evolution.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    evolutionTable: evolutionTable.map((entry) => {
      const evolution =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      const statBonuses =
        evolution.statBonuses &&
        typeof evolution.statBonuses === "object" &&
        !Array.isArray(evolution.statBonuses)
          ? Object.fromEntries(
              Object.entries(
                evolution.statBonuses as Record<string, unknown>
              ).map(([key, item]) => [key, Number(item ?? 0)])
            )
          : undefined;
      return {
        evolutionId: String(evolution.evolutionId ?? ""),
        runeCombo: Array.isArray(evolution.runeCombo)
          ? evolution.runeCombo.map((runeId) => String(runeId ?? ""))
          : [],
        resultSpellId:
          typeof evolution.resultSpellId === "string"
            ? evolution.resultSpellId
            : undefined,
        resultName: String(evolution.resultName ?? ""),
        statBonuses,
        effectIds: Array.isArray(evolution.effectIds)
          ? evolution.effectIds.map((effectId) => String(effectId ?? ""))
          : [],
        isSummon: Boolean(evolution.isSummon),
        minLevel:
          typeof evolution.minLevel === "number"
            ? evolution.minLevel
            : undefined,
        minAffinityPerRune:
          typeof evolution.minAffinityPerRune === "number"
            ? evolution.minAffinityPerRune
            : undefined,
      };
    }),
  };
};

const normalizeRuneAffinityPack = (
  value: unknown
): RuneAffinityPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const gain =
    record.gain &&
    typeof record.gain === "object" &&
    !Array.isArray(record.gain)
      ? (record.gain as Record<string, unknown>)
      : {};
  const evolution =
    record.evolution &&
    typeof record.evolution === "object" &&
    !Array.isArray(record.evolution)
      ? (record.evolution as Record<string, unknown>)
      : {};
  const spellCrafting =
    record.spellCrafting &&
    typeof record.spellCrafting === "object" &&
    !Array.isArray(record.spellCrafting)
      ? (record.spellCrafting as Record<string, unknown>)
      : {};

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "rune-affinity.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    gain: {
      perCast: typeof gain.perCast === "string" ? gain.perCast : undefined,
      amountPerRunePerCast: Number(gain.amountPerRunePerCast ?? 0),
      cap: Number(gain.cap ?? 100),
      decay: typeof gain.decay === "string" ? gain.decay : undefined,
      note: typeof gain.note === "string" ? gain.note : undefined,
    },
    evolution: {
      description:
        typeof evolution.description === "string"
          ? evolution.description
          : undefined,
      conditionField:
        typeof evolution.conditionField === "string"
          ? evolution.conditionField
          : undefined,
      example:
        typeof evolution.example === "string" ? evolution.example : undefined,
    },
    spellCrafting: {
      powerBonus:
        typeof spellCrafting.powerBonus === "string"
          ? spellCrafting.powerBonus
          : undefined,
      formulaId:
        typeof spellCrafting.formulaId === "string" ||
        spellCrafting.formulaId === null
          ? (spellCrafting.formulaId as string | null)
          : undefined,
      evolutionUnlockDisplay:
        typeof spellCrafting.evolutionUnlockDisplay === "string"
          ? spellCrafting.evolutionUnlockDisplay
          : undefined,
    },
  };
};

const normalizeSpellProgressionPack = (
  value: unknown
): SpellProgressionPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const levelUp =
    record.levelUp &&
    typeof record.levelUp === "object" &&
    !Array.isArray(record.levelUp)
      ? (record.levelUp as Record<string, unknown>)
      : {};
  const evolution =
    record.evolution &&
    typeof record.evolution === "object" &&
    !Array.isArray(record.evolution)
      ? (record.evolution as Record<string, unknown>)
      : {};

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "spell-progression.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    levelUp: {
      mode: String(levelUp.mode ?? "useCount"),
      description:
        typeof levelUp.description === "string"
          ? levelUp.description
          : undefined,
      levels: Array.isArray(levelUp.levels)
        ? levelUp.levels.map((entry) => {
            const levelRow =
              entry && typeof entry === "object" && !Array.isArray(entry)
                ? (entry as Record<string, unknown>)
                : {};
            return {
              level: Number(levelRow.level ?? 1),
              minUseCount: Number(levelRow.minUseCount ?? 0),
            };
          })
        : [],
    },
    evolution: {
      description:
        typeof evolution.description === "string"
          ? evolution.description
          : undefined,
      conditionFields: Array.isArray(evolution.conditionFields)
        ? evolution.conditionFields.map((field) => String(field))
        : [],
    },
  };
};

const normalizeTitlePack = (value: unknown): TitlePackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const titles = Array.isArray(record.titles) ? record.titles : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "titles.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    titles: titles.map((entry) => {
      const title =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        titleId: String(title.titleId ?? ""),
        name: String(title.name ?? title.titleId ?? ""),
        archetypeId: String(title.archetypeId ?? ""),
        rarityId: String(title.rarityId ?? "common"),
        unlockCondition: Array.isArray(title.unlockCondition)
          ? title.unlockCondition.map((condition) => {
              if (
                condition &&
                typeof condition === "object" &&
                !Array.isArray(condition)
              ) {
                return {
                  ...condition,
                  type: String(
                    (condition as Record<string, unknown>).type ?? "unknown"
                  ),
                };
              }
              return { type: "unknown" };
            })
          : [],
      };
    }),
  };
};

const normalizeMountPack = (value: unknown): MountPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const mounts = Array.isArray(record.mounts) ? record.mounts : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "mounts.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    mounts: mounts.map((entry) => {
      const mount =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      const visualRef =
        mount.visualRef &&
        typeof mount.visualRef === "object" &&
        !Array.isArray(mount.visualRef)
          ? (mount.visualRef as Record<string, unknown>)
          : null;
      const movementModifier =
        mount.movementModifier &&
        typeof mount.movementModifier === "object" &&
        !Array.isArray(mount.movementModifier)
          ? (mount.movementModifier as Record<string, unknown>)
          : null;
      return {
        mountId: String(mount.mountId ?? ""),
        name: String(mount.name ?? mount.mountId ?? ""),
        description:
          typeof mount.description === "string" ? mount.description : undefined,
        whereAllowed:
          mount.whereAllowed === "dungeon" ||
          mount.whereAllowed === "overworld" ||
          mount.whereAllowed === "both"
            ? mount.whereAllowed
            : undefined,
        effectId:
          typeof mount.effectId === "string" ? mount.effectId : undefined,
        effectDurationMoves:
          typeof mount.effectDurationMoves === "number"
            ? mount.effectDurationMoves
            : undefined,
        movementModifier: movementModifier
          ? {
              ticksPerMove:
                typeof movementModifier.ticksPerMove === "number"
                  ? movementModifier.ticksPerMove
                  : undefined,
            }
          : undefined,
        visualRef: visualRef
          ? {
              spriteCollection:
                typeof visualRef.spriteCollection === "string"
                  ? visualRef.spriteCollection
                  : undefined,
              iconSpriteUrl:
                typeof visualRef.iconSpriteUrl === "string"
                  ? visualRef.iconSpriteUrl
                  : undefined,
              frontSpriteUrl:
                typeof visualRef.frontSpriteUrl === "string"
                  ? visualRef.frontSpriteUrl
                  : undefined,
              backSpriteUrl:
                typeof visualRef.backSpriteUrl === "string"
                  ? visualRef.backSpriteUrl
                  : undefined,
            }
          : undefined,
      };
    }),
  };
};

const normalizeWorldMapPlace = (value: unknown): WorldMapPlace => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const exits = Array.isArray(record.exits) ? record.exits : [];
  return {
    placeId: String(record.placeId ?? ""),
    name: String(record.name ?? record.placeId ?? ""),
    description:
      typeof record.description === "string" ? record.description : undefined,
    exits: exits.map((entry) => {
      const exit =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        label: String(exit.label ?? ""),
        targetPlaceId:
          typeof exit.targetPlaceId === "string"
            ? exit.targetPlaceId
            : undefined,
        targetRegionId:
          typeof exit.targetRegionId === "string"
            ? exit.targetRegionId
            : undefined,
      };
    }),
  };
};

const normalizeWorldMapPack = (value: unknown): WorldMapPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const regions = Array.isArray(record.regions) ? record.regions : [];
  const normalizePlaceList = (raw: unknown): WorldMapPlace[] => {
    return Array.isArray(raw) ? raw.map(normalizeWorldMapPlace) : [];
  };

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "world-map.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    worldId: String(record.worldId ?? "dungeonbreak"),
    title: String(record.title ?? record.worldId ?? "World"),
    regions: regions.map((entry) => {
      const region =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      const structure =
        region.structure &&
        typeof region.structure === "object" &&
        !Array.isArray(region.structure)
          ? (region.structure as Record<string, unknown>)
          : {};
      const rules =
        region.rules && typeof region.rules === "object" && !Array.isArray(region.rules)
          ? (region.rules as Record<string, unknown>)
          : {};
      const visualHints =
        region.visualHints &&
        typeof region.visualHints === "object" &&
        !Array.isArray(region.visualHints)
          ? (region.visualHints as Record<string, unknown>)
          : {};

      return {
        regionId: String(region.regionId ?? ""),
        name: String(region.name ?? region.regionId ?? ""),
        kind: String(region.kind ?? "hub"),
        theme: typeof region.theme === "string" ? region.theme : undefined,
        summary:
          typeof region.summary === "string" ? region.summary : undefined,
        tags: Array.isArray(region.tags)
          ? region.tags.map((tag) => String(tag))
          : [],
        structure: Object.fromEntries(
          Object.entries(structure).map(([key, raw]) => [key, Number(raw ?? 0)])
        ),
        rules: Object.fromEntries(
          Object.entries(rules).map(([key, raw]) => [key, Boolean(raw)])
        ),
        visualHints: Object.fromEntries(
          Object.entries(visualHints).map(([key, raw]) => [key, String(raw)])
        ),
        town: region.town ? normalizeWorldMapPlace(region.town) : undefined,
        districts: normalizePlaceList(region.districts),
        wilderness: normalizePlaceList(region.wilderness),
        outskirts: normalizePlaceList(region.outskirts),
        dungeonEntrances: Array.isArray(region.dungeonEntrances)
          ? region.dungeonEntrances.map((place) => {
              const normalized = normalizeWorldMapPlace(place);
              const placeRecord =
                place && typeof place === "object" && !Array.isArray(place)
                  ? (place as Record<string, unknown>)
                  : {};
              return {
                ...normalized,
                inZone:
                  typeof placeRecord.inZone === "string"
                    ? placeRecord.inZone
                    : undefined,
              };
            })
          : [],
        connectionRegionIds: Array.isArray(region.connectionRegionIds)
          ? region.connectionRegionIds.map((id) => String(id))
          : [],
        dungeonRef:
          typeof region.dungeonRef === "string" ? region.dungeonRef : undefined,
        startDepth:
          typeof region.startDepth === "number" ? region.startDepth : undefined,
        escapeDepth:
          typeof region.escapeDepth === "number"
            ? region.escapeDepth
            : undefined,
      };
    }),
    notes:
      record.notes && typeof record.notes === "object" && !Array.isArray(record.notes)
        ? Object.fromEntries(
            Object.entries(record.notes as Record<string, unknown>).map(
              ([key, raw]) => [key, String(raw)]
            )
          )
        : undefined,
  };
};

const normalizeContentBindings = (
  value: Partial<ContentBindings> | undefined
): ContentBindings => ({
  modelInstances: Array.isArray(value?.modelInstances)
    ? value.modelInstances
    : [],
  canonicalModelInstances: Array.isArray(value?.canonicalModelInstances)
    ? value.canonicalModelInstances
    : [],
});

const normalizeFeatureSchema = (value: unknown): RuntimeFeatureDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    return {
      featureId: String(record.featureId ?? ""),
      label: String(record.label ?? record.featureId ?? ""),
      description:
        typeof record.description === "string" ? record.description : undefined,
      groups: Array.isArray(record.groups)
        ? record.groups.map((group) => String(group))
        : [],
      defaultValue:
        typeof record.defaultValue === "number" ? record.defaultValue : 0,
    };
  });
};

const normalizeModelSchemas = (value: unknown): RuntimeModelDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    const featureRefs = Array.isArray(record.featureRefs)
      ? record.featureRefs.map((ref) => {
          const refRecord = (ref ?? {}) as Record<string, unknown>;
          return {
            featureId: String(refRecord.featureId ?? ""),
            required:
              typeof refRecord.required === "boolean"
                ? refRecord.required
                : undefined,
            defaultValue:
              typeof refRecord.defaultValue === "number"
                ? refRecord.defaultValue
                : undefined,
          };
        })
      : [];
    const statModifiers = Array.isArray(record.statModifiers)
      ? record.statModifiers.map((modifier) => {
          const modifierRecord = (modifier ?? {}) as Record<string, unknown>;
          const mappings = Array.isArray(modifierRecord.mappings)
            ? modifierRecord.mappings.map((mapping) => {
                const mappingRecord = (mapping ?? {}) as Record<
                  string,
                  unknown
                >;
                return {
                  modifierFeatureId: String(
                    mappingRecord.modifierFeatureId ?? ""
                  ),
                  targetFeatureId: String(mappingRecord.targetFeatureId ?? ""),
                };
              })
            : [];
          return {
            modifierStatModelId: String(
              modifierRecord.modifierStatModelId ?? ""
            ),
            mappings,
          };
        })
      : undefined;
    return {
      modelId: String(record.modelId ?? ""),
      label: String(record.label ?? record.modelId ?? ""),
      description:
        typeof record.description === "string" ? record.description : undefined,
      extendsModelId:
        typeof record.extendsModelId === "string"
          ? record.extendsModelId
          : undefined,
      attachedStatModelIds: Array.isArray(record.attachedStatModelIds)
        ? record.attachedStatModelIds.map((item) => String(item))
        : undefined,
      statModifiers,
      featureRefs,
    };
  });
};

const normalizeFeaturePacks = (value: unknown): FeaturePack[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((row) => {
    const record = (row ?? {}) as Record<string, unknown>;
    const traits =
      record.traits &&
      typeof record.traits === "object" &&
      !Array.isArray(record.traits)
        ? Object.fromEntries(
            Object.entries(record.traits as Record<string, unknown>).map(
              ([key, amount]) => [key, Number(amount ?? 0)]
            )
          )
        : {};
    return {
      basisId: String(record.basisId ?? ""),
      label: String(record.label ?? record.basisId ?? ""),
      description:
        typeof record.description === "string" ? record.description : undefined,
      traits,
    };
  });
};

const contentSchemaRecord =
  contentSourceDocument.contentSchema as unknown as Record<string, unknown>;
const vectorRuntimeRecord =
  contentSourceDocument.vectorRuntime as unknown as Record<string, unknown>;

export const CONTENT_SOURCE_DOCUMENT: ContentSourceDocument =
  contentSourceDocument;
export const ENTITY_TYPE_PACK: EntityTypePackDocument =
  normalizeEntityTypePack(entityTypesJson);
export const GAME_STATS: GameStatsDocument = normalizeGameStats(gameStatsJson);
export const GUIDE_PACK: GuidePackDocument = normalizeGuidePack(guidesJson);
export const PRESENTER_STRINGS: PresenterStringsDocument =
  normalizePresenterStrings(presenterStringsJson);
export const RARITY_PACK: RarityPackDocument =
  normalizeRarityPack(raritiesJson);
export const RUNE_AFFINITY_PACK: RuneAffinityPackDocument =
  normalizeRuneAffinityPack(runeAffinityJson);
export const RUNE_PACK: RunePackDocument = normalizeRunePack(runesJson);
export const SPELL_CATEGORY_PACK: SpellCategoryPackDocument =
  normalizeSpellCategoryPack(spellCategoriesJson);
export const SPELL_EVOLUTION_PACK: SpellEvolutionPackDocument =
  normalizeSpellEvolutionPack(spellEvolutionJson);
export const SPELL_PACK: SpellPackDocument = normalizeSpellPack(spellsJson);
export const SPELL_PROGRESSION_PACK: SpellProgressionPackDocument =
  normalizeSpellProgressionPack(spellProgressionJson);
export const TITLE_PACK: TitlePackDocument = normalizeTitlePack(titlesJson);
export const MOUNT_PACK: MountPackDocument = normalizeMountPack(mountsJson);
export const WORLD_MAP_PACK: WorldMapPackDocument =
  normalizeWorldMapPack(worldMapJson);

/** The single mount (Dolci). Use when mount is active to read effect/whereAllowed. */
export const THE_MOUNT: MountDefinition | undefined = MOUNT_PACK.mounts[0];

export const CONTENT_SCHEMA_DOCUMENT: ContentSchemaDocument = {
  $schema:
    typeof contentSchemaRecord.$schema === "string"
      ? contentSchemaRecord.$schema
      : undefined,
  schemaVersion: String(
    contentSchemaRecord.schemaVersion ?? "content-schema.v1"
  ),
  featureSchema: normalizeFeatureSchema(contentSchemaRecord.featureSchema),
  modelSchemas: normalizeModelSchemas(contentSchemaRecord.modelSchemas),
  contentBindings: contentSchemaRecord.contentBindings
    ? normalizeContentBindings(
        contentSchemaRecord.contentBindings as Partial<ContentBindings>
      )
    : undefined,
};

const resolvedContentFeatures = normalizeFeaturePacks(
  vectorRuntimeRecord.contentFeatures
);

export const SPACE_VECTOR_PACK: SpaceVectorPack = {
  featureSchema: CONTENT_SCHEMA_DOCUMENT.featureSchema,
  modelSchemas: CONTENT_SCHEMA_DOCUMENT.modelSchemas,
  contentBindings: normalizeContentBindings(
    CONTENT_SCHEMA_DOCUMENT.contentBindings
  ),
  contentFeatures: resolvedContentFeatures,
  powerFeatures: normalizeFeaturePacks(vectorRuntimeRecord.powerFeatures),
  thematicBasisTraits: resolvedContentFeatures,
  actionSemantics:
    vectorRuntimeRecord.actionSemantics &&
    typeof vectorRuntimeRecord.actionSemantics === "object"
      ? (vectorRuntimeRecord.actionSemantics as Record<string, NumberMap>)
      : {},
  roomSemantics:
    vectorRuntimeRecord.roomSemantics &&
    typeof vectorRuntimeRecord.roomSemantics === "object"
      ? (vectorRuntimeRecord.roomSemantics as Record<string, NumberMap>)
      : {},
  eventSemantics: {
    metric:
      vectorRuntimeRecord.eventSemantics &&
      typeof vectorRuntimeRecord.eventSemantics === "object" &&
      (vectorRuntimeRecord.eventSemantics as Record<string, unknown>).metric &&
      typeof (vectorRuntimeRecord.eventSemantics as Record<string, unknown>)
        .metric === "object"
        ? ((vectorRuntimeRecord.eventSemantics as Record<string, unknown>)
            .metric as Record<string, NumberMap>)
        : {},
    kind:
      vectorRuntimeRecord.eventSemantics &&
      typeof vectorRuntimeRecord.eventSemantics === "object" &&
      (vectorRuntimeRecord.eventSemantics as Record<string, unknown>).kind &&
      typeof (vectorRuntimeRecord.eventSemantics as Record<string, unknown>)
        .kind === "object"
        ? ((vectorRuntimeRecord.eventSemantics as Record<string, unknown>)
            .kind as Record<string, NumberMap>)
        : {},
  },
  itemSemantics: {
    tagWeights:
      vectorRuntimeRecord.itemSemantics &&
      typeof vectorRuntimeRecord.itemSemantics === "object" &&
      (vectorRuntimeRecord.itemSemantics as Record<string, unknown>)
        .tagWeights &&
      typeof (vectorRuntimeRecord.itemSemantics as Record<string, unknown>)
        .tagWeights === "object"
        ? ((vectorRuntimeRecord.itemSemantics as Record<string, unknown>)
            .tagWeights as Record<string, NumberMap>)
        : {},
    rarityWeights:
      vectorRuntimeRecord.itemSemantics &&
      typeof vectorRuntimeRecord.itemSemantics === "object" &&
      (vectorRuntimeRecord.itemSemantics as Record<string, unknown>)
        .rarityWeights &&
      typeof (vectorRuntimeRecord.itemSemantics as Record<string, unknown>)
        .rarityWeights === "object"
        ? ((vectorRuntimeRecord.itemSemantics as Record<string, unknown>)
            .rarityWeights as Record<string, NumberMap>)
        : {},
  },
  behaviorDefaults: {
    windowSeconds:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .windowSeconds === "number"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
            .windowSeconds as number)
        : 5,
    stepSeconds:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .stepSeconds === "number"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
            .stepSeconds as number)
        : 1,
    actionStyle:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .actionStyle &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .actionStyle === "object"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
            .actionStyle as Record<string, string>)
        : {},
    eventStyle:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .eventStyle &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .eventStyle === "object"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
            .eventStyle as Record<string, string>)
        : {},
    roomStyle:
      typeof vectorRuntimeRecord.behaviorDefaults === "object" &&
      vectorRuntimeRecord.behaviorDefaults &&
      (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .roomStyle &&
      typeof (vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
        .roomStyle === "object"
        ? ((vectorRuntimeRecord.behaviorDefaults as Record<string, unknown>)
            .roomStyle as Record<string, string>)
        : {},
  },
  entityProjection:
    vectorRuntimeRecord.entityProjection &&
    typeof vectorRuntimeRecord.entityProjection === "object"
      ? {
          healthRiskScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>)
              .healthRiskScale ?? 1
          ),
          energyRecoveryScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>)
              .energyRecoveryScale ?? 1
          ),
          reputationVisibilityScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>)
              .reputationVisibilityScale ?? 0.02
          ),
          pressureHealthScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>)
              .pressureHealthScale ?? 0.833_333_333_3
          ),
          pressureReputationScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>)
              .pressureReputationScale ?? 0.005
          ),
        }
      : {
          healthRiskScale: 1,
          energyRecoveryScale: 1,
          reputationVisibilityScale: 0.02,
          pressureHealthScale: 0.833_333_333_3,
          pressureReputationScale: 0.005,
        },
  levelSemantics:
    vectorRuntimeRecord.levelSemantics &&
    typeof vectorRuntimeRecord.levelSemantics === "object"
      ? {
          combatRoomPressureScale: Number(
            (vectorRuntimeRecord.levelSemantics as Record<string, unknown>)
              .combatRoomPressureScale ?? 4
          ),
          restRoomRecoveryScale: Number(
            (vectorRuntimeRecord.levelSemantics as Record<string, unknown>)
              .restRoomRecoveryScale ?? 5
          ),
        }
      : {
          combatRoomPressureScale: 4,
          restRoomRecoveryScale: 5,
        },
};

export const ACTION_CATALOG = contentSourceDocument.packs.actionCatalog;
export const ACTION_INTENTS = contentSourceDocument.packs.actionIntents;
export const ACTION_POLICIES = contentSourceDocument.packs.actionPolicies;
export const ACTION_CONTRACTS = contentSourceDocument.packs.actionContracts;
export const ROOM_TEMPLATES = contentSourceDocument.packs.roomTemplates;
export const DUNGEON_LAYOUT_PACK = contentSourceDocument.packs.dungeonLayouts;
export const ITEM_PACK = contentSourceDocument.packs.itemPack;
export const SKILL_PACK = contentSourceDocument.packs.skillPack;
export const ARCHETYPE_PACK = contentSourceDocument.packs.archetypePack;
export const DIALOGUE_PACK = contentSourceDocument.packs.dialoguePack;
export const CUTSCENE_PACK = contentSourceDocument.packs.cutscenePack;
export const QUEST_PACK = contentSourceDocument.packs.questPack;
export const EVENT_PACK = contentSourceDocument.packs.eventPack;

export const decodeContentSourceDocument = (
  value: string | unknown
): ContentSourceDocument => {
  return parseGenerated(value, ContentSourceConvert.toContentSource);
};

export const decodeContentPackBundle = (
  value: string | unknown
): ContentPackBundle => {
  return parseGenerated(value, ContentPackBundleConvert.toContentPackBundle);
};

export const CANONICAL_SEED_V1 = ACTION_CONTRACTS.canonicalSeedV1;
