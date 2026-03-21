import { CUTSCENE_PACK } from "../contracts";
import type { EntityState } from "../core/types";
import { combatStat } from "../core/entity-stats";

export interface CutsceneDefinition {
  cutsceneId: string;
  title: string;
  text: string;
  triggerKind:
    | "item_tag"
    | "skill_unlock"
    | "combat_stat_milestone"
    | "fame_milestone"
    | "chapter_complete"
    | "escape"
    | "room_entry_feature"
    | "room_entry_room";
  once: boolean;
  requiredActionType?: string;
  requiredItemTag?: string;
  requiredSkillId?: string;
  minCombatStat?: { key: string; value: number };
  minFame?: number;
  requiredRoomFeature?: string;
  requiredRoomId?: string;
}

export interface CutsceneContext {
  actor: EntityState;
  actionType: string;
  foundItemTags: string[];
  unlockedSkillIds: string[];
  chapterCompleted?: number;
  escaped?: boolean;
  roomFeature?: string;
  roomId?: string;
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

    if (definition.triggerKind === "combat_stat_milestone") {
      if (!definition.minCombatStat) {
        return false;
      }
      const current = combatStat(
        ctx.actor,
        definition.minCombatStat.key as
          | "might"
          | "agility"
          | "insight"
          | "willpower"
          | "defense"
          | "power"
      );
      return current >= definition.minCombatStat.value;
    }

    if (definition.triggerKind === "fame_milestone") {
      if (definition.minFame === undefined) {
        return false;
      }
      return Number(ctx.actor.narrativeStats.Fame ?? 0) >= definition.minFame;
    }

    if (definition.triggerKind === "chapter_complete") {
      return ctx.chapterCompleted !== undefined;
    }

    if (definition.triggerKind === "escape") {
      return Boolean(ctx.escaped);
    }

    if (definition.triggerKind === "room_entry_feature") {
      return (
        ctx.actionType === "move" &&
        Boolean(
          definition.requiredRoomFeature &&
            definition.requiredRoomFeature === ctx.roomFeature
        )
      );
    }

    if (definition.triggerKind === "room_entry_room") {
      return (
        ctx.actionType === "move" &&
        Boolean(definition.requiredRoomId && definition.requiredRoomId === ctx.roomId)
      );
    }

    return false;
  }
}

export const buildDefaultCutsceneDirector = (): CutsceneDirector => {
  const definitions: CutsceneDefinition[] = CUTSCENE_PACK.cutscenes.map(
    (cutscene) => ({
      cutsceneId: cutscene.cutsceneId,
      title: cutscene.title,
      text: cutscene.text,
      triggerKind: cutscene.triggerKind,
      once: cutscene.once,
      requiredActionType: cutscene.requiredActionType,
      requiredItemTag: cutscene.requiredItemTag,
      requiredSkillId: cutscene.requiredSkillId,
      minCombatStat: cutscene.minCombatStat,
      minFame: cutscene.minFame,
      requiredRoomFeature: cutscene.requiredRoomFeature,
      requiredRoomId: cutscene.requiredRoomId,
    })
  );
  return new CutsceneDirector(definitions);
};
