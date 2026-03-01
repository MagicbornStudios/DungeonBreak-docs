import type { ActionItem, PlayUiAction } from "@dungeonbreak/engine";
import type { UiTone } from "./shared";
import { actionGlyph, actionTone, formatActionLabel } from "./ui-context";

export type ActionGroupState = {
  groups: Array<{ items: ActionItem[] }>;
};

export function getActionType(action: PlayUiAction): string {
  if (action.kind === "system") return action.systemAction;
  return action.playerAction.actionType;
}

export function collectActionItems(state: ActionGroupState): ActionItem[] {
  return state.groups.flatMap((group) => group.items);
}

export function itemsByActionType(state: ActionGroupState, actionType: string): ActionItem[] {
  return collectActionItems(state).filter((item) => getActionType(item.action) === actionType);
}

export function firstItemByActionType(state: ActionGroupState, actionType: string): ActionItem | null {
  return itemsByActionType(state, actionType)[0] ?? null;
}

export function formatActionButtonLabel(item: ActionItem): string {
  return formatActionLabel(item);
}

export function actionToneFor(item: ActionItem): UiTone {
  return actionTone(item.action);
}

export function actionGlyphFor(item: ActionItem): string {
  return actionGlyph(item.action);
}

export function sortActionItems(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    const pA = Number(a.uiPriority ?? 999);
    const pB = Number(b.uiPriority ?? 999);
    if (pA !== pB) return pA - pB;
    return a.label.localeCompare(b.label);
  });
}
