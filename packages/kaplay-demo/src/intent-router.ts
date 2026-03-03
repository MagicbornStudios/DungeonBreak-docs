import { ACTION_TYPE } from "@dungeonbreak/engine";

export type SceneId =
  | "firstPerson"
  | "gridNavigation"
  | "gridActionMenu"
  | "gridCombat"
  | "gridInventory"
  | "gridDialogue"
  | "gridRuneForge";

type IntentRouterContext = {
  inRuneForgeContext: boolean;
  hasEncounter: boolean;
};

const actionRouteMap: Record<string, SceneId | null> = {
  choose_dialogue: "gridDialogue",
  fight: "gridCombat",
  flee: "gridCombat",
  evolve_skill: "gridRuneForge",
  purchase: "gridRuneForge",
  re_equip: "gridRuneForge",
};

export function routeForActionType(actionType: string, ctx: IntentRouterContext): SceneId {
  if (actionType === ACTION_TYPE.REST && ctx.inRuneForgeContext) return "gridRuneForge";
  return actionRouteMap[actionType] ?? "gridNavigation";
}

function toSceneId(screen: string | undefined | null): SceneId | null {
  if (!screen) return null;
  if (
    screen === "firstPerson" ||
    screen === "gridNavigation" ||
    screen === "gridActionMenu" ||
    screen === "gridCombat" ||
    screen === "gridInventory" ||
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
  ctx: IntentRouterContext,
): SceneId {
  return toSceneId(uiScreen) ?? routeForActionType(actionType, ctx);
}

export function hotkeyRouteMap(ctx: IntentRouterContext): Record<string, SceneId | null> {
  return {
    "1": "firstPerson",
    e: "gridActionMenu",
    space: "gridActionMenu",
    c: "gridActionMenu",
    f: ctx.hasEncounter ? "gridCombat" : null,
    i: "gridInventory",
    b: "gridInventory",
    t: "gridDialogue",
    j: "gridDialogue",
    r: ctx.inRuneForgeContext ? "gridRuneForge" : null,
    m: ctx.inRuneForgeContext ? "gridRuneForge" : null,
  };
}
