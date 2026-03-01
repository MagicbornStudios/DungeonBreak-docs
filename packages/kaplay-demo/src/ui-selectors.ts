import type { UiSessionState } from "./scene-contracts";

export function selectFogMetrics(ui: UiSessionState) {
  return ui.fog;
}

export function selectDialogueSummary(ui: UiSessionState) {
  const last = ui.dialogue.steps.at(-1);
  return {
    sequence: ui.dialogue.sequence,
    stepsCount: ui.dialogue.steps.length,
    lastLabel: last?.label ?? "none",
    lastKind: last?.kind ?? null,
    lastOptionId: last?.optionId ?? null,
  };
}

export function selectRecentDialogueTimeline(ui: UiSessionState, limit = 3): string[] {
  return ui.dialogue.steps
    .slice(-Math.max(1, limit))
    .map((step, idx) => `${idx + 1}. t${step.turn} ${step.label}`);
}

