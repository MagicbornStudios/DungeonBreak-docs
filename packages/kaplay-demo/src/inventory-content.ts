import type { ActionItem } from "@dungeonbreak/engine";
import { collectActionItems, getActionType } from "./action-renderer";
import type { SceneCallbacks } from "./scene-contracts";

export interface InventoryRow {
  itemId: string;
  name: string;
  description: string;
  rarity: string;
  tags: string[];
  slotId: "weapon" | "armor" | "accessory" | "consumable" | "loot";
  typeLabel: string;
  equippedSlot: "weapon" | "armor" | "accessory" | null;
  showInBag: boolean;
  line: string;
  canUse: boolean;
  canEquip: boolean;
  canDrop: boolean;
  useAction: ActionItem | null;
  equipAction: ActionItem | null;
  dropAction: ActionItem | null;
}

function actionKey(actionType: string, itemId: string): string {
  return `${actionType}:${itemId}`;
}

function inventorySlotId(
  tags: string[]
): "weapon" | "armor" | "accessory" | "consumable" | "loot" {
  if (tags.includes("weapon")) {
    return "weapon";
  }
  if (tags.includes("armor")) {
    return "armor";
  }
  if (
    tags.includes("accessory") ||
    tags.includes("relic") ||
    tags.includes("fame") ||
    tags.includes("utility") ||
    tags.includes("guile")
  ) {
    return "accessory";
  }
  if (tags.includes("consumable") || tags.includes("potion")) {
    return "consumable";
  }
  return "loot";
}

function inventoryTypeLabel(
  slotId: "weapon" | "armor" | "accessory" | "consumable" | "loot",
  tags: string[]
): string {
  if (tags.includes("currency")) {
    return "Currency";
  }
  if (tags.includes("treasure")) {
    return "Treasure";
  }
  if (slotId === "weapon") {
    return "Weapon";
  }
  if (slotId === "armor") {
    return "Armor";
  }
  if (slotId === "accessory") {
    return "Accessory";
  }
  if (slotId === "consumable") {
    return "Consumable";
  }
  return "Material";
}

function showInBag(tags: string[]): boolean {
  return !(tags.includes("currency") || tags.includes("treasure"));
}

export function inventoryRows(
  state: ReturnType<SceneCallbacks["getState"]>
): InventoryRow[] {
  const snapshot = state.snapshot as {
    entities: Record<
      string,
      {
        inventory: Array<{
          itemId: string;
          name: string;
          description?: string;
          rarity?: string;
          tags?: string[];
        }>;
        equippedWeaponItemId?: string | null;
        equippedArmorItemId?: string | null;
        equippedAccessoryItemId?: string | null;
      }
    >;
    playerId: string;
  };
  const player = snapshot.entities[snapshot.playerId];
  const inventory = player?.inventory ?? [];
  const actionMap = new Map<string, ActionItem>();

  for (const item of collectActionItems(state)) {
    if (item.action.kind !== "player") {
      continue;
    }
    const itemId = String(item.action.playerAction.payload.itemId ?? "");
    if (itemId.length === 0) {
      continue;
    }
    actionMap.set(actionKey(getActionType(item.action), itemId), item);
  }

  return inventory.map((item, idx) => {
    const rarity = item.rarity ?? "common";
    const tagList = item.tags ?? [];
    let equippedSlot: "weapon" | "armor" | "accessory" | null = null;
    if (player?.equippedWeaponItemId === item.itemId) {
      equippedSlot = "weapon";
    } else if (player?.equippedArmorItemId === item.itemId) {
      equippedSlot = "armor";
    } else if (player?.equippedAccessoryItemId === item.itemId) {
      equippedSlot = "accessory";
    }
    const equippedMarker = equippedSlot ? ` [equipped ${equippedSlot}]` : "";
    const useAction = actionMap.get(actionKey("use_item", item.itemId)) ?? null;
    const equipAction =
      actionMap.get(actionKey("equip_item", item.itemId)) ?? null;
    const dropAction =
      actionMap.get(actionKey("drop_item", item.itemId)) ?? null;
    const slotId = inventorySlotId(tagList);
    const typeLabel = inventoryTypeLabel(slotId, tagList);

    return {
      itemId: item.itemId,
      name: item.name,
      description: item.description ?? "",
      rarity,
      tags: tagList,
      slotId,
      typeLabel,
      equippedSlot,
      showInBag: showInBag(tagList),
      line: `${idx + 1}. ${item.name} | ${typeLabel} | ${rarity}${equippedMarker}`,
      canUse: Boolean(useAction?.available),
      canEquip: Boolean(equipAction?.available),
      canDrop: Boolean(dropAction?.available),
      useAction,
      equipAction,
      dropAction,
    };
  });
}
