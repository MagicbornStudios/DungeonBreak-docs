export type UiTone = "neutral" | "good" | "warn" | "danger" | "accent";

export const UI_FONT_FAMILY = "Montserrat";
export const DISPLAY_FONT_FAMILY = "Montserrat";

export const uiPalette = {
  panelBg: [26, 17, 18] as const,
  panelBorder: [112, 82, 46] as const,
  panelShadow: [12, 8, 10] as const,
  panelHighlight: [184, 140, 76] as const,
  headerBg: [38, 19, 22] as const,
  headerTitle: [244, 227, 193] as const,
  headerSubtitle: [198, 160, 110] as const,
  textPrimary: [234, 221, 198] as const,
  textMuted: [163, 139, 112] as const,
  iconAccent: [214, 171, 104] as const,
  separator: [84, 58, 34] as const,
};

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
  narrator: [208, 186, 160] as const,
  plain: [176, 160, 142] as const,
};

export const actionGlyphByType: Record<string, string> = {
  move: "[MV]",
  whistle: "[MNT]",
  fight: "[ATK]",
  flee: "[RUN]",
  talk: "[TALK]",
  choose_dialogue: "[DIA]",
  rest: "[REST]",
  train: "[TRN]",
  search: "[SRCH]",
  inspect: "[LOOK]",
  use_item: "[USE]",
  equip_item: "[EQP]",
  drop_item: "[DROP]",
  purchase: "[BUY]",
  re_equip: "[RE-EQ]",
  evolve_skill: "[EVO]",
  stream: "[CAST]",
  save_slot: "[SAVE]",
  load_slot: "[LOAD]",
  look: "[LOOK]",
  status: "[STAT]",
};
