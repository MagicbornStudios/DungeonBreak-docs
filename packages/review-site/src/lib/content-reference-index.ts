/**
 * Read-only index of ids in the loaded content bundle — review hub only (no engine).
 */

export type RefCategory =
  | "rune"
  | "skill"
  | "spell"
  | "narrative"
  | "combat"
  | "dialogue"
  | "cutscene"
  | "quest"
  | "event"
  | "archetype"
  | "item"
  | "rarity"
  | "entityType";

/** Tailwind classes for review-hub reference rows (border + badge). */
export const REF_CATEGORY_CLASS: Record<
  RefCategory,
  { border: string; badge: string }
> = {
  rune: {
    border: "border-l-4 border-l-fuchsia-500/75 pl-2.5",
    badge: "bg-fuchsia-500/20 text-fuchsia-100",
  },
  skill: {
    border: "border-l-4 border-l-emerald-500/75 pl-2.5",
    badge: "bg-emerald-500/20 text-emerald-100",
  },
  spell: {
    border: "border-l-4 border-l-violet-500/75 pl-2.5",
    badge: "bg-violet-500/20 text-violet-100",
  },
  narrative: {
    border: "border-l-4 border-l-indigo-500/75 pl-2.5",
    badge: "bg-indigo-500/20 text-indigo-100",
  },
  combat: {
    border: "border-l-4 border-l-orange-500/75 pl-2.5",
    badge: "bg-orange-500/20 text-orange-100",
  },
  dialogue: {
    border: "border-l-4 border-l-sky-500/75 pl-2.5",
    badge: "bg-sky-500/20 text-sky-100",
  },
  cutscene: {
    border: "border-l-4 border-l-amber-500/75 pl-2.5",
    badge: "bg-amber-500/20 text-amber-100",
  },
  quest: {
    border: "border-l-4 border-l-rose-500/75 pl-2.5",
    badge: "bg-rose-500/20 text-rose-100",
  },
  event: {
    border: "border-l-4 border-l-cyan-500/75 pl-2.5",
    badge: "bg-cyan-500/20 text-cyan-100",
  },
  archetype: {
    border: "border-l-4 border-l-purple-500/75 pl-2.5",
    badge: "bg-purple-500/20 text-purple-100",
  },
  item: {
    border: "border-l-4 border-l-lime-500/75 pl-2.5",
    badge: "bg-lime-500/20 text-lime-950",
  },
  rarity: {
    border: "border-l-4 border-l-slate-400/80 pl-2.5",
    badge: "bg-slate-500/25 text-slate-100",
  },
  entityType: {
    border: "border-l-4 border-l-zinc-400/80 pl-2.5",
    badge: "bg-zinc-500/25 text-zinc-100",
  },
};

export type ResolvedRef = {
  category: RefCategory;
  targetPack: string;
  id: string;
  label: string;
  subtitle?: string;
  known: boolean;
};

type PackMap = Record<string, unknown>;

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function readArray(pack: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(pack)) {
    return [];
  }
  const v = pack[key];
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter(isRecord);
}

function str(row: Record<string, unknown>, k: string): string | undefined {
  const v = row[k];
  return typeof v === "string" ? v : undefined;
}

export class ContentReferenceIndex {
  readonly runeById = new Map<string, { label: string; subtitle?: string }>();
  readonly skillById = new Map<string, { label: string }>();
  readonly spellById = new Map<string, { label: string }>();
  readonly dialogueById = new Map<string, { label: string }>();
  readonly cutsceneById = new Map<string, { label: string }>();
  readonly questById = new Map<string, { label: string }>();
  readonly eventById = new Map<string, { label: string }>();
  readonly archetypeById = new Map<string, { label: string }>();
  readonly itemById = new Map<string, { label: string }>();
  readonly rarityById = new Map<string, { label: string }>();
  readonly entityTypeById = new Map<string, { label: string }>();
  readonly narrativeEntityKey = new Map<string, { label: string }>();
  readonly combatEntityKey = new Map<string, { label: string }>();
  readonly skillStatEntityKey = new Map<string, { label: string }>();

  constructor(packs: PackMap | null | undefined) {
    if (!packs) {
      return;
    }
    for (const row of readArray(packs.runePack, "runes")) {
      const id = str(row, "runeId");
      if (id) {
        this.runeById.set(id, {
          label: str(row, "name") ?? id,
          subtitle: str(row, "type"),
        });
      }
    }
    for (const row of readArray(packs.skillPack, "skills")) {
      const id = str(row, "skillId");
      if (id) {
        this.skillById.set(id, { label: str(row, "name") ?? id });
      }
    }
    for (const row of readArray(packs.spellPack, "spells")) {
      const id = str(row, "spellId");
      if (id) {
        this.spellById.set(id, { label: str(row, "name") ?? id });
      }
    }
    for (const row of readArray(packs.dialoguePack, "dialogues")) {
      const id = str(row, "dialogueId");
      if (id) {
        this.dialogueById.set(id, { label: str(row, "label") ?? id });
      }
    }
    for (const row of readArray(packs.cutscenePack, "cutscenes")) {
      const id = str(row, "cutsceneId");
      if (id) {
        this.cutsceneById.set(id, {
          label: str(row, "title") ?? str(row, "label") ?? id,
        });
      }
    }
    for (const row of readArray(packs.questPack, "quests")) {
      const id = str(row, "questId");
      if (id) {
        this.questById.set(id, { label: str(row, "title") ?? id });
      }
    }
    for (const row of readArray(packs.eventPack, "events")) {
      const id = str(row, "eventId");
      if (id) {
        this.eventById.set(id, { label: str(row, "label") ?? id });
      }
    }
    for (const row of readArray(packs.archetypePack, "archetypes")) {
      const id = str(row, "archetypeId");
      if (id) {
        this.archetypeById.set(id, { label: str(row, "label") ?? id });
      }
    }
    for (const row of readArray(packs.itemPack, "items")) {
      const id = str(row, "itemId");
      if (id) {
        this.itemById.set(id, { label: str(row, "name") ?? id });
      }
    }
    for (const row of readArray(packs.rarities, "rarities")) {
      const id = str(row, "rarityId");
      if (id) {
        this.rarityById.set(id, { label: str(row, "label") ?? id });
      }
    }
    for (const row of readArray(packs.entityTypes, "entityTypes")) {
      const id = str(row, "entityTypeId");
      if (id) {
        this.entityTypeById.set(id, { label: str(row, "label") ?? id });
      }
    }
    for (const row of readArray(packs.narrativeStats, "traits")) {
      const ek = str(row, "entityKey");
      if (ek) {
        this.narrativeEntityKey.set(ek, {
          label: str(row, "name") ?? ek,
        });
      }
    }
    for (const row of readArray(packs.combatStatPack, "stats")) {
      const ek = str(row, "entityKey");
      if (ek) {
        this.combatEntityKey.set(ek, {
          label: str(row, "name") ?? ek,
        });
      }
    }
    for (const row of readArray(packs.skillStats, "stats")) {
      const ek = str(row, "entityKey");
      if (ek) {
        this.skillStatEntityKey.set(ek, {
          label: str(row, "name") ?? ek,
        });
      }
    }
  }

  resolve(fieldKey: string | undefined, raw: string): ResolvedRef | null {
    if (!fieldKey || !raw.trim()) {
      return null;
    }
    const fk = fieldKey;

    if (fk === "runeId" || fk.endsWith("RuneId")) {
      const row = this.runeById.get(raw);
      return {
        category: "rune",
        targetPack: "runePack",
        id: raw,
        label: row?.label ?? raw,
        subtitle: row?.subtitle,
        known: Boolean(row),
      };
    }
    if (fk === "skillId" || fk.endsWith("SkillId")) {
      const row = this.skillById.get(raw);
      return {
        category: "skill",
        targetPack: "skillPack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "spellId" || fk.endsWith("SpellId")) {
      const row = this.spellById.get(raw);
      return {
        category: "spell",
        targetPack: "spellPack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "dialogueId" || fk.endsWith("DialogueId")) {
      const row = this.dialogueById.get(raw);
      return {
        category: "dialogue",
        targetPack: "dialoguePack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "cutsceneId" || fk.endsWith("CutsceneId")) {
      const row = this.cutsceneById.get(raw);
      return {
        category: "cutscene",
        targetPack: "cutscenePack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "questId" || fk.endsWith("QuestId")) {
      const row = this.questById.get(raw);
      return {
        category: "quest",
        targetPack: "questPack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "eventId" || fk.endsWith("EventId")) {
      const row = this.eventById.get(raw);
      return {
        category: "event",
        targetPack: "eventPack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "onSelectEventIds") {
      const row = this.eventById.get(raw);
      return {
        category: "event",
        targetPack: "eventPack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "onSelectCutsceneIds") {
      const row = this.cutsceneById.get(raw);
      return {
        category: "cutscene",
        targetPack: "cutscenePack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "archetypeId" || fk.endsWith("ArchetypeId")) {
      const row = this.archetypeById.get(raw);
      return {
        category: "archetype",
        targetPack: "archetypePack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "itemId" || fk.endsWith("ItemId")) {
      const row = this.itemById.get(raw);
      return {
        category: "item",
        targetPack: "itemPack",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "rarityId" || fk.endsWith("RarityId")) {
      const row = this.rarityById.get(raw);
      return {
        category: "rarity",
        targetPack: "rarities",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    if (fk === "entityTypeId" || fk.endsWith("EntityTypeId")) {
      const row = this.entityTypeById.get(raw);
      return {
        category: "entityType",
        targetPack: "entityTypes",
        id: raw,
        label: row?.label ?? raw,
        known: Boolean(row),
      };
    }
    return null;
  }

  /** Rune combo string → resolution (always runePack). */
  resolveRuneComboId(runeId: string): ResolvedRef {
    const row = this.runeById.get(runeId);
    return {
      category: "rune",
      targetPack: "runePack",
      id: runeId,
      label: row?.label ?? runeId,
      subtitle: row?.subtitle,
      known: Boolean(row),
    };
  }

  suggestIdsForField(fieldKey: string | undefined, limit = 24): string[] {
    if (!fieldKey) {
      return [];
    }
    const fk = fieldKey;
    const take = (m: Map<string, unknown>) =>
      [...m.keys()].slice(0, limit).sort((a, b) => a.localeCompare(b));

    if (fk === "runeId" || fk.endsWith("RuneId")) {
      return take(this.runeById as Map<string, unknown>);
    }
    if (fk === "skillId" || fk.endsWith("SkillId")) {
      return take(this.skillById as Map<string, unknown>);
    }
    if (fk === "spellId" || fk.endsWith("SpellId")) {
      return take(this.spellById as Map<string, unknown>);
    }
    if (fk === "dialogueId" || fk.endsWith("DialogueId")) {
      return take(this.dialogueById as Map<string, unknown>);
    }
    if (fk === "cutsceneId" || fk.endsWith("CutsceneId")) {
      return take(this.cutsceneById as Map<string, unknown>);
    }
    if (fk === "questId" || fk.endsWith("QuestId")) {
      return take(this.questById as Map<string, unknown>);
    }
    if (fk === "eventId" || fk.endsWith("EventId")) {
      return take(this.eventById as Map<string, unknown>);
    }
    if (fk === "onSelectEventIds") {
      return take(this.eventById as Map<string, unknown>);
    }
    if (fk === "onSelectCutsceneIds") {
      return take(this.cutsceneById as Map<string, unknown>);
    }
    if (fk === "archetypeId" || fk.endsWith("ArchetypeId")) {
      return take(this.archetypeById as Map<string, unknown>);
    }
    if (fk === "itemId" || fk.endsWith("ItemId")) {
      return take(this.itemById as Map<string, unknown>);
    }
    if (fk === "rarityId" || fk.endsWith("RarityId")) {
      return take(this.rarityById as Map<string, unknown>);
    }
    if (fk === "entityTypeId" || fk.endsWith("EntityTypeId")) {
      return take(this.entityTypeById as Map<string, unknown>);
    }
    return [];
  }
}

let cachedPacksRef: PackMap | null | undefined;
let cachedIndex: ContentReferenceIndex | null = null;

export function getContentReferenceIndex(
  packs: PackMap | null | undefined
): ContentReferenceIndex {
  if (packs === cachedPacksRef && cachedIndex) {
    return cachedIndex;
  }
  cachedPacksRef = packs;
  cachedIndex = new ContentReferenceIndex(packs);
  return cachedIndex;
}
