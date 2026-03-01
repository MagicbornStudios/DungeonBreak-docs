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
  if (actionType === "rest" && ctx.inRuneForgeContext) return "gridRuneForge";
  return actionRouteMap[actionType] ?? "gridNavigation";
}

export function hotkeyRouteMap(ctx: IntentRouterContext): Record<string, SceneId | null> {
  return {
    "1": "firstPerson",
    e: "gridActionMenu",
    space: "gridActionMenu",
    c: "gridCombat",
    i: "gridInventory",
    t: "gridDialogue",
    r: ctx.inRuneForgeContext ? "gridRuneForge" : null,
  };
}

