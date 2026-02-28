import { z } from "zod";
import actionCatalogJson from "../contracts/data/action-catalog.json";
import actionFormulasJson from "../contracts/data/action-formulas.json";
import cutscenesJson from "../contracts/data/cutscenes.json";
import itemsJson from "../contracts/data/items.json";
import roomTemplatesJson from "../contracts/data/room-templates.json";
import skillsJson from "../contracts/data/skills.json";

const numberMapSchema = z.record(z.string(), z.number());

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
      branch: z.string(),
      exclusiveWith: z.array(z.string()).optional(),
      evolvesFrom: z.string().optional(),
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

export const ACTION_CONTRACTS = actionContractsSchema.parse(actionFormulasJson);
export const ACTION_CATALOG = actionCatalogSchema.parse(actionCatalogJson);
export const ROOM_TEMPLATES = roomTemplatesSchema.parse(roomTemplatesJson);
export const ITEM_PACK = itemsSchema.parse(itemsJson);
export const SKILL_PACK = skillsSchema.parse(skillsJson);
export const CUTSCENE_PACK = cutscenesSchema.parse(cutscenesJson);

export const CANONICAL_SEED_V1 = ACTION_CONTRACTS.canonicalSeedV1;
