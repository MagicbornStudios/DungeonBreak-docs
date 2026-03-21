import { ACTION_CONTRACTS } from "../../contracts";
import type { EntityState, PlayerAction, RoomNode } from "../../core/types";
import { takePresentItems } from "../../world/map";
import { mergeDeltas, toNumberMap } from "../game-runtime-helpers";
import type { ActionAvailabilityResult, ActionOutcome } from "./action-types";

export const availabilityForInventoryAction = (input: {
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
  nearby: EntityState[];
  runeForgePurchaseCost: number;
  runeForgeOfferItemIds: string[];
  findInventoryItem: (
    actor: EntityState,
    itemId: string
  ) => EntityState["inventory"][number] | null;
  isEquippable: (item: EntityState["inventory"][number]) => boolean;
  countCurrencyTokens: (actor: EntityState) => number;
  resolveTradeTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[]
  ) => EntityState | null;
  isTradeItem: (item: EntityState["inventory"][number]) => boolean;
  merchantBuyPriceForItem: (item: EntityState["inventory"][number]) => number;
  merchantSellPriceForItem: (item: EntityState["inventory"][number]) => number;
}): ActionAvailabilityResult | null => {
  const {
    actor,
    action,
    room,
    nearby,
    runeForgePurchaseCost,
    runeForgeOfferItemIds,
    findInventoryItem,
    isEquippable,
    countCurrencyTokens,
    resolveTradeTarget,
    isTradeItem,
    merchantBuyPriceForItem,
    merchantSellPriceForItem,
  } = input;

  if (action.actionType === "use_item") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    const item = findInventoryItem(actor, String(action.payload.itemId ?? ""));
    return item
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["Missing item"] };
  }

  if (action.actionType === "equip_item") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    const item = findInventoryItem(actor, String(action.payload.itemId ?? ""));
    if (!item) {
      return { available: false, blockedReasons: ["Missing item"] };
    }
    return isEquippable(item)
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["Item is not equippable"] };
  }

  if (action.actionType === "drop_item") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    const item = findInventoryItem(actor, String(action.payload.itemId ?? ""));
    return item
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["Missing item"] };
  }

  if (action.actionType === "buy_item") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    const target = resolveTradeTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby
    );
    if (!target) {
      return { available: false, blockedReasons: ["Need trader"] };
    }
    const item = findInventoryItem(target, String(action.payload.itemId ?? ""));
    if (!item) {
      return { available: false, blockedReasons: ["Missing trade item"] };
    }
    if (!isTradeItem(item)) {
      return { available: false, blockedReasons: ["Item cannot be traded"] };
    }
    if (countCurrencyTokens(actor) < merchantBuyPriceForItem(item)) {
      return { available: false, blockedReasons: ["Need currency"] };
    }
    return { available: true, blockedReasons: [] };
  }

  if (action.actionType === "sell_item") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    const target = resolveTradeTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby
    );
    if (!target) {
      return { available: false, blockedReasons: ["Need trader"] };
    }
    const item = findInventoryItem(actor, String(action.payload.itemId ?? ""));
    if (!item) {
      return { available: false, blockedReasons: ["Missing item"] };
    }
    if (!isTradeItem(item)) {
      return { available: false, blockedReasons: ["Item cannot be traded"] };
    }
    if (merchantSellPriceForItem(item) <= 0) {
      return { available: false, blockedReasons: ["Trader offers nothing"] };
    }
    return { available: true, blockedReasons: [] };
  }

  if (action.actionType === "purchase") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    if (room.feature !== "rune_forge") {
      return { available: false, blockedReasons: ["Need rune forge room"] };
    }
    const itemId = String(action.payload.itemId ?? "");
    if (!itemId) {
      return { available: false, blockedReasons: ["Missing item id"] };
    }
    if (!runeForgeOfferItemIds.includes(itemId)) {
      return {
        available: false,
        blockedReasons: ["Item not sold at rune forge"],
      };
    }
    if (countCurrencyTokens(actor) < runeForgePurchaseCost) {
      return { available: false, blockedReasons: ["Need currency"] };
    }
    return { available: true, blockedReasons: [] };
  }

  if (action.actionType === "re_equip") {
    if (!actor.isPlayer) {
      return { available: false, blockedReasons: ["Player action only"] };
    }
    if (room.feature !== "rune_forge") {
      return { available: false, blockedReasons: ["Need rune forge room"] };
    }
    const item = findInventoryItem(actor, String(action.payload.itemId ?? ""));
    if (!item) {
      return { available: false, blockedReasons: ["Missing item"] };
    }
    return isEquippable(item)
      ? { available: true, blockedReasons: [] }
      : { available: false, blockedReasons: ["Item is not equippable"] };
  }

  return null;
};

export const performInventoryAction = (input: {
  actor: EntityState;
  action: PlayerAction;
  room: RoomNode;
  nearby: EntityState[];
  runeForgePurchaseCost: number;
  findInventoryItem: (
    actor: EntityState,
    itemId: string
  ) => EntityState["inventory"][number] | null;
  isConsumable: (item: EntityState["inventory"][number]) => boolean;
  clearEquippedItem: (actor: EntityState, itemId: string) => void;
  setEquippedItem: (
    actor: EntityState,
    item: EntityState["inventory"][number]
  ) => void;
  isEquippable: (item: EntityState["inventory"][number]) => boolean;
  consumeCurrencyTokens: (actor: EntityState, count: number) => number;
  buildPurchasedItem: (
    itemId: string
  ) => EntityState["inventory"][number] | null;
  resolveTradeTarget: (
    actor: EntityState,
    requestedTargetId: string | undefined,
    nearby: EntityState[]
  ) => EntityState | null;
  isTradeItem: (item: EntityState["inventory"][number]) => boolean;
  merchantBuyPriceForItem: (item: EntityState["inventory"][number]) => number;
  merchantSellPriceForItem: (item: EntityState["inventory"][number]) => number;
  treasureCrystalRewardForRoom: (room: RoomNode) => number;
  buildManaCrystalItems: (
    count: number,
    source: string,
    rarity?: EntityState["inventory"][number]["rarity"]
  ) => EntityState["inventory"];
}): ActionOutcome | null => {
  const {
    actor,
    action,
    room,
    nearby,
    runeForgePurchaseCost,
    findInventoryItem,
    isConsumable,
    clearEquippedItem,
    setEquippedItem,
    isEquippable,
    consumeCurrencyTokens,
    buildPurchasedItem,
    resolveTradeTarget,
    isTradeItem,
    merchantBuyPriceForItem,
    merchantSellPriceForItem,
    treasureCrystalRewardForRoom,
    buildManaCrystalItems,
  } = input;
  const formulas = ACTION_CONTRACTS.actions;

  if (action.actionType === "search") {
    const crystalReward =
      room.feature === "treasure" ? treasureCrystalRewardForRoom(room) : 0;
    const takenItems = takePresentItems(room);
    const crystalItems = buildManaCrystalItems(
      crystalReward,
      `search_${room.roomId}`,
      crystalReward >= 4 ? "rare" : "common"
    );
    if (takenItems.length === 0 && crystalItems.length === 0) {
      return {
        message: `${actor.name} searches the room but finds nothing new.`,
        warnings: ["search_empty"],
        narrativeStatDelta: toNumberMap(
          formulas.searchEmpty?.traitDelta ?? { Comprehension: 0.01 }
        ),
        metadata: {},
        foundItemTags: [],
      };
    }
    for (const takenItem of takenItems) {
      actor.inventory.push({
        itemId: takenItem.itemId,
        name: takenItem.name,
        rarity: takenItem.rarity,
        description: takenItem.description,
        tags: [...takenItem.tags],
        narrativeStatDelta: { ...takenItem.vectorDelta },
      });
    }
    actor.inventory.push(...crystalItems);
    const foundNames = [
      ...takenItems.map((item) => item.name),
      crystalItems.length > 0
        ? `${crystalItems.length} mana crystal${crystalItems.length === 1 ? "" : "s"}`
        : null,
    ].filter((value): value is string => Boolean(value));
    const rarityOrder = ["legendary", "epic", "rare", "common"] as const;
    const rarity =
      takenItems
        .map((item) => item.rarity)
        .find((candidate) => rarityOrder.includes(candidate)) ?? "common";
    return {
      message: `${actor.name} searches the room and finds ${foundNames.join(", ")}.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        ...takenItems.map((item) => item.vectorDelta)
      ),
      metadata: {
        itemIds: takenItems.map((item) => item.itemId),
        rarity,
        manaCrystalCount: crystalItems.length,
      },
      foundItemTags: [
        ...new Set(
          [
            ...takenItems.flatMap((item) => item.tags),
            ...crystalItems.flatMap((item) => item.tags),
          ].filter(Boolean)
        ),
      ],
    };
  }

  if (action.actionType === "use_item") {
    const itemId = String(action.payload.itemId ?? "");
    const item = findInventoryItem(actor, itemId);
    if (!item) {
      return {
        message: `${actor.name} cannot find item '${itemId}'.`,
        warnings: ["item_missing"],
        narrativeStatDelta: {},
        metadata: { itemId },
        foundItemTags: [],
      };
    }
    const consumed = isConsumable(item);
    if (consumed) {
      actor.inventory = actor.inventory.filter(
        (entry) => entry.itemId !== item.itemId
      );
      clearEquippedItem(actor, item.itemId);
    }
    return {
      message: consumed
        ? `${actor.name} uses ${item.name} and consumes it.`
        : `${actor.name} uses ${item.name}.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        item.narrativeStatDelta,
        formulas.useItem?.traitDelta ?? {},
        formulas.useItem?.featureDelta ?? { Awareness: 0.02 }
      ),
      metadata: { itemId: item.itemId, consumed },
      foundItemTags: [...item.tags],
    };
  }

  if (action.actionType === "equip_item") {
    const itemId = String(action.payload.itemId ?? "");
    const item = findInventoryItem(actor, itemId);
    if (!item) {
      return {
        message: `${actor.name} cannot find item '${itemId}'.`,
        warnings: ["item_missing"],
        narrativeStatDelta: {},
        metadata: { itemId },
        foundItemTags: [],
      };
    }
    if (!isEquippable(item)) {
      return {
        message: `${item.name} cannot be equipped.`,
        warnings: ["item_not_equippable"],
        narrativeStatDelta: {},
        metadata: { itemId: item.itemId },
        foundItemTags: [],
      };
    }
    setEquippedItem(actor, item);
    return {
      message: `${actor.name} equips ${item.name}.`,
      warnings: [],
      narrativeStatDelta: toNumberMap(
        formulas.equipItem?.featureDelta ?? { Momentum: 0.03 }
      ),
      metadata: { itemId: item.itemId },
      foundItemTags: [...item.tags],
    };
  }

  if (action.actionType === "drop_item") {
    const itemId = String(action.payload.itemId ?? "");
    const item = findInventoryItem(actor, itemId);
    if (!item) {
      return {
        message: `${actor.name} cannot find item '${itemId}'.`,
        warnings: ["item_missing"],
        narrativeStatDelta: {},
        metadata: { itemId },
        foundItemTags: [],
      };
    }
    actor.inventory = actor.inventory.filter(
      (entry) => entry.itemId !== item.itemId
    );
    clearEquippedItem(actor, item.itemId);
    return {
      message: `${actor.name} drops ${item.name}.`,
      warnings: [],
      narrativeStatDelta: toNumberMap(
        formulas.dropItem?.featureDelta ?? { Momentum: -0.02 }
      ),
      metadata: { itemId: item.itemId },
      foundItemTags: [],
    };
  }

  if (action.actionType === "buy_item") {
    const target = resolveTradeTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby
    );
    const itemId = String(action.payload.itemId ?? "");
    const tradedItem = target ? findInventoryItem(target, itemId) : null;
    if (!(target && tradedItem && isTradeItem(tradedItem))) {
      return {
        message: `${actor.name} cannot complete that trade right now.`,
        warnings: ["trade_unavailable"],
        narrativeStatDelta: {},
        metadata: { itemId },
        foundItemTags: [],
      };
    }
    const price = merchantBuyPriceForItem(tradedItem);
    if (consumeCurrencyTokens(actor, price) < price) {
      return {
        message: `${actor.name} lacks the mana crystals to buy ${tradedItem.name}.`,
        warnings: ["insufficient_currency"],
        narrativeStatDelta: {},
        metadata: { itemId, targetId: target.entityId },
        foundItemTags: [],
      };
    }
    target.inventory = target.inventory.filter(
      (item) => item.itemId !== itemId
    );
    clearEquippedItem(target, itemId);
    const boughtItem = {
      ...tradedItem,
      tags: tradedItem.tags.filter(
        (tag) => tag !== "merchant_stock" && tag !== "buyback"
      ),
    };
    actor.inventory.push(boughtItem);
    const isBuyback = tradedItem.tags.includes("buyback");
    return {
      message: isBuyback
        ? `${actor.name} buys back ${boughtItem.name} from ${target.name}.`
        : `${actor.name} buys ${boughtItem.name} from ${target.name}.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.purchase?.traitDelta ?? {
          Comprehension: 0.02,
          Constraint: 0.02,
        },
        formulas.purchase?.featureDelta ?? {
          Awareness: 0.05,
          Momentum: 0.03,
        }
      ),
      metadata: {
        itemId: boughtItem.itemId,
        targetId: target.entityId,
        manaCrystalCount: -price,
        buyback: isBuyback,
      },
      foundItemTags: [...boughtItem.tags],
      subjectEntityId: target.entityId,
    };
  }

  if (action.actionType === "sell_item") {
    const target = resolveTradeTarget(
      actor,
      action.payload.targetId as string | undefined,
      nearby
    );
    const itemId = String(action.payload.itemId ?? "");
    const soldItem = findInventoryItem(actor, itemId);
    if (!(target && soldItem && isTradeItem(soldItem))) {
      return {
        message: `${actor.name} cannot sell that item right now.`,
        warnings: ["trade_unavailable"],
        narrativeStatDelta: {},
        metadata: { itemId },
        foundItemTags: [],
      };
    }
    const payout = merchantSellPriceForItem(soldItem);
    actor.inventory = actor.inventory.filter((item) => item.itemId !== itemId);
    clearEquippedItem(actor, itemId);
    const payoutItems = buildManaCrystalItems(
      payout,
      `sell_${itemId}`,
      soldItem.rarity
    );
    actor.inventory.push(...payoutItems);
    target.inventory.push({
      ...soldItem,
      tags: [...new Set([...soldItem.tags, "merchant_stock", "buyback"])],
    });
    return {
      message: `${actor.name} sells ${soldItem.name} to ${target.name} for ${payout} mana crystal${payout === 1 ? "" : "s"}.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.dropItem?.featureDelta ?? { Momentum: -0.02 },
        { Comprehension: 0.01 }
      ),
      metadata: {
        itemId: soldItem.itemId,
        targetId: target.entityId,
        manaCrystalCount: payout,
      },
      foundItemTags: payoutItems.flatMap((item) => item.tags),
      subjectEntityId: target.entityId,
    };
  }

  if (action.actionType === "purchase") {
    const itemId = String(action.payload.itemId ?? "");
    const purchasedItem = buildPurchasedItem(itemId);
    if (!purchasedItem) {
      return {
        message: `Rune Forge cannot sell '${itemId}'.`,
        warnings: ["unknown_purchase_item"],
        narrativeStatDelta: {},
        metadata: { itemId },
        foundItemTags: [],
      };
    }
    const consumed = consumeCurrencyTokens(actor, runeForgePurchaseCost);
    if (consumed < runeForgePurchaseCost) {
      return {
        message: `${actor.name} lacks currency to purchase ${itemId}.`,
        warnings: ["insufficient_currency"],
        narrativeStatDelta: {},
        metadata: { itemId, required: runeForgePurchaseCost, consumed },
        foundItemTags: [],
      };
    }
    actor.inventory.push(purchasedItem);
    return {
      message: `${actor.name} purchases ${purchasedItem.name} from the Rune Forge.`,
      warnings: [],
      narrativeStatDelta: mergeDeltas(
        formulas.purchase?.traitDelta ?? {
          Comprehension: 0.02,
          Constraint: 0.02,
        },
        formulas.purchase?.featureDelta ?? {
          Awareness: 0.05,
          Momentum: 0.03,
        }
      ),
      metadata: {
        itemId: purchasedItem.itemId,
        purchasedFrom: itemId,
        currencySpent: consumed,
      },
      foundItemTags: [...purchasedItem.tags],
    };
  }

  if (action.actionType === "re_equip") {
    const itemId = String(action.payload.itemId ?? "");
    const item = findInventoryItem(actor, itemId);
    if (!item) {
      return {
        message: `${actor.name} cannot re-equip missing item '${itemId}'.`,
        warnings: ["item_missing"],
        narrativeStatDelta: {},
        metadata: { itemId },
        foundItemTags: [],
      };
    }
    if (!isEquippable(item)) {
      return {
        message: `${item.name} cannot be re-equipped.`,
        warnings: ["item_not_equippable"],
        narrativeStatDelta: {},
        metadata: { itemId: item.itemId },
        foundItemTags: [],
      };
    }
    setEquippedItem(actor, item);
    return {
      message: `${actor.name} re-equips ${item.name} at the Rune Forge.`,
      warnings: [],
      narrativeStatDelta: toNumberMap(
        formulas.reEquip?.featureDelta ?? { Momentum: 0.04 }
      ),
      metadata: { itemId: item.itemId },
      foundItemTags: [...item.tags],
    };
  }

  return null;
};
