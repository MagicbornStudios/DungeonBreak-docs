import { ACTION_TYPE, type ActionItem, type PlayUiAction } from "@dungeonbreak/engine";
import type { UiTone } from "./theme-tokens";
import { actionGlyphByType } from "./theme-tokens";

function actionTypeOf(action: PlayUiAction): string {
  if (action.kind === "system") return action.systemAction;
  return action.playerAction.actionType;
}

export function actionGlyph(action: PlayUiAction): string {
  return actionGlyphByType[actionTypeOf(action)] ?? "[ACT]";
}

export function actionTone(action: PlayUiAction): UiTone {
  const kind = actionTypeOf(action);
  if (kind === ACTION_TYPE.FIGHT) return "danger";
  if (kind === ACTION_TYPE.FLEE || kind === "drop_item") return "warn";
  if (kind === ACTION_TYPE.REST || kind === "equip_item" || kind === ACTION_TYPE.RE_EQUIP) return "good";
  if (kind === ACTION_TYPE.EVOLVE_SKILL || kind === ACTION_TYPE.PURCHASE || kind === "stream") return "accent";
  return "neutral";
}

export function formatActionLabel(item: ActionItem): string {
  return `${actionGlyph(item.action)} ${item.label}`;
}
