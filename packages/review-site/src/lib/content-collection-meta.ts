/** User-facing grouping for `packs` keys in `content-pack.bundle.v1.json`. */

export type ContentCollectionCategory =
  | "actions"
  | "schema"
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
    description: "Model schemas, stat bindings, and validation shape.",
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
    description: "Item definitions and metadata.",
    category: "narrative",
  },
  skillPack: {
    title: "Skills",
    description: "Skills and related stats.",
    category: "narrative",
  },
  spellPack: {
    title: "Spells",
    description: "Authored spells (combat, utility, evolution hooks).",
    category: "narrative",
  },
  runePack: {
    title: "Runes",
    description: "Rune definitions for forge / affinity systems.",
    category: "narrative",
  },
  runeAffinity: {
    title: "Rune affinity",
    description:
      "Gain caps, evolution gates, and forge power rules tied to spell runeCombo.",
    category: "narrative",
  },
  gameStats: {
    title: "Economy & tuning",
    description:
      "Mana crystals, merchant buy/sell curves, combat/search rewards, spell slots, starter skills — canonical economy knobs.",
    category: "schema",
  },
  combatStatPack: {
    title: "Combat stats",
    description: "Combat stat catalog (might, agility, insight, …).",
    category: "schema",
  },
  narrativeStats: {
    title: "Narrative stats",
    description:
      "Named narrative trait catalog (entityKey → traitId). Same keys as archetype narrativeProfile, entity narrativeStats, and dialogue vectors.",
    category: "schema",
  },
  skillStats: {
    title: "Skill stat axes",
    description:
      "Weapon / delivery proficiency axes (Slashing, Magic, …) used on entities and skill progression.",
    category: "schema",
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
  "actions",
  "narrative",
  "world",
  "other",
];

const CATEGORY_LABEL: Record<ContentCollectionCategory, string> = {
  schema: "Schema & source",
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
