import type { KAPLAYCtx } from "kaplay";
import type { DisplayScreenEntry, DisplayScreenTab } from "./display-screen";
import {
  renderDisplayDetailLines,
  resolveDisplayScreenSelection,
} from "./display-screen";
import {
  addButton,
  addTabBar,
  type TabBarItem,
  UI_TAG,
  type UiTone,
} from "./shared";
import { tonePalette, uiPalette } from "./theme-tokens";
import {
  drawButtonSurfaceAtom,
  drawKeycapAtom,
  drawMutedTextAtom,
  drawSelectionFrameAtom,
  drawSurfaceAtom,
  drawTextAtom,
  drawToneTextAtom,
} from "./ui/atoms";
import { renderSectionHeaderMolecule } from "./ui/molecules";

const SLOT_PANEL_W = 126;
const DETAIL_PANEL_W = 224;
const PANEL_GAP = 10;
const GRID_CARD_GAP = 8;
const GRID_CARD_MAX = 82;
const GRID_CARD_MIN = 72;
const CONTROL_STRIP_H = 28;

export type GridIconKind =
  | "weapon"
  | "armor"
  | "accessory"
  | "consumable"
  | "loot"
  | "conversation"
  | "transportation"
  | "exploration"
  | "combat"
  | "crafting"
  | "detection"
  | "spell"
  | "empty";

export interface GridIconSpec {
  kind: GridIconKind;
  spriteName?: string | null;
  accent?: [number, number, number];
}

export interface LoadoutGridEntry extends DisplayScreenEntry {
  icon: GridIconSpec;
  metaLabel?: string;
  rarityColor?: [number, number, number] | null;
  rarityIcon?: GridIconSpec;
  rarityLabel?: string | null;
}

export interface LoadoutSlotEntry {
  id: string;
  label: string;
  subtitle: string;
  icon: GridIconSpec;
  tone: UiTone;
  occupiedLabel?: string;
  selected: boolean;
  onSelect: () => void;
}

export interface LoadoutGridAction {
  label: string;
  tone: UiTone;
  enabled: boolean;
  onSelect: () => void;
  icon?: GridIconSpec;
}

export interface LoadoutGridControlHint extends TabBarItem {
  keycap: string;
  tone?: UiTone;
}

interface RenderLoadoutGridScreenOptions<T extends LoadoutGridEntry> {
  k: KAPLAYCtx;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle: string;
  slotsTitle: string;
  gridTitle: string;
  detailTitle?: string;
  slots: LoadoutSlotEntry[];
  entries: T[];
  pageIndex: number;
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onPageChange: (pageIndex: number, nextSelectedEntryId: string | null) => void;
  tabs?: DisplayScreenTab[];
  activeTabLabel?: string;
  filterTabs?: DisplayScreenTab[];
  activeFilterLabel?: string;
  sortTabs?: DisplayScreenTab[];
  activeSortLabel?: string;
  controlHints?: LoadoutGridControlHint[];
  actions?: LoadoutGridAction[];
  detailVisualHeight?: number;
  emptyGridText: string;
  emptyDetailText: string;
  detailFooterText?: string;
  panelIcons?: {
    detail?: GridIconSpec;
    grid?: GridIconSpec;
    slots?: GridIconSpec;
  };
  renderDetailVisual?: (
    entry: T,
    frame: { height: number; width: number; x: number; y: number }
  ) => void;
  tag?: string;
}

function drawPanelCard(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  icon: GridIconSpec | undefined,
  tag: string
): void {
  drawSurfaceAtom(k, x, y, width, height, tag);
  k.add([
    k.rect(width - 20, 2, { radius: 1 }),
    k.pos(x + 10, y + 10),
    k.color(176, 128, 68),
    tag,
  ]);
  if (icon) {
    drawGridIcon(k, icon, x + 10, y + 14, 20, "accent", tag);
  }
  drawMutedTextAtom(k, {
    x: x + (icon ? 36 : 10),
    y: y + 16,
    text: label,
    size: 9,
    width: width - (icon ? 46 : 20),
    tag,
  });
}

function drawGlyphRect(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number],
  tag: string
): void {
  k.add([
    k.rect(width, height, { radius: 2 }),
    k.pos(x, y),
    k.color(color[0], color[1], color[2]),
    tag,
  ]);
}

function iconAccent(
  icon: GridIconSpec,
  tone: UiTone
): [number, number, number] {
  if (icon.accent) {
    return icon.accent;
  }
  const palette = tonePalette[tone];
  return [palette.fg[0], palette.fg[1], palette.fg[2]];
}

function drawGridIcon(
  k: KAPLAYCtx,
  icon: GridIconSpec,
  x: number,
  y: number,
  size: number,
  tone: UiTone,
  tag: string
): void {
  const accent = iconAccent(icon, tone);
  const shadow: [number, number, number] = [42, 26, 24];
  drawGlyphRect(k, x, y, size, size, shadow, tag);
  drawGlyphRect(k, x + 1, y + 1, size - 2, size - 2, [26, 19, 22], tag);

  if (icon.spriteName) {
    k.add([
      k.sprite(icon.spriteName),
      k.pos(x + size / 2, y + size / 2),
      k.anchor("center"),
      k.scale(Math.max(0.7, (size - 8) / 32)),
      tag,
    ]);
    return;
  }

  const cx = x + Math.floor(size / 2);
  const cy = y + Math.floor(size / 2);
  switch (icon.kind) {
    case "weapon":
      drawGlyphRect(k, cx - 4, y + 9, 8, size - 20, accent, tag);
      drawGlyphRect(k, cx - 8, y + 20, 16, 4, accent, tag);
      drawGlyphRect(k, cx - 2, y + size - 13, 4, 8, [194, 157, 113], tag);
      break;
    case "armor":
      drawGlyphRect(k, cx - 14, y + 10, 10, 8, accent, tag);
      drawGlyphRect(k, cx + 4, y + 10, 10, 8, accent, tag);
      drawGlyphRect(k, cx - 12, y + 18, 24, 20, accent, tag);
      drawGlyphRect(k, cx - 8, y + 40, 16, 5, [194, 157, 113], tag);
      break;
    case "accessory":
      drawGlyphRect(k, cx - 12, cy - 4, 24, 8, accent, tag);
      drawGlyphRect(k, cx - 4, cy - 12, 8, 24, accent, tag);
      drawGlyphRect(k, cx - 7, cy - 7, 14, 14, [26, 19, 22], tag);
      break;
    case "consumable":
      drawGlyphRect(k, cx - 8, y + 10, 16, 5, [194, 157, 113], tag);
      drawGlyphRect(k, cx - 10, y + 15, 20, 24, accent, tag);
      drawGlyphRect(k, cx - 4, y + 20, 8, 6, [240, 214, 156], tag);
      break;
    case "conversation":
      drawGlyphRect(k, x + 9, y + 12, size - 18, 18, accent, tag);
      drawGlyphRect(k, x + 16, y + 28, 10, 8, accent, tag);
      break;
    case "transportation":
      drawGlyphRect(k, x + 10, cy - 3, size - 24, 6, accent, tag);
      drawGlyphRect(k, x + size - 22, cy - 9, 12, 18, accent, tag);
      break;
    case "exploration":
      drawGlyphRect(k, cx - 2, y + 10, 4, size - 20, accent, tag);
      drawGlyphRect(k, x + 10, cy - 2, size - 20, 4, accent, tag);
      drawGlyphRect(k, cx - 8, cy - 8, 16, 16, [194, 157, 113], tag);
      break;
    case "combat":
      drawGlyphRect(k, cx - 3, y + 8, 6, size - 16, accent, tag);
      drawGlyphRect(k, x + 8, cy - 3, size - 16, 6, accent, tag);
      drawGlyphRect(k, x + 15, y + 15, 8, 8, [194, 157, 113], tag);
      drawGlyphRect(
        k,
        x + size - 23,
        y + size - 23,
        8,
        8,
        [194, 157, 113],
        tag
      );
      break;
    case "crafting":
      drawGlyphRect(k, cx - 12, y + 14, 24, 6, accent, tag);
      drawGlyphRect(k, cx - 4, y + 20, 8, 16, accent, tag);
      drawGlyphRect(k, cx - 16, y + 36, 32, 6, [194, 157, 113], tag);
      break;
    case "detection":
      drawGlyphRect(k, x + 10, cy - 4, size - 20, 8, accent, tag);
      drawGlyphRect(k, cx - 4, y + 10, 8, size - 20, accent, tag);
      drawGlyphRect(k, cx - 2, cy - 2, 4, 4, [240, 214, 156], tag);
      break;
    case "loot":
      drawGlyphRect(k, x + 10, y + 14, size - 20, 10, accent, tag);
      drawGlyphRect(k, x + 14, y + 26, size - 28, 10, [194, 157, 113], tag);
      drawGlyphRect(k, x + 18, y + 38, size - 36, 8, accent, tag);
      break;
    case "spell":
      drawGlyphRect(k, cx - 6, y + 10, 12, 12, accent, tag);
      drawGlyphRect(k, x + 16, y + 26, size - 32, 6, accent, tag);
      drawGlyphRect(k, cx - 3, y + 32, 6, 14, [194, 157, 113], tag);
      break;
    default:
      drawGlyphRect(k, x + 12, cy - 2, size - 24, 4, accent, tag);
      drawGlyphRect(k, cx - 2, y + 12, 4, size - 24, accent, tag);
      break;
  }
}

function drawInfoChip(
  k: KAPLAYCtx,
  x: number,
  y: number,
  label: string,
  tone: UiTone,
  tag: string,
  opts?: {
    icon?: GridIconSpec;
    keycap?: string;
    maxWidth?: number;
  }
): number {
  const iconInset = opts?.icon ? 18 : 0;
  const keycapInset = opts?.keycap ? opts.keycap.length * 6 + 18 : 0;
  const width = Math.max(
    70,
    Math.min(
      opts?.maxWidth ?? Number.MAX_SAFE_INTEGER,
      label.length * 6 + 20 + iconInset + keycapInset
    )
  );
  drawSurfaceAtom(k, x, y, width, CONTROL_STRIP_H, tag, {
    bg: tonePalette.neutral.bg,
    border: uiPalette.separator,
    highlight: uiPalette.panelHeaderRule,
  });
  if (opts?.icon) {
    drawGridIcon(k, opts.icon, x + 6, y + 6, 16, tone, tag);
  }
  const textX = x + 10 + iconInset + (opts?.icon ? 2 : 0);
  if (opts?.keycap) {
    const keycapWidth = opts.keycap.length * 6 + 10;
    drawKeycapAtom(k, {
      x: x + width - keycapWidth - 8,
      y: y + 6,
      text: opts.keycap,
      tone,
      tag,
    });
  }
  drawToneTextAtom(k, {
    x: textX,
    y: y + 9,
    text: label,
    tone,
    size: 9,
    width: width - (textX - x) - (opts?.keycap ? keycapInset : 10),
    tag,
  });
  return width;
}

function drawActionButton(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  action: LoadoutGridAction,
  tag: string
): void {
  const button = drawButtonSurfaceAtom(k, {
    x,
    y,
    width,
    height: CONTROL_STRIP_H,
    tone: action.tone,
    enabled: action.enabled,
    tag,
  });
  let textX = x + 8;
  if (action.icon) {
    drawGridIcon(k, action.icon, x + 6, y + 6, 16, action.tone, tag);
    textX += 20;
  }
  drawToneTextAtom(k, {
    x: textX,
    y: y + 9,
    text: action.label,
    tone: action.tone,
    size: 9,
    width: width - (textX - x) - 8,
    disabled: !action.enabled,
    tag,
  });
  if (action.enabled) {
    const bg = tonePalette[action.tone].bg;
    const hover = [
      Math.min(255, bg[0] + 20),
      Math.min(255, bg[1] + 20),
      Math.min(255, bg[2] + 20),
    ] as const;
    button.onHover(() => {
      button.color = k.rgb(hover[0], hover[1], hover[2]);
    });
    button.onHoverEnd(() => {
      button.color = k.rgb(bg[0], bg[1], bg[2]);
    });
    button.onClick(action.onSelect);
  }
}

function renderControlHintsRow(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  hints: LoadoutGridControlHint[],
  tag: string
): number {
  let cursorX = x;
  for (const hint of hints) {
    if (cursorX >= x + width - 70) {
      break;
    }
    const chipWidth = drawInfoChip(
      k,
      cursorX,
      y,
      hint.label,
      hint.tone ?? "neutral",
      tag,
      {
        icon: hint.iconSpriteName
          ? { kind: "loot", spriteName: hint.iconSpriteName }
          : undefined,
        keycap: hint.keycap,
        maxWidth: x + width - cursorX,
      }
    );
    cursorX += chipWidth + 8;
  }
  return y + CONTROL_STRIP_H + 6;
}

function drawRarityBadge(
  k: KAPLAYCtx,
  entry: LoadoutGridEntry,
  x: number,
  y: number,
  tag: string
): void {
  if (!(entry.rarityLabel || entry.rarityIcon)) {
    return;
  }
  drawInfoChip(k, x, y, entry.rarityLabel ?? "Known", "accent", tag, {
    icon: entry.rarityIcon ?? undefined,
    maxWidth: 94,
  });
}

function drawSelectableCard(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  tone: UiTone,
  selected: boolean,
  onSelect: () => void,
  tag: string,
  accentColor?: [number, number, number] | null
) {
  const baseTone = selected ? "accent" : tone;
  const palette = tonePalette[baseTone];
  let borderColor: [number, number, number] = [...uiPalette.separator];
  if (selected && accentColor) {
    borderColor = accentColor;
  } else if (selected) {
    borderColor = [...uiPalette.selectionOutline];
  }
  k.add([
    k.rect(width, height, { radius: 5 }),
    k.pos(x, y),
    k.color(borderColor[0], borderColor[1], borderColor[2]),
    tag,
  ]);
  const button = k.add([
    k.rect(width - (selected ? 4 : 2), height - (selected ? 4 : 2), {
      radius: 4,
    }),
    k.pos(x + (selected ? 2 : 1), y + (selected ? 2 : 1)),
    k.area(),
    k.color(palette.bg[0], palette.bg[1], palette.bg[2]),
    tag,
  ]);
  const hover = [
    Math.min(255, palette.bg[0] + 18),
    Math.min(255, palette.bg[1] + 18),
    Math.min(255, palette.bg[2] + 18),
  ] as const;
  button.onHover(() => {
    button.color = k.rgb(hover[0], hover[1], hover[2]);
  });
  button.onHoverEnd(() => {
    button.color = k.rgb(palette.bg[0], palette.bg[1], palette.bg[2]);
  });
  button.onClick(onSelect);
  if (selected) {
    const fill = accentColor ?? uiPalette.selectionFill;
    k.add([
      k.rect(width - 12, 4, { radius: 2 }),
      k.pos(x + 6, y + 6),
      k.color(fill[0], fill[1], fill[2]),
      tag,
    ]);
    k.add([
      k.rect(4, height - 8, { radius: 2 }),
      k.pos(x + 4, y + 4),
      k.color(fill[0], fill[1], fill[2]),
      tag,
    ]);
  }
  if (selected) {
    drawSelectionFrameAtom(k, {
      x,
      y,
      width,
      height,
      tag,
    });
  }
  return button;
}

export function renderLoadoutGridScreen<T extends LoadoutGridEntry>(
  options: RenderLoadoutGridScreenOptions<T>
) {
  const {
    k,
    x,
    y,
    width,
    height,
    title,
    subtitle,
    slotsTitle,
    gridTitle,
    detailTitle = "Detail",
    slots,
    entries,
    pageIndex,
    selectedEntryId,
    onSelectEntry,
    onPageChange,
    tabs,
    activeTabLabel,
    filterTabs,
    activeFilterLabel,
    sortTabs,
    activeSortLabel,
    controlHints = [],
    actions = [],
    detailVisualHeight = 82,
    emptyGridText,
    emptyDetailText,
    detailFooterText,
    panelIcons,
    renderDetailVisual,
    tag = UI_TAG,
  } = options;

  let contentY = renderSectionHeaderMolecule(k, {
    x,
    y,
    title,
    subtitle,
    tag,
  });

  if (tabs && tabs.length > 0 && activeTabLabel) {
    contentY = addTabBar(
      k,
      x,
      contentY + 2,
      tabs,
      activeTabLabel,
      (tabLabel) => {
        tabs.find((tab) => tab.label === tabLabel)?.onSelect();
      },
      tag
    );
  }

  if (filterTabs && filterTabs.length > 0 && activeFilterLabel) {
    contentY = addTabBar(
      k,
      x,
      contentY + 2,
      filterTabs,
      activeFilterLabel,
      (tabLabel) => {
        filterTabs.find((tab) => tab.label === tabLabel)?.onSelect();
      },
      tag
    );
  }

  if (sortTabs && sortTabs.length > 0 && activeSortLabel) {
    contentY = addTabBar(
      k,
      x,
      contentY + 2,
      sortTabs,
      activeSortLabel,
      (tabLabel) => {
        sortTabs.find((tab) => tab.label === tabLabel)?.onSelect();
      },
      tag
    );
  }

  contentY += 4;

  if (controlHints.length > 0) {
    contentY = renderControlHintsRow(k, x, contentY, width, controlHints, tag);
  }

  if (actions.length > 0) {
    const gap = 8;
    const buttonW = Math.floor(
      (width - gap * (actions.length - 1)) / actions.length
    );
    for (const [index, action] of actions.entries()) {
      drawActionButton(
        k,
        x + index * (buttonW + gap),
        contentY,
        buttonW,
        action,
        tag
      );
    }
    contentY += CONTROL_STRIP_H + 8;
  }

  const contentHeight = height - (contentY - y);
  const slotX = x;
  const gridX = slotX + SLOT_PANEL_W + PANEL_GAP;
  const detailX = x + width - DETAIL_PANEL_W;
  const gridWidth = Math.max(GRID_CARD_MIN * 3, detailX - gridX - PANEL_GAP);
  const gridY = contentY;
  const panelHeight = contentHeight - 2;

  drawPanelCard(
    k,
    slotX,
    contentY,
    SLOT_PANEL_W,
    panelHeight,
    slotsTitle,
    panelIcons?.slots,
    tag
  );
  drawPanelCard(
    k,
    gridX,
    contentY,
    gridWidth,
    panelHeight,
    gridTitle,
    panelIcons?.grid,
    tag
  );
  drawPanelCard(
    k,
    detailX,
    contentY,
    DETAIL_PANEL_W,
    panelHeight,
    detailTitle,
    panelIcons?.detail,
    tag
  );

  let slotY = contentY + 32;
  for (const slot of slots) {
    drawSelectableCard(
      k,
      slotX + 8,
      slotY,
      SLOT_PANEL_W - 16,
      50,
      slot.selected ? "accent" : slot.tone,
      slot.selected,
      slot.onSelect,
      tag
    );
    drawGridIcon(k, slot.icon, slotX + 14, slotY + 8, 32, slot.tone, tag);
    drawToneTextAtom(k, {
      x: slotX + 52,
      y: slotY + 8,
      text: slot.label,
      tone: slot.selected ? "accent" : slot.tone,
      size: 10,
      width: SLOT_PANEL_W - 60,
      tag,
    });
    drawMutedTextAtom(k, {
      x: slotX + 52,
      y: slotY + 22,
      text: slot.subtitle,
      size: 9,
      width: SLOT_PANEL_W - 60,
      tag,
    });
    if (slot.occupiedLabel) {
      drawMutedTextAtom(k, {
        x: slotX + 14,
        y: slotY + 38,
        text: slot.occupiedLabel,
        size: 8,
        width: SLOT_PANEL_W - 24,
        tag,
      });
    }
    slotY += 56;
  }

  const gridCols = Math.max(
    3,
    Math.min(
      4,
      Math.floor(
        (gridWidth - 18 + GRID_CARD_GAP) / (GRID_CARD_MIN + GRID_CARD_GAP)
      )
    )
  );
  const cardSize = Math.max(
    GRID_CARD_MIN,
    Math.min(
      GRID_CARD_MAX,
      Math.floor((gridWidth - 18 - GRID_CARD_GAP * (gridCols - 1)) / gridCols)
    )
  );
  const gridRows = Math.max(
    1,
    Math.min(3, Math.floor((panelHeight - 52) / (cardSize + GRID_CARD_GAP)))
  );
  const pageSize = Math.max(1, gridCols * gridRows);
  const resolved = resolveDisplayScreenSelection(
    entries,
    pageIndex,
    selectedEntryId,
    pageSize
  );

  const gridInnerX = gridX + 9;
  const gridInnerY = contentY + 32;
  if (resolved.pagedEntries.length === 0) {
    drawMutedTextAtom(k, {
      x: gridInnerX,
      y: gridInnerY,
      text: emptyGridText,
      size: 10,
      width: gridWidth - 18,
      tag,
    });
  } else {
    for (const [index, entry] of resolved.pagedEntries.entries()) {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const cardX = gridInnerX + col * (cardSize + GRID_CARD_GAP);
      const cardY = gridInnerY + row * (cardSize + GRID_CARD_GAP);
      drawSelectableCard(
        k,
        cardX,
        cardY,
        cardSize,
        cardSize,
        entry.tone,
        resolved.selectedEntry?.id === entry.id,
        () => onSelectEntry(entry.id),
        tag,
        entry.rarityColor
      );
      if (entry.rarityColor) {
        drawGlyphRect(
          k,
          cardX + 8,
          cardY + 8,
          cardSize - 16,
          3,
          entry.rarityColor,
          tag
        );
      }
      if (entry.rarityIcon) {
        drawGridIcon(
          k,
          entry.rarityIcon,
          cardX + cardSize - 24,
          cardY + 8,
          14,
          "accent",
          tag
        );
      }
      drawGridIcon(k, entry.icon, cardX + 10, cardY + 8, 30, entry.tone, tag);
      drawToneTextAtom(k, {
        x: cardX + 8,
        y: cardY + 42,
        text: entry.title,
        tone: resolved.selectedEntry?.id === entry.id ? "accent" : entry.tone,
        size: 9,
        width: cardSize - 16,
        tag,
      });
      drawMutedTextAtom(k, {
        x: cardX + 8,
        y: cardY + 56,
        text: entry.metaLabel ?? entry.subtitle,
        size: 8,
        width: cardSize - 16,
        tag,
      });
    }
  }

  drawToneTextAtom(k, {
    x: gridX + gridWidth - 44,
    y: contentY + 16,
    text: `${resolved.pageIndex + 1}/${resolved.pageCount}`,
    tone: "warn",
    size: 9,
    tag,
  });
  if (resolved.pageCount > 1) {
    const navY = contentY + panelHeight - 28;
    const buttonW = Math.floor((gridWidth - 26) / 2);
    addButton(
      k,
      gridX + 8,
      navY,
      buttonW,
      "Prev",
      () => {
        const nextPageIndex = Math.max(0, resolved.pageIndex - 1);
        const nextSelectedEntryId =
          entries[nextPageIndex * pageSize]?.id ?? resolved.selectedEntryId;
        onPageChange(nextPageIndex, nextSelectedEntryId);
      },
      resolved.pageIndex > 0,
      { tone: "neutral", compact: true, tag }
    );
    addButton(
      k,
      gridX + 12 + buttonW,
      navY,
      buttonW,
      "Next",
      () => {
        const nextPageIndex = Math.min(
          resolved.pageCount - 1,
          resolved.pageIndex + 1
        );
        const nextSelectedEntryId =
          entries[nextPageIndex * pageSize]?.id ?? resolved.selectedEntryId;
        onPageChange(nextPageIndex, nextSelectedEntryId);
      },
      resolved.pageIndex < resolved.pageCount - 1,
      { tone: "neutral", compact: true, tag }
    );
  }

  const selected = resolved.selectedEntry;
  if (selected) {
    const detailVisualFrame = {
      height: detailVisualHeight,
      width: DETAIL_PANEL_W - 20,
      x: detailX + 10,
      y: contentY + 18,
    };
    if (renderDetailVisual) {
      renderDetailVisual(selected, detailVisualFrame);
    } else {
      drawGridIcon(
        k,
        selected.icon,
        detailX + DETAIL_PANEL_W - 52,
        contentY + 16,
        28,
        selected.tone,
        tag
      );
    }
    drawRarityBadge(k, selected, detailX + 10, contentY + 12, tag);
    drawToneTextAtom(k, {
      x: detailX + 10,
      y: contentY + detailVisualHeight + 22,
      text: selected.title,
      tone: selected.tone,
      size: 12,
      width: DETAIL_PANEL_W - 20,
      tag,
    });
    drawMutedTextAtom(k, {
      x: detailX + 10,
      y: contentY + detailVisualHeight + 40,
      text: selected.subtitle,
      size: 10,
      width: DETAIL_PANEL_W - 20,
      tag,
    });
    renderDisplayDetailLines(
      k,
      detailX + 10,
      contentY + detailVisualHeight + 58,
      DETAIL_PANEL_W - 20,
      selected.detailLines,
      10,
      tag
    );
    if (detailFooterText) {
      drawMutedTextAtom(k, {
        x: detailX + 10,
        y: contentY + panelHeight - 22,
        text: detailFooterText,
        size: 9,
        width: DETAIL_PANEL_W - 20,
        tag,
      });
    }
  } else {
    drawTextAtom(k, {
      x: detailX + 10,
      y: contentY + 28,
      text: emptyDetailText,
      size: 10,
      width: DETAIL_PANEL_W - 20,
      color: uiPalette.textMuted,
      tag,
    });
  }

  return resolved;
}
