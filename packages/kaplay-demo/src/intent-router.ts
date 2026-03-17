import { ACTION_TYPE } from "@dungeonbreak/engine";

export type SceneId =
  | "gridNavigation"
  | "gridMap"
  | "gridCombat"
  | "gridInventory"
  | "gridJournal"
  | "gridSpellbook"
  | "gridEquipped"
  | "gridDialogue"
  | "gridRuneForge";

interface IntentRouterContext {
  inRuneForgeContext: boolean;
  hasEncounter: boolean;
}

const actionRouteMap: Record<string, SceneId | null> = {
  choose_dialogue: "gridDialogue",
  fight: "gridCombat",
  flee: "gridCombat",
  evolve_skill: "gridRuneForge",
  purchase: "gridRuneForge",
  re_equip: "gridRuneForge",
};

export function routeForActionType(
  actionType: string,
  ctx: IntentRouterContext
): SceneId {
  if (actionType === ACTION_TYPE.REST && ctx.inRuneForgeContext) {
    return "gridRuneForge";
  }
  return actionRouteMap[actionType] ?? "gridNavigation";
}

function toSceneId(screen: string | undefined | null): SceneId | null {
  if (!screen) {
    return null;
  }
  if (
    screen === "gridNavigation" ||
    screen === "gridMap" ||
    screen === "gridCombat" ||
    screen === "gridInventory" ||
    screen === "gridJournal" ||
    screen === "gridSpellbook" ||
    screen === "gridEquipped" ||
    screen === "gridDialogue" ||
    screen === "gridRuneForge"
  ) {
    return screen;
  }
  return null;
}

export function routeForActionItem(
  actionType: string,
  uiScreen: string | undefined,
  ctx: IntentRouterContext
): SceneId {
  return toSceneId(uiScreen) ?? routeForActionType(actionType, ctx);
}

export function hotkeyRouteMap(
  ctx: IntentRouterContext
): Record<string, SceneId | null> {
  return {
    e: null,
    space: null,
    c: null,
    m: "gridMap",
    f: ctx.hasEncounter ? "gridCombat" : null,
    i: "gridInventory",
    b: "gridInventory",
    p: "gridSpellbook",
    v: null,
    q: "gridEquipped",
    t: "gridDialogue",
    j: "gridJournal",
    r: ctx.inRuneForgeContext ? "gridRuneForge" : null,
  };
}
