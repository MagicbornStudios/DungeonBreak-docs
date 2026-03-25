export type NavigationRoomIconId =
  | "arrow-left-right"
  | "arrow-up-down"
  | "backpack"
  | "bed"
  | "book-open"
  | "crown"
  | "door-open"
  | "dumbbell"
  | "funnel"
  | "gem"
  | "hammer"
  | "map"
  | "messages-square"
  | "scroll-text"
  | "shield"
  | "sparkles"
  | "swords"
  | "trash-2"
  | "wand-sparkles";

export type NavigationPresenceVisualKind =
  | "boss"
  | "dungeoneer"
  | "hostile"
  | "room";

export interface NavigationPortraitStyle {
  eyebrow: string;
  frameColor: [number, number, number];
  plateColor: [number, number, number];
  shadowColor: [number, number, number];
  portraitScale: number;
  portraitOffsetX: number;
  portraitOffsetY: number;
  sceneBackplateOpacity: number;
}

export interface NavigationRoomIconArgs {
  feature: string;
  isBossRoom?: boolean;
  isExitTarget?: boolean;
}

export function resolveRoomFeatureIconId(
  feature: string
): NavigationRoomIconId {
  switch (feature) {
    case "combat":
      return "swords";
    case "dialogue":
      return "messages-square";
    case "rest":
      return "bed";
    case "rune_forge":
      return "hammer";
    case "training":
      return "dumbbell";
    case "treasure":
      return "gem";
    default:
      return "map";
  }
}

export function resolveRoomTileIconId(
  args: NavigationRoomIconArgs
): NavigationRoomIconId {
  if (args.isBossRoom) {
    return "crown";
  }
  if (args.isExitTarget) {
    return "door-open";
  }
  return resolveRoomFeatureIconId(args.feature);
}

export function resolvePresenceVisualKind(args: {
  bossCount?: number;
  hostileCount?: number;
  dungeoneerCount?: number;
}): NavigationPresenceVisualKind {
  if ((args.bossCount ?? 0) > 0) {
    return "boss";
  }
  if ((args.hostileCount ?? 0) > 0) {
    return "hostile";
  }
  if ((args.dungeoneerCount ?? 0) > 0) {
    return "dungeoneer";
  }
  return "room";
}

export function resolvePortraitStyle(
  kind: NavigationPresenceVisualKind
): NavigationPortraitStyle {
  switch (kind) {
    case "boss":
      return {
        eyebrow: "BOSS",
        frameColor: [116, 84, 34],
        plateColor: [54, 18, 22],
        shadowColor: [20, 8, 10],
        portraitScale: 1.62,
        portraitOffsetX: 1,
        portraitOffsetY: 50,
        sceneBackplateOpacity: 0.22,
      };
    case "hostile":
      return {
        eyebrow: "HOSTILE",
        frameColor: [110, 54, 44],
        plateColor: [42, 18, 20],
        shadowColor: [16, 8, 10],
        portraitScale: 1.42,
        portraitOffsetX: 1,
        portraitOffsetY: 47,
        sceneBackplateOpacity: 0.2,
      };
    case "dungeoneer":
      return {
        eyebrow: "RIVAL",
        frameColor: [54, 98, 88],
        plateColor: [18, 33, 34],
        shadowColor: [10, 12, 12],
        portraitScale: 1.5,
        portraitOffsetX: 1,
        portraitOffsetY: 47,
        sceneBackplateOpacity: 0.18,
      };
    default:
      return {
        eyebrow: "ROOM",
        frameColor: [74, 54, 39],
        plateColor: [28, 21, 24],
        shadowColor: [16, 10, 12],
        portraitScale: 1.08,
        portraitOffsetX: 0,
        portraitOffsetY: 41,
        sceneBackplateOpacity: 0.28,
      };
  }
}
