import type { KAPLAYCtx } from "kaplay";
import { addButton, addTabBar, LINE_H, UI_TAG } from "./shared";
import type { UiTone } from "./theme-tokens";
import {
  drawMutedTextAtom,
  drawSurfaceAtom,
  drawTextAtom,
  drawToneTextAtom,
} from "./ui/atoms";
import { renderSectionHeaderMolecule } from "./ui/molecules";

export interface DisplayScreenEntry {
  id: string;
  title: string;
  subtitle: string;
  detailLines: string[];
  tone: UiTone;
}

export interface DisplayScreenSelection<T extends DisplayScreenEntry> {
  pageCount: number;
  pageIndex: number;
  pagedEntries: T[];
  selectedEntry: T | null;
  selectedEntryId: string | null;
}

export interface DisplayScreenTab {
  label: string;
  onSelect: () => void;
}

interface DisplayEntryFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderDisplayScreenOptions<T extends DisplayScreenEntry> {
  k: KAPLAYCtx;
  x: number;
  y: number;
  width: number;
  title: string;
  subtitle: string;
  listTitle: string;
  entries: T[];
  pageIndex: number;
  selectedEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onPageChange: (pageIndex: number, nextSelectedEntryId: string | null) => void;
  tabs?: DisplayScreenTab[];
  activeTabLabel?: string;
  secondaryTabs?: DisplayScreenTab[];
  activeSecondaryTabLabel?: string;
  emptyListText: string;
  emptyDetailText: string;
  detailFooterText?: string;
  pageSize?: number;
  detailHeight?: number;
  renderListVisual?: (entry: T, frame: DisplayEntryFrame) => void;
  renderDetailVisual?: (entry: T, frame: DisplayEntryFrame) => void;
  tag?: string;
}

export function renderDisplayDetailLines(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  lines: string[],
  maxLines = 8,
  tag = UI_TAG
): number {
  let nextY = y;
  for (const line of lines.slice(0, maxLines)) {
    drawTextAtom(k, {
      x,
      y: nextY,
      text: line,
      size: 10,
      width,
      tag,
    });
    nextY += LINE_H;
  }
  return nextY;
}

export function resolveDisplayScreenSelection<T extends DisplayScreenEntry>(
  entries: T[],
  pageIndex: number,
  selectedEntryId: string | null,
  pageSize = 6
): DisplayScreenSelection<T> {
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const nextPageIndex = Math.max(0, Math.min(pageIndex, pageCount - 1));
  const pagedEntries = entries.slice(
    nextPageIndex * pageSize,
    nextPageIndex * pageSize + pageSize
  );
  const nextSelectedEntryId =
    selectedEntryId && entries.some((entry) => entry.id === selectedEntryId)
      ? selectedEntryId
      : (entries[0]?.id ?? null);
  const selectedEntry =
    entries.find((entry) => entry.id === nextSelectedEntryId) ??
    pagedEntries[0] ??
    null;

  return {
    pageCount,
    pageIndex: nextPageIndex,
    pagedEntries,
    selectedEntry,
    selectedEntryId: selectedEntry?.id ?? null,
  };
}

function drawDisplayPanelCard(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  tag = UI_TAG
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

export function renderDisplayScreen<T extends DisplayScreenEntry>(
  options: RenderDisplayScreenOptions<T>
): DisplayScreenSelection<T> {
  const {
    k,
    x,
    y,
    width,
    title,
    subtitle,
    listTitle,
    entries,
    pageIndex,
    selectedEntryId,
    onSelectEntry,
    onPageChange,
    tabs,
    activeTabLabel,
    secondaryTabs,
    activeSecondaryTabLabel,
    emptyListText,
    emptyDetailText,
    detailFooterText,
    renderListVisual,
    renderDetailVisual,
    tag = UI_TAG,
  } = options;
  const pageSize = options.pageSize ?? 6;
  const detailHeight = options.detailHeight ?? 196;
  const resolved = resolveDisplayScreenSelection(
    entries,
    pageIndex,
    selectedEntryId,
    pageSize
  );

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

  if (secondaryTabs && secondaryTabs.length > 0 && activeSecondaryTabLabel) {
    contentY = addTabBar(
      k,
      x,
      contentY + 2,
      secondaryTabs.map((tab) => tab.label),
      activeSecondaryTabLabel,
      (tabLabel) => {
        secondaryTabs.find((tab) => tab.label === tabLabel)?.onSelect();
      },
      tag
    );
  }

  contentY += 4;

  const listWidth = Math.max(152, Math.floor(width * 0.42));
  const detailX = x + listWidth + 10;
  const detailWidth = width - listWidth - 10;
  const listCardHeight = detailHeight;
  const detailCardHeight = detailHeight;
  const listInnerX = x + 10;
  let listY = contentY + 34;

  drawDisplayPanelCard(
    k,
    x,
    contentY,
    listWidth,
    listCardHeight,
    listTitle,
    tag
  );
  drawToneTextAtom(k, {
    x: x + listWidth - 34,
    y: contentY + 16,
    text: `${resolved.pageIndex + 1}/${resolved.pageCount}`,
    tone: "warn",
    size: 9,
    tag,
  });

  if (resolved.pagedEntries.length === 0) {
    drawMutedTextAtom(k, {
      x: listInnerX,
      y: listY,
      text: emptyListText,
      size: 10,
      width: listWidth - 20,
      tag,
    });
  } else {
    for (const entry of resolved.pagedEntries) {
      const buttonY = listY;
      const nextY = addButton(
        k,
        listInnerX,
        buttonY,
        listWidth - 20,
        entry.title,
        () => onSelectEntry(entry.id),
        true,
        {
          tone: resolved.selectedEntry?.id === entry.id ? "accent" : entry.tone,
          compact: true,
          tag,
        }
      );
      renderListVisual?.(entry, {
        x: listInnerX,
        y: buttonY,
        width: listWidth - 20,
        height: 20,
      });
      listY = nextY;
    }
  }

  if (resolved.pageCount > 1) {
    const navY = Math.max(listY + 2, contentY + listCardHeight - 34);
    const pageButtonWidth = Math.floor((listWidth - 28) / 2);
    addButton(
      k,
      listInnerX,
      navY,
      pageButtonWidth,
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
      listInnerX + pageButtonWidth + 8,
      navY,
      pageButtonWidth,
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

  drawDisplayPanelCard(
    k,
    detailX,
    contentY,
    detailWidth,
    detailCardHeight,
    "Entry Detail",
    tag
  );
  if (resolved.selectedEntry) {
    drawToneTextAtom(k, {
      x: detailX + 10,
      y: contentY + 20,
      text: resolved.selectedEntry.title,
      tone: resolved.selectedEntry.tone,
      size: 12,
      width: detailWidth - 20,
      tag,
    });
    drawMutedTextAtom(k, {
      x: detailX + 10,
      y: contentY + 38,
      text: resolved.selectedEntry.subtitle,
      size: 10,
      width: detailWidth - 20,
      tag,
    });
    renderDetailVisual?.(resolved.selectedEntry, {
      x: detailX + 10,
      y: contentY + 18,
      width: detailWidth - 20,
      height: 40,
    });
    renderDisplayDetailLines(
      k,
      detailX + 10,
      contentY + 60,
      detailWidth - 20,
      resolved.selectedEntry.detailLines,
      8,
      tag
    );
    if (detailFooterText) {
      drawMutedTextAtom(k, {
        x: detailX + 10,
        y: contentY + detailCardHeight - 24,
        text: detailFooterText,
        size: 10,
        width: detailWidth - 20,
        tag,
      });
    }
  } else {
    drawMutedTextAtom(k, {
      x: detailX + 10,
      y: contentY + 24,
      text: emptyDetailText,
      size: 10,
      width: detailWidth - 20,
      tag,
    });
  }

  return resolved;
}

interface RegisterDisplayHotkeysOptions {
  onOpenMap: () => void;
  onOpenSpellbook?: () => void;
  onOpenJournal?: () => void;
  onOpenStats?: () => void;
  onOpenEquipped?: () => void;
  onOpenBag?: () => void;
  onOpenDialogue?: () => void;
  onOpenRuneForge?: (() => void) | null;
  onEscape: () => void;
}

export function registerStandardDisplayHotkeys(
  k: KAPLAYCtx,
  options: RegisterDisplayHotkeysOptions
): void {
  k.onKeyPress("m", options.onOpenMap);
  if (options.onOpenSpellbook) {
    k.onKeyPress("p", options.onOpenSpellbook);
  }
  if (options.onOpenJournal) {
    k.onKeyPress("j", options.onOpenJournal);
  }
  if (options.onOpenStats) {
    k.onKeyPress("v", options.onOpenStats);
  }
  if (options.onOpenEquipped) {
    k.onKeyPress("q", options.onOpenEquipped);
  }
  if (options.onOpenBag) {
    k.onKeyPress("b", options.onOpenBag);
  }
  if (options.onOpenDialogue) {
    k.onKeyPress("t", options.onOpenDialogue);
  }
  if (options.onOpenRuneForge) {
    k.onKeyPress("r", options.onOpenRuneForge);
  }
  k.onKeyPress("escape", options.onEscape);
}

interface BuildDisplayHintsOptions {
  includeJournal?: boolean;
  includeSpellbook?: boolean;
  includeStats?: boolean;
  includeEquipped?: boolean;
  includeWorldMap?: boolean;
  includeBag?: boolean;
  includeDialogue?: boolean;
  includeRuneForge?: boolean;
}

export function buildStandardDisplayHints(
  options: BuildDisplayHintsOptions = {}
): string[] {
  const hints = ["[M] Map"];
  if (options.includeRuneForge) {
    hints.push("[R] Rune Forge");
  }
  if (options.includeSpellbook ?? true) {
    hints.push("[P] Spellbook");
  }
  if (options.includeStats ?? true) {
    hints.push("[V] Stats");
  }
  if (options.includeEquipped ?? true) {
    hints.push("[Q] Equipped");
  }
  if (options.includeWorldMap ?? true) {
    hints.push("[O] World");
  }
  if (options.includeJournal ?? true) {
    hints.push("[J] Journal");
  }
  if (options.includeDialogue) {
    hints.push("[T] Dialogue");
  }
  if (options.includeBag ?? true) {
    hints.push("[B] Bag");
  }
  hints.push("[Esc] Navigation");
  return hints;
}
