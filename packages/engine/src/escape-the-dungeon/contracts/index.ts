import gameStatsJson from "../contracts/data/config_game_stats.json";
import runtimeEntityIdentityJson from "../contracts/data/config_runtime_entity_identity.json";
import runeAffinityJson from "../contracts/data/config_rune_affinity.json";
import spellForgeCostsJson from "../contracts/data/config_spell_forge_costs.json";
import spellProgressionJson from "../contracts/data/config_spell_progression.json";
import guidesJson from "../contracts/data/content_guides.json";
import mountsJson from "../contracts/data/content_mounts.json";
import spawnTableJson from "../contracts/data/content_spawn_table.json";
import spellEvolutionJson from "../contracts/data/content_spell_evolution.json";
import spellsJson from "../contracts/data/content_spells.json";
import titlesJson from "../contracts/data/content_titles.json";
import worldMapJson from "../contracts/data/content_world_map.json";
import combatStatsJson from "../contracts/data/lookup_combat_stats.json";
import effectsJson from "../contracts/data/lookup_effects.json";
import entityTypesJson from "../contracts/data/lookup_entity_types.json";
import equipmentSlotsJson from "../contracts/data/lookup_equipment_slots.json";
import narrativeTraitsJson from "../contracts/data/lookup_narrative_traits.json";
import occupationsJson from "../contracts/data/lookup_occupations.json";
import partyRolesJson from "../contracts/data/lookup_party_roles.json";
import raritiesJson from "../contracts/data/lookup_rarities.json";
import runesJson from "../contracts/data/lookup_runes.json";
import skillStatsJson from "../contracts/data/lookup_skill_stats.json";
import spellCategoriesJson from "../contracts/data/lookup_spell_categories.json";
import {
  Convert as ContentPackBundleConvert,
  type ContentPackBundle as GeneratedContentPackBundle,
} from "../contracts/generated/content-pack-bundle";
import { GENERATED_CONTENT_PACK_REGISTRY } from "../contracts/generated/content-pack-registry";
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
    manaRecoveryScale: number;
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
  statSchema: StatSchemaDocument;
  contentBindings?: ContentBindings;
}

export interface StatDomainDocument {
  lookupPack: string;
  lookupIdField: string;
  entityKeyField: string;
  generatedKeyExport: string;
}

export interface StatSchemaDocument {
  combat: StatDomainDocument;
  skill: StatDomainDocument;
  narrative: StatDomainDocument;
  rune: StatDomainDocument;
}

export type ContentPackRegistryKind =
  | "lookup"
  | "config"
  | "content"
  | "schema"
  | "source";

export interface ContentPackRegistryEntry {
  packId: string;
  title: string;
  kind: ContentPackRegistryKind;
  exportName: string;
  sourceFile: string;
  bundleKey?: string;
  contentSourcePath?: string;
  schemaVersion?: string;
  schemaRef?: string;
  description?: string;
  topLevelCounts: Record<string, number>;
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

export interface CombatStatDefinition {
  statId: string;
  entityKey: string;
  name: string;
  description?: string;
  defaultValue: number;
}

export interface CombatStatPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  stats: CombatStatDefinition[];
}

export interface SkillStatDefinition {
  statId: string;
  entityKey: string;
  name: string;
  description?: string;
  defaultValue: number;
}

export interface SkillStatPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  stats: SkillStatDefinition[];
}

export interface NarrativeStatDefinition {
  traitId: string;
  entityKey: string;
  name: string;
  description?: string;
  defaultValue: number;
  hidden?: boolean;
}

export interface NarrativeStatPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  traits: NarrativeStatDefinition[];
}

export interface GameStatsDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  defaultMoveTickCost: number;
  preparedSpellSlotCount: number;
  runeForgeOfferItemCost: number;
  treasureCrystalRewardsByRarity: Record<string, number>;
  combatCrystalRewardsByEntityKind: Record<string, number>;
  darkMapReputationPenalty: number;
  merchantBuyPriceByRarity: Record<string, number>;
  merchantSellPriceByRarity: Record<string, number>;
  temporaryHostilityDurationTicks: number;
  playerStarterSkillIds: string[];
  playerAuthoredStarterSpellIds: string[];
}

export interface EffectDefinition {
  effectId: string;
  name: string;
  kind: string;
  durationType: string;
  durationTicks?: number;
  tickDamage?: number;
  stacking?: string;
  description?: string;
}

export interface EffectPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  effects: EffectDefinition[];
}

export interface EquipmentSlotDefinition {
  slotId: string;
  name: string;
  description?: string;
  order: number;
}

export interface EquipmentSlotPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  slots: EquipmentSlotDefinition[];
}

export interface OccupationDefinition {
  occupationId: string;
  name: string;
  canTrade: boolean;
  isBoss: boolean;
  description?: string;
}

export interface OccupationPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  occupations: OccupationDefinition[];
}

export interface PartyRoleDefinition {
  partyRoleId: string;
  name: string;
  description?: string;
}

export interface PartyRolePackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  partyRoles: PartyRoleDefinition[];
}

export interface RuntimeEntityIdentityPreset {
  presetId: string;
  entityKind: string;
  defaultEntityTypeId: string;
  defaultOccupationId?: string;
  defaultPartyRoleId?: string;
  entityTypePool: string[];
  archetypePool: string[];
  partyRolePool: string[];
}

export interface RuntimeEntityIdentityArchetypeOverride {
  archetypeId: string;
  entityTypePool: string[];
}

export interface RuntimeEntityIdentityPackDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  presets: RuntimeEntityIdentityPreset[];
  hostileArchetypeOverrides: RuntimeEntityIdentityArchetypeOverride[];
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

export interface SpellForgeCostsDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  defaultByRarity: Record<string, number>;
  overrides: Record<string, number>;
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

export interface SpawnTableEntry {
  archetypeId: string;
  weight: number;
  minDepth: number;
  maxDepth: number;
}

export interface SpawnTableDocument {
  $schema?: string;
  schemaVersion: string;
  description?: string;
  spawnIntervalTicks: number;
  capPerRoom: number;
  capPerLevel: number;
  entries: SpawnTableEntry[];
}

export type ContentPackBundle = GeneratedContentPackBundle;
export type ContentSourceDocument = ContentSource;

const parseGenerated = <T>(value: unknown, decode: (json: string) => T): T => {
  try {
    return decode(typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
};

const contentSourceDocument = parseGenerated(
  contentSourceJson,
  ContentSourceConvert.toContentSource
);

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

const normalizeCombatStatPack = (value: unknown): CombatStatPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const stats = Array.isArray(record.stats) ? record.stats : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "combat-stats.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    stats: stats.map((entry) => {
      const stat =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        statId: String(stat.statId ?? ""),
        entityKey: String(stat.entityKey ?? ""),
        name: String(stat.name ?? stat.entityKey ?? stat.statId ?? ""),
        description:
          typeof stat.description === "string" ? stat.description : undefined,
        defaultValue: Number(stat.defaultValue ?? 0),
      };
    }),
  };
};

const normalizeSkillStatPack = (value: unknown): SkillStatPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const stats = Array.isArray(record.stats) ? record.stats : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "skill-stats.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    stats: stats.map((entry) => {
      const stat =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        statId: String(stat.statId ?? ""),
        entityKey: String(stat.entityKey ?? ""),
        name: String(stat.name ?? stat.entityKey ?? stat.statId ?? ""),
        description:
          typeof stat.description === "string" ? stat.description : undefined,
        defaultValue: Number(stat.defaultValue ?? 0),
      };
    }),
  };
};

const normalizeNarrativeStatPack = (
  value: unknown
): NarrativeStatPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const traits = Array.isArray(record.traits) ? record.traits : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "narrative-traits.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    traits: traits.map((entry) => {
      const trait =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        traitId: String(trait.traitId ?? ""),
        entityKey: String(trait.entityKey ?? trait.name ?? ""),
        name: String(trait.name ?? trait.entityKey ?? trait.traitId ?? ""),
        description:
          typeof trait.description === "string" ? trait.description : undefined,
        defaultValue: Number(trait.defaultValue ?? 0),
        hidden: typeof trait.hidden === "boolean" ? trait.hidden : undefined,
      };
    }),
  };
};

const normalizeGameStats = (value: unknown): GameStatsDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const normalizeNumberRecord = (input: unknown): Record<string, number> => {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, amount]) => [
        key,
        Math.max(0, Math.floor(Number(amount ?? 0))),
      ])
    );
  };

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
    treasureCrystalRewardsByRarity: normalizeNumberRecord(
      record.treasureCrystalRewardsByRarity
    ),
    combatCrystalRewardsByEntityKind: normalizeNumberRecord(
      record.combatCrystalRewardsByEntityKind
    ),
    darkMapReputationPenalty: Math.max(
      0,
      Math.floor(Number(record.darkMapReputationPenalty ?? 1))
    ),
    merchantBuyPriceByRarity: normalizeNumberRecord(
      record.merchantBuyPriceByRarity
    ),
    merchantSellPriceByRarity: normalizeNumberRecord(
      record.merchantSellPriceByRarity
    ),
    temporaryHostilityDurationTicks: Math.max(
      1,
      Math.floor(Number(record.temporaryHostilityDurationTicks ?? 3))
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

const normalizeEffectPack = (value: unknown): EffectPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const effects = Array.isArray(record.effects) ? record.effects : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "effects.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    effects: effects.map((entry) => {
      const effect =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        effectId: String(effect.effectId ?? ""),
        name: String(effect.name ?? effect.effectId ?? ""),
        kind: String(effect.kind ?? "status"),
        durationType: String(effect.durationType ?? "instant"),
        durationTicks:
          typeof effect.durationTicks === "number"
            ? effect.durationTicks
            : undefined,
        tickDamage:
          typeof effect.tickDamage === "number" ? effect.tickDamage : undefined,
        stacking:
          typeof effect.stacking === "string" ? effect.stacking : undefined,
        description:
          typeof effect.description === "string"
            ? effect.description
            : undefined,
      };
    }),
  };
};

const normalizeEquipmentSlotPack = (
  value: unknown
): EquipmentSlotPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const slots = Array.isArray(record.slots) ? record.slots : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "equipment-slots.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    slots: slots.map((entry) => {
      const slot =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        slotId: String(slot.slotId ?? ""),
        name: String(slot.name ?? slot.slotId ?? ""),
        description:
          typeof slot.description === "string" ? slot.description : undefined,
        order: Number(slot.order ?? 0),
      };
    }),
  };
};

const normalizeOccupationPack = (value: unknown): OccupationPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const occupations = Array.isArray(record.occupations)
    ? record.occupations
    : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "occupations.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    occupations: occupations.map((entry) => {
      const occupation =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        occupationId: String(occupation.occupationId ?? ""),
        name: String(occupation.name ?? occupation.occupationId ?? ""),
        canTrade: Boolean(occupation.canTrade),
        isBoss: Boolean(occupation.isBoss),
        description:
          typeof occupation.description === "string"
            ? occupation.description
            : undefined,
      };
    }),
  };
};

const normalizePartyRolePack = (value: unknown): PartyRolePackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const partyRoles = Array.isArray(record.partyRoles) ? record.partyRoles : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "party-roles.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    partyRoles: partyRoles.map((entry) => {
      const partyRole =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        partyRoleId: String(partyRole.partyRoleId ?? ""),
        name: String(partyRole.name ?? partyRole.partyRoleId ?? ""),
        description:
          typeof partyRole.description === "string"
            ? partyRole.description
            : undefined,
      };
    }),
  };
};

const normalizeRuntimeEntityIdentityPack = (
  value: unknown
): RuntimeEntityIdentityPackDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const presets = Array.isArray(record.presets) ? record.presets : [];
  const hostileArchetypeOverrides = Array.isArray(
    record.hostileArchetypeOverrides
  )
    ? record.hostileArchetypeOverrides
    : [];

  const stringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => entry.length > 0);
  };

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(
      record.schemaVersion ?? "runtime-entity-identity.v1"
    ),
    description:
      typeof record.description === "string" ? record.description : undefined,
    presets: presets.map((entry) => {
      const preset =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        presetId: String(preset.presetId ?? ""),
        entityKind: String(preset.entityKind ?? ""),
        defaultEntityTypeId: String(
          preset.defaultEntityTypeId ?? preset.entityTypeId ?? ""
        ),
        defaultOccupationId:
          typeof preset.defaultOccupationId === "string"
            ? preset.defaultOccupationId
            : undefined,
        defaultPartyRoleId:
          typeof preset.defaultPartyRoleId === "string"
            ? preset.defaultPartyRoleId
            : undefined,
        entityTypePool: stringArray(preset.entityTypePool),
        archetypePool: stringArray(preset.archetypePool),
        partyRolePool: stringArray(preset.partyRolePool),
      };
    }),
    hostileArchetypeOverrides: hostileArchetypeOverrides.map((entry) => {
      const override =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        archetypeId: String(override.archetypeId ?? ""),
        entityTypePool: stringArray(override.entityTypePool),
      };
    }),
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

const normalizeStatDomain = (value: unknown): StatDomainDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    lookupPack: String(record.lookupPack ?? ""),
    lookupIdField: String(record.lookupIdField ?? ""),
    entityKeyField: String(record.entityKeyField ?? ""),
    generatedKeyExport: String(record.generatedKeyExport ?? ""),
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

const normalizeSpellForgeCosts = (value: unknown): SpellForgeCostsDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const toNumberRecord = (raw: unknown): Record<string, number> => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([key, value]) => [
        key,
        Number(value ?? 0),
      ])
    );
  };

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "spell-forge-costs.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    defaultByRarity: toNumberRecord(record.defaultByRarity),
    overrides: toNumberRecord(record.overrides),
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
        region.rules &&
        typeof region.rules === "object" &&
        !Array.isArray(region.rules)
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
      record.notes &&
      typeof record.notes === "object" &&
      !Array.isArray(record.notes)
        ? Object.fromEntries(
            Object.entries(record.notes as Record<string, unknown>).map(
              ([key, raw]) => [key, String(raw)]
            )
          )
        : undefined,
  };
};

const normalizeSpawnTable = (value: unknown): SpawnTableDocument => {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const entries = Array.isArray(record.entries) ? record.entries : [];

  return {
    $schema: typeof record.$schema === "string" ? record.$schema : undefined,
    schemaVersion: String(record.schemaVersion ?? "spawn-table.v1"),
    description:
      typeof record.description === "string" ? record.description : undefined,
    spawnIntervalTicks: Number(record.spawnIntervalTicks ?? 0),
    capPerRoom: Number(record.capPerRoom ?? 0),
    capPerLevel: Number(record.capPerLevel ?? 0),
    entries: entries.map((entry) => {
      const row =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      return {
        archetypeId: String(row.archetypeId ?? ""),
        weight: Number(row.weight ?? 0),
        minDepth: Number(row.minDepth ?? 0),
        maxDepth: Number(row.maxDepth ?? 0),
      };
    }),
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
const statSchemaRecord =
  contentSchemaRecord.statSchema &&
  typeof contentSchemaRecord.statSchema === "object" &&
  !Array.isArray(contentSchemaRecord.statSchema)
    ? (contentSchemaRecord.statSchema as Record<string, unknown>)
    : {};
const vectorRuntimeRecord =
  contentSourceDocument.vectorRuntime as unknown as Record<string, unknown>;

const indexByField = <
  TEntry extends object,
  TField extends Extract<keyof TEntry, string>,
>(
  entries: readonly TEntry[],
  field: TField
): Readonly<Record<string, TEntry>> => {
  return Object.freeze(
    Object.fromEntries(
      entries.map((entry) => [String(entry[field]), entry])
    ) as Record<string, TEntry>
  );
};

const projectFieldRecord = <
  TEntry extends object,
  TKeyField extends Extract<keyof TEntry, string>,
  TValueField extends Extract<keyof TEntry, string>,
>(
  entries: readonly TEntry[],
  keyField: TKeyField,
  valueField: TValueField
): Readonly<Record<string, TEntry[TValueField]>> => {
  return Object.freeze(
    Object.fromEntries(
      entries.map((entry) => [String(entry[keyField]), entry[valueField]])
    ) as Record<string, TEntry[TValueField]>
  );
};

const indexByDerivedKey = <TEntry extends object>(
  entries: readonly TEntry[],
  keyFor: (entry: TEntry) => string
): Readonly<Record<string, TEntry>> => {
  return Object.freeze(
    Object.fromEntries(
      entries.map((entry) => [keyFor(entry), entry])
    ) as Record<string, TEntry>
  );
};

export const CONTENT_SOURCE_DOCUMENT: ContentSourceDocument =
  contentSourceDocument;
export const ENTITY_TYPE_PACK: EntityTypePackDocument =
  normalizeEntityTypePack(entityTypesJson);
export const COMBAT_STAT_PACK: CombatStatPackDocument =
  normalizeCombatStatPack(combatStatsJson);
export const EFFECT_PACK: EffectPackDocument = normalizeEffectPack(effectsJson);
export const EQUIPMENT_SLOT_PACK: EquipmentSlotPackDocument =
  normalizeEquipmentSlotPack(equipmentSlotsJson);
export const GAME_STATS: GameStatsDocument = normalizeGameStats(gameStatsJson);
export const GUIDE_PACK: GuidePackDocument = normalizeGuidePack(guidesJson);
export const NARRATIVE_STAT_PACK: NarrativeStatPackDocument =
  normalizeNarrativeStatPack(narrativeTraitsJson);
export const OCCUPATION_PACK: OccupationPackDocument =
  normalizeOccupationPack(occupationsJson);
export const PARTY_ROLE_PACK: PartyRolePackDocument =
  normalizePartyRolePack(partyRolesJson);
export const RUNTIME_ENTITY_IDENTITY_PACK: RuntimeEntityIdentityPackDocument =
  normalizeRuntimeEntityIdentityPack(runtimeEntityIdentityJson);
export const RARITY_PACK: RarityPackDocument =
  normalizeRarityPack(raritiesJson);
export const RUNE_AFFINITY_PACK: RuneAffinityPackDocument =
  normalizeRuneAffinityPack(runeAffinityJson);
export const RUNE_PACK: RunePackDocument = normalizeRunePack(runesJson);
export const SKILL_STAT_PACK: SkillStatPackDocument =
  normalizeSkillStatPack(skillStatsJson);
export const SPELL_CATEGORY_PACK: SpellCategoryPackDocument =
  normalizeSpellCategoryPack(spellCategoriesJson);
export const SPELL_EVOLUTION_PACK: SpellEvolutionPackDocument =
  normalizeSpellEvolutionPack(spellEvolutionJson);
export const SPELL_FORGE_COSTS: SpellForgeCostsDocument =
  normalizeSpellForgeCosts(spellForgeCostsJson);
export const SPELL_PACK: SpellPackDocument = normalizeSpellPack(spellsJson);
export const SPELL_PROGRESSION_PACK: SpellProgressionPackDocument =
  normalizeSpellProgressionPack(spellProgressionJson);
export const SPAWN_TABLE_PACK: SpawnTableDocument =
  normalizeSpawnTable(spawnTableJson);
export const TITLE_PACK: TitlePackDocument = normalizeTitlePack(titlesJson);
export const MOUNT_PACK: MountPackDocument = normalizeMountPack(mountsJson);
export const WORLD_MAP_PACK: WorldMapPackDocument =
  normalizeWorldMapPack(worldMapJson);

export const ENTITY_TYPE_LIST = ENTITY_TYPE_PACK.entityTypes;
export const ENTITY_TYPE_BY_ID = indexByField(ENTITY_TYPE_LIST, "entityTypeId");
export const ENTITY_TYPE_NAME_BY_ID = projectFieldRecord(
  ENTITY_TYPE_LIST,
  "entityTypeId",
  "name"
);

export const COMBAT_STAT_LIST = COMBAT_STAT_PACK.stats;
export const COMBAT_STAT_BY_ID = indexByField(COMBAT_STAT_LIST, "statId");
export const COMBAT_STAT_BY_KEY = indexByField(COMBAT_STAT_LIST, "entityKey");
export const COMBAT_STAT_NAME_BY_ID = projectFieldRecord(
  COMBAT_STAT_LIST,
  "statId",
  "name"
);

export const EFFECT_LIST = EFFECT_PACK.effects;
export const EFFECT_BY_ID = indexByField(EFFECT_LIST, "effectId");
export const EFFECT_NAME_BY_ID = projectFieldRecord(
  EFFECT_LIST,
  "effectId",
  "name"
);

export const EQUIPMENT_SLOT_LIST = EQUIPMENT_SLOT_PACK.slots;
export const EQUIPMENT_SLOT_BY_ID = indexByField(EQUIPMENT_SLOT_LIST, "slotId");
export const EQUIPMENT_SLOT_NAME_BY_ID = projectFieldRecord(
  EQUIPMENT_SLOT_LIST,
  "slotId",
  "name"
);

export const SKILL_STAT_LIST = SKILL_STAT_PACK.stats;
export const SKILL_STAT_BY_ID = indexByField(SKILL_STAT_LIST, "statId");
export const SKILL_STAT_BY_KEY = indexByField(SKILL_STAT_LIST, "entityKey");
export const SKILL_STAT_NAME_BY_ID = projectFieldRecord(
  SKILL_STAT_LIST,
  "statId",
  "name"
);

export const NARRATIVE_STAT_LIST = NARRATIVE_STAT_PACK.traits;
export const NARRATIVE_STAT_BY_ID = indexByField(
  NARRATIVE_STAT_LIST,
  "traitId"
);
export const NARRATIVE_STAT_BY_KEY = indexByField(
  NARRATIVE_STAT_LIST,
  "entityKey"
);
export const NARRATIVE_STAT_NAME_BY_ID = projectFieldRecord(
  NARRATIVE_STAT_LIST,
  "traitId",
  "name"
);

export const OCCUPATION_LIST = OCCUPATION_PACK.occupations;
export const OCCUPATION_BY_ID = indexByField(OCCUPATION_LIST, "occupationId");
export const OCCUPATION_NAME_BY_ID = projectFieldRecord(
  OCCUPATION_LIST,
  "occupationId",
  "name"
);

export const PARTY_ROLE_LIST = PARTY_ROLE_PACK.partyRoles;
export const PARTY_ROLE_BY_ID = indexByField(PARTY_ROLE_LIST, "partyRoleId");
export const PARTY_ROLE_NAME_BY_ID = projectFieldRecord(
  PARTY_ROLE_LIST,
  "partyRoleId",
  "name"
);

export const RUNTIME_ENTITY_IDENTITY_PRESET_LIST =
  RUNTIME_ENTITY_IDENTITY_PACK.presets;
export const RUNTIME_ENTITY_IDENTITY_PRESET_BY_ID = indexByField(
  RUNTIME_ENTITY_IDENTITY_PRESET_LIST,
  "presetId"
);
export const RUNTIME_ENTITY_IDENTITY_HOSTILE_OVERRIDE_LIST =
  RUNTIME_ENTITY_IDENTITY_PACK.hostileArchetypeOverrides;
export const RUNTIME_ENTITY_IDENTITY_HOSTILE_OVERRIDE_BY_ARCHETYPE_ID =
  indexByField(
    RUNTIME_ENTITY_IDENTITY_HOSTILE_OVERRIDE_LIST,
    "archetypeId"
  );

export const RARITY_LIST = RARITY_PACK.rarities;
export const RARITY_BY_ID = indexByField(RARITY_LIST, "rarityId");
export const RARITY_LABEL_BY_ID = projectFieldRecord(
  RARITY_LIST,
  "rarityId",
  "label"
);

export const RUNE_LIST = RUNE_PACK.runes;
export const RUNE_BY_ID = indexByField(RUNE_LIST, "runeId");
export const RUNE_NAME_BY_ID = projectFieldRecord(RUNE_LIST, "runeId", "name");

export const SPELL_CATEGORY_LIST = SPELL_CATEGORY_PACK.categories;
export const SPELL_CATEGORY_BY_ID = indexByField(
  SPELL_CATEGORY_LIST,
  "categoryId"
);
export const SPELL_CATEGORY_NAME_BY_ID = projectFieldRecord(
  SPELL_CATEGORY_LIST,
  "categoryId",
  "name"
);

export const SPELL_LIST = SPELL_PACK.spells;
export const SPELL_BY_ID = indexByField(SPELL_LIST, "spellId");
export const SPELL_NAME_BY_ID = projectFieldRecord(
  SPELL_LIST,
  "spellId",
  "name"
);
export const SPELL_BY_RUNE_COMBO_KEY = indexByDerivedKey(SPELL_LIST, (spell) =>
  Array.isArray(spell.runeCombo) ? spell.runeCombo.join("|") : ""
);

export const SPELL_EVOLUTION_LIST = SPELL_EVOLUTION_PACK.evolutionTable;
export const SPELL_EVOLUTION_BY_ID = indexByField(
  SPELL_EVOLUTION_LIST,
  "evolutionId"
);

export const TITLE_LIST = TITLE_PACK.titles;
export const TITLE_BY_ID = indexByField(TITLE_LIST, "titleId");
export const TITLE_NAME_BY_ID = projectFieldRecord(
  TITLE_LIST,
  "titleId",
  "name"
);

export const MOUNT_LIST = MOUNT_PACK.mounts;
export const MOUNT_BY_ID = indexByField(MOUNT_LIST, "mountId");
export const MOUNT_NAME_BY_ID = projectFieldRecord(
  MOUNT_LIST,
  "mountId",
  "name"
);

export const GUIDE_LIST = GUIDE_PACK.guides;
export const GUIDE_BY_ID = indexByField(GUIDE_LIST, "guideId");
export const GUIDE_TITLE_BY_ID = projectFieldRecord(
  GUIDE_LIST,
  "guideId",
  "title"
);

export const WORLD_REGION_LIST = WORLD_MAP_PACK.regions;
export const WORLD_REGION_BY_ID = indexByField(WORLD_REGION_LIST, "regionId");
export const WORLD_REGION_NAME_BY_ID = projectFieldRecord(
  WORLD_REGION_LIST,
  "regionId",
  "name"
);
export const WORLD_PLACE_LIST = WORLD_REGION_LIST.flatMap((region) => [
  ...(region.town ? [region.town] : []),
  ...region.districts,
  ...region.wilderness,
  ...region.outskirts,
  ...region.dungeonEntrances,
]);
export const WORLD_PLACE_BY_ID = indexByField(WORLD_PLACE_LIST, "placeId");
export const WORLD_PLACE_NAME_BY_ID = projectFieldRecord(
  WORLD_PLACE_LIST,
  "placeId",
  "name"
);

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
  statSchema: normalizeStatDomain(statSchemaRecord.combat).lookupPack
    ? {
        combat: normalizeStatDomain(statSchemaRecord.combat),
        skill: normalizeStatDomain(statSchemaRecord.skill),
        narrative: normalizeStatDomain(statSchemaRecord.narrative),
        rune: normalizeStatDomain(statSchemaRecord.rune),
      }
    : {
        combat: {
          lookupPack: "lookup_combat_stats.json",
          lookupIdField: "statId",
          entityKeyField: "entityKey",
          generatedKeyExport: "COMBAT_STAT_KEYS",
        },
        skill: {
          lookupPack: "lookup_skill_stats.json",
          lookupIdField: "statId",
          entityKeyField: "entityKey",
          generatedKeyExport: "SKILL_STAT_KEYS",
        },
        narrative: {
          lookupPack: "lookup_narrative_traits.json",
          lookupIdField: "traitId",
          entityKeyField: "entityKey",
          generatedKeyExport: "NARRATIVE_STAT_NAMES",
        },
        rune: {
          lookupPack: "lookup_runes.json",
          lookupIdField: "runeId",
          entityKeyField: "runeId",
          generatedKeyExport: "RUNE_IDS",
        },
      },
  contentBindings: contentSchemaRecord.contentBindings
    ? normalizeContentBindings(
        contentSchemaRecord.contentBindings as Partial<ContentBindings>
      )
    : undefined,
};

export const STAT_SCHEMA_DOCUMENT: StatSchemaDocument =
  CONTENT_SCHEMA_DOCUMENT.statSchema;

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
          manaRecoveryScale: Number(
            (vectorRuntimeRecord.entityProjection as Record<string, unknown>)
              .manaRecoveryScale ?? 1
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
          manaRecoveryScale: 1,
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
export const DIALOGUE_PRESENTER_STRINGS = DIALOGUE_PACK.presenterStrings;
export const CUTSCENE_PACK = contentSourceDocument.packs.cutscenePack;
export const QUEST_PACK = contentSourceDocument.packs.questPack;
export const EVENT_PACK = contentSourceDocument.packs.eventPack;

export const ACTION_CATALOG_LIST = ACTION_CATALOG.actions;
export const ACTION_CATALOG_BY_ACTION_TYPE = indexByField(
  ACTION_CATALOG_LIST,
  "actionType"
);

export const ACTION_INTENT_LIST = ACTION_INTENTS.intents;
export const ACTION_INTENT_BY_ACTION_TYPE = indexByField(
  ACTION_INTENT_LIST,
  "actionType"
);

export const ACTION_POLICY_LIST = ACTION_POLICIES.policies;
export const ACTION_POLICY_BY_ID = indexByField(ACTION_POLICY_LIST, "policyId");

export const ROOM_TEMPLATE_LIST = ROOM_TEMPLATES.templates;
export const ROOM_TEMPLATE_BY_FEATURE = indexByField(
  ROOM_TEMPLATE_LIST,
  "feature"
);

export const DUNGEON_LAYOUT_LIST = DUNGEON_LAYOUT_PACK.dungeons;
export const DUNGEON_LAYOUT_BY_TITLE = indexByField(
  DUNGEON_LAYOUT_LIST,
  "title"
);
export const DUNGEON_ROOM_LIST = DUNGEON_LAYOUT_LIST.flatMap((dungeon) =>
  dungeon.levels.flatMap((level) => level.rooms)
);
export const DUNGEON_ROOM_BY_ID = indexByField(DUNGEON_ROOM_LIST, "roomId");

export const ITEM_LIST = ITEM_PACK.items;
export const ITEM_BY_ID = indexByField(ITEM_LIST, "itemId");
export const ITEM_NAME_BY_ID = projectFieldRecord(ITEM_LIST, "itemId", "name");

export const SKILL_LIST = SKILL_PACK.skills;
export const SKILL_BY_ID = indexByField(SKILL_LIST, "skillId");
export const SKILL_NAME_BY_ID = projectFieldRecord(
  SKILL_LIST,
  "skillId",
  "name"
);

export const ARCHETYPE_LIST = ARCHETYPE_PACK.archetypes;
export const ARCHETYPE_BY_ID = indexByField(ARCHETYPE_LIST, "archetypeId");

export const DIALOGUE_LIST = DIALOGUE_PACK.dialogues;
export const DIALOGUE_BY_ID = indexByField(DIALOGUE_LIST, "dialogueId");

export const CUTSCENE_LIST = CUTSCENE_PACK.cutscenes;
export const CUTSCENE_BY_ID = indexByField(CUTSCENE_LIST, "cutsceneId");

export const QUEST_LIST = QUEST_PACK.quests;
export const QUEST_BY_ID = indexByField(QUEST_LIST, "questId");

export const EVENT_LIST = EVENT_PACK.events;
export const EVENT_BY_ID = indexByField(EVENT_LIST, "eventId");

export const CONTENT_PACK_REGISTRY: ContentPackRegistryEntry[] =
  GENERATED_CONTENT_PACK_REGISTRY.map((entry) => ({ ...entry }));

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
