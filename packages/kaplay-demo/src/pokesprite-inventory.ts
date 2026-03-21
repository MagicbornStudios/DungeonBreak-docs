export type InventoryPlaceholderSlotId =
  | "all"
  | "weapon"
  | "armor"
  | "accessory"
  | "consumable"
  | "loot";

interface PokespritePlaceholderSpec {
  spriteName: string;
  vendorPath: string;
  publicPath: string;
}

const INVENTORY_SPRITE_ROOT = "sprites/pokesprite/inventory";

export const POKESPRITE_SLOT_PLACEHOLDERS: Record<
  InventoryPlaceholderSlotId,
  PokespritePlaceholderSpec
> = {
  all: {
    spriteName: "pokesprite-inventory-all",
    vendorPath: "items/key-item/forage-bag.png",
    publicPath: `${INVENTORY_SPRITE_ROOT}/all.png`,
  },
  weapon: {
    spriteName: "pokesprite-inventory-weapon",
    vendorPath: "items/hold-item/rusted-sword.png",
    publicPath: `${INVENTORY_SPRITE_ROOT}/weapon.png`,
  },
  armor: {
    spriteName: "pokesprite-inventory-armor",
    vendorPath: "items/hold-item/assault-vest.png",
    publicPath: `${INVENTORY_SPRITE_ROOT}/armor.png`,
  },
  accessory: {
    spriteName: "pokesprite-inventory-accessory",
    vendorPath: "items/hold-item/amulet-coin.png",
    publicPath: `${INVENTORY_SPRITE_ROOT}/accessory.png`,
  },
  consumable: {
    spriteName: "pokesprite-inventory-consumable",
    vendorPath: "items/medicine/potion.png",
    publicPath: `${INVENTORY_SPRITE_ROOT}/consumable.png`,
  },
  loot: {
    spriteName: "pokesprite-inventory-loot",
    vendorPath: "items/valuable-item/nugget.png",
    publicPath: `${INVENTORY_SPRITE_ROOT}/loot.png`,
  },
};

export function pokespritePublicUrl(publicPath: string): string {
  return `./${publicPath}`;
}
