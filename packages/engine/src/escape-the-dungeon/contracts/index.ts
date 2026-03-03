import { z } from "zod";
import actionCatalogJson from "../contracts/data/action-catalog.json";
import actionIntentsJson from "../contracts/data/action-intents.json";
import actionPoliciesJson from "../contracts/data/action-policies.json";
import actionFormulasJson from "../contracts/data/action-formulas.json";
import archetypesJson from "../contracts/data/archetypes.json";
import cutscenesJson from "../contracts/data/cutscenes.json";
import dialogueClustersJson from "../contracts/data/dialogue-clusters.json";
import eventsJson from "../contracts/data/events.json";
import itemsJson from "../contracts/data/items.json";
import questsJson from "../contracts/data/quests.json";
import roomTemplatesJson from "../contracts/data/room-templates.json";
import dungeonsJson from "../contracts/data/dungeons.json";
import skillsJson from "../contracts/data/skills.json";
import spaceVectorsJson from "../contracts/data/space-vectors.json";

const numberMapSchema = z.record(z.string(), z.number());
const prerequisiteSchema = z.object({
  kind: z.string(),
  key: z.string().optional(),
  value: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional(),
});

const actionFormulaSchema = z.object({
  energyDelta: z.number().optional(),
  energyDeltaBase: z.number().optional(),
  energyDeltaRestRoom: z.number().optional(),
  xpDelta: z.number().optional(),
  reputationDelta: z.number().optional(),
  effortCost: z.number().optional(),
  traitDelta: numberMapSchema.optional(),
  featureDelta: numberMapSchema.optional(),
  noTargetTraitDelta: numberMapSchema.optional(),
});

const actionContractsSchema = z.object({
  canonicalSeedV1: z.number().int().positive(),
  roomInfluenceScale: z.number().nonnegative(),
  deedProjection: z.object({
    perFeatureCap: z.number().positive(),
    globalBudget: z.number().positive(),
  }),
  entityPressure: z.object({
    cap: z.number().int().positive(),
    countItemsAsEntities: z.boolean(),
  }),
  actions: z.record(z.string(), actionFormulaSchema),
});

const actionCatalogSchema = z.object({
  actions: z.array(
    z.object({
      actionType: z.string(),
      group: z.string(),
      requiresTarget: z.boolean(),
      requiresEncounter: z.boolean().optional(),
      requiresRoomFeature: z.string().optional(),
    }),
  ),
});

const actionIntentsSchema = z.object({
  intents: z.array(
    z.object({
      actionType: z.string(),
      uiIntent: z.string(),
      uiScreen: z.string(),
      uiPriority: z.number().int(),
    }),
  ),
});

const actionPoliciesSchema = z.object({
  policies: z.array(
    z.object({
      policyId: z.string(),
      label: z.string(),
      entityKindFilter: z.array(z.string()),
      priorityOrder: z.array(z.string()),
    }),
  ),
});

const roomTemplatesSchema = z.object({
  templates: z.array(
    z.object({
      feature: z.string(),
      baseVector: numberMapSchema,
    }),
  ),
});

const vec3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const transformSchema = z.object({
  position: vec3Schema,
  rotation: vec3Schema.optional(),
  scale: vec3Schema.optional(),
});

const dungeonItemSchema = z.object({
  itemId: z.string(),
  itemBlueprintId: z.string().optional(),
  name: z.string(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  vectorDelta: numberMapSchema.default({}),
  isPresent: z.boolean().default(true),
  transform: transformSchema.optional(),
});

const dungeonRoomSchema = z.object({
  roomId: z.string(),
  roomBlueprintId: z.string().optional(),
  name: z.string().optional(),
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  index: z.number().int().nonnegative(),
  feature: z.string(),
  description: z.string().optional(),
  baseVector: numberMapSchema.optional(),
  exits: z
    .array(
      z.object({
        direction: z.enum(["north", "south", "east", "west", "up", "down"]),
        depth: z.number().int().positive(),
        roomId: z.string(),
      }),
  )
    .default([]),
  items: z.array(dungeonItemSchema).default([]),
  transform: transformSchema.optional(),
});

const dungeonLevelSchema = z.object({
  depth: z.number().int().positive(),
  rows: z.number().int().positive(),
  columns: z.number().int().positive(),
  heightScale: z.number().positive().default(1),
  transform: transformSchema.optional(),
  rooms: z.array(dungeonRoomSchema).min(1),
});

const dungeonLayoutPackSchema = z.object({
  dungeons: z.array(
    z.object({
      dungeonId: z.string(),
      title: z.string(),
      startDepth: z.number().int().positive(),
      startRoomId: z.string(),
      escapeDepth: z.number().int().positive(),
      escapeRoomId: z.string(),
      roomSize: z.object({
        x: z.number().positive(),
        y: z.number().positive(),
        z: z.number().positive(),
      }),
      levelSpacing: z.number().nonnegative(),
      dungeonOrigin: vec3Schema,
      roomBlueprints: z
        .array(
          z.object({
            roomBlueprintId: z.string(),
            name: z.string(),
            feature: z.string(),
            baseVector: numberMapSchema.optional(),
            description: z.string().optional(),
          }),
        )
        .optional(),
      itemBlueprints: z
        .array(
          z.object({
            itemBlueprintId: z.string(),
            name: z.string(),
            rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
            description: z.string().default(""),
            tags: z.array(z.string()).default([]),
            vectorDelta: numberMapSchema.default({}),
          }),
        )
        .optional(),
      levels: z.array(dungeonLevelSchema).min(1),
    }),
  ),
});

const itemsSchema = z.object({
  rarityTiers: z.array(z.string()),
  items: z.array(
    z.object({
      itemId: z.string(),
      tags: z.array(z.string()),
      vectorDelta: numberMapSchema,
    }),
  ),
});

const skillsSchema = z.object({
  skills: z.array(
    z.object({
      skillId: z.string(),
      name: z.string(),
      description: z.string(),
      branch: z.string(),
      branchGroup: z.string().optional(),
      exclusiveWith: z.array(z.string()).optional(),
      evolvesFrom: z.string().optional(),
      requiresRuneForge: z.boolean().optional(),
      unlockRadius: z.number().positive().optional(),
      vectorProfile: numberMapSchema.optional(),
      unlockRequirements: z.array(prerequisiteSchema).optional(),
      useRequirements: z.array(prerequisiteSchema).optional(),
      traitBonus: numberMapSchema.optional(),
      featureBonus: numberMapSchema.optional(),
    }),
  ),
});

const archetypesSchema = z.object({
  archetypes: z.array(
    z.object({
      archetypeId: z.string(),
      label: z.string(),
      description: z.string(),
      vectorProfile: numberMapSchema,
      featureProfile: numberMapSchema.optional(),
      preferredSkills: z.array(z.string()).optional(),
    }),
  ),
});

const dialogueClustersSchema = z.object({
  clusters: z.array(
    z.object({
      clusterId: z.string(),
      title: z.string(),
      centerVector: numberMapSchema,
      radius: z.number().positive(),
      options: z.array(
        z.object({
          optionId: z.string(),
          label: z.string(),
          line: z.string(),
          clusterId: z.string(),
          anchorVector: numberMapSchema,
          radius: z.number().positive(),
          effectVector: numberMapSchema,
          responseText: z.string(),
          nextOptionId: z.string().optional(),
          requiresRoomFeature: z.string().optional(),
          requiresItemTagPresent: z.string().optional(),
          requiresItemTagAbsent: z.string().optional(),
          requiresSkillId: z.string().optional(),
          takeItemTag: z.string().optional(),
        }),
      ),
    }),
  ),
});

const cutscenesSchema = z.object({
  cutscenes: z.array(
    z.object({
      cutsceneId: z.string(),
      title: z.string(),
      once: z.boolean(),
    }),
  ),
});

const questRequiredProgressSchema = z.object({
  mode: z.enum(["fixed", "total_levels"]),
  value: z.number().int().positive().optional(),
});

const questProgressRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("action"),
    actionType: z.string(),
    amount: z.number().int().positive().default(1),
  }),
  z.object({
    kind: z.literal("chapter_completed"),
    amount: z.number().int().positive().default(1),
  }),
  z.object({
    kind: z.literal("escape"),
    amount: z.number().int().positive().optional(),
    setToRequired: z.boolean().optional(),
  }),
]);

const questsSchema = z.object({
  quests: z.array(
    z.object({
      questId: z.string(),
      title: z.string(),
      description: z.string(),
      requiredProgress: questRequiredProgressSchema,
      progressRules: z.array(questProgressRuleSchema),
    }),
  ),
});

const eventTriggerSchema = z.discriminatedUnion("metric", [
  z.object({
    metric: z.literal("turn_index"),
    gte: z.number().int().nonnegative(),
  }),
  z.object({
    metric: z.literal("player_feature"),
    key: z.string(),
    gte: z.number(),
  }),
]);

const eventsSchema = z.object({
  events: z.array(
    z.object({
      eventId: z.string(),
      kind: z.enum(["deterministic", "emergent"]),
      trigger: eventTriggerSchema,
      probability: z.number().min(0).max(1).optional(),
      message: z.string(),
      traitDelta: numberMapSchema.optional(),
      featureDelta: numberMapSchema.optional(),
      globalEnemyLevelBonusDelta: z.number().int().optional(),
    }),
  ),
});

const behaviorStyleSchema = z.enum(["burst", "pulse", "ramp", "steady"]);

const featurePackSchema = z.object({
  basisId: z.string(),
  label: z.string(),
  description: z.string().optional(),
  traits: numberMapSchema,
});

const modelFeatureRefSchema = z.object({
  featureId: z.string(),
  spaces: z.array(z.string()).default([]),
  required: z.boolean().default(false),
  defaultValue: z.number().optional(),
});

const modelSchemaDefinition = z.object({
  modelId: z.string(),
  label: z.string(),
  description: z.string().optional(),
  extendsModelId: z.string().optional(),
  featureRefs: z.array(modelFeatureRefSchema).default([]),
});

const spaceVectorPackSchema = z.object({
  featureSchema: z
    .array(
      z.object({
        featureId: z.string(),
        label: z.string(),
        description: z.string().optional(),
        groups: z.array(z.string()).default([]),
        spaces: z.array(z.string()).default([]),
        defaultValue: z.number().default(0),
      }),
    )
    .default([]),
  modelSchemas: z.array(modelSchemaDefinition).default([]),
  contentBindings: z
    .object({
      modelInstances: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            modelId: z.string(),
            canonical: z.boolean().default(false),
          }),
        )
        .default([]),
      canonicalModelInstances: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            modelId: z.string(),
            canonical: z.boolean().default(true),
          }),
        )
        .default([]),
    })
    .default({ modelInstances: [], canonicalModelInstances: [] }),
  contentFeatures: z.array(featurePackSchema).default([]),
  powerFeatures: z.array(featurePackSchema).default([]),
  // Backward compatibility for older packs.
  thematicBasisTraits: z.array(featurePackSchema).default([]),
  actionSemantics: z.record(z.string(), numberMapSchema).default({}),
  roomSemantics: z.record(z.string(), numberMapSchema).default({}),
  eventSemantics: z
    .object({
      metric: z.record(z.string(), numberMapSchema).default({}),
      kind: z.record(z.string(), numberMapSchema).default({}),
    })
    .default({ metric: {}, kind: {} }),
  itemSemantics: z
    .object({
      tagWeights: z.record(z.string(), numberMapSchema).default({}),
      rarityWeights: z.record(z.string(), numberMapSchema).default({}),
    })
    .default({ tagWeights: {}, rarityWeights: {} }),
  behaviorDefaults: z
    .object({
      windowSeconds: z.number().positive().default(5),
      stepSeconds: z.number().positive().default(1),
      actionStyle: z.record(z.string(), behaviorStyleSchema).default({}),
      eventStyle: z.record(z.string(), behaviorStyleSchema).default({}),
      roomStyle: z.record(z.string(), behaviorStyleSchema).default({}),
    })
    .default({
      windowSeconds: 5,
      stepSeconds: 1,
      actionStyle: {},
      eventStyle: {},
      roomStyle: {},
    }),
  entityProjection: z
    .object({
      healthRiskScale: z.number().default(1),
      energyRecoveryScale: z.number().default(1),
      reputationVisibilityScale: z.number().default(0.02),
      pressureHealthScale: z.number().default(0.8333333333),
      pressureReputationScale: z.number().default(0.005),
    })
    .default({
      healthRiskScale: 1,
      energyRecoveryScale: 1,
      reputationVisibilityScale: 0.02,
      pressureHealthScale: 0.8333333333,
      pressureReputationScale: 0.005,
    }),
  levelSemantics: z
    .object({
      combatRoomPressureScale: z.number().positive().default(4),
      restRoomRecoveryScale: z.number().positive().default(5),
    })
    .default({
      combatRoomPressureScale: 4,
      restRoomRecoveryScale: 5,
    }),
});

export type SpaceVectorPack = z.infer<typeof spaceVectorPackSchema>;

export const ACTION_CONTRACTS = actionContractsSchema.parse(actionFormulasJson);
export const ACTION_CATALOG = actionCatalogSchema.parse(actionCatalogJson);
export const ACTION_INTENTS = actionIntentsSchema.parse(actionIntentsJson);
export const ACTION_POLICIES = actionPoliciesSchema.parse(actionPoliciesJson);
export const ROOM_TEMPLATES = roomTemplatesSchema.parse(roomTemplatesJson);
export const DUNGEON_LAYOUT_PACK = dungeonLayoutPackSchema.parse(dungeonsJson);
export const ITEM_PACK = itemsSchema.parse(itemsJson);
export const SKILL_PACK = skillsSchema.parse(skillsJson);
export const ARCHETYPE_PACK = archetypesSchema.parse(archetypesJson);
export const DIALOGUE_PACK = dialogueClustersSchema.parse(dialogueClustersJson);
export const CUTSCENE_PACK = cutscenesSchema.parse(cutscenesJson);
export const QUEST_PACK = questsSchema.parse(questsJson);
export const EVENT_PACK = eventsSchema.parse(eventsJson);
const parsedSpaceVectorPack = spaceVectorPackSchema.parse(spaceVectorsJson);
const resolvedContentFeatures =
  parsedSpaceVectorPack.contentFeatures.length > 0
    ? parsedSpaceVectorPack.contentFeatures
    : parsedSpaceVectorPack.thematicBasisTraits;
export const SPACE_VECTOR_PACK: SpaceVectorPack = {
  ...parsedSpaceVectorPack,
  contentFeatures: resolvedContentFeatures,
  thematicBasisTraits: resolvedContentFeatures,
};

export const CANONICAL_SEED_V1 = ACTION_CONTRACTS.canonicalSeedV1;
