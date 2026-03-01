import type { PlayerAction } from "../core/types";

export const actionMove = (direction: string): PlayerAction => ({
  actionType: "move",
  payload: { direction: direction.toLowerCase() },
});

export const actionTrain = (): PlayerAction => ({
  actionType: "train",
  payload: {},
});

export const actionTalk = (targetId?: string): PlayerAction => ({
  actionType: "talk",
  payload: targetId ? { targetId } : {},
});

export const actionRest = (): PlayerAction => ({
  actionType: "rest",
  payload: {},
});

export const actionSearch = (): PlayerAction => ({
  actionType: "search",
  payload: {},
});

export const actionSpeak = (intentText: string): PlayerAction => ({
  actionType: "speak",
  payload: { intentText },
});

export const actionFight = (): PlayerAction => ({
  actionType: "fight",
  payload: {},
});

export const actionFlee = (direction: string): PlayerAction => ({
  actionType: "flee",
  payload: { direction: direction.toLowerCase() },
});

export const actionChooseDialogue = (optionId: string): PlayerAction => ({
  actionType: "choose_dialogue",
  payload: { optionId },
});

export const actionLiveStream = (effort = 10): PlayerAction => ({
  actionType: "live_stream",
  payload: { effort },
});

export const actionSteal = (targetId?: string): PlayerAction => ({
  actionType: "steal",
  payload: targetId ? { targetId } : {},
});

export const actionRecruit = (targetId?: string): PlayerAction => ({
  actionType: "recruit",
  payload: targetId ? { targetId } : {},
});

export const actionMurder = (targetId?: string): PlayerAction => ({
  actionType: "murder",
  payload: targetId ? { targetId } : {},
});

export const actionEvolveSkill = (skillId: string): PlayerAction => ({
  actionType: "evolve_skill",
  payload: { skillId },
});

export const actionUseItem = (itemId: string): PlayerAction => ({
  actionType: "use_item",
  payload: { itemId },
});

export const actionEquipItem = (itemId: string): PlayerAction => ({
  actionType: "equip_item",
  payload: { itemId },
});

export const actionDropItem = (itemId: string): PlayerAction => ({
  actionType: "drop_item",
  payload: { itemId },
});
