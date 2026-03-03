// generated from content-pack.manifest.v1

export interface EntityBaseModel {
  "Comprehension": number;
  "Constraint": number;
  "Survival": number;
  "Fame": number;
  "Effort": number;
  "Awareness": number;
  "Guile": number;
  "Momentum": number;
}

export const ENTITY_BASE_DEFAULTS: Partial<EntityBaseModel> = {
  "Comprehension": 0.000,
  "Constraint": 0.000,
  "Survival": 0.000,
  "Fame": 0.000,
  "Effort": 0.000,
  "Awareness": 0.000,
  "Guile": 0.000,
  "Momentum": 0.000,
};

export interface EntityWerewolfModel {
  "Survival": number;
  "Direction": number;
  "Momentum": number;
  "Guile": number;
  "Effort": number;
}

export const ENTITY_WEREWOLF_DEFAULTS: Partial<EntityWerewolfModel> = {
  "Survival": 0.000,
  "Direction": 0.000,
  "Momentum": 0.000,
  "Guile": 0.000,
  "Effort": 0.000,
};

export interface EntityVillagerModel {
  "Empathy": number;
  "Comprehension": number;
  "Awareness": number;
  "Fame": number;
  "Equilibrium": number;
}

export const ENTITY_VILLAGER_DEFAULTS: Partial<EntityVillagerModel> = {
  "Empathy": 0.000,
  "Comprehension": 0.000,
  "Awareness": 0.000,
  "Fame": 0.000,
  "Equilibrium": 0.000,
};

export interface EntityHostileModel {
  "Survival": number;
  "Constraint": number;
  "Direction": number;
  "Momentum": number;
  "Effort": number;
}

export const ENTITY_HOSTILE_DEFAULTS: Partial<EntityHostileModel> = {
  "Survival": 0.000,
  "Constraint": 0.000,
  "Direction": 0.000,
  "Momentum": 0.000,
  "Effort": 0.000,
};

export interface ItemBaseModel {
  "Construction": number;
  "Constraint": number;
  "Awareness": number;
  "Momentum": number;
}

export const ITEM_BASE_DEFAULTS: Partial<ItemBaseModel> = {
  "Construction": 0.000,
  "Constraint": 0.000,
  "Awareness": 0.000,
  "Momentum": 0.000,
};

export interface ItemWeaponModel {
  "Constraint": number;
  "Direction": number;
  "Survival": number;
  "Momentum": number;
}

export const ITEM_WEAPON_DEFAULTS: Partial<ItemWeaponModel> = {
  "Constraint": 0.000,
  "Direction": 0.000,
  "Survival": 0.000,
  "Momentum": 0.000,
};

export interface ItemPotionModel {
  "Equilibrium": number;
  "Levity": number;
  "Awareness": number;
  "Effort": number;
}

export const ITEM_POTION_DEFAULTS: Partial<ItemPotionModel> = {
  "Equilibrium": 0.000,
  "Levity": 0.000,
  "Awareness": 0.000,
  "Effort": 0.000,
};

export interface ItemQuestModel {
  "Projection": number;
  "Comprehension": number;
  "Fame": number;
  "Awareness": number;
}

export const ITEM_QUEST_DEFAULTS: Partial<ItemQuestModel> = {
  "Projection": 0.000,
  "Comprehension": 0.000,
  "Fame": 0.000,
  "Awareness": 0.000,
};

export interface RoomBaseModel {
  "Equilibrium": number;
  "Freedom": number;
  "Direction": number;
  "Survival": number;
}

export const ROOM_BASE_DEFAULTS: Partial<RoomBaseModel> = {
  "Equilibrium": 0.000,
  "Freedom": 0.000,
  "Direction": 0.000,
  "Survival": 0.000,
};

export interface RoomCombatModel {
  "Survival": number;
  "Constraint": number;
  "Direction": number;
  "Momentum": number;
}

export const ROOM_COMBAT_DEFAULTS: Partial<RoomCombatModel> = {
  "Survival": 0.000,
  "Constraint": 0.000,
  "Direction": 0.000,
  "Momentum": 0.000,
};

export interface RoomDialogueModel {
  "Empathy": number;
  "Comprehension": number;
  "Levity": number;
  "Awareness": number;
}

export const ROOM_DIALOGUE_DEFAULTS: Partial<RoomDialogueModel> = {
  "Empathy": 0.000,
  "Comprehension": 0.000,
  "Levity": 0.000,
  "Awareness": 0.000,
};

export interface RoomRuneForgeModel {
  "Construction": number;
  "Constraint": number;
  "Projection": number;
  "Effort": number;
}

export const ROOM_RUNE_FORGE_DEFAULTS: Partial<RoomRuneForgeModel> = {
  "Construction": 0.000,
  "Constraint": 0.000,
  "Projection": 0.000,
  "Effort": 0.000,
};

export interface RoomTreasureModel {
  "Freedom": number;
  "Projection": number;
  "Survival": number;
  "Fame": number;
}

export const ROOM_TREASURE_DEFAULTS: Partial<RoomTreasureModel> = {
  "Freedom": 0.000,
  "Projection": 0.000,
  "Survival": 0.000,
  "Fame": 0.000,
};

export interface LevelBaseModel {
  "Effort": number;
  "Momentum": number;
  "Fame": number;
  "Awareness": number;
}

export const LEVEL_BASE_DEFAULTS: Partial<LevelBaseModel> = {
  "Effort": 0.000,
  "Momentum": 0.000,
  "Fame": 0.000,
  "Awareness": 0.000,
};

export interface LevelBossFloorModel {
  "Survival": number;
  "Constraint": number;
  "Momentum": number;
  "Effort": number;
  "Fame": number;
}

export const LEVEL_BOSS_FLOOR_DEFAULTS: Partial<LevelBossFloorModel> = {
  "Survival": 0.000,
  "Constraint": 0.000,
  "Momentum": 0.000,
  "Effort": 0.000,
  "Fame": 0.000,
};

export interface LevelSafeFloorModel {
  "Equilibrium": number;
  "Levity": number;
  "Empathy": number;
  "Awareness": number;
  "Effort": number;
}

export const LEVEL_SAFE_FLOOR_DEFAULTS: Partial<LevelSafeFloorModel> = {
  "Equilibrium": 0.000,
  "Levity": 0.000,
  "Empathy": 0.000,
  "Awareness": 0.000,
  "Effort": 0.000,
};

export interface EffectBaseModel {
  "Projection": number;
  "Survival": number;
  "Awareness": number;
  "Momentum": number;
}

export const EFFECT_BASE_DEFAULTS: Partial<EffectBaseModel> = {
  "Projection": 0.000,
  "Survival": 0.000,
  "Awareness": 0.000,
  "Momentum": 0.000,
};

export interface EffectDotModel {
  "Constraint": number;
  "Survival": number;
  "Momentum": number;
  "Effort": number;
}

export const EFFECT_DOT_DEFAULTS: Partial<EffectDotModel> = {
  "Constraint": 0.000,
  "Survival": 0.000,
  "Momentum": 0.000,
  "Effort": 0.000,
};

export interface EffectHotModel {
  "Equilibrium": number;
  "Levity": number;
  "Awareness": number;
  "Effort": number;
}

export const EFFECT_HOT_DEFAULTS: Partial<EffectHotModel> = {
  "Equilibrium": 0.000,
  "Levity": 0.000,
  "Awareness": 0.000,
  "Effort": 0.000,
};

export interface EffectAuraModel {
  "Projection": number;
  "Freedom": number;
  "Momentum": number;
  "Awareness": number;
}

export const EFFECT_AURA_DEFAULTS: Partial<EffectAuraModel> = {
  "Projection": 0.000,
  "Freedom": 0.000,
  "Momentum": 0.000,
  "Awareness": 0.000,
};

export interface EffectTriggeredModel {
  "Projection": number;
  "Constraint": number;
  "Momentum": number;
  "Awareness": number;
}

export const EFFECT_TRIGGERED_DEFAULTS: Partial<EffectTriggeredModel> = {
  "Projection": 0.000,
  "Constraint": 0.000,
  "Momentum": 0.000,
  "Awareness": 0.000,
};

