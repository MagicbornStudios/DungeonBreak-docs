import type { InfoPanelTone } from "@/components/reports/content-creator/selection-utils";

export const INFO_PANEL_TONE_CLASSES: Record<InfoPanelTone, string> = {
  none: "border-border bg-background",
  canonical: "border-amber-400/40 bg-amber-500/5",
  stats: "border-cyan-400/40 bg-cyan-500/5",
  models: "border-indigo-400/40 bg-indigo-500/5",
};

export const INFO_PANEL_HEADER_TONE_CLASSES: Record<InfoPanelTone, string> = {
  none: "border-border bg-transparent",
  canonical: "border-amber-400/40 bg-amber-500/10",
  stats: "border-cyan-400/40 bg-cyan-500/10",
  models: "border-indigo-400/40 bg-indigo-500/10",
};
