export type UiTone = "neutral" | "good" | "warn" | "danger" | "accent";
export type RoomThemeId =
  | "default"
  | "combat"
  | "dialogue"
  | "rest"
  | "rune_forge"
  | "training"
  | "treasure";

export interface RoomSceneTheme {
  id: RoomThemeId;
  label: string;
  feature: string;
  background: [number, number, number];
  frameShadow: [number, number, number];
  frameSurface: [number, number, number];
  frameHighlight: [number, number, number];
  embeddedSurface: [number, number, number];
  headerBg: [number, number, number];
  headerTitle: [number, number, number];
  headerSubtitle: [number, number, number];
  headerRule: [number, number, number];
  divider: [number, number, number];
  overlayEyebrow: [number, number, number];
}

export const UI_FONT_FAMILY = "Montserrat";
export const DISPLAY_FONT_FAMILY = "Montserrat";

export const uiPalette = {
  panelBg: [26, 17, 18] as const,
  panelBorder: [112, 82, 46] as const,
  panelShadow: [12, 8, 10] as const,
  panelHighlight: [184, 140, 76] as const,
  panelHeaderRule: [141, 106, 63] as const,
  panelHeaderEyebrow: [173, 136, 90] as const,
  selectionOutline: [238, 197, 116] as const,
  selectionFill: [116, 80, 32] as const,
  selectionMarker: [120, 214, 152] as const,
  selectionShadow: [20, 14, 18] as const,
  headerBg: [38, 19, 22] as const,
  headerTitle: [244, 227, 193] as const,
  headerSubtitle: [198, 160, 110] as const,
  textPrimary: [234, 221, 198] as const,
  textMuted: [163, 139, 112] as const,
  iconAccent: [214, 171, 104] as const,
  separator: [84, 58, 34] as const,
};

export const uiMetrics = {
  panelInset: 10,
  panelTitleTop: 10,
  panelTitleGap: 16,
  panelSectionGap: 8,
  panelRuleInset: 8,
  panelRuleGap: 6,
  buttonCompactHeight: 20,
  buttonHeight: 24,
  buttonGap: 4,
} as const;

export const tonePalette: Record<
  UiTone,
  { bg: [number, number, number]; fg: [number, number, number] }
> = {
  neutral: { bg: [64, 44, 36], fg: [229, 211, 182] },
  good: { bg: [34, 78, 66], fg: [192, 234, 216] },
  warn: { bg: [112, 74, 24], fg: [249, 224, 170] },
  danger: { bg: [122, 40, 42], fg: [252, 206, 196] },
  accent: { bg: [132, 78, 24], fg: [246, 228, 194] },
};

export const feedToneColor = {
  chapter: [245, 214, 148] as const,
  dialogue: [222, 213, 196] as const,
  combat: [238, 165, 150] as const,
  system: [176, 210, 184] as const,
  boss: [244, 202, 132] as const,
  live: [159, 206, 255] as const,
  player: [212, 232, 184] as const,
  dungeoneer: [184, 231, 209] as const,
  entity: [228, 191, 170] as const,
  narrator: [208, 186, 160] as const,
  plain: [176, 160, 142] as const,
};

export const actionGlyphByType: Record<string, string> = {
  move: "MV",
  whistle: "MNT",
  fight: "ATK",
  flee: "RUN",
  talk: "TALK",
  choose_dialogue: "DIA",
  rest: "REST",
  train: "TRN",
  search: "SRCH",
  inspect: "LOOK",
  use_item: "USE",
  equip_item: "EQP",
  drop_item: "DROP",
  purchase: "BUY",
  re_equip: "REQ",
  evolve_skill: "EVO",
  stream: "CAST",
  save_slot: "SAVE",
  load_slot: "LOAD",
  look: "LOOK",
  status: "STAT",
};

const ROOM_SCENE_THEMES: Record<RoomThemeId, RoomSceneTheme> = {
  default: {
    id: "default",
    label: "Dungeon",
    feature: "default",
    background: [15, 23, 42],
    frameShadow: [12, 8, 10],
    frameSurface: [26, 17, 18],
    frameHighlight: [184, 140, 76],
    embeddedSurface: [28, 18, 19],
    headerBg: [38, 19, 22],
    headerTitle: [244, 227, 193],
    headerSubtitle: [198, 160, 110],
    headerRule: [184, 140, 76],
    divider: [84, 58, 34],
    overlayEyebrow: [173, 136, 90],
  },
  combat: {
    id: "combat",
    label: "Hostile Chamber",
    feature: "combat",
    background: [32, 12, 14],
    frameShadow: [18, 8, 10],
    frameSurface: [44, 17, 18],
    frameHighlight: [214, 101, 92],
    embeddedSurface: [54, 20, 22],
    headerBg: [68, 24, 28],
    headerTitle: [252, 222, 208],
    headerSubtitle: [233, 164, 151],
    headerRule: [214, 101, 92],
    divider: [112, 49, 44],
    overlayEyebrow: [235, 154, 138],
  },
  dialogue: {
    id: "dialogue",
    label: "Parley Hall",
    feature: "dialogue",
    background: [13, 28, 29],
    frameShadow: [8, 14, 14],
    frameSurface: [18, 36, 35],
    frameHighlight: [111, 182, 161],
    embeddedSurface: [21, 44, 41],
    headerBg: [22, 54, 50],
    headerTitle: [218, 240, 231],
    headerSubtitle: [159, 205, 186],
    headerRule: [111, 182, 161],
    divider: [54, 106, 93],
    overlayEyebrow: [133, 193, 171],
  },
  rest: {
    id: "rest",
    label: "Rest Nook",
    feature: "rest",
    background: [18, 28, 22],
    frameShadow: [10, 12, 10],
    frameSurface: [24, 39, 28],
    frameHighlight: [130, 184, 125],
    embeddedSurface: [30, 47, 33],
    headerBg: [35, 60, 37],
    headerTitle: [228, 241, 220],
    headerSubtitle: [172, 206, 160],
    headerRule: [130, 184, 125],
    divider: [70, 108, 63],
    overlayEyebrow: [163, 206, 150],
  },
  rune_forge: {
    id: "rune_forge",
    label: "Rune Forge",
    feature: "rune_forge",
    background: [30, 18, 7],
    frameShadow: [15, 10, 6],
    frameSurface: [45, 25, 13],
    frameHighlight: [228, 166, 87],
    embeddedSurface: [54, 30, 15],
    headerBg: [72, 38, 17],
    headerTitle: [247, 229, 196],
    headerSubtitle: [230, 185, 118],
    headerRule: [228, 166, 87],
    divider: [132, 83, 32],
    overlayEyebrow: [226, 182, 114],
  },
  training: {
    id: "training",
    label: "Drill Yard",
    feature: "training",
    background: [15, 20, 36],
    frameShadow: [10, 11, 18],
    frameSurface: [21, 29, 49],
    frameHighlight: [116, 154, 220],
    embeddedSurface: [25, 36, 58],
    headerBg: [30, 44, 79],
    headerTitle: [221, 232, 253],
    headerSubtitle: [165, 188, 235],
    headerRule: [116, 154, 220],
    divider: [63, 91, 146],
    overlayEyebrow: [146, 176, 230],
  },
  treasure: {
    id: "treasure",
    label: "Treasure Vault",
    feature: "treasure",
    background: [30, 23, 8],
    frameShadow: [16, 13, 8],
    frameSurface: [48, 35, 13],
    frameHighlight: [224, 191, 92],
    embeddedSurface: [58, 42, 16],
    headerBg: [82, 59, 18],
    headerTitle: [248, 240, 200],
    headerSubtitle: [233, 207, 121],
    headerRule: [224, 191, 92],
    divider: [132, 104, 40],
    overlayEyebrow: [230, 204, 118],
  },
};

export function resolveRoomSceneTheme(
  feature: string | null | undefined
): RoomSceneTheme {
  switch (feature) {
    case "combat":
      return ROOM_SCENE_THEMES.combat;
    case "dialogue":
      return ROOM_SCENE_THEMES.dialogue;
    case "rest":
      return ROOM_SCENE_THEMES.rest;
    case "rune_forge":
      return ROOM_SCENE_THEMES.rune_forge;
    case "training":
      return ROOM_SCENE_THEMES.training;
    case "treasure":
      return ROOM_SCENE_THEMES.treasure;
    default:
      return ROOM_SCENE_THEMES.default;
  }
}
