import { CUTSCENE_PACK } from "@/lib/escape-the-dungeon/contracts";
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

export const buildDefaultCutsceneDirector = (
  cutscenePack = CUTSCENE_PACK,
): CutsceneDirector => {
  return new CutsceneDirector(
    cutscenePack.cutscenes.map((definition) => ({
      cutsceneId: definition.cutsceneId,
      title: definition.title,
      text: definition.text,
      triggerKind: definition.triggerKind,
      once: definition.once,
      requiredActionType: definition.requiredActionType,
      requiredItemTag: definition.requiredItemTag,
      requiredSkillId: definition.requiredSkillId,
      minAttribute: definition.minAttribute,
      minFame: definition.minFame,
    })),
  );
};
