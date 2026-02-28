import { CANONICAL_SEED_V1 } from "../contracts";
import type { ActionAvailability, PlayerAction } from "../core/types";
import { GameEngine } from "../engine/game";

export interface BalanceRunMetrics {
  seed: number;
  turnsRequested: number;
  turnsPlayed: number;
  escaped: boolean;
  depth: number;
  level: number;
  fame: number;
  actionUsage: Record<string, number>;
  finalArchetype: string;
  archetypeTransitions: number;
}

export interface BalanceBatchMetrics {
  generatedAt: string;
  seeds: number[];
  turnsPerRun: number;
  runs: BalanceRunMetrics[];
  aggregate: {
    escapeRate: number;
    averageFame: number;
    averageLevel: number;
    archetypeDistribution: Record<string, number>;
    actionUsage: Record<string, number>;
  };
}

const increment = (target: Record<string, number>, key: string, amount = 1): void => {
  target[key] = (target[key] ?? 0) + amount;
};

const toAction = (row: ActionAvailability): PlayerAction => {
  if (row.actionType === "choose_dialogue") {
    const options = (row.payload.options as Array<{ optionId: string }> | undefined) ?? [];
    return {
      actionType: "choose_dialogue",
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (row.actionType === "evolve_skill") {
    return {
      actionType: "evolve_skill",
      payload: { skillId: String(row.payload.skillId ?? "") },
    };
  }
  if (row.actionType === "live_stream") {
    return {
      actionType: "live_stream",
      payload: { effort: Number(row.payload.effort ?? 10) },
    };
  }
  if (row.actionType === "speak") {
    return {
      actionType: "speak",
      payload: { intentText: "Push forward. Keep the run alive." },
    };
  }
  return { actionType: row.actionType, payload: { ...row.payload } };
};

const chooseAction = (rows: ActionAvailability[], turnIndex: number): PlayerAction => {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) {
    return { actionType: "rest", payload: {} };
  }
  const orderedByPriority = [...legal].sort((a, b) => {
    const priority = (row: ActionAvailability): number => {
      if (row.actionType === "fight") {
        return 1;
      }
      if (row.actionType === "flee") {
        return 2;
      }
      if (row.actionType === "evolve_skill") {
        return 3;
      }
      if (row.actionType === "choose_dialogue") {
        return 4;
      }
      if (row.actionType === "search") {
        return 5;
      }
      if (row.actionType === "train") {
        return 6;
      }
      if (row.actionType === "live_stream") {
        return 7;
      }
      if (row.actionType === "talk") {
        return 8;
      }
      if (row.actionType === "move") {
        return 9;
      }
      return 10;
    };
    const pA = priority(a);
    const pB = priority(b);
    if (pA !== pB) {
      return pA - pB;
    }
    return a.label.localeCompare(b.label);
  });

  const sampled = orderedByPriority[Math.min(orderedByPriority.length - 1, turnIndex % 3)];
  return toAction(sampled as ActionAvailability);
};

export const simulateBalanceRun = (seed: number, turns = 80): BalanceRunMetrics => {
  const game = GameEngine.create(seed);
  let transitions = 0;
  const usage: Record<string, number> = {};
  let previousArchetype = game.player.archetypeHeading;

  for (let turn = 0; turn < turns; turn += 1) {
    if (game.state.escaped || game.player.health <= 0) {
      break;
    }
    const action = chooseAction(game.availableActions(game.player), turn);
    increment(usage, action.actionType, 1);
    game.dispatch(action);
    if (game.player.archetypeHeading !== previousArchetype) {
      transitions += 1;
      previousArchetype = game.player.archetypeHeading;
    }
  }

  const status = game.status();
  return {
    seed,
    turnsRequested: turns,
    turnsPlayed: Number(status.turn ?? 0),
    escaped: game.state.escaped,
    depth: Number(status.depth ?? game.player.depth),
    level: Number(status.level ?? 1),
    fame: Number(game.player.features.Fame ?? 0),
    actionUsage: usage,
    finalArchetype: game.player.archetypeHeading,
    archetypeTransitions: transitions,
  };
};

export const simulateBalanceBatch = (seeds: number[], turns = 80): BalanceBatchMetrics => {
  const orderedSeeds = seeds.length > 0 ? [...seeds] : [CANONICAL_SEED_V1];
  const runs = orderedSeeds.map((seed) => simulateBalanceRun(seed, turns));
  const aggregateActionUsage: Record<string, number> = {};
  const archetypeDistribution: Record<string, number> = {};

  for (const run of runs) {
    increment(archetypeDistribution, run.finalArchetype, 1);
    for (const [actionType, count] of Object.entries(run.actionUsage)) {
      increment(aggregateActionUsage, actionType, count);
    }
  }

  const divisor = Math.max(1, runs.length);
  return {
    generatedAt: new Date().toISOString(),
    seeds: orderedSeeds,
    turnsPerRun: turns,
    runs,
    aggregate: {
      escapeRate: runs.filter((run) => run.escaped).length / divisor,
      averageFame: runs.reduce((sum, run) => sum + run.fame, 0) / divisor,
      averageLevel: runs.reduce((sum, run) => sum + run.level, 0) / divisor,
      archetypeDistribution,
      actionUsage: aggregateActionUsage,
    },
  };
};
