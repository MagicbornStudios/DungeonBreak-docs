import type { ActionItem } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import type { UiTone } from "./theme-tokens";
import { renderActionListPanel, renderEventLogPanel, renderInfoPanel } from "./panel-components";

type InfoPanelSchema = {
  kind: "info";
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  lines: Array<{ text: string; tone?: UiTone }>;
};

type EventLogPanelSchema = {
  kind: "event_log";
  x: number;
  y: number;
  width: number;
  title?: string;
  lines: string[];
  maxLines: number;
};

type ActionListPanelSchema = {
  kind: "action_list";
  x: number;
  y: number;
  width: number;
  items: ActionItem[];
  onAction: (item: ActionItem) => void;
  maxItems?: number;
  compact?: boolean;
};

export type PanelSchema = InfoPanelSchema | EventLogPanelSchema | ActionListPanelSchema;

export function renderPanelSchema(k: KAPLAYCtx, panel: PanelSchema): number {
  if (panel.kind === "info") {
    return renderInfoPanel(k, panel.x, panel.y, panel.width, panel.height, panel.title, panel.lines);
  }
  if (panel.kind === "event_log") {
    return renderEventLogPanel(k, panel.x, panel.y, panel.width, panel.lines, panel.maxLines, panel.title);
  }
  return renderActionListPanel(k, panel.x, panel.y, panel.width, panel.items, panel.onAction, {
    maxItems: panel.maxItems,
    compact: panel.compact,
  });
}

