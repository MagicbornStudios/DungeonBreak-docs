import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import TOML from "@iarna/toml";

export const AI_FLAG_IDS = [
  "ai.assistant.session-routing",
  "ai.subscription.entitlement-check",
  "ai.schema.mutation-api",
  "ai.schema.publish",
  "ai.third-party.provider-path",
] as const;

export type AiFlagId = (typeof AI_FLAG_IDS)[number];
export type AiFlagMode = "observe" | "enforce";

export type AiFlagContext = {
  cohort?: string;
  overrides?: Partial<Record<AiFlagId, boolean>>;
};

type RawFlagDefinition = {
  default?: unknown;
  owner?: unknown;
  mode?: unknown;
  description?: unknown;
  expires_at?: unknown;
};

type AiFlagDefinition = {
  id: AiFlagId;
  default: boolean;
  owner: string;
  mode: AiFlagMode;
  description?: string;
  expiresAt?: string;
};

type AiFlagConfig = {
  sourceFiles: string[];
  flags: Record<AiFlagId, AiFlagDefinition>;
  cohorts: Record<string, Partial<Record<AiFlagId, boolean>>>;
};

const DEFAULT_FLAGS_TOML = path.resolve(process.cwd(), "config", "ai-flags.defaults.toml");
const LOCAL_FLAGS_TOML = path.resolve(process.cwd(), "config", "ai-flags.local.toml");

let cache: AiFlagConfig | null = null;

const isFlagId = (value: string): value is AiFlagId =>
  (AI_FLAG_IDS as readonly string[]).includes(value);

const parseTomlFile = (filePath: string): Record<string, unknown> => {
  const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = TOML.parse(raw);
  if (!parsed || typeof parsed !== "object") return {};
  return parsed as Record<string, unknown>;
};

const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

const asString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value : fallback;

const asMode = (value: unknown): AiFlagMode => (value === "observe" ? "observe" : "enforce");

const mergeConfig = (base: AiFlagConfig, source: Record<string, unknown>): AiFlagConfig => {
  const flagsNode = source.flags;
  if (flagsNode && typeof flagsNode === "object") {
    for (const [flagId, raw] of Object.entries(flagsNode as Record<string, unknown>)) {
      if (!isFlagId(flagId) || !raw || typeof raw !== "object") continue;
      const rawDef = raw as RawFlagDefinition;
      const current = base.flags[flagId];
      base.flags[flagId] = {
        id: flagId,
        default: asBoolean(rawDef.default, current.default),
        owner: asString(rawDef.owner, current.owner),
        mode: asMode(rawDef.mode ?? current.mode),
        description:
          typeof rawDef.description === "string"
            ? rawDef.description
            : current.description,
        expiresAt:
          typeof rawDef.expires_at === "string" ? rawDef.expires_at : current.expiresAt,
      };
    }
  }

  const cohortsNode = source.cohorts;
  if (cohortsNode && typeof cohortsNode === "object") {
    for (const [cohort, values] of Object.entries(cohortsNode as Record<string, unknown>)) {
      if (!values || typeof values !== "object") continue;
      const existing = base.cohorts[cohort] ?? {};
      for (const [flagId, enabled] of Object.entries(values as Record<string, unknown>)) {
        if (!isFlagId(flagId) || typeof enabled !== "boolean") continue;
        existing[flagId] = enabled;
      }
      base.cohorts[cohort] = existing;
    }
  }

  return base;
};

const createBaseConfig = (): AiFlagConfig => {
  const flags = {} as Record<AiFlagId, AiFlagDefinition>;
  for (const id of AI_FLAG_IDS) {
    flags[id] = {
      id,
      default: false,
      owner: "platform",
      mode: "enforce",
    };
  }
  return {
    sourceFiles: [],
    flags,
    cohorts: {},
  };
};

export const loadAiFlagConfig = (): AiFlagConfig => {
  if (cache) return cache;

  const result = createBaseConfig();
  const pathFromEnv = process.env.AI_FLAGS_TOML_PATH?.trim();

  if (existsSync(DEFAULT_FLAGS_TOML)) {
    mergeConfig(result, parseTomlFile(DEFAULT_FLAGS_TOML));
    result.sourceFiles.push(DEFAULT_FLAGS_TOML);
  }

  if (existsSync(LOCAL_FLAGS_TOML)) {
    mergeConfig(result, parseTomlFile(LOCAL_FLAGS_TOML));
    result.sourceFiles.push(LOCAL_FLAGS_TOML);
  }

  if (pathFromEnv && existsSync(pathFromEnv)) {
    mergeConfig(result, parseTomlFile(pathFromEnv));
    result.sourceFiles.push(pathFromEnv);
  }

  cache = result;
  return result;
};

export const resetAiFlagConfigCache = (): void => {
  cache = null;
};

export const isAiFlagEnabled = (flagId: AiFlagId, context: AiFlagContext = {}): boolean => {
  const config = loadAiFlagConfig();
  const def = config.flags[flagId];
  const cohort = context.cohort ? config.cohorts[context.cohort] : undefined;
  const cohortValue = cohort?.[flagId];
  const overrideValue = context.overrides?.[flagId];

  if (typeof overrideValue === "boolean") return overrideValue;
  if (typeof cohortValue === "boolean") return cohortValue;
  return def.default;
};

export const getAiFlagDefinition = (flagId: AiFlagId): AiFlagDefinition =>
  loadAiFlagConfig().flags[flagId];

export const listAiFlags = (): AiFlagDefinition[] =>
  AI_FLAG_IDS.map((id) => loadAiFlagConfig().flags[id]);

