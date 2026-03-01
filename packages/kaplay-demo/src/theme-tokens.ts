export type UiTone = "neutral" | "good" | "warn" | "danger" | "accent";

export const uiPalette = {
  panelBg: [20, 28, 48] as const,
  panelBorder: [44, 62, 100] as const,
  headerBg: [28, 36, 62] as const,
  headerTitle: [230, 230, 240] as const,
  headerSubtitle: [170, 180, 205] as const,
};

export const tonePalette: Record<UiTone, { bg: [number, number, number]; fg: [number, number, number] }> = {
  neutral: { bg: [42, 54, 82], fg: [196, 208, 232] },
  good: { bg: [30, 78, 52], fg: [192, 238, 208] },
  warn: { bg: [84, 66, 28], fg: [245, 222, 162] },
  danger: { bg: [92, 34, 40], fg: [250, 196, 202] },
  accent: { bg: [58, 76, 108], fg: [226, 230, 240] },
};

export const feedToneColor = {
  chapter: [246, 221, 162] as const,
  dialogue: [206, 226, 248] as const,
  combat: [246, 182, 182] as const,
  system: [176, 212, 176] as const,
  narrator: [218, 214, 236] as const,
  plain: [175, 178, 190] as const,
};

export const actionGlyphByType: Record<string, string> = {
  move: "[MV]",
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

