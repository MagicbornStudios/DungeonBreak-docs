import type { UiTone } from "./theme-tokens";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function infoPanelHeightForLines(lines: number, compact = true): number {
  const header = compact ? 22 : 26;
  const lineHeight = compact ? 14 : 16;
  return header + Math.max(1, lines) * lineHeight + 8;
}

export function eventLogMaxLinesForHeight(height: number, compact = true): number {
  const lineHeight = compact ? 14 : 16;
  const reserved = compact ? 26 : 30;
  const lines = Math.floor((Math.max(0, height - reserved)) / lineHeight);
  return clamp(lines, 2, 14);
}

export function healthTone(health: number): UiTone {
  if (health <= 25) return "danger";
  if (health <= 55) return "warn";
  return "good";
}

export function energyTone(energy: number): UiTone {
  if (energy <= 20) return "warn";
  return "good";
}
