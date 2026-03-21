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
} from "./journal-content";
import { logKaplayDebugError, recordKaplayDebug } from "./kaplay-debug";
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
  },
  {
    id: "command-spellbook",
    title: "Spellbook",
    subtitle: "Prepared spells and unlocked pool",
    detailLines: [
      "Review your prepared loadout and the spells you can currently slot.",
      "Rune codex pages open from rune forge context instead of the top command menu.",
    ],
    tone: "accent",
    targetOverlay: "spellbook",
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
  canSell: boolean;
  useAction: ActionItem | null;
  equipAction: ActionItem | null;
  dropAction: ActionItem | null;
  sellAction: ActionItem | null;
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
    case "loadout":
      return "Loadout";
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
  return inventoryRows(state).map((row) => ({
    id: row.itemId,
    itemId: row.itemId,
    rarity: row.rarity,
    slotId: row.slotId,
    equippedSlot: row.equippedSlot,
    title: row.line.split(". ").slice(1).join(". ") || row.line,
    subtitle:
      [
        row.canUse ? "Use" : null,
        row.canEquip ? "Equip" : null,
        row.canDrop ? "Drop" : null,
        row.canSell ? "Sell" : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" | ") || "View only",
    detailLines: [
      row.line,
      row.canUse
        ? "Use is available in the current context."
        : "Use is unavailable here.",
      row.canEquip
        ? "Equip is available in the current context."
        : "Equip is unavailable here.",
      row.canDrop
        ? "Drop is available in the current context."
        : "Drop is unavailable here.",
      row.canSell
        ? "Sell is available in the current context."
        : "Sell is unavailable here.",
    ],
    tone: bagEntryTone(row.canUse, row.canEquip),
    icon: {
      kind: bagEntryIconKind(row.slotId),
      spriteName: resolveInventoryItemSprite(row.itemId, row.slotId),
    },
    metaLabel: `${row.rarity} | ${row.slotId}${row.equippedSlot ? " | equipped" : ""}`,
    canUse: row.canUse,
    canEquip: row.canEquip,
    canDrop: row.canDrop,
    canSell: row.canSell,
    useAction: row.useAction,
    equipAction: row.equipAction,
    dropAction: row.dropAction,
    sellAction: row.sellAction,
  }));
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
    spellbookTab: "loadout",
    spellbookCategory: SPELLBOOK_CATEGORY_OPTIONS[0],
    spellbookPageIndex: 0,
    spellbookSelectedEntryId: null,
    spellbookSelectedSlotIndex: 0,
    spellbookSort: "slot",
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
        detailFooterText: "[Arrow] Move  [Enter] Open  [Esc] Close",
        detailHeight: overlayDetailH,
        pageSize: NAVIGATION_MENU_ENTRIES.length,
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
        subtitle: "Grid inventory with side gear slots and direct item actions",
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
            onSelect: () => {
              overlayState.bagSort = "slot";
              overlayState.bagPageIndex = 0;
              onRender();
            },
          },
          {
            label: "Rarity",
            onSelect: () => {
              overlayState.bagSort = "rarity";
              overlayState.bagPageIndex = 0;
              onRender();
            },
          },
          {
            label: "Name",
            onSelect: () => {
              overlayState.bagSort = "name";
              overlayState.bagPageIndex = 0;
              onRender();
            },
          },
        ],
        activeSortLabel: sortLabel(overlayState.bagSort),
        emptyGridText: "Inventory is empty.",
        emptyDetailText: "Select an item to inspect it.",
        detailFooterText: "[Esc] Close",
        actions: [
          {
            label: "[USE] Use",
            tone: "good",
            enabled: Boolean(selectedBagEntry?.canUse),
            onSelect: () => {
              if (!selectedBagEntry?.useAction) {
                return;
              }
              onDoAction(selectedBagEntry.useAction);
            },
          },
          {
            label: "[EQP] Equip",
            tone: "accent",
            enabled: Boolean(selectedBagEntry?.canEquip),
            onSelect: () => {
              if (!selectedBagEntry?.equipAction) {
                return;
              }
              onDoAction(selectedBagEntry.equipAction);
            },
          },
          {
            label: "[DROP] Drop",
            tone: "warn",
            enabled: Boolean(selectedBagEntry?.canDrop),
            onSelect: () => {
              if (!selectedBagEntry?.dropAction) {
                return;
              }
              onDoAction(selectedBagEntry.dropAction);
            },
          },
          {
            label: "[SELL] Sell",
            tone: "accent",
            enabled: Boolean(selectedBagEntry?.canSell),
            onSelect: () => {
              if (!selectedBagEntry?.sellAction) {
                return;
              }
              onDoAction(selectedBagEntry.sellAction);
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
            onSelect: () => {
              overlayState.journalTab = "quests";
              overlayState.journalPageIndex = 0;
              overlayState.journalSelectedEntryId = null;
              onRender();
            },
          },
          {
            label: "Bestiary",
            onSelect: () => {
              overlayState.journalTab = "bestiary";
              overlayState.journalPageIndex = 0;
              overlayState.journalSelectedEntryId = null;
              onRender();
            },
          },
          {
            label: "Guides",
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
      const spellbookTab =
        overlayState.spellbookAllowCodex ||
        overlayState.spellbookTab !== "codex"
          ? overlayState.spellbookTab
          : "loadout";
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
        spellbookTab === "loadout" ||
        overlayState.spellbookCategory.categoryId === "all"
          ? allEntries
          : allEntries.filter((entry) => {
              return (
                entry.categoryId === overlayState.spellbookCategory.categoryId
              );
            });
      const entries = filteredEntries.map((entry) => {
        let metaLabel = `${entry.categoryId}${entry.rarityId ? ` | ${entry.rarityId}` : ""}`;
        if (spellbookTab === "loadout") {
          metaLabel = `Slot ${Number(entry.slotIndex ?? 0) + 1}`;
        } else if (spellbookTab === "codex") {
          metaLabel = `${entry.knownInPool ? "Known" : "Unknown"}${entry.forgeCostManaCrystals !== null ? ` | ${entry.forgeCostManaCrystals} mc` : ""}`;
        }
        return {
          ...entry,
          icon: {
            kind: spellEntryIconKind(entry.categoryId),
            spriteName: entry.spellId
              ? resolveSpellSprite(entry.spellId)
              : null,
          },
          metaLabel,
        };
      });
      const selectedSpellEntry =
        entries.find(
          (entry) => entry.id === overlayState.spellbookSelectedEntryId
        ) ??
        entries.find(
          (entry) =>
            spellbookTab === "loadout" &&
            entry.slotIndex === overlayState.spellbookSelectedSlotIndex
        ) ??
        entries[0] ??
        null;
      let spellGridTitle = "Prepared Spells";
      if (spellbookTab === "pool") {
        spellGridTitle = "Spell Pool";
      } else if (spellbookTab === "codex") {
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
          ? "Shared spell loadout, pool, and rune-forge codex"
          : "Shared spell loadout and unlocked pool",
        slotsTitle: "Loadout",
        gridTitle: spellGridTitle,
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
          label: `Slot ${slot.slotIndex + 1}`,
          subtitle: slot.skillId ? slot.name : "Empty",
          occupiedLabel: slot.skillId ? slot.name : "Prepare at forge",
          icon: {
            kind: slot.skillId ? spellEntryIconKind("spell") : "empty",
          },
          tone: slot.skillId ? "accent" : "warn",
          selected: slot.slotIndex === overlayState.spellbookSelectedSlotIndex,
          onSelect: () => {
            overlayState.spellbookSelectedSlotIndex = slot.slotIndex;
            if (spellbookTab === "loadout") {
              overlayState.spellbookSelectedEntryId =
                entries.find((entry) => entry.slotIndex === slot.slotIndex)
                  ?.id ?? null;
            }
            onRender();
          },
        })),
        tabs: [
          {
            label: "Loadout",
            onSelect: () => {
              overlayState.spellbookTab = "loadout";
              overlayState.spellbookPageIndex = 0;
              overlayState.spellbookSelectedEntryId = null;
              onRender();
            },
          },
          {
            label: "Pool",
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
        filterTabs:
          spellbookTab === "loadout"
            ? undefined
            : SPELLBOOK_CATEGORY_OPTIONS.map((option) => ({
                label: option.label,
                onSelect: () => {
                  overlayState.spellbookCategory = option;
                  overlayState.spellbookPageIndex = 0;
                  overlayState.spellbookSelectedEntryId = null;
                  onRender();
                },
              })),
        activeFilterLabel:
          spellbookTab === "loadout"
            ? undefined
            : overlayState.spellbookCategory.label,
        sortTabs: [
          {
            label: "Slot",
            onSelect: () => {
              overlayState.spellbookSort = "slot";
              overlayState.spellbookPageIndex = 0;
              onRender();
            },
          },
          {
            label: "Rarity",
            onSelect: () => {
              overlayState.spellbookSort = "rarity";
              overlayState.spellbookPageIndex = 0;
              onRender();
            },
          },
          {
            label: "Name",
            onSelect: () => {
              overlayState.spellbookSort = "name";
              overlayState.spellbookPageIndex = 0;
              onRender();
            },
          },
        ],
        activeSortLabel: sortLabel(overlayState.spellbookSort),
        emptyGridText: "No spells available.",
        emptyDetailText: "Select a spell.",
        detailFooterText: "[Esc] Close",
        actions: [
          {
            label: `[PREP] Prepare -> Slot ${overlayState.spellbookSelectedSlotIndex + 1}`,
            tone: "accent",
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
            label: `[CLR] Clear Slot ${overlayState.spellbookSelectedSlotIndex + 1}`,
            tone: "warn",
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
        emptyDetailText: "Select a loadout entry.",
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
