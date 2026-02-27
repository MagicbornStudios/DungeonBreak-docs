import type { EntityState } from "@/lib/escape-the-dungeon/core/types";

export interface CutsceneDefinition {
  cutsceneId: string;
  title: string;
  text: string;
  triggerKind:
    | "item_tag"
    | "skill_unlock"
    | "attribute_milestone"
    | "fame_milestone"
    | "chapter_complete"
    | "escape";
  once: boolean;
  requiredActionType?: string;
  requiredItemTag?: string;
  requiredSkillId?: string;
  minAttribute?: { key: string; value: number };
  minFame?: number;
}

export interface CutsceneContext {
  actor: EntityState;
  actionType: string;
  foundItemTags: string[];
  unlockedSkillIds: string[];
  chapterCompleted?: number;
  escaped?: boolean;
}

export interface CutsceneHit {
  cutsceneId: string;
  title: string;
  text: string;
}

export class CutsceneDirector {
  readonly definitions: CutsceneDefinition[];

  private seen = new Set<string>();

  constructor(definitions: CutsceneDefinition[]) {
    this.definitions = definitions;
  }

  setSeen(ids: string[]): void {
    this.seen = new Set(ids);
  }

  seenIds(): string[] {
    return [...this.seen];
  }

  trigger(ctx: CutsceneContext): CutsceneHit[] {
    const hits: CutsceneHit[] = [];

    for (const definition of this.definitions) {
      if (definition.once && this.seen.has(definition.cutsceneId)) {
        continue;
      }
      if (!this.matches(definition, ctx)) {
        continue;
      }
      if (definition.once) {
        this.seen.add(definition.cutsceneId);
      }
      hits.push({
        cutsceneId: definition.cutsceneId,
        title: definition.title,
        text: definition.text,
      });
    }

    return hits;
  }

  private matches(definition: CutsceneDefinition, ctx: CutsceneContext): boolean {
    if (definition.requiredActionType && definition.requiredActionType !== ctx.actionType) {
      return false;
    }

    if (definition.triggerKind === "item_tag") {
      return Boolean(definition.requiredItemTag && ctx.foundItemTags.includes(definition.requiredItemTag));
    }

    if (definition.triggerKind === "skill_unlock") {
      return Boolean(definition.requiredSkillId && ctx.unlockedSkillIds.includes(definition.requiredSkillId));
    }

    if (definition.triggerKind === "attribute_milestone") {
      if (!definition.minAttribute) {
        return false;
      }
      const current = Number(
        (ctx.actor.attributes as unknown as Record<string, number>)[definition.minAttribute.key] ?? 0,
      );
      return current >= definition.minAttribute.value;
    }

    if (definition.triggerKind === "fame_milestone") {
      if (definition.minFame === undefined) {
        return false;
      }
      return Number(ctx.actor.features.Fame ?? 0) >= definition.minFame;
    }

    if (definition.triggerKind === "chapter_complete") {
      return ctx.chapterCompleted !== undefined;
    }

    if (definition.triggerKind === "escape") {
      return Boolean(ctx.escaped);
    }

    return false;
  }
}

export const buildDefaultCutsceneDirector = (): CutsceneDirector => {
  return new CutsceneDirector([
    {
      cutsceneId: "cutscene_treasure_first",
      title: "A Locked Cache",
      text: "The chest seal breaks. Someone passed here before you, and they were in a hurry.",
      triggerKind: "item_tag",
      requiredItemTag: "treasure",
      once: true,
    },
    {
      cutsceneId: "cutscene_training_might",
      title: "Steel Memory",
      text: "Your stance stops shaking. The dungeon no longer feels bigger than you.",
      triggerKind: "attribute_milestone",
      requiredActionType: "train",
      minAttribute: { key: "might", value: 8 },
      once: true,
    },
    {
      cutsceneId: "cutscene_stream_first",
      title: "Signal in the Dark",
      text: "A weak stream signal catches. The audience count moves from zero to one.",
      triggerKind: "fame_milestone",
      requiredActionType: "live_stream",
      minFame: 1,
      once: true,
    },
    {
      cutsceneId: "cutscene_shadow_hand_unlock",
      title: "Hands Like Smoke",
      text: "You map weight and motion in a blink. Theft feels less like chance and more like geometry.",
      triggerKind: "skill_unlock",
      requiredSkillId: "shadow_hand",
      once: true,
    },
    {
      cutsceneId: "cutscene_chapter_complete",
      title: "Chapter Closed",
      text: "Another level is behind you. The dungeon's story has one less page to write.",
      triggerKind: "chapter_complete",
      once: false,
    },
    {
      cutsceneId: "cutscene_escape",
      title: "Surface Air",
      text: "The final gate opens. Kael steps out carrying twelve chapters of proof.",
      triggerKind: "escape",
      once: true,
    },
  ]);
};
