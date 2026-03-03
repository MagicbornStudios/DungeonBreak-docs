import type { KAPLAYCtx } from "kaplay";
import { addButton, LINE_H } from "../shared";
import { drawDividerAtom, drawSurfaceAtom } from "./atoms";
import { renderSectionHeaderMolecule, renderStatRowMolecule } from "./molecules";

type CommandPanelOptions = {
  x: number;
  y: number;
  width: number;
  hasEncounter: boolean;
  inRuneForgeContext: boolean;
  onOpenNavigation: () => void;
  onOpenControls: () => void;
  onOpenBag: () => void;
  onOpenJournal: () => void;
  onOpenCombat: () => void;
  onOpenMagic: () => void;
};

type RoomBriefOptions = {
  x: number;
  y: number;
  width: number;
  look: string;
  status: Record<string, unknown>;
  tag?: string;
};

type ThreeColumnShellOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  leftWidth: number;
  rightWidth: number;
  inset: number;
  columnGap: number;
  tag?: string;
};

export type ThreeColumnShellLayout = {
  leftX: number;
  centerX: number;
  rightX: number;
  innerY: number;
  centerWidth: number;
};

export function renderThreeColumnShellOrganism(
  k: KAPLAYCtx,
  opts: ThreeColumnShellOptions,
): ThreeColumnShellLayout {
  const tag = opts.tag ?? "ui";
  drawSurfaceAtom(k, opts.x, opts.y, opts.width, opts.height, tag);

  const leftX = opts.x + opts.inset;
  const innerY = opts.y + opts.inset;
  const innerWidth = opts.width - opts.inset * 2;
  const centerWidth = innerWidth - opts.leftWidth - opts.rightWidth - opts.columnGap * 2;
  const centerX = leftX + opts.leftWidth + opts.columnGap;
  const rightX = centerX + centerWidth + opts.columnGap;

  drawDividerAtom(k, centerX - opts.columnGap / 2, innerY, opts.height - opts.inset * 2, tag);
  drawDividerAtom(k, rightX - opts.columnGap / 2, innerY, opts.height - opts.inset * 2, tag);

  return { leftX, centerX, rightX, innerY, centerWidth };
}

export function renderCommandPanelOrganism(k: KAPLAYCtx, opts: CommandPanelOptions): number {
  let y = renderSectionHeaderMolecule(k, {
    x: opts.x,
    y: opts.y - 4,
    title: "Command Panel",
    subtitle: "Keyboard or buttons",
  });
  y += 2;

  if (opts.hasEncounter) {
    y = addButton(k, opts.x, y, opts.width, "[F] Combat", opts.onOpenCombat, true, { tone: "danger" });
  }
  y = addButton(k, opts.x, y, opts.width, "[C] Controls", opts.onOpenControls, true, { tone: "accent" });
  y = addButton(k, opts.x, y, opts.width, "[N] Map", opts.onOpenNavigation, true, { tone: "neutral" });
  y = addButton(k, opts.x, y, opts.width, "[B] Bag", opts.onOpenBag, true, { tone: "neutral" });
  y = addButton(k, opts.x, y, opts.width, "[J] Journal", opts.onOpenJournal, true, { tone: "neutral" });

  if (opts.inRuneForgeContext) {
    y = addButton(k, opts.x, y, opts.width, "[M] Magic Lab", opts.onOpenMagic, true, { tone: "accent" });
  }

  return y;
}

function parseRoomBrief(look: string): {
  title: string;
  feature: string;
  exits: string;
  nearby: string;
} {
  const lines = look.split("\n").map((line) => line.trim()).filter(Boolean);
  const title = lines[0] ?? "Unknown Room";
  const feature = lines.find((line) => line.toLowerCase().startsWith("feature:")) ?? "Feature: unknown";
  const exits = lines.find((line) => line.toLowerCase().startsWith("exits:")) ?? "Exits: unknown";
  const nearby = lines.find((line) => line.toLowerCase().startsWith("nearby:")) ?? "Nearby: none";
  return { title, feature, exits, nearby };
}

export function renderRoomBriefOrganism(k: KAPLAYCtx, opts: RoomBriefOptions): number {
  const room = parseRoomBrief(opts.look);
  let y = renderSectionHeaderMolecule(k, {
    x: opts.x,
    y: opts.y,
    title: "Room Brief",
    subtitle: room.title,
    titleSize: 10,
    subtitleSize: 11,
    tag: opts.tag,
  });

  y += 2;
  y = renderStatRowMolecule(k, {
    x: opts.x,
    y,
    icon: "[D]",
    label: "Depth",
    value: String(opts.status.depth ?? "??"),
    tone: "good",
    width: opts.width,
    tag: opts.tag,
  });
  y = renderStatRowMolecule(k, {
    x: opts.x,
    y,
    icon: "[F]",
    label: "",
    value: room.feature.replace(/^Feature:\s*/i, ""),
    tone: "accent",
    width: opts.width,
    tag: opts.tag,
  });
  y = renderStatRowMolecule(k, {
    x: opts.x,
    y,
    icon: "[X]",
    label: "",
    value: room.exits.replace(/^Exits:\s*/i, ""),
    tone: "neutral",
    width: opts.width,
    tag: opts.tag,
  });
  y = renderStatRowMolecule(k, {
    x: opts.x,
    y,
    icon: "[?]",
    label: "",
    value: room.nearby.replace(/^Nearby:\s*/i, ""),
    tone: "warn",
    width: opts.width,
    tag: opts.tag,
  });

  return y + LINE_H / 2;
}
