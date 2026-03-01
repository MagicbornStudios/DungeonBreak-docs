import type { ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import { renderPanelSchema } from "./panel-schema";
import { buildDialogueProgressBlock } from "./scene-blocks";
import type { UiSessionState } from "./scene-contracts";

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
  ui: UiSessionState;
  timelineLimit?: number;
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
      return renderPanelSchema(
        k,
        buildDialogueProgressBlock(params.ui, {
          x: params.x,
          y: params.y,
          width: params.width,
        }, params.timelineLimit ?? 3),
      );
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
