import type { PanelSchema } from "./panel-schema";
import { energyTone, healthTone, infoPanelHeightForLines } from "./panel-formulas";
import { selectDialogueSummary, selectFogMetrics, selectRecentDialogueTimeline } from "./ui-selectors";
import type { UiSessionState } from "./scene-contracts";
import type { UiTone } from "./theme-tokens";

type BlockRect = {
  x: number;
  y: number;
  width: number;
};

type InfoLine = {
  text: string;
  tone?: UiTone;
};

export function buildDialogueProgressBlock(
  ui: UiSessionState,
  rect: BlockRect,
  limit = 3,
): PanelSchema {
  const summary = selectDialogueSummary(ui);
  const timeline = selectRecentDialogueTimeline(ui, limit);
  const lines: InfoLine[] = [
    { text: `[SEQ] ${summary.sequence} | [STEPS] ${summary.stepsCount}`, tone: "accent" as const },
    { text: `[LAST] ${summary.lastLabel}`, tone: "good" as const },
    { text: timeline.join(" | ") || "No dialogue decisions yet.", tone: "neutral" as const },
  ];
  return {
    kind: "info",
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: infoPanelHeightForLines(lines.length),
    title: "Progression",
    lines,
  };
}

export function buildFogStatusBlock(
  ui: UiSessionState,
  status: Record<string, unknown>,
  look: string,
  rect: BlockRect,
): PanelSchema {
  const fog = selectFogMetrics(ui);
  const hp = Number(status.health ?? 0);
  const energy = Number(status.energy ?? 0);
  const nearby = look
    .split("\n")
    .find((line) => line.toLowerCase().startsWith("nearby:"))
    ?.trim();
  const lines: InfoLine[] = [
    { text: `[DEPTH] ${String(status.depth ?? "?")}  [LV] ${String(status.level ?? "?")}`, tone: "neutral" as const },
    { text: `[HP] ${String(status.health ?? "?")}`, tone: healthTone(hp) },
    { text: `[ENERGY] ${String(status.energy ?? "?")}`, tone: energyTone(energy) },
    {
      text: `[FOG] r=${fog.radius} (lvl+${fog.levelFactor} cmp+${fog.comprehensionFactor} aware+${fog.awarenessFactor})`,
      tone: "accent" as const,
    },
    { text: nearby ?? "Nearby: unknown", tone: nearby?.toLowerCase().includes("none") ? "good" : "warn" },
  ];
  return {
    kind: "info",
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: infoPanelHeightForLines(lines.length, false),
    title: "Context",
    lines,
  };
}
