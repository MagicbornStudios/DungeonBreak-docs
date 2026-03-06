import {
  IconCompass as CompassIcon,
  IconCrosshair as CrosshairIcon,
  IconSparkles as SparklesIcon,
  IconSwords as SwordsIcon,
} from "@tabler/icons-react";
import type { ComponentType } from "react";

const CLUSTER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
];

const BRANCH_COLORS: Record<string, string> = {
  perception: "#3b82f6",
  combat: "#ef4444",
  craft: "#22c55e",
  dialogue: "#a855f7",
  archetype: "#f59e0b",
  default: "#6b7280",
};

const TYPE_COLORS: Record<string, string> = {
  skill: "#22c55e",
  archetype: "#f59e0b",
  dialogue: "#a855f7",
  default: "#6b7280",
};

export type ColorBy = "branch" | "type" | "cluster";
export type SpaceMode = "trait" | "combined";

export type ViewPoint = {
  branch: string;
  type: string;
  cluster?: number;
  x: number;
  y: number;
  z: number;
  xCombined?: number;
  yCombined?: number;
  zCombined?: number;
};

export function getPointColor(pt: ViewPoint, colorBy: ColorBy): string {
  if (colorBy === "branch")
    return BRANCH_COLORS[pt.branch] ?? BRANCH_COLORS.default;
  if (colorBy === "cluster")
    return pt.cluster != null
      ? CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length]!
      : BRANCH_COLORS.default;
  return TYPE_COLORS[pt.type] ?? TYPE_COLORS.default;
}

export function getPointCoords(
  pt: ViewPoint,
  space: SpaceMode
): { x: number; y: number; z: number } {
  if (space === "combined" && pt.xCombined != null) {
    return { x: pt.xCombined, y: pt.yCombined!, z: pt.zCombined! };
  }
  return { x: pt.x, y: pt.y, z: pt.z };
}

export function getTypeBadgeMeta(type: string): {
  Icon: ComponentType<{ className?: string }>;
  className: string;
} {
  switch (type) {
    case "action":
      return {
        Icon: SwordsIcon,
        className: "border-amber-400/60 bg-amber-500/20 text-amber-100",
      };
    case "event":
      return {
        Icon: SparklesIcon,
        className: "border-violet-400/60 bg-violet-500/20 text-violet-100",
      };
    case "effect":
      return {
        Icon: CrosshairIcon,
        className: "border-emerald-400/60 bg-emerald-500/20 text-emerald-100",
      };
    case "dialogue":
      return {
        Icon: SparklesIcon,
        className: "border-fuchsia-400/60 bg-fuchsia-500/20 text-fuchsia-100",
      };
    case "skill":
      return {
        Icon: CompassIcon,
        className: "border-cyan-400/60 bg-cyan-500/20 text-cyan-100",
      };
    default:
      return {
        Icon: CompassIcon,
        className: "border-slate-400/60 bg-slate-500/20 text-slate-100",
      };
  }
}

export function getBranchBadgeClass(branch: string): string {
  switch (branch) {
    case "combat":
      return "border-red-400/60 bg-red-500/20 text-red-100";
    case "dialogue":
      return "border-purple-400/60 bg-purple-500/20 text-purple-100";
    case "craft":
      return "border-green-400/60 bg-green-500/20 text-green-100";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}
