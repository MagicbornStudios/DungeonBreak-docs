import type { ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { actionToneFor, formatActionButtonLabel } from "./action-renderer";
import { addButton, UI_TAG } from "./shared";
import { drawMutedTextAtom, drawTextAtom } from "./ui/atoms";
import { renderSectionHeaderMolecule } from "./ui/molecules";

const ACTION_BUTTON_W_PADDING = 16;

export interface HeaderCommandItem {
  label: string;
  onClick: () => void;
  tone: "neutral" | "accent" | "danger";
}

export function roomFeatureLabel(feature: string): string {
  return feature
    .split("_")
    .map((part) => {
      return part.length > 0
        ? `${part[0].toUpperCase()}${part.slice(1)}`
        : part;
    })
    .join(" ");
}

export function renderActionColumn(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  selectedExit: {
    direction: "north" | "south" | "west" | "east";
    roomId: string;
    feature: string;
  } | null,
  globalActions: ActionItem[],
  onConfirmMove: () => void,
  onDoAction: (item: ActionItem) => void,
  moveSectionY: number,
  globalSectionY: number,
  tag = UI_TAG,
  showMoveSection = true,
  showStaticText = true,
  onOpenMoreGlobal?: (() => void) | null
): void {
  if (showStaticText) {
    renderSectionHeaderMolecule(k, {
      x: x + 12,
      y: y + 10,
      title: "Actions",
      tag,
    });
  }
  if (showMoveSection) {
    renderMoveActionBlock(
      k,
      x,
      y + moveSectionY,
      width,
      selectedExit,
      onConfirmMove,
      tag,
      showStaticText
    );
  }
  renderGlobalActionBlock(
    k,
    x,
    y + globalSectionY,
    width,
    globalActions,
    onDoAction,
    tag,
    showStaticText,
    onOpenMoreGlobal
  );
}

export function renderHeaderCommandBar(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  commands: HeaderCommandItem[],
  tag = UI_TAG
): void {
  let cursorX = x;
  let cursorY = y;
  const rowStep = 24;

  for (const command of commands) {
    const buttonWidth = Math.max(
      58,
      Math.min(92, command.label.length * 6 + 12)
    );
    if (cursorX + buttonWidth > x + width) {
      cursorX = x;
      cursorY += rowStep;
    }
    addButton(
      k,
      cursorX,
      cursorY,
      buttonWidth,
      command.label,
      command.onClick,
      true,
      {
        tone: command.tone,
        compact: true,
        tag,
      }
    );
    cursorX += buttonWidth + 6;
  }
}

export function renderRoomInfoPanel(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  title: string,
  featureLabel: string,
  lines: string[],
  roomActions: ActionItem[],
  onDoAction: (item: ActionItem) => void,
  tag = UI_TAG,
  showStaticText = true,
  onOpenMoreRoom?: (() => void) | null
): void {
  let cursorY = y + 48;
  if (showStaticText) {
    cursorY = renderSectionHeaderMolecule(k, {
      x: x + 14,
      y: y + 10,
      title,
      subtitle: featureLabel,
      titleSize: 12,
      subtitleSize: 10,
      tag,
    });

    for (const line of lines.slice(0, 3)) {
      drawTextAtom(k, {
        x: x + 14,
        y: cursorY,
        text: line,
        size: 10,
        width: width - 28,
        tag,
      });
      cursorY += 16;
    }
  }

  if (roomActions.length === 0) {
    return;
  }

  cursorY = showStaticText ? cursorY + 18 : y + 114;
  if (showStaticText) {
    drawMutedTextAtom(k, {
      x: x + 14,
      y: cursorY - 14,
      text: "Room Actions",
      size: 10,
      tag,
    });
  }
  let actionX = x + 14;
  let actionY = cursorY;
  const buttonWidth = 136;
  for (const item of roomActions) {
    addButton(
      k,
      actionX,
      actionY,
      buttonWidth,
      formatActionButtonLabel(item),
      () => onDoAction(item),
      item.available,
      { tone: actionToneFor(item), compact: true, tag }
    );
    actionX += buttonWidth + 10;
    if (actionX + buttonWidth > x + width - 14) {
      actionX = x + 14;
      actionY += 44;
    }
  }
  if (!onOpenMoreRoom) {
    return;
  }
  addButton(
    k,
    actionX,
    actionY,
    buttonWidth,
    "[MORE] More",
    onOpenMoreRoom,
    true,
    { tone: "neutral", compact: true, tag }
  );
}

export function renderMoveActionBlock(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  selectedExit: {
    direction: "north" | "south" | "west" | "east";
    roomId: string;
    feature: string;
  } | null,
  onConfirmMove: () => void,
  tag: string,
  showStaticText = true
): void {
  if (showStaticText) {
    drawMutedTextAtom(k, {
      x: x + 12,
      y,
      text: "Move",
      size: 10,
      tag,
    });
  }
  const cursorY = showStaticText ? y + 14 : y;

  if (!selectedExit) {
    drawMutedTextAtom(k, {
      x: x + 12,
      y: cursorY,
      text: "No route available.",
      size: 9,
      width: width - ACTION_BUTTON_W_PADDING,
      tag,
    });
    return;
  }
  addButton(
    k,
    x + 12,
    cursorY,
    width - ACTION_BUTTON_W_PADDING,
    "Move",
    onConfirmMove,
    true,
    { tone: "accent", compact: true, tag }
  );
}

function renderGlobalActionBlock(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  globalActions: ActionItem[],
  onDoAction: (item: ActionItem) => void,
  tag: string,
  showStaticText = true,
  onOpenMoreGlobal?: (() => void) | null
): void {
  let cursorY = y;
  if (globalActions.length > 0 && showStaticText) {
    drawMutedTextAtom(k, {
      x: x + 12,
      y: cursorY,
      text: "Global",
      size: 10,
      tag,
    });
    cursorY += 14;
  }
  if (globalActions.length > 0 && !showStaticText) {
    cursorY = y;
  }

  for (const item of globalActions) {
    cursorY = addButton(
      k,
      x + 12,
      cursorY,
      width - ACTION_BUTTON_W_PADDING,
      formatActionButtonLabel(item),
      () => {
        onDoAction(item);
      },
      item.available,
      { tone: actionToneFor(item), compact: true, tag }
    );
  }
  if (onOpenMoreGlobal) {
    cursorY = addButton(
      k,
      x + 12,
      cursorY,
      width - ACTION_BUTTON_W_PADDING,
      "[MORE] More",
      onOpenMoreGlobal,
      true,
      { tone: "neutral", compact: true, tag }
    );
  }

  if (globalActions.length > 0 || onOpenMoreGlobal) {
    return;
  }

  if (showStaticText) {
    drawMutedTextAtom(k, {
      x: x + 12,
      y: cursorY + 2,
      text: "No global actions here.",
      size: 9,
      width: width - ACTION_BUTTON_W_PADDING,
      tag,
    });
  }
}
