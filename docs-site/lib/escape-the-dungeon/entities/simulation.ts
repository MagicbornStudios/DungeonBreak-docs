import type { EntityState, PlayerAction, RoomFeature } from "@/lib/escape-the-dungeon/core/types";
import type { DeterministicRng } from "@/lib/escape-the-dungeon/core/rng";

const actionWeight = (
  actor: EntityState,
  action: PlayerAction,
  roomFeature: RoomFeature,
  nearbyEnemyCount: number,
): number => {
  let score = 1;

  if (action.actionType === "rest") {
    score += actor.energy < 0.5 ? 4 : 0.5;
    if (roomFeature === "rest") {
      score += 1.5;
    }
  }

  if (action.actionType === "train") {
    score += roomFeature === "training" ? 4 : 0.6;
  }

  if (action.actionType === "search") {
    score += roomFeature === "treasure" ? 4 : 1.2;
  }

  if (action.actionType === "talk" || action.actionType === "choose_dialogue") {
    score += roomFeature === "dialogue" ? 3 : 1;
  }

  if (action.actionType === "fight") {
    score += nearbyEnemyCount > 0 ? 5 : 0.2;
    if (actor.entityKind === "boss" || actor.entityKind === "hostile") {
      score += 2;
    }
  }

  if (action.actionType === "murder") {
    score += actor.faction === "laughing_face" ? 5 : 0;
  }

  if (action.actionType === "live_stream") {
    score += actor.isPlayer ? 2 : 0.8;
  }

  if (action.actionType === "move") {
    score += 1.2;
    if (actor.entityKind === "hostile") {
      score += 2.2;
    }
  }

  if (action.actionType === "evolve_skill") {
    score += roomFeature === "rune_forge" ? 4.5 : 0.4;
  }

  return Math.max(0.05, score);
};

export const chooseFromLegalActions = (
  actor: EntityState,
  legalActions: PlayerAction[],
  roomFeature: RoomFeature,
  nearbyEnemyCount: number,
  rng: DeterministicRng,
): PlayerAction => {
  if (legalActions.length === 0) {
    return { actionType: "rest", payload: {} };
  }

  if (actor.entityKind === "hostile" || actor.entityKind === "boss") {
    const combat = legalActions.filter((action) => action.actionType === "fight" || action.actionType === "murder");
    if (combat.length > 0 && nearbyEnemyCount > 0) {
      return rng.pick(combat);
    }
  }

  const weighted: Array<{ action: PlayerAction; weight: number }> = legalActions.map((action) => ({
    action,
    weight: actionWeight(actor, action, roomFeature, nearbyEnemyCount),
  }));

  let total = 0;
  for (const row of weighted) {
    total += row.weight;
  }

  const roll = rng.nextFloat() * total;
  let cursor = 0;
  for (const row of weighted) {
    cursor += row.weight;
    if (roll <= cursor) {
      return row.action;
    }
  }

  const fallback = weighted.at(-1);
  if (!fallback) {
    return { actionType: "rest", payload: {} };
  }
  return fallback.action;
};
