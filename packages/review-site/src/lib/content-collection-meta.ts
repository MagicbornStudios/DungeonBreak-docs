/** User-facing grouping for `packs` keys in `content-pack.bundle.v1.json`. */

export type ContentCollectionCategory =
  | "actions"
  | "schema"
  | "stats"
  | "rules"
  | "narrative"
  | "world"
  | "other";

export interface ContentCollectionMeta {
  id: string;
  title: string;
  description: string;
  category: ContentCollectionCategory;
}

const META: Record<string, Omit<ContentCollectionMeta, "id">> = {
  actionCatalog: {
    title: "Action catalog",
    description: "Action definitions exposed to the runtime.",
    category: "actions",
  },
  actionContracts: {
    title: "Action contracts",
    description: "Contract surfaces between intents, policies, and effects.",
    category: "actions",
  },
  actionIntents: {
    title: "Action intents",
    description: "Player/system intent vocabulary.",
    category: "actions",
  },
  actionPolicies: {
    title: "Action policies",
    description: "Guards and resolution rules for actions.",
    category: "actions",
  },
  contentSchema: {
    title: "Content schema",
    description:
      "Model schemas and validation shape (featureSchema, modelSchemas, statSchema bindings).",
    category: "schema",
  },
  contentSource: {
    title: "Content source",
    description: "Provenance and source maps for bundled content.",
    category: "schema",
  },
  archetypePack: {
    title: "Archetypes",
    description: "Character archetypes and templates.",
    category: "narrative",
  },
  itemPack: {
    title: "Items",
    description:
      "Item definitions; economy currency lives here as inventory rows (tag currency), e.g. mana_crystal — not under stat catalogs.",
    category: "narrative",
  },
  skillPack: {
    title: "Skills",
    description:
      "Skill definitions; proficiency axes are listed under Stat catalogs (skillStats).",
    category: "narrative",
  },
  spellPack: {
    title: "Spells",
    description:
      "Authored spells (runeCombo, evolution hooks). Rune combo authoring references runePack; affinity thresholds come from rune affinity rules.",
    category: "narrative",
  },
  runePack: {
    title: "Runes (affinity axes)",
    description:
      "Rune alphabet: each runeId is one affinity axis. Player values live in entity.runeStats[runeId] (0…cap). Used for spell combos, evolution gates, and forge—not melee damage dice.",
    category: "stats",
  },
  runeAffinity: {
    title: "Rune affinity rules",
    description:
      "Tuning only: per-cast gain, cap, optional decay cadence, evolution gate field names, forge power bonus text. Does not define axes—that is runePack + runeStats.",
    category: "rules",
  },
  gameStats: {
    title: "Economy & tuning",
    description:
      "Crystal payout tables, merchant curves, forge slot costs, starter skills/spells, and optional currencyItemIds + review-only composed character previews.",
    category: "rules",
  },
  combatStatPack: {
    title: "Combat stats",
    description:
      "Combat stat catalog; keys map to entity.combatStats (resolution, pools, equipment).",
    category: "stats",
  },
  narrativeStats: {
    title: "Narrative stats",
    description:
      "Named narrative trait catalog (entityKey → traitId). Same keys as archetype narrativeProfile, entity narrativeStats, dialogue vectors, and action trait deltas.",
    category: "stats",
  },
  skillStats: {
    title: "Skill stat axes",
    description:
      "Weapon / delivery proficiency axes (Slashing, Magic, …) on entity.skillStats; skill content references these for mastery.",
    category: "stats",
  },
  rarities: {
    title: "Rarities",
    description:
      "Rarity scale (common → legendary) for items, spells, quests, titles; drives crystal payouts and UI chrome.",
    category: "schema",
  },
  dialoguePack: {
    title: "Dialogue",
    description: "Dialogue graphs and lines.",
    category: "narrative",
  },
  cutscenePack: {
    title: "Cutscenes",
    description:
      "Narrative beats with triggerKind hooks (item_tag, skill_unlock, escape, …) — distinct from deterministic eventPack metrics.",
    category: "narrative",
  },
  questPack: {
    title: "Quests",
    description: "Quest graphs and objectives.",
    category: "narrative",
  },
  eventPack: {
    title: "Events",
    description:
      "Metric-driven deterministic/emergent events (turn index, fame, …); not the same authoring path as cutscene triggerKind.",
    category: "narrative",
  },
  dungeonLayouts: {
    title: "Dungeon layouts",
    description: "Room graphs and placement data.",
    category: "world",
  },
  roomTemplates: {
    title: "Room templates",
    description: "Reusable room definitions.",
    category: "world",
  },
  spaceVectors: {
    title: "Space vectors",
    description:
      "Legacy embedding payload for older balance/sim tooling. Omitted from this hub by default — still present in the raw bundle JSON if needed.",
    category: "world",
  },
  entityTypes: {
    title: "Entity types",
    description: "Spawnable entity kinds with visuals (lookup_entity_types).",
    category: "schema",
  },
  runtimeEntityIdentity: {
    title: "Runtime entity identity",
    description:
      "Defaults for player / dungeoneer / hostile kinds and archetype pools.",
    category: "schema",
  },
};

const CATEGORY_ORDER: ContentCollectionCategory[] = [
  "schema",
  "stats",
  "rules",
  "actions",
  "narrative",
  "world",
  "other",
];

const CATEGORY_LABEL: Record<ContentCollectionCategory, string> = {
  schema: "Schema & source",
  stats: "Stat catalogs & affinity axes",
  rules: "Gameplay rules (caps · gates · economy)",
  actions: "Actions",
  narrative: "Narrative & items",
  world: "World & space",
  other: "Other",
};

/** Packs hidden from the Game data sidebar (still in `content-pack.bundle.v1.json`). */
const EXPLORER_HIDDEN_PACK_KEYS = new Set<string>(["spaceVectors"]);

export function filterExplorerPackKeys(keys: string[]): string[] {
  return keys.filter((k) => !EXPLORER_HIDDEN_PACK_KEYS.has(k));
}

export function metaForPackKey(key: string): ContentCollectionMeta {
  const m = META[key];
  if (m) {
    return { id: key, ...m };
  }
  return {
    id: key,
    title: key,
    description: "Pack slice from the content bundle.",
    category: "other",
  };
}

export function groupPackKeys(keys: string[]): {
  category: ContentCollectionCategory;
  label: string;
  items: ContentCollectionMeta[];
}[] {
  const metas = keys.map(metaForPackKey);
  const byCat = new Map<ContentCollectionCategory, ContentCollectionMeta[]>();
  for (const c of CATEGORY_ORDER) {
    byCat.set(c, []);
  }
  for (const m of metas) {
    const list = byCat.get(m.category) ?? [];
    list.push(m);
    byCat.set(m.category, list);
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    items: (byCat.get(category) ?? []).sort((a, b) =>
      a.title.localeCompare(b.title)
    ),
  })).filter((g) => g.items.length > 0);
}
