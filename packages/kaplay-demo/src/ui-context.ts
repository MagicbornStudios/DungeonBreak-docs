import type { ActionItem, PlayUiAction } from "@dungeonbreak/engine";
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
  if (kind === "fight") return "danger";
  if (kind === "flee" || kind === "drop_item") return "warn";
  if (kind === "rest" || kind === "equip_item" || kind === "re_equip") return "good";
  if (kind === "evolve_skill" || kind === "purchase" || kind === "stream") return "accent";
  return "neutral";
}

export function formatActionLabel(item: ActionItem): string {
  return `${actionGlyph(item.action)} ${item.label}`;
}
