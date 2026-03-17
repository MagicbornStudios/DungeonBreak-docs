import type { KAPLAYCtx } from "kaplay";
import type { DisplayScreenEntry, DisplayScreenTab } from "./display-screen";
import {
  renderDisplayDetailLines,
  resolveDisplayScreenSelection,
} from "./display-screen";
import { addButton, addTabBar, UI_TAG, type UiTone } from "./shared";
import { tonePalette, uiPalette } from "./theme-tokens";
import {
  drawMutedTextAtom,
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
  accent?: [number, number, number];
}

export interface LoadoutGridEntry extends DisplayScreenEntry {
  icon: GridIconSpec;
  metaLabel?: string;
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
  actions?: LoadoutGridAction[];
  emptyGridText: string;
  emptyDetailText: string;
  detailFooterText?: string;
  tag?: string;
}

function drawPanelCard(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  tag: string
): void {
  drawSurfaceAtom(k, x, y, width, height, tag);
  k.add([
    k.rect(width - 20, 2, { radius: 1 }),
    k.pos(x + 10, y + 10),
    k.color(176, 128, 68),
    tag,
  ]);
  drawMutedTextAtom(k, {
    x: x + 10,
    y: y + 16,
    text: label,
    size: 9,
    width: width - 20,
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

function drawSelectableCard(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  tone: UiTone,
  selected: boolean,
  onSelect: () => void,
  tag: string
) {
  const baseTone = selected ? "accent" : tone;
  const palette = tonePalette[baseTone];
  k.add([
    k.rect(width, height, { radius: 5 }),
    k.pos(x, y),
    k.color(20, 14, 18),
    tag,
  ]);
  const button = k.add([
    k.rect(width - 2, height - 2, { radius: 4 }),
    k.pos(x + 1, y + 1),
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
    actions = [],
    emptyGridText,
    emptyDetailText,
    detailFooterText,
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
      tabs.map((tab) => tab.label),
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
      filterTabs.map((tab) => tab.label),
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
      sortTabs.map((tab) => tab.label),
      activeSortLabel,
      (tabLabel) => {
        sortTabs.find((tab) => tab.label === tabLabel)?.onSelect();
      },
      tag
    );
  }

  contentY += 4;

  const actionRowH = actions.length > 0 ? 28 : 0;
  const contentHeight = height - (contentY - y) - actionRowH;
  const slotX = x;
  const gridX = slotX + SLOT_PANEL_W + PANEL_GAP;
  const detailX = x + width - DETAIL_PANEL_W;
  const gridWidth = Math.max(GRID_CARD_MIN * 3, detailX - gridX - PANEL_GAP);
  const gridY = contentY;
  const panelHeight = contentHeight - 2;

  drawPanelCard(k, slotX, contentY, SLOT_PANEL_W, panelHeight, slotsTitle, tag);
  drawPanelCard(k, gridX, contentY, gridWidth, panelHeight, gridTitle, tag);
  drawPanelCard(
    k,
    detailX,
    contentY,
    DETAIL_PANEL_W,
    panelHeight,
    detailTitle,
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
        tag
      );
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
    drawGridIcon(
      k,
      selected.icon,
      detailX + DETAIL_PANEL_W - 52,
      contentY + 16,
      28,
      selected.tone,
      tag
    );
    drawToneTextAtom(k, {
      x: detailX + 10,
      y: contentY + 20,
      text: selected.title,
      tone: selected.tone,
      size: 12,
      width: DETAIL_PANEL_W - 70,
      tag,
    });
    drawMutedTextAtom(k, {
      x: detailX + 10,
      y: contentY + 38,
      text: selected.subtitle,
      size: 10,
      width: DETAIL_PANEL_W - 20,
      tag,
    });
    renderDisplayDetailLines(
      k,
      detailX + 10,
      contentY + 58,
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

  if (actions.length > 0) {
    const buttonY = y + height - 24;
    const gap = 8;
    const buttonW = Math.floor(
      (width - gap * (actions.length - 1)) / actions.length
    );
    for (const [index, action] of actions.entries()) {
      addButton(
        k,
        x + index * (buttonW + gap),
        buttonY,
        buttonW,
        action.label,
        action.onSelect,
        action.enabled,
        {
          tone: action.tone,
          compact: true,
          tag,
        }
      );
    }
  }

  return resolved;
}
