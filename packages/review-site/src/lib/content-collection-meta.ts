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
    description: "Spell definitions (if present in bundle).",
    category: "narrative",
  },
  dialoguePack: {
    title: "Dialogue",
    description: "Dialogue graphs and lines.",
    category: "narrative",
  },
  cutscenePack: {
    title: "Cutscenes",
    description: "Cinematic / scripted sequences.",
    category: "narrative",
  },
  questPack: {
    title: "Quests",
    description: "Quest graphs and objectives.",
    category: "narrative",
  },
  eventPack: {
    title: "Events",
    description: "Game events and triggers.",
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
    description: "Embedding / vector payloads for space systems.",
    category: "world",
  },
  entityTypes: {
    title: "Entity types",
    description: "Entity type registry (when included in bundle).",
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
