import {
  ARCHETYPE_PACK,
  ENTITY_TYPE_BY_ID,
  ENTITY_TYPE_NAME_BY_ID,
  OCCUPATION_BY_ID,
  OCCUPATION_NAME_BY_ID,
  PARTY_ROLE_BY_ID,
  PARTY_ROLE_NAME_BY_ID,
  RARITY_PACK,
  RUNTIME_ENTITY_IDENTITY_HOSTILE_OVERRIDE_BY_ARCHETYPE_ID,
  RUNTIME_ENTITY_IDENTITY_PRESET_BY_ID,
  TITLE_PACK,
} from "../contracts";
import { clamp, type EntityState, type GameConfig, type GameState, type NumberMap, TRAIT_NAMES } from "../core/types";
import { actForDepth, chapterForDepth } from "../world/map";

const FLOAT_EPSILON = 1e-9;
const DEFAULT_PRESET_ID_BY_KIND = {
  player: "player",
  dungeoneer: "dungeoneer",
  boss: "boss",
  hostile: "hostile",
  summon: "summon",
} as const satisfies Record<EntityState["entityKind"], string>;
const DEFAULT_ENTITY_TYPE_ID_BY_KIND = {
  player: "human",
  dungeoneer: "human",
  boss: "knight",
  hostile: "beast",
  summon: "summon",
} as const satisfies Record<EntityState["entityKind"], string>;
const DEFAULT_OCCUPATION_ID_BY_KIND = {
  player: "dungeoneer",
  dungeoneer: "dungeoneer",
  boss: "boss",
  hostile: null,
  summon: null,
} as const satisfies Record<EntityState["entityKind"], string | null>;
const DEFAULT_PARTY_ROLE_ID_BY_KIND = {
  player: "jack_of_all_trades",
  dungeoneer: null,
  boss: null,
  hostile: null,
  summon: null,
} as const satisfies Record<EntityState["entityKind"], string | null>;

const pickFromPool = (
  pool: readonly string[],
  fallback: string,
  seedIndex: number,
): string => {
  if (pool.length === 0) {
    return fallback;
  }
  const safeIndex = Math.abs(Math.floor(seedIndex));
  return pool[safeIndex % pool.length] ?? fallback;
};

const runtimeIdentityPreset = (presetId: string) => {
  return RUNTIME_ENTITY_IDENTITY_PRESET_BY_ID[presetId] ?? null;
};

export const titleForArchetype = (archetypeId: string) => {
  return (
    TITLE_PACK.titles.find((title) => title.titleId === archetypeId) ??
    TITLE_PACK.titles.find((title) => title.archetypeId === archetypeId) ??
    null
  );
};

export const rarityLabel = (rarityId: string | null): string | null => {
  if (!rarityId) {
    return null;
  }
  return (
    RARITY_PACK.rarities.find((rarity) => rarity.rarityId === rarityId)
      ?.label ?? rarityId
  );
};

export const archetypeLabel = (archetypeId: string): string => {
  return (
    ARCHETYPE_PACK.archetypes.find(
      (archetype) => archetype.archetypeId === archetypeId,
    )?.label ?? archetypeId
  );
};

export const defaultEntityTypeIdForKind = (
  entityKind: EntityState["entityKind"],
): string => {
  const preset =
    runtimeIdentityPreset(DEFAULT_PRESET_ID_BY_KIND[entityKind]) ?? null;
  if (
    preset &&
    preset.defaultEntityTypeId &&
    ENTITY_TYPE_BY_ID[preset.defaultEntityTypeId]
  ) {
    return preset.defaultEntityTypeId;
  }
  return DEFAULT_ENTITY_TYPE_ID_BY_KIND[entityKind];
};

export const defaultOccupationIdForKind = (
  entityKind: EntityState["entityKind"],
): string | null => {
  const preset =
    runtimeIdentityPreset(DEFAULT_PRESET_ID_BY_KIND[entityKind]) ?? null;
  if (
    preset?.defaultOccupationId &&
    OCCUPATION_BY_ID[preset.defaultOccupationId]
  ) {
    return preset.defaultOccupationId;
  }
  return DEFAULT_OCCUPATION_ID_BY_KIND[entityKind];
};

export const defaultPartyRoleIdForKind = (
  entityKind: EntityState["entityKind"],
): string | null => {
  const preset =
    runtimeIdentityPreset(DEFAULT_PRESET_ID_BY_KIND[entityKind]) ?? null;
  if (
    preset?.defaultPartyRoleId &&
    PARTY_ROLE_BY_ID[preset.defaultPartyRoleId]
  ) {
    return preset.defaultPartyRoleId;
  }
  return DEFAULT_PARTY_ROLE_ID_BY_KIND[entityKind];
};

export const authoredEntityTypeIdForPreset = (
  presetId: string,
  seedIndex: number,
  fallbackEntityKind: EntityState["entityKind"],
): string => {
  const preset = runtimeIdentityPreset(presetId);
  if (!preset) {
    return defaultEntityTypeIdForKind(fallbackEntityKind);
  }
  const defaultEntityTypeId = canonicalEntityTypeId(
    preset.defaultEntityTypeId,
    fallbackEntityKind,
  );
  const pool = preset.entityTypePool.filter((entityTypeId) =>
    Boolean(ENTITY_TYPE_BY_ID[entityTypeId]),
  );
  return canonicalEntityTypeId(
    pickFromPool(pool, defaultEntityTypeId, seedIndex),
    fallbackEntityKind,
  );
};

export const authoredArchetypeIdForPreset = (
  presetId: string,
  seedIndex: number,
  fallbackArchetypeId: string,
): string => {
  const preset = runtimeIdentityPreset(presetId);
  if (!preset) {
    return fallbackArchetypeId;
  }
  const pool = preset.archetypePool.filter((archetypeId) =>
    Boolean(
      ARCHETYPE_PACK.archetypes.find(
        (entry) => entry.archetypeId === archetypeId,
      ),
    ),
  );
  return pickFromPool(pool, fallbackArchetypeId, seedIndex);
};

export const authoredPartyRoleIdForPreset = (
  presetId: string,
  seedIndex: number,
  fallbackPartyRoleId: string | null,
): string | null => {
  const preset = runtimeIdentityPreset(presetId);
  if (!preset) {
    return fallbackPartyRoleId;
  }
  const pool = preset.partyRolePool.filter((partyRoleId) =>
    Boolean(PARTY_ROLE_BY_ID[partyRoleId]),
  );
  if (pool.length === 0) {
    return fallbackPartyRoleId;
  }
  return pickFromPool(
    pool,
    fallbackPartyRoleId ?? pool[0] ?? "",
    seedIndex,
  );
};

export const authoredHostileEntityTypeIdForArchetype = (
  archetypeId: string,
  seedIndex: number,
): string => {
  const override =
    RUNTIME_ENTITY_IDENTITY_HOSTILE_OVERRIDE_BY_ARCHETYPE_ID[archetypeId] ??
    null;
  const pool = (
    override?.entityTypePool.length
      ? override.entityTypePool
      : runtimeIdentityPreset("hostile")?.entityTypePool ?? []
  ).filter((entityTypeId) => Boolean(ENTITY_TYPE_BY_ID[entityTypeId]));
  const fallbackEntityTypeId = authoredEntityTypeIdForPreset(
    "hostile",
    seedIndex,
    "hostile",
  );
  return canonicalEntityTypeId(
    pickFromPool(pool, fallbackEntityTypeId, seedIndex),
    "hostile",
  );
};

export const canonicalEntityTypeId = (
  entityTypeId: string | null | undefined,
  entityKind: EntityState["entityKind"],
): string => {
  if (entityTypeId && ENTITY_TYPE_BY_ID[entityTypeId]) {
    return entityTypeId;
  }
  return defaultEntityTypeIdForKind(entityKind);
};

export const canonicalOccupationId = (
  occupationId: string | null | undefined,
  entityKind: EntityState["entityKind"],
): string | null => {
  if (occupationId && OCCUPATION_BY_ID[occupationId]) {
    return occupationId;
  }
  return defaultOccupationIdForKind(entityKind);
};

export const canonicalPartyRoleId = (
  partyRoleId: string | null | undefined,
  entityKind: EntityState["entityKind"],
): string | null => {
  if (partyRoleId && PARTY_ROLE_BY_ID[partyRoleId]) {
    return partyRoleId;
  }
  return defaultPartyRoleIdForKind(entityKind);
};

export const entityTypeLabel = (entityTypeId: string): string => {
  return ENTITY_TYPE_NAME_BY_ID[entityTypeId] ?? entityTypeId;
};

export const occupationLabel = (occupationId: string | null): string | null => {
  if (!occupationId) {
    return null;
  }
  return OCCUPATION_NAME_BY_ID[occupationId] ?? occupationId;
};

export const partyRoleLabel = (partyRoleId: string | null): string | null => {
  if (!partyRoleId) {
    return null;
  }
  return PARTY_ROLE_NAME_BY_ID[partyRoleId] ?? partyRoleId;
};

export const runeComboKey = (runeCombo: readonly string[]): string => {
  return runeCombo.join("|");
};

export const requiredProgressForQuest = (
  quest: { requiredProgress: { mode: string; value?: number | null } },
  config: GameConfig,
): number => {
  if (quest.requiredProgress.mode === "total_levels") {
    return config.totalLevels;
  }
  return Math.max(1, Number(quest.requiredProgress.value ?? 1));
};

export const toNumberMap = (delta: unknown): NumberMap => {
  const next: NumberMap = {};
  if (!delta || typeof delta !== "object" || Array.isArray(delta)) {
    return next;
  }
  for (const [key, value] of Object.entries(delta)) {
    if (Math.abs(Number(value)) > FLOAT_EPSILON) {
      next[key] = Number(value);
    }
  }
  return next;
};

export const normalizeNumberRecord = (value: unknown): NumberMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, amount]) => [
      key,
      Number(amount ?? 0),
    ]),
  );
};

export const applyClampedStatDelta = (
  stats: Record<string, number>,
  delta: unknown,
  minValue: number,
  maxValue: number,
): NumberMap => {
  const applied: NumberMap = {};
  for (const [key, value] of Object.entries(toNumberMap(delta))) {
    const before = Number(stats[key] ?? 0);
    const after = clamp(before + Number(value), minValue, maxValue);
    stats[key] = after;
    const diff = after - before;
    if (Math.abs(diff) > FLOAT_EPSILON) {
      applied[key] = diff;
    }
  }
  return applied;
};

export const applyStatDelta = (
  stats: Record<string, number>,
  delta: unknown,
): NumberMap => {
  const applied: NumberMap = {};
  for (const [key, value] of Object.entries(toNumberMap(delta))) {
    const before = Number(stats[key] ?? 0);
    const after = before + Number(value);
    stats[key] = after;
    const diff = after - before;
    if (Math.abs(diff) > FLOAT_EPSILON) {
      applied[key] = diff;
    }
  }
  return applied;
};

export const applyNarrativeStatDelta = (
  stats: Record<string, number>,
  delta: unknown,
  minValue: number,
  maxValue: number,
): NumberMap => {
  const applied: NumberMap = {};
  for (const [key, value] of Object.entries(toNumberMap(delta))) {
    const before = Number(stats[key] ?? 0);
    const after = TRAIT_NAMES.includes(key as (typeof TRAIT_NAMES)[number])
      ? clamp(before + Number(value), minValue, maxValue)
      : before + Number(value);
    stats[key] = after;
    const diff = after - before;
    if (Math.abs(diff) > FLOAT_EPSILON) {
      applied[key] = diff;
    }
  }
  return applied;
};

export const mergeDeltas = (...parts: unknown[]): NumberMap => {
  const merged: NumberMap = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(toNumberMap(part))) {
      merged[key] = Number(merged[key] ?? 0) + Number(value);
    }
  }
  return toNumberMap(merged);
};

export const partitionNarrativeStatDelta = (
  narrativeStatDelta: NumberMap,
): { traitDelta: NumberMap; featureDelta: NumberMap } => {
  const traitDelta: NumberMap = {};
  const featureDelta: NumberMap = {};
  for (const [key, value] of Object.entries(toNumberMap(narrativeStatDelta))) {
    if (TRAIT_NAMES.includes(key as (typeof TRAIT_NAMES)[number])) {
      traitDelta[key] = value;
      continue;
    }
    featureDelta[key] = value;
  }
  return { traitDelta, featureDelta };
};

export const levelForEntity = (
  entity: EntityState,
  config: GameConfig,
  globalEnemyBonus: number,
): number => {
  const byXp = Math.floor(entity.xp / config.baseXpPerLevel);
  const hostileBonus =
    entity.entityKind === "hostile" || entity.entityKind === "boss"
      ? globalEnemyBonus
      : 0;
  return Math.max(1, entity.baseLevel + byXp + hostileBonus);
};

export const chapterFor = (state: GameState, depth: number): number =>
  chapterForDepth(state.dungeon, depth);

export const actFor = (state: GameState, depth: number): number =>
  actForDepth(state.dungeon, depth);

export const diffMap = (
  before: NumberMap,
  after: NumberMap,
): NumberMap => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const next: NumberMap = {};
  for (const key of keys) {
    const diff = Number(after[key] ?? 0) - Number(before[key] ?? 0);
    if (Math.abs(diff) > FLOAT_EPSILON) {
      next[key] = diff;
    }
  }
  return next;
};

export const scaleVector = (source: NumberMap, scale: number): NumberMap => {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value * scale]),
  );
};
