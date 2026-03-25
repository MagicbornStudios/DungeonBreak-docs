import type {
  ActionItem,
  EntityState,
  GameSnapshot,
} from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import {
  actionToneFor,
  formatActionButtonLabel,
  itemsByActionType,
} from "./action-renderer";
import {
  ensureQuestIconSprite,
  resolveInventoryItemSprite,
  resolveInventoryPlaceholderSprite,
  resolveSpellSprite,
} from "./content-visuals";
import { type DisplayScreenEntry, renderDisplayScreen } from "./display-screen";
import { buildEquippedEntries, type EquippedEntry } from "./equipped-content";
import { inventoryRows } from "./inventory-content";
import {
  buildJournalEntries,
  type JournalEntry,
  type JournalTab,
  questJournalRarityLabel,
  questJournalRarityTint,
} from "./journal-content";
import { logKaplayDebugError, recordKaplayDebug } from "./kaplay-debug";
import { resolveKaplayStaticIconSprite } from "./kaplay-static-icons";
import { H, W } from "./layout-constants";
import {
  type GridIconKind,
  type LoadoutGridEntry,
  renderLoadoutGridScreen,
} from "./loadout-grid-screen";
import type { SceneCallbacks } from "./scene-contracts";
import { addButton, UI_TAG } from "./shared";
import {
  buildSpellbookEntries,
  type PreparedSpellSlotView,
  type RuntimeSpellPoolView,
  SPELLBOOK_CATEGORY_OPTIONS,
  type SpellbookCategoryOption,
  type SpellbookEntry,
  type SpellbookTab,
} from "./spellbook-content";
import { buildStatsEntries } from "./stats-content";
import { drawKeycapAtom, drawTextAtom } from "./ui/atoms";

type BagFilterId = "all" | "weapon" | "armor" | "accessory";
type BagSortId = "slot" | "rarity" | "name";
type SpellSortId = "slot" | "rarity" | "name";
type ExtendedEntityState = EntityState & {
  equippedArmorItemId?: string | null;
  equippedAccessoryItemId?: string | null;
};

export type NavigationOverlayKind =
  | "menu_hub"
  | "dialogue"
  | "bag"
  | "journal"
  | "spellbook"
  | "stats"
  | "equipped"
  | "global_actions"
  | "room_actions";

export type NavigationCommandTarget =
  | "bag"
  | "journal"
  | "spellbook"
  | "stats"
  | "equipped"
  | null;

export interface NavigationMenuEntry extends DisplayScreenEntry {
  targetOverlay: NavigationCommandTarget;
  targetScene?: "gridWorldMap" | null;
  iconSpriteName?: string | null;
  commandKeycap?: string | null;
}

export const NAVIGATION_MENU_ENTRIES: NavigationMenuEntry[] = [
  {
    id: "command-map",
    title: "Map",
    subtitle: "Return to the dungeon floor board",
    detailLines: [
      "Closes the menu and returns focus to floor navigation.",
      "Use arrow keys to move across exits once the board is active again.",
    ],
    tone: "accent",
    targetOverlay: null,
    iconSpriteName: resolveKaplayStaticIconSprite("map"),
    commandKeycap: "M",
  },
  {
    id: "command-bag",
    title: "Bag",
    subtitle: "Inventory and consumables",
    detailLines: [
      "Inspect carried items and trigger use, equip, or drop actions.",
      "Useful when a room change reveals new loot or context actions.",
    ],
    tone: "good",
    targetOverlay: "bag",
    iconSpriteName: resolveKaplayStaticIconSprite("backpack"),
    commandKeycap: "B",
  },
  {
    id: "command-journal",
    title: "Journal",
    subtitle: "Quests, bestiary, and guides",
    detailLines: [
      "Read quest state, enemy notes, and authored guidance.",
      "Keeps the narrative log out of the main navigation shell.",
    ],
    tone: "neutral",
    targetOverlay: "journal",
    iconSpriteName: resolveKaplayStaticIconSprite("book-open"),
    commandKeycap: "J",
  },
  {
    id: "command-spellbook",
    title: "Spellbook",
    subtitle: "Prepared slots and unlocked pool",
    detailLines: [
      "Review the spells you already have equipped and the pool you can equip from.",
      "Rune codex pages open from rune forge context instead of the top command menu.",
    ],
    tone: "accent",
    targetOverlay: "spellbook",
    iconSpriteName: resolveKaplayStaticIconSprite("scroll-text"),
    commandKeycap: "P",
  },
  {
    id: "command-stats",
    title: "Stats",
    subtitle: "Vitals, progression, and readouts",
    detailLines: [
      "Shows the run state, current vitals, and other tracked values.",
      "Useful as a quick status check without leaving the navigation shell.",
    ],
    tone: "warn",
    targetOverlay: "stats",
    iconSpriteName: resolveKaplayStaticIconSprite("sparkles"),
    commandKeycap: "V",
  },
  {
    id: "command-equipped",
    title: "Equipped",
    subtitle: "Loadout, title track, and archetype",
    detailLines: [
      "Inspect what Kael has equipped and how the current build is framed.",
      "A fast read when the room loop changes your equipment priorities.",
    ],
    tone: "neutral",
    targetOverlay: "equipped",
    iconSpriteName: resolveKaplayStaticIconSprite("shield"),
    commandKeycap: "Q",
  },
  {
    id: "command-world-map",
    title: "World Map",
    subtitle: "Large authored region view",
    detailLines: [
      "Opens the prototype world-map screen built from the authored region pack.",
      "Use it to inspect the current dungeon region and the route back toward Emberfall.",
    ],
    tone: "accent",
    targetOverlay: null,
    targetScene: "gridWorldMap",
    iconSpriteName: resolveKaplayStaticIconSprite("door-open"),
    commandKeycap: "O",
  },
];

export interface NavigationOverlayState {
  activeOverlay: NavigationOverlayKind | null;
  menuHubSelectedEntryId: string | null;
  bagPageIndex: number;
  bagSelectedEntryId: string | null;
  bagFilter: BagFilterId;
  bagSort: BagSortId;
  journalTab: JournalTab;
  journalPageIndex: number;
  journalSelectedEntryId: string | null;
  spellbookTab: SpellbookTab;
  spellbookCategory: SpellbookCategoryOption;
  spellbookPageIndex: number;
  spellbookSelectedEntryId: string | null;
  spellbookSelectedSlotIndex: number;
  spellbookSort: SpellSortId;
  spellbookAllowCodex: boolean;
  dialoguePageIndex: number;
  dialogueSelectedEntryId: string | null;
  statsPageIndex: number;
  statsSelectedEntryId: string | null;
  equippedPageIndex: number;
  equippedSelectedEntryId: string | null;
  globalActionsPageIndex: number;
  globalActionsSelectedEntryId: string | null;
  roomActionsPageIndex: number;
  roomActionsSelectedEntryId: string | null;
}

let pendingNavigationOverlay: NavigationOverlayKind | null = null;
let pendingSpellbookContext: {
  allowCodex: boolean;
  tab: SpellbookTab | null;
} | null = null;

interface BagOverlayEntry extends LoadoutGridEntry {
  itemId: string;
  rarity: string;
  slotId: BagFilterId | "consumable" | "loot";
  equippedSlot: "weapon" | "armor" | "accessory" | null;
  canUse: boolean;
  canEquip: boolean;
  canDrop: boolean;
  useAction: ActionItem | null;
  equipAction: ActionItem | null;
  dropAction: ActionItem | null;
}

interface ActionOverlayEntry extends DisplayScreenEntry {
  actionItem: ActionItem;
}

interface RenderNavigationOverlayParams {
  k: KAPLAYCtx;
  overlayState: NavigationOverlayState;
  sceneState: ReturnType<SceneCallbacks["getState"]>;
  snapshot: GameSnapshot;
  x: number;
  y: number;
  width: number;
  height: number;
  preparedSlots: PreparedSpellSlotView[];
  spellPool: RuntimeSpellPoolView[];
  onPrepareSpellSlot: (slotIndex: number, skillId: string | null) => void;
  onRender: () => void;
  onClose: () => void;
  onOpenNavigationMenuEntry: (entry: NavigationMenuEntry) => void;
  onDoAction: (item: ActionItem) => void;
  globalActions?: ActionItem[];
  roomActions?: ActionItem[];
  tag?: string;
}

function bagEntryTone(
  canUse: boolean,
  canEquip: boolean
): "neutral" | "accent" | "good" {
  if (canUse) {
    return "good";
  }
  if (canEquip) {
    return "accent";
  }
  return "neutral";
}

function rarityRank(rarity: string | null | undefined): number {
  if (rarity === "legendary") {
    return 0;
  }
  if (rarity === "epic") {
    return 1;
  }
  if (rarity === "rare") {
    return 2;
  }
  if (rarity === "uncommon") {
    return 3;
  }
  return 4;
}

function titleCaseId(value: string | null | undefined): string {
  const normalized = String(value ?? "common");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function rarityVisual(rarityId: string | null | undefined): {
  color: [number, number, number];
  iconSpriteName: string;
  label: string;
} {
  if (rarityId === "legendary") {
    return {
      color: [244, 201, 110],
      iconSpriteName: resolveKaplayStaticIconSprite("crown"),
      label: "Legendary",
    };
  }
  if (rarityId === "epic") {
    return {
      color: [189, 132, 235],
      iconSpriteName: resolveKaplayStaticIconSprite("sparkles"),
      label: "Epic",
    };
  }
  if (rarityId === "rare") {
    return {
      color: [109, 165, 234],
      iconSpriteName: resolveKaplayStaticIconSprite("gem"),
      label: "Rare",
    };
  }
  if (rarityId === "uncommon") {
    return {
      color: [132, 199, 142],
      iconSpriteName: resolveKaplayStaticIconSprite("shield"),
      label: "Uncommon",
    };
  }
  return {
    color: [198, 160, 110],
    iconSpriteName: resolveKaplayStaticIconSprite("scroll-text"),
    label: titleCaseId(rarityId),
  };
}

function bagFilterLabel(filter: BagFilterId): string {
  switch (filter) {
    case "weapon":
      return "Weapon";
    case "armor":
      return "Armor";
    case "accessory":
      return "Accessory";
    default:
      return "All";
  }
}

function bagSlotIconKind(filter: BagFilterId): GridIconKind {
  if (filter === "weapon") {
    return "weapon";
  }
  if (filter === "armor") {
    return "armor";
  }
  if (filter === "accessory") {
    return "accessory";
  }
  return "loot";
}

function bagEntryIconKind(slotId: BagOverlayEntry["slotId"]): GridIconKind {
  if (slotId === "weapon") {
    return "weapon";
  }
  if (slotId === "armor") {
    return "armor";
  }
  if (slotId === "accessory") {
    return "accessory";
  }
  if (slotId === "consumable") {
    return "consumable";
  }
  return "loot";
}

function spellEntryIconKind(categoryId: string): GridIconKind {
  if (categoryId === "conversation") {
    return "conversation";
  }
  if (categoryId === "transportation") {
    return "transportation";
  }
  if (categoryId === "exploration") {
    return "exploration";
  }
  if (categoryId === "combat") {
    return "combat";
  }
  if (categoryId === "crafting") {
    return "crafting";
  }
  if (categoryId === "detection") {
    return "detection";
  }
  if (categoryId === "empty") {
    return "empty";
  }
  return "spell";
}

function spellCategoryIconSprite(categoryId: string): string {
  switch (categoryId) {
    case "conversation":
      return resolveKaplayStaticIconSprite("messages-square");
    case "transportation":
      return resolveKaplayStaticIconSprite("door-open");
    case "exploration":
      return resolveKaplayStaticIconSprite("map");
    case "combat":
      return resolveKaplayStaticIconSprite("swords");
    case "crafting":
      return resolveKaplayStaticIconSprite("hammer");
    case "detection":
      return resolveKaplayStaticIconSprite("shield");
    default:
      return resolveKaplayStaticIconSprite("scroll-text");
  }
}

function sortIconSprite(sort: BagSortId | SpellSortId): string {
  if (sort === "slot") {
    return resolveKaplayStaticIconSprite("backpack");
  }
  if (sort === "rarity") {
    return resolveKaplayStaticIconSprite("gem");
  }
  return resolveKaplayStaticIconSprite("scroll-text");
}

function sortBagEntries(
  entries: BagOverlayEntry[],
  sort: BagSortId
): BagOverlayEntry[] {
  return [...entries].sort((left, right) => {
    if (sort === "rarity") {
      const rarityDelta = rarityRank(left.rarity) - rarityRank(right.rarity);
      if (rarityDelta !== 0) {
        return rarityDelta;
      }
    }
    if (sort === "slot") {
      const slotOrder = ["weapon", "armor", "accessory", "consumable", "loot"];
      const leftOrder = slotOrder.indexOf(left.slotId);
      const rightOrder = slotOrder.indexOf(right.slotId);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
    }
    return left.title.localeCompare(right.title);
  });
}

function sortSpellEntries(
  entries: SpellbookEntry[],
  sort: SpellSortId
): SpellbookEntry[] {
  return [...entries].sort((left, right) => {
    if (sort === "slot") {
      const leftSlot = left.slotIndex ?? Number.MAX_SAFE_INTEGER;
      const rightSlot = right.slotIndex ?? Number.MAX_SAFE_INTEGER;
      if (leftSlot !== rightSlot) {
        return leftSlot - rightSlot;
      }
      if (left.isEquipped !== right.isEquipped) {
        return left.isEquipped ? -1 : 1;
      }
    }
    if (sort === "rarity") {
      const rarityDelta =
        rarityRank(left.rarityId) - rarityRank(right.rarityId);
      if (rarityDelta !== 0) {
        return rarityDelta;
      }
    }
    return left.title.localeCompare(right.title);
  });
}

function sortLabel(sort: BagSortId | SpellSortId): string {
  if (sort === "slot") {
    return "Slot";
  }
  if (sort === "rarity") {
    return "Rarity";
  }
  return "Name";
}

function journalOverlayLabel(tab: JournalTab): string {
  switch (tab) {
    case "quests":
      return "Quests";
    case "bestiary":
      return "Bestiary";
    case "guides":
      return "Guides";
    default:
      return "Journal";
  }
}

function spellbookOverlayLabel(tab: SpellbookTab): string {
  switch (tab) {
    case "pool":
      return "Pool";
    case "codex":
      return "Codex";
    default:
      return "Spellbook";
  }
}

function buildBagOverlayEntries(
  state: ReturnType<SceneCallbacks["getState"]>
): BagOverlayEntry[] {
  return inventoryRows(state)
    .filter((row) => row.showInBag)
    .map((row) => {
      const rarity = rarityVisual(row.rarity);
      const statusBits = [
        row.equippedSlot ? `Equipped ${titleCaseId(row.equippedSlot)}` : null,
        row.canEquip ? "Equippable" : null,
        row.canUse ? "Usable" : null,
        row.canDrop ? "Droppable" : null,
      ].filter((value): value is string => Boolean(value));
      return {
        id: row.itemId,
        itemId: row.itemId,
        rarity: row.rarity,
        slotId: row.slotId,
        equippedSlot: row.equippedSlot,
        title: row.name,
        subtitle: [row.typeLabel, titleCaseId(row.rarity)].join(" | "),
        detailLines: [
          row.line,
          row.description || "No authored item description is available yet.",
          `Type: ${row.typeLabel}`,
          `Rarity: ${rarity.label}`,
          statusBits.length > 0
            ? `Status: ${statusBits.join(" | ")}`
            : "Status: Carry only",
          row.canUse
            ? "Use is available in the current context."
            : "Use is unavailable here.",
          row.canEquip
            ? "Equip is available in the current context."
            : "Equip is unavailable here.",
          row.canDrop
            ? "Drop is available in the current context."
            : "Drop is unavailable here.",
        ],
        tone: bagEntryTone(row.canUse, row.canEquip),
        icon: {
          kind: bagEntryIconKind(row.slotId),
          spriteName: resolveInventoryItemSprite(row.itemId, row.slotId),
          accent: rarity.color,
        },
        metaLabel: `${row.typeLabel}${row.equippedSlot ? ` | Equipped ${titleCaseId(row.equippedSlot)}` : ""}`,
        rarityColor: rarity.color,
        rarityIcon: {
          kind: "loot" as const,
          spriteName: rarity.iconSpriteName,
          accent: rarity.color,
        },
        rarityLabel: rarity.label,
        canUse: row.canUse,
        canEquip: row.canEquip,
        canDrop: row.canDrop,
        useAction: row.useAction,
        equipAction: row.equipAction,
        dropAction: row.dropAction,
      };
    });
}

function buildActionOverlayEntries(
  actions: ActionItem[]
): ActionOverlayEntry[] {
  return actions.map((item, index) => ({
    id: `${item.label}-${String(index)}`,
    title: formatActionButtonLabel(item),
    subtitle: item.available ? "Available now" : "Unavailable here",
    detailLines: [
      item.label,
      item.available
        ? "This action can be used in the current context."
        : "This action is not available in the current context.",
    ],
    tone: actionToneFor(item),
    actionItem: item,
  }));
}

function renderCenterOverlaySurface(
  k: KAPLAYCtx,
  x: number,
  y: number,
  width: number,
  height: number,
  tag = UI_TAG
): void {
  k.add([k.rect(W, H), k.pos(0, 0), k.color(8, 6, 10), k.opacity(0.82), tag]);
  k.add([
    k.rect(width + 10, height + 10, { radius: 12 }),
    k.pos(x - 5, y - 3),
    k.color(10, 8, 12),
    k.opacity(0.72),
    tag,
  ]);
  k.add([
    k.rect(width, height, { radius: 8 }),
    k.pos(x, y),
    k.color(14, 9, 12),
    k.opacity(0.98),
    tag,
  ]);
  k.add([
    k.rect(width - 24, 2, { radius: 1 }),
    k.pos(x + 12, y + 10),
    k.color(176, 128, 68),
    tag,
  ]);
}

export function createNavigationOverlayState(): NavigationOverlayState {
  return {
    activeOverlay: null,
    menuHubSelectedEntryId: NAVIGATION_MENU_ENTRIES[0]?.id ?? null,
    bagPageIndex: 0,
    bagSelectedEntryId: null,
    bagFilter: "all",
    bagSort: "slot",
    journalTab: "quests",
    journalPageIndex: 0,
    journalSelectedEntryId: null,
    spellbookTab: "pool",
    spellbookCategory: SPELLBOOK_CATEGORY_OPTIONS[0],
    spellbookPageIndex: 0,
    spellbookSelectedEntryId: null,
    spellbookSelectedSlotIndex: 0,
    spellbookSort: "rarity",
    spellbookAllowCodex: false,
    dialoguePageIndex: 0,
    dialogueSelectedEntryId: null,
    statsPageIndex: 0,
    statsSelectedEntryId: null,
    equippedPageIndex: 0,
    equippedSelectedEntryId: null,
    globalActionsPageIndex: 0,
    globalActionsSelectedEntryId: null,
    roomActionsPageIndex: 0,
    roomActionsSelectedEntryId: null,
  };
}

export function consumePendingNavigationOverlay(): NavigationOverlayKind | null {
  const nextOverlay = pendingNavigationOverlay;
  pendingNavigationOverlay = null;
  return nextOverlay;
}

export function consumePendingSpellbookContext(): {
  allowCodex: boolean;
  tab: SpellbookTab | null;
} | null {
  const nextContext = pendingSpellbookContext;
  pendingSpellbookContext = null;
  return nextContext;
}

export function setPendingNavigationOverlay(
  overlay: NavigationOverlayKind | null
): void {
  pendingNavigationOverlay = overlay;
}

export function setPendingSpellbookContext(
  context: {
    allowCodex: boolean;
    tab: SpellbookTab | null;
  } | null
): void {
  pendingSpellbookContext = context;
}

function drawDisplaySpriteVisual(
  k: KAPLAYCtx,
  spriteName: string | null,
  frame: { x: number; y: number; width: number; height: number },
  tag: string,
  scale: number
): void {
  if (!spriteName) {
    return;
  }
  k.add([
    k.sprite(spriteName),
    k.pos(frame.x + frame.width - 16, frame.y + frame.height / 2),
    k.anchor("center"),
    k.scale(scale),
    tag,
  ]);
}

function drawCommandBoardListVisual(
  k: KAPLAYCtx,
  entry: NavigationMenuEntry,
  frame: { x: number; y: number; width: number; height: number },
  tag: string
): void {
  const keycapWidth = entry.commandKeycap
    ? entry.commandKeycap.length * 6 + 10
    : 0;
  const keycapX = frame.x + frame.width - keycapWidth - 6;
  if (entry.iconSpriteName) {
    k.add([
      k.sprite(entry.iconSpriteName),
      k.pos(
        frame.x + frame.width - (entry.commandKeycap ? keycapWidth + 22 : 18),
        frame.y + frame.height / 2
      ),
      k.anchor("center"),
      k.scale(0.38),
      tag,
    ]);
  }
  if (entry.commandKeycap) {
    drawKeycapAtom(k, {
      x: keycapX,
      y: frame.y + 2,
      text: entry.commandKeycap === "TAB" ? "Tab" : entry.commandKeycap,
      tone: "accent",
      tag,
    });
  }
}

function drawCommandBoardDetailVisual(
  k: KAPLAYCtx,
  entry: NavigationMenuEntry,
  frame: { x: number; y: number; width: number; height: number },
  tag: string
): void {
  const iconSpriteName =
    entry.iconSpriteName ?? resolveKaplayStaticIconSprite("scroll-text");
  k.add([
    k.sprite(iconSpriteName),
    k.pos(frame.x + frame.width - 18, frame.y + frame.height / 2),
    k.anchor("center"),
    k.scale(0.8),
    tag,
  ]);
  if (entry.commandKeycap) {
    drawTextAtom(k, {
      x: frame.x + frame.width - 88,
      y: frame.y + 16,
      text: "Shortcut",
      size: 9,
      color: [196, 158, 112],
      width: 54,
      tag,
    });
    drawKeycapAtom(k, {
      x: frame.x + frame.width - 88,
      y: frame.y + 28,
      text: entry.commandKeycap === "TAB" ? "Tab" : entry.commandKeycap,
      tone: "accent",
      tag,
    });
  }
}

function drawDetailPortrait(
  k: KAPLAYCtx,
  spriteName: string | null,
  frame: { height: number; width: number; x: number; y: number },
  tag: string,
  tone: "neutral" | "good" | "warn" | "danger" | "accent"
): void {
  const fallbackSprite =
    spriteName ?? resolveKaplayStaticIconSprite("book-open");
  const accentMap: Record<typeof tone, [number, number, number]> = {
    accent: [214, 171, 104],
    danger: [214, 101, 92],
    good: [111, 182, 161],
    neutral: [176, 128, 68],
    warn: [224, 191, 92],
  };
  const accent = accentMap[tone];
  k.add([
    k.rect(frame.width, frame.height, { radius: 10 }),
    k.pos(frame.x, frame.y),
    k.color(34, 20, 24),
    tag,
  ]);
  k.add([
    k.rect(frame.width - 6, frame.height - 6, { radius: 8 }),
    k.pos(frame.x + 3, frame.y + 3),
    k.color(64, 44, 36),
    tag,
  ]);
  k.add([
    k.rect(frame.width - 18, 2, { radius: 1 }),
    k.pos(frame.x + 9, frame.y + 10),
    k.color(accent[0], accent[1], accent[2]),
    tag,
  ]);
  k.add([
    k.rect(frame.width - 18, frame.height - 34, { radius: 8 }),
    k.pos(frame.x + 9, frame.y + 18),
    k.color(48, 32, 28),
    tag,
  ]);
  k.add([
    k.sprite(fallbackSprite),
    k.pos(frame.x + frame.width / 2, frame.y + frame.height / 2 + 8),
    k.anchor("center"),
    k.scale(spriteName ? 2.1 : 1),
    tag,
  ]);
}

function equippedEntrySpriteName(
  entry: EquippedEntry,
  snapshot: GameSnapshot
): string | null {
  const player = snapshot.entities[snapshot.playerId] as
    | ExtendedEntityState
    | undefined;
  if (!player) {
    return null;
  }
  if (entry.id === "loadout-summary") {
    return resolveInventoryPlaceholderSprite("all");
  }
  if (entry.id === "weapon") {
    return player.equippedWeaponItemId
      ? resolveInventoryItemSprite(player.equippedWeaponItemId, "weapon")
      : resolveInventoryPlaceholderSprite("weapon");
  }
  if (entry.id === "armor") {
    return player.equippedArmorItemId
      ? resolveInventoryItemSprite(player.equippedArmorItemId, "armor")
      : resolveInventoryPlaceholderSprite("armor");
  }
  if (entry.id === "accessory") {
    return player.equippedAccessoryItemId
      ? resolveInventoryItemSprite(player.equippedAccessoryItemId, "accessory")
      : resolveInventoryPlaceholderSprite("accessory");
  }
  if (entry.id.startsWith("slot-")) {
    const slotIndex = Number(entry.id.replace("slot-", ""));
    const skillId = player.equippedSkillSlots[slotIndex] ?? null;
    return skillId ? resolveSpellSprite(skillId) : null;
  }
  if (entry.id === "archetype-profile") {
    return resolveInventoryPlaceholderSprite("armor");
  }
  if (entry.id === "title-track") {
    return resolveInventoryPlaceholderSprite("accessory");
  }
  return null;
}

export function renderNavigationOverlay({
  k,
  overlayState,
  sceneState,
  snapshot,
  x,
  y,
  width,
  height,
  preparedSlots,
  spellPool,
  onPrepareSpellSlot,
  onRender,
  onClose,
  onOpenNavigationMenuEntry,
  onDoAction,
  globalActions = [],
  roomActions = [],
  tag = UI_TAG,
}: RenderNavigationOverlayParams): void {
  if (!overlayState.activeOverlay) {
    return;
  }
  try {
    recordKaplayDebug("overlay", "render", {
      kind: overlayState.activeOverlay,
    });

    const overlayBodyX = x + 14;
    const overlayBodyY = y + 16;
    const overlayBodyW = width - 28;
    const overlayDetailH = Math.max(164, height - 72);

    renderCenterOverlaySurface(k, x, y, width, height, tag);
    addButton(k, x + width - 44, y + 14, 30, "X", onClose, true, {
      tone: "danger",
      compact: true,
      tag,
    });

    if (overlayState.activeOverlay === "menu_hub") {
      renderDisplayScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        title: "Menus",
        subtitle: "Arrow keys move, Enter opens, Esc closes",
        listTitle: "Command Board",
        entries: NAVIGATION_MENU_ENTRIES,
        pageIndex: 0,
        selectedEntryId: overlayState.menuHubSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.menuHubSelectedEntryId = entryId;
          const entry =
            NAVIGATION_MENU_ENTRIES.find(
              (candidate) => candidate.id === entryId
            ) ?? null;
          if (!entry) {
            onRender();
            return;
          }
          onOpenNavigationMenuEntry(entry);
        },
        onPageChange: (_nextPageIndex, nextSelectedEntryId) => {
          overlayState.menuHubSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        emptyListText: "No navigation commands are available.",
        emptyDetailText: "Select a command.",
        detailTitle: "",
        detailFooterText: "[Up/Down] Browse  [Enter] Open  [Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: NAVIGATION_MENU_ENTRIES.length,
        renderListVisual: (entry, frame) =>
          drawCommandBoardListVisual(k, entry, frame, tag),
        renderDetailVisual: (entry, frame) =>
          drawCommandBoardDetailVisual(k, entry, frame, tag),
        tag,
      });
      return;
    }

    if (overlayState.activeOverlay === "bag") {
      const player = snapshot.entities[
        snapshot.playerId
      ] as ExtendedEntityState;
      const allEntries = sortBagEntries(
        buildBagOverlayEntries(sceneState),
        overlayState.bagSort
      );
      const entries =
        overlayState.bagFilter === "all"
          ? allEntries
          : allEntries.filter(
              (entry) => entry.slotId === overlayState.bagFilter
            );
      const selectedBagEntry =
        entries.find((entry) => entry.id === overlayState.bagSelectedEntryId) ??
        entries[0] ??
        null;
      const weaponName =
        player.inventory.find(
          (item) => item.itemId === player.equippedWeaponItemId
        )?.name ?? "Empty";
      const armorName =
        player.inventory.find(
          (item) => item.itemId === player.equippedArmorItemId
        )?.name ?? "Empty";
      const accessoryName =
        player.inventory.find(
          (item) => item.itemId === player.equippedAccessoryItemId
        )?.name ?? "Empty";
      const bagGridTitle =
        overlayState.bagFilter === "all"
          ? "Inventory Grid"
          : `${bagFilterLabel(overlayState.bagFilter)} Inventory`;
      renderLoadoutGridScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        height: height - 44,
        title: "Bag",
        subtitle:
          "Icon-led inventory with slot filters and selection actions up top",
        slotsTitle: "Gear Slots",
        gridTitle: bagGridTitle,
        entries,
        pageIndex: overlayState.bagPageIndex,
        selectedEntryId: overlayState.bagSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.bagSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.bagPageIndex = nextPageIndex;
          overlayState.bagSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        slots: [
          {
            id: "all",
            label: "All",
            subtitle: `${player.inventory.length} carried`,
            occupiedLabel: "Full pack",
            icon: {
              kind: bagSlotIconKind("all"),
              spriteName: resolveInventoryPlaceholderSprite("all"),
            },
            tone: "neutral",
            selected: overlayState.bagFilter === "all",
            onSelect: () => {
              overlayState.bagFilter = "all";
              overlayState.bagPageIndex = 0;
              overlayState.bagSelectedEntryId = null;
              onRender();
            },
          },
          {
            id: "weapon",
            label: "Weapon",
            subtitle: "Main hand",
            occupiedLabel: weaponName,
            icon: {
              kind: bagSlotIconKind("weapon"),
              spriteName: resolveInventoryPlaceholderSprite("weapon"),
            },
            tone: "accent",
            selected: overlayState.bagFilter === "weapon",
            onSelect: () => {
              overlayState.bagFilter = "weapon";
              overlayState.bagPageIndex = 0;
              overlayState.bagSelectedEntryId = null;
              onRender();
            },
          },
          {
            id: "armor",
            label: "Armor",
            subtitle: "Body slot",
            occupiedLabel: armorName,
            icon: {
              kind: bagSlotIconKind("armor"),
              spriteName: resolveInventoryPlaceholderSprite("armor"),
            },
            tone: "good",
            selected: overlayState.bagFilter === "armor",
            onSelect: () => {
              overlayState.bagFilter = "armor";
              overlayState.bagPageIndex = 0;
              overlayState.bagSelectedEntryId = null;
              onRender();
            },
          },
          {
            id: "accessory",
            label: "Accessory",
            subtitle: "Charm slot",
            occupiedLabel: accessoryName,
            icon: {
              kind: bagSlotIconKind("accessory"),
              spriteName: resolveInventoryPlaceholderSprite("accessory"),
            },
            tone: "warn",
            selected: overlayState.bagFilter === "accessory",
            onSelect: () => {
              overlayState.bagFilter = "accessory";
              overlayState.bagPageIndex = 0;
              overlayState.bagSelectedEntryId = null;
              onRender();
            },
          },
        ],
        sortTabs: [
          {
            label: "Slot",
            iconSpriteName: sortIconSprite("slot"),
            onSelect: () => {
              overlayState.bagSort = "slot";
              overlayState.bagPageIndex = 0;
              onRender();
            },
          },
          {
            label: "Rarity",
            iconSpriteName: sortIconSprite("rarity"),
            onSelect: () => {
              overlayState.bagSort = "rarity";
              overlayState.bagPageIndex = 0;
              onRender();
            },
          },
          {
            label: "Name",
            iconSpriteName: sortIconSprite("name"),
            onSelect: () => {
              overlayState.bagSort = "name";
              overlayState.bagPageIndex = 0;
              onRender();
            },
          },
        ],
        activeSortLabel: sortLabel(overlayState.bagSort),
        controlHints: [],
        emptyGridText: "Inventory is empty.",
        emptyDetailText: "Select an item to inspect it.",
        detailFooterText: "Context actions stay pinned above. Esc closes.",
        actions: [
          {
            label: "Use",
            tone: "good",
            icon: {
              kind: "consumable",
              spriteName: resolveKaplayStaticIconSprite("wand-sparkles"),
            },
            enabled: Boolean(selectedBagEntry?.canUse),
            onSelect: () => {
              if (!selectedBagEntry?.useAction) {
                return;
              }
              onDoAction(selectedBagEntry.useAction);
            },
          },
          {
            label: "Equip",
            tone: "accent",
            icon: {
              kind: "armor",
              spriteName: resolveKaplayStaticIconSprite("shield"),
            },
            enabled: Boolean(selectedBagEntry?.canEquip),
            onSelect: () => {
              if (!selectedBagEntry?.equipAction) {
                return;
              }
              onDoAction(selectedBagEntry.equipAction);
            },
          },
          {
            label: "Drop",
            tone: "warn",
            icon: {
              kind: "loot",
              spriteName: resolveKaplayStaticIconSprite("trash-2"),
            },
            enabled: Boolean(selectedBagEntry?.canDrop),
            onSelect: () => {
              if (!selectedBagEntry?.dropAction) {
                return;
              }
              onDoAction(selectedBagEntry.dropAction);
            },
          },
        ],
        tag,
      });
      return;
    }

    if (overlayState.activeOverlay === "journal") {
      const entries = buildJournalEntries(overlayState.journalTab, snapshot);
      renderDisplayScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        title: "Journal",
        subtitle: "Quests, bestiary, and guides",
        listTitle: journalOverlayLabel(overlayState.journalTab),
        entries: entries as JournalEntry[],
        pageIndex: overlayState.journalPageIndex,
        selectedEntryId: overlayState.journalSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.journalSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.journalPageIndex = nextPageIndex;
          overlayState.journalSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        tabs: [
          {
            label: "Quests",
            iconSpriteName: resolveKaplayStaticIconSprite("scroll-text"),
            onSelect: () => {
              overlayState.journalTab = "quests";
              overlayState.journalPageIndex = 0;
              overlayState.journalSelectedEntryId = null;
              onRender();
            },
          },
          {
            label: "Bestiary",
            iconSpriteName: resolveKaplayStaticIconSprite("swords"),
            onSelect: () => {
              overlayState.journalTab = "bestiary";
              overlayState.journalPageIndex = 0;
              overlayState.journalSelectedEntryId = null;
              onRender();
            },
          },
          {
            label: "Guides",
            iconSpriteName: resolveKaplayStaticIconSprite("book-open"),
            onSelect: () => {
              overlayState.journalTab = "guides";
              overlayState.journalPageIndex = 0;
              overlayState.journalSelectedEntryId = null;
              onRender();
            },
          },
        ],
        activeTabLabel: journalOverlayLabel(overlayState.journalTab),
        emptyListText: "No journal entries.",
        emptyDetailText: "Select an entry.",
        detailFooterText:
          "[D-pad Up/Down] Select  [D-pad Left/Right] Page  [B/Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: 5,
        renderListVisual:
          overlayState.journalTab === "quests"
            ? (entry, frame) => {
                const q = entry as JournalEntry;
                const tint = questJournalRarityTint(q.rarityId);
                if (!tint) {
                  return;
                }
                k.add([
                  k.rect(3, 14, { radius: 1 }),
                  k.pos(frame.x + 2, frame.y + 3),
                  k.color(tint[0], tint[1], tint[2]),
                  tag,
                ]);
              }
            : undefined,
        renderDetailVisual:
          overlayState.journalTab === "quests"
            ? (entry, frame) => {
                const q = entry as JournalEntry;
                const spriteName =
                  q.iconSpriteUrl && q.id
                    ? ensureQuestIconSprite(k, q.id, q.iconSpriteUrl)
                    : null;
                let labelX = frame.x;
                if (spriteName) {
                  k.add([
                    k.sprite(spriteName),
                    k.pos(frame.x + 16, frame.y + 16),
                    k.anchor("center"),
                    k.scale(0.85),
                    tag,
                  ]);
                  labelX = frame.x + 36;
                }
                const rarityLabel = questJournalRarityLabel(q.rarityId);
                if (rarityLabel) {
                  const rgb = questJournalRarityTint(q.rarityId) ?? [
                    200, 200, 200,
                  ];
                  drawTextAtom(k, {
                    x: labelX,
                    y: frame.y + 10,
                    text: rarityLabel,
                    size: 9,
                    width: Math.max(40, frame.width - (labelX - frame.x)),
                    color: rgb,
                    tag,
                  });
                }
              }
            : undefined,
        tag,
      });
      return;
    }

    if (overlayState.activeOverlay === "dialogue") {
      const entries = buildActionOverlayEntries(
        itemsByActionType(sceneState, "choose_dialogue")
      ).filter((entry) => {
        return (
          entry.actionItem.action.kind === "player" &&
          entry.actionItem.action.playerAction.actionType === "choose_dialogue"
        );
      });
      const resolved = renderDisplayScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        title: "Dialogue",
        subtitle: "Stay in the navigation shell while picking a response",
        listTitle: "Responses",
        entries,
        pageIndex: overlayState.dialoguePageIndex,
        selectedEntryId: overlayState.dialogueSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.dialogueSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.dialoguePageIndex = nextPageIndex;
          overlayState.dialogueSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        emptyListText: "No dialogue options are available.",
        emptyDetailText: "Select a response.",
        detailFooterText: "[D-pad] Select  [A/Enter] Speak  [B/Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: 5,
        tag,
      });
      const selectedEntry =
        entries.find((entry) => entry.id === resolved.selectedEntryId) ?? null;
      if (!selectedEntry) {
        return;
      }
      addButton(
        k,
        x + 14,
        y + height - 34,
        width - 28,
        "Speak",
        () => onDoAction(selectedEntry.actionItem),
        selectedEntry.actionItem.available,
        { tone: selectedEntry.tone, compact: true, tag }
      );
      return;
    }

    if (overlayState.activeOverlay === "spellbook") {
      if (overlayState.spellbookSort === "slot") {
        overlayState.spellbookSort = "rarity";
      }
      const spellbookTab =
        overlayState.spellbookAllowCodex ||
        overlayState.spellbookTab !== "codex"
          ? overlayState.spellbookTab
          : "pool";
      if (spellbookTab !== overlayState.spellbookTab) {
        overlayState.spellbookTab = spellbookTab;
      }
      overlayState.spellbookSelectedSlotIndex = Math.max(
        0,
        Math.min(
          overlayState.spellbookSelectedSlotIndex,
          Math.max(0, preparedSlots.length - 1)
        )
      );
      const selectedSlot =
        preparedSlots[overlayState.spellbookSelectedSlotIndex] ?? null;
      const discovery = {
        discoveredSpellIds: new Set(
          sceneState.engine.discoveredSpellIds() as string[]
        ),
        discoveredEvolutionIds: new Set(
          sceneState.engine.discoveredEvolutionIds() as string[]
        ),
      };
      const allEntries = sortSpellEntries(
        buildSpellbookEntries(
          spellbookTab,
          preparedSlots,
          spellPool,
          discovery,
          overlayState.spellbookCategory.categoryId
        ),
        overlayState.spellbookSort
      );
      const filteredEntries =
        overlayState.spellbookCategory.categoryId === "all"
          ? allEntries
          : allEntries.filter((entry) => {
              return (
                entry.categoryId === overlayState.spellbookCategory.categoryId
              );
            });
      const entries: Array<SpellbookEntry & LoadoutGridEntry> =
        filteredEntries.map((entry) => {
          const rarity = rarityVisual(entry.rarityId);
          let metaLabel = `${entry.categoryId}${entry.rarityId ? ` | ${entry.rarityId}` : ""}`;
          if (spellbookTab === "codex") {
            metaLabel = `${rarity.label} | ${entry.knownInPool ? "Known" : "Unknown"}${entry.forgeCostManaCrystals === null ? "" : ` | ${entry.forgeCostManaCrystals} mc`}`;
          } else if (entry.slotIndex === null) {
            metaLabel = `${rarity.label} | ${titleCaseId(entry.categoryId)}`;
          } else {
            metaLabel = `${rarity.label} | Prepared Slot ${entry.slotIndex + 1}`;
          }
          return {
            ...entry,
            icon: {
              kind: spellEntryIconKind(entry.categoryId),
              spriteName: entry.spellId
                ? (resolveSpellSprite(entry.spellId) ??
                  spellCategoryIconSprite(entry.categoryId))
                : spellCategoryIconSprite(entry.categoryId),
              accent: rarity.color,
            },
            rarityColor: rarity.color,
            rarityIcon: {
              kind: "spell" as const,
              spriteName: rarity.iconSpriteName,
              accent: rarity.color,
            },
            rarityLabel: rarity.label,
            metaLabel,
          };
        });
      const selectedSpellEntry =
        entries.find(
          (entry) => entry.id === overlayState.spellbookSelectedEntryId
        ) ??
        entries.find(
          (entry) => entry.slotIndex === overlayState.spellbookSelectedSlotIndex
        ) ??
        entries[0] ??
        null;
      let spellGridTitle = "Spell Pool";
      if (spellbookTab === "codex") {
        spellGridTitle = `Rune Codex - ${overlayState.spellbookCategory.label}`;
      }
      renderLoadoutGridScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        height: height - 44,
        title: "Spellbook",
        subtitle: overlayState.spellbookAllowCodex
          ? "Pool-first prep with codex filters and top selection actions"
          : "Pool-first prep with clearer rarity and selection cues",
        slotsTitle: "Prepared",
        gridTitle: spellGridTitle,
        detailTitle: "Spell Portrait",
        entries,
        pageIndex: overlayState.spellbookPageIndex,
        selectedEntryId: overlayState.spellbookSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.spellbookSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.spellbookPageIndex = nextPageIndex;
          overlayState.spellbookSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        slots: preparedSlots.map((slot) => ({
          id: `spell-slot-${slot.slotIndex}`,
          label: `Prepared ${slot.slotIndex + 1}`,
          subtitle: slot.skillId ? slot.name : "Empty",
          occupiedLabel: slot.skillId ? slot.description : "Equip from pool",
          icon: {
            kind: slot.skillId ? spellEntryIconKind("spell") : "empty",
            spriteName: slot.skillId ? resolveSpellSprite(slot.skillId) : null,
          },
          tone: slot.skillId ? "accent" : "warn",
          selected: slot.slotIndex === overlayState.spellbookSelectedSlotIndex,
          onSelect: () => {
            overlayState.spellbookSelectedSlotIndex = slot.slotIndex;
            overlayState.spellbookSelectedEntryId =
              entries.find((entry) => entry.slotIndex === slot.slotIndex)?.id ??
              overlayState.spellbookSelectedEntryId;
            onRender();
          },
        })),
        tabs: [
          {
            label: "Pool",
            iconSpriteName: resolveKaplayStaticIconSprite("scroll-text"),
            onSelect: () => {
              overlayState.spellbookTab = "pool";
              overlayState.spellbookPageIndex = 0;
              overlayState.spellbookSelectedEntryId = null;
              onRender();
            },
          },
          ...(overlayState.spellbookAllowCodex
            ? [
                {
                  label: "Codex",
                  iconSpriteName: resolveKaplayStaticIconSprite("book-open"),
                  onSelect: () => {
                    overlayState.spellbookTab = "codex";
                    overlayState.spellbookPageIndex = 0;
                    overlayState.spellbookSelectedEntryId = null;
                    onRender();
                  },
                },
              ]
            : []),
        ],
        activeTabLabel: spellbookOverlayLabel(spellbookTab),
        filterTabs: SPELLBOOK_CATEGORY_OPTIONS.map((option) => ({
          label: option.label,
          iconSpriteName:
            option.categoryId === "all"
              ? resolveKaplayStaticIconSprite("funnel")
              : spellCategoryIconSprite(option.categoryId),
          onSelect: () => {
            overlayState.spellbookCategory = option;
            overlayState.spellbookPageIndex = 0;
            overlayState.spellbookSelectedEntryId = null;
            onRender();
          },
        })),
        activeFilterLabel: overlayState.spellbookCategory.label,
        sortTabs: [
          {
            label: "Rarity",
            iconSpriteName: sortIconSprite("rarity"),
            onSelect: () => {
              overlayState.spellbookSort = "rarity";
              overlayState.spellbookPageIndex = 0;
              onRender();
            },
          },
          {
            label: "Name",
            iconSpriteName: sortIconSprite("name"),
            onSelect: () => {
              overlayState.spellbookSort = "name";
              overlayState.spellbookPageIndex = 0;
              onRender();
            },
          },
        ],
        activeSortLabel: sortLabel(overlayState.spellbookSort),
        controlHints: [],
        detailVisualHeight: 104,
        emptyGridText: "No spells available.",
        emptyDetailText: "Select a spell.",
        detailFooterText: "Equip and Clear stay pinned above. Esc closes.",
        panelIcons: {
          detail: {
            kind: "spell",
            spriteName: resolveKaplayStaticIconSprite("scroll-text"),
          },
          grid: {
            kind: "spell",
            spriteName:
              spellbookTab === "codex"
                ? resolveKaplayStaticIconSprite("book-open")
                : resolveKaplayStaticIconSprite("scroll-text"),
          },
          slots: {
            kind: "spell",
            spriteName: resolveKaplayStaticIconSprite("shield"),
          },
        },
        renderDetailVisual: (entry, frame) => {
          drawDetailPortrait(
            k,
            entry.spellId
              ? (resolveSpellSprite(entry.spellId) ??
                  spellCategoryIconSprite(entry.categoryId))
              : spellCategoryIconSprite(entry.categoryId),
            frame,
            tag,
            entry.tone
          );
        },
        actions: [
          {
            label: `Equip -> Prepared ${overlayState.spellbookSelectedSlotIndex + 1}`,
            tone: "accent",
            icon: {
              kind: "spell",
              spriteName: resolveKaplayStaticIconSprite("wand-sparkles"),
            },
            enabled:
              spellbookTab === "pool" && Boolean(selectedSpellEntry?.spellId),
            onSelect: () => {
              if (!(spellbookTab === "pool" && selectedSpellEntry?.spellId)) {
                return;
              }
              onPrepareSpellSlot(
                overlayState.spellbookSelectedSlotIndex,
                selectedSpellEntry.spellId
              );
            },
          },
          {
            label: `Clear Prepared ${overlayState.spellbookSelectedSlotIndex + 1}`,
            tone: "warn",
            icon: {
              kind: "empty",
              spriteName: resolveKaplayStaticIconSprite("trash-2"),
            },
            enabled: Boolean(selectedSlot?.skillId),
            onSelect: () => {
              onPrepareSpellSlot(overlayState.spellbookSelectedSlotIndex, null);
            },
          },
        ],
        tag,
      });
      return;
    }

    if (overlayState.activeOverlay === "stats") {
      const entries = buildStatsEntries(
        snapshot,
        sceneState.status as Record<string, unknown>
      );
      renderDisplayScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        title: "Stats",
        subtitle: "Run state and vitals",
        listTitle: "Readouts",
        entries,
        pageIndex: overlayState.statsPageIndex,
        selectedEntryId: overlayState.statsSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.statsSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.statsPageIndex = nextPageIndex;
          overlayState.statsSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        emptyListText: "No stat entries.",
        emptyDetailText: "Select a readout.",
        detailFooterText:
          "[D-pad Up/Down] Select  [D-pad Left/Right] Page  [B/Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: 5,
        tag,
      });
      return;
    }

    if (overlayState.activeOverlay === "global_actions") {
      const entries = buildActionOverlayEntries(globalActions);
      const resolved = renderDisplayScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        title: "Global Actions",
        subtitle: "Run-level and traversal actions",
        listTitle: "Available Actions",
        entries,
        pageIndex: overlayState.globalActionsPageIndex,
        selectedEntryId: overlayState.globalActionsSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.globalActionsSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.globalActionsPageIndex = nextPageIndex;
          overlayState.globalActionsSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        emptyListText: "No global actions available.",
        emptyDetailText: "Select an action.",
        detailFooterText:
          "[D-pad Up/Down] Select  [D-pad Left/Right] Page  [A/Enter] Do  [B/Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: 5,
        tag,
      });
      const selectedEntry =
        entries.find((entry) => entry.id === resolved.selectedEntryId) ?? null;
      if (!selectedEntry) {
        return;
      }
      addButton(
        k,
        x + 14,
        y + height - 34,
        width - 28,
        "[DO] Execute",
        () => onDoAction(selectedEntry.actionItem),
        selectedEntry.actionItem.available,
        { tone: selectedEntry.tone, compact: true, tag }
      );
      return;
    }

    if (overlayState.activeOverlay === "room_actions") {
      const entries = buildActionOverlayEntries(roomActions);
      const resolved = renderDisplayScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        title: "Room Actions",
        subtitle: "Actions tied to the room you occupy",
        listTitle: "Room Actions",
        entries,
        pageIndex: overlayState.roomActionsPageIndex,
        selectedEntryId: overlayState.roomActionsSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.roomActionsSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.roomActionsPageIndex = nextPageIndex;
          overlayState.roomActionsSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        emptyListText: "No room actions available.",
        emptyDetailText: "Select an action.",
        detailFooterText:
          "[D-pad Up/Down] Select  [D-pad Left/Right] Page  [A/Enter] Do  [B/Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: 5,
        tag,
      });
      const selectedEntry =
        entries.find((entry) => entry.id === resolved.selectedEntryId) ?? null;
      if (!selectedEntry) {
        return;
      }
      addButton(
        k,
        x + 14,
        y + height - 34,
        width - 28,
        "[DO] Execute",
        () => onDoAction(selectedEntry.actionItem),
        selectedEntry.actionItem.available,
        { tone: selectedEntry.tone, compact: true, tag }
      );
      return;
    }

    if (overlayState.activeOverlay === "equipped") {
      const entries = buildEquippedEntries(
        snapshot,
        sceneState.status as Record<string, unknown>
      );
      renderDisplayScreen({
        k,
        x: overlayBodyX,
        y: overlayBodyY,
        width: overlayBodyW,
        title: "Equipped",
        subtitle: "Loadout, archetype, and title track",
        listTitle: "Loadout",
        entries: entries as EquippedEntry[],
        pageIndex: overlayState.equippedPageIndex,
        selectedEntryId: overlayState.equippedSelectedEntryId,
        onSelectEntry: (entryId) => {
          overlayState.equippedSelectedEntryId = entryId;
          onRender();
        },
        onPageChange: (nextPageIndex, nextSelectedEntryId) => {
          overlayState.equippedPageIndex = nextPageIndex;
          overlayState.equippedSelectedEntryId = nextSelectedEntryId;
          onRender();
        },
        emptyListText: "No equipment entries.",
        emptyDetailText: "Select a spell to inspect or prepare.",
        detailFooterText:
          "[D-pad Up/Down] Select  [D-pad Left/Right] Page  [B/Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: 5,
        renderListVisual: (entry, frame) => {
          drawDisplaySpriteVisual(
            k,
            equippedEntrySpriteName(entry, snapshot),
            frame,
            tag,
            0.5
          );
        },
        renderDetailVisual: (entry, frame) => {
          drawDisplaySpriteVisual(
            k,
            equippedEntrySpriteName(entry, snapshot),
            frame,
            tag,
            0.85
          );
        },
        tag,
      });
    }
  } catch (error) {
    logKaplayDebugError("overlay", "render-failed", error, {
      kind: overlayState.activeOverlay,
    });
    throw error;
  }
}
