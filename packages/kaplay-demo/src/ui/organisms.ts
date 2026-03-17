import type { KAPLAYCtx } from "kaplay";
import { addButton, LINE_H } from "../shared";
import { drawDividerAtom, drawSurfaceAtom } from "./atoms";
import {
  renderSectionHeaderMolecule,
  renderStatRowMolecule,
} from "./molecules";

const FEATURE_PREFIX_REGEX = /^Feature:\s*/i;
const EXITS_PREFIX_REGEX = /^Exits:\s*/i;
const NEARBY_PREFIX_REGEX = /^Nearby:\s*/i;

interface CommandPanelOptions {
  x: number;
  y: number;
  width: number;
  height?: number;
  hasEncounter: boolean;
  inRuneForgeContext: boolean;
  onOpenMap: () => void;
  onOpenWorldMap: () => void;
  onOpenBag: () => void;
  onOpenJournal: () => void;
  onOpenSpellbook: () => void;
  onOpenStats: () => void;
  onOpenEquipped: () => void;
  onOpenCombat: () => void;
  onOpenMagic: () => void;
}

interface RoomBriefOptions {
  x: number;
  y: number;
  width: number;
  look: string;
  status: Record<string, unknown>;
  tag?: string;
}

interface ThreeColumnShellOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  leftWidth: number;
  rightWidth: number;
  inset: number;
  columnGap: number;
  drawSurface?: boolean;
  tag?: string;
}

export interface ThreeColumnShellLayout {
  leftX: number;
  centerX: number;
  rightX: number;
  innerY: number;
  centerWidth: number;
}

export function renderThreeColumnShellOrganism(
  k: KAPLAYCtx,
  opts: ThreeColumnShellOptions
): ThreeColumnShellLayout {
  const tag = opts.tag ?? "ui";
  if (opts.drawSurface ?? true) {
    drawSurfaceAtom(k, opts.x, opts.y, opts.width, opts.height, tag);
  }

  const leftX = opts.x + opts.inset;
  const innerY = opts.y + opts.inset;
  const innerWidth = opts.width - opts.inset * 2;
  const centerWidth =
    innerWidth - opts.leftWidth - opts.rightWidth - opts.columnGap * 2;
  const centerX = leftX + opts.leftWidth + opts.columnGap;
  const rightX = centerX + centerWidth + opts.columnGap;

  if (opts.leftWidth > 0) {
    drawDividerAtom(
      k,
      centerX - opts.columnGap / 2,
      innerY,
      opts.height - opts.inset * 2,
      tag
    );
  }
  drawDividerAtom(
    k,
    rightX - opts.columnGap / 2,
    innerY,
    opts.height - opts.inset * 2,
    tag
  );

  return { leftX, centerX, rightX, innerY, centerWidth };
}

export function renderCommandPanelOrganism(
  k: KAPLAYCtx,
  opts: CommandPanelOptions
): number {
  if (opts.height !== undefined) {
    drawSurfaceAtom(k, opts.x, opts.y, opts.width, opts.height, "ui");
  }
  let y = renderSectionHeaderMolecule(k, {
    x: opts.x + 12,
    y: opts.y + 6,
    title: "Command Panel",
    subtitle: "Menu surfaces",
  });
  y += 2;

  if (opts.hasEncounter) {
    y = addButton(
      k,
      opts.x + 12,
      y,
      opts.width - 24,
      "[F] Combat",
      opts.onOpenCombat,
      true,
      { tone: "danger" }
    );
  }
  y = addButton(
    k,
    opts.x + 12,
    y,
    opts.width - 24,
    "[M] Map",
    opts.onOpenMap,
    true,
    {
      tone: "neutral",
    }
  );
  y = addButton(
    k,
    opts.x + 12,
    y,
    opts.width - 24,
    "[B] Bag",
    opts.onOpenBag,
    true,
    {
      tone: "neutral",
    }
  );
  y = addButton(
    k,
    opts.x + 12,
    y,
    opts.width - 24,
    "[J] Journal",
    opts.onOpenJournal,
    true,
    { tone: "neutral" }
  );
  y = addButton(
    k,
    opts.x + 12,
    y,
    opts.width - 24,
    "[P] Spellbook",
    opts.onOpenSpellbook,
    true,
    { tone: "accent" }
  );
  y = addButton(
    k,
    opts.x + 12,
    y,
    opts.width - 24,
    "[V] Stats",
    opts.onOpenStats,
    true,
    {
      tone: "neutral",
    }
  );
  y = addButton(
    k,
    opts.x + 12,
    y,
    opts.width - 24,
    "[Q] Equipped",
    opts.onOpenEquipped,
    true,
    { tone: "neutral" }
  );
  y = addButton(
    k,
    opts.x + 12,
    y,
    opts.width - 24,
    "[O] World",
    opts.onOpenWorldMap,
    true,
    { tone: "neutral" }
  );

  if (opts.inRuneForgeContext) {
    y = addButton(
      k,
      opts.x + 12,
      y,
      opts.width - 24,
      "[R] Rune Forge",
      opts.onOpenMagic,
      true,
      { tone: "accent" }
    );
  }

  return y;
}

function parseRoomBrief(look: string): {
  title: string;
  feature: string;
  exits: string;
  nearby: string;
} {
  const lines = look
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] ?? "Unknown Room";
  const feature =
    lines.find((line) => line.toLowerCase().startsWith("feature:")) ??
    "Feature: unknown";
  const exits =
    lines.find((line) => line.toLowerCase().startsWith("exits:")) ??
    "Exits: unknown";
  const nearby =
    lines.find((line) => line.toLowerCase().startsWith("nearby:")) ??
    "Nearby: none";
  return { title, feature, exits, nearby };
}

export function renderRoomBriefOrganism(
  k: KAPLAYCtx,
  opts: RoomBriefOptions
): number {
  const room = parseRoomBrief(opts.look);
  let y = renderSectionHeaderMolecule(k, {
    x: opts.x,
    y: opts.y,
    title: "Room Pulse",
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
    value: room.feature.replace(FEATURE_PREFIX_REGEX, ""),
    tone: "accent",
    width: opts.width,
    tag: opts.tag,
  });
  y = renderStatRowMolecule(k, {
    x: opts.x,
    y,
    icon: "[X]",
    label: "",
    value: room.exits.replace(EXITS_PREFIX_REGEX, ""),
    tone: "neutral",
    width: opts.width,
    tag: opts.tag,
  });
  y = renderStatRowMolecule(k, {
    x: opts.x,
    y,
    icon: "[?]",
    label: "",
    value: room.nearby.replace(NEARBY_PREFIX_REGEX, ""),
    tone: "warn",
    width: opts.width,
    tag: opts.tag,
  });

  return y + LINE_H / 2;
}
