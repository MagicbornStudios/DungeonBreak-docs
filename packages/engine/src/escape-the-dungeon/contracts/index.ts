import { z } from "zod";
import actionCatalogJson from "../contracts/data/action-catalog.json";
import actionPoliciesJson from "../contracts/data/action-policies.json";
import actionFormulasJson from "../contracts/data/action-formulas.json";
import archetypesJson from "../contracts/data/archetypes.json";
import cutscenesJson from "../contracts/data/cutscenes.json";
import dialogueClustersJson from "../contracts/data/dialogue-clusters.json";
import eventsJson from "../contracts/data/events.json";
import itemsJson from "../contracts/data/items.json";
import questsJson from "../contracts/data/quests.json";
import roomTemplatesJson from "../contracts/data/room-templates.json";
import skillsJson from "../contracts/data/skills.json";

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

export const ACTION_CONTRACTS = actionContractsSchema.parse(actionFormulasJson);
export const ACTION_CATALOG = actionCatalogSchema.parse(actionCatalogJson);
export const ACTION_POLICIES = actionPoliciesSchema.parse(actionPoliciesJson);
export const ROOM_TEMPLATES = roomTemplatesSchema.parse(roomTemplatesJson);
export const ITEM_PACK = itemsSchema.parse(itemsJson);
export const SKILL_PACK = skillsSchema.parse(skillsJson);
export const ARCHETYPE_PACK = archetypesSchema.parse(archetypesJson);
export const DIALOGUE_PACK = dialogueClustersSchema.parse(dialogueClustersJson);
export const CUTSCENE_PACK = cutscenesSchema.parse(cutscenesJson);
export const QUEST_PACK = questsSchema.parse(questsJson);
export const EVENT_PACK = eventsSchema.parse(eventsJson);

export const CANONICAL_SEED_V1 = ACTION_CONTRACTS.canonicalSeedV1;
