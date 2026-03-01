import type { ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { renderPanelSchema } from "./panel-schema";

type WidgetId = "event_log" | "dialogue_progress" | "action_list";

type EventLogWidgetParams = {
  x: number;
  y: number;
  width: number;
  title?: string;
  lines: string[];
  maxLines: number;
};

type DialogueProgressWidgetParams = {
  x: number;
  y: number;
  width: number;
  sequence: number;
  stepsCount: number;
  lastLabel: string;
  timeline: string[];
};

type ActionListWidgetParams = {
  x: number;
  y: number;
  width: number;
  items: ActionItem[];
  onAction: (item: ActionItem) => void;
  maxItems?: number;
  compact?: boolean;
};

export function createWidgetRegistry(k: KAPLAYCtx) {
  return {
    renderEventLog(params: EventLogWidgetParams): number {
      return renderPanelSchema(k, {
        kind: "event_log",
        x: params.x,
        y: params.y,
        width: params.width,
        title: params.title,
        lines: params.lines,
        maxLines: params.maxLines,
      });
    },
    renderDialogueProgress(params: DialogueProgressWidgetParams): number {
      return renderPanelSchema(k, {
        kind: "info",
        x: params.x,
        y: params.y,
        width: params.width,
        height: 88,
        title: "Progression",
        lines: [
          { text: `[SEQ] ${params.sequence} | [STEPS] ${params.stepsCount}`, tone: "accent" },
          { text: `[LAST] ${params.lastLabel}`, tone: "good" },
          { text: params.timeline.join(" | ") || "No dialogue decisions yet.", tone: "neutral" },
        ],
      });
    },
    renderActionList(params: ActionListWidgetParams): number {
      return renderPanelSchema(k, {
        kind: "action_list",
        x: params.x,
        y: params.y,
        width: params.width,
        items: params.items,
        onAction: params.onAction,
        maxItems: params.maxItems,
        compact: params.compact,
      });
    },
  };
}

