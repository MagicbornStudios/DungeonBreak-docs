import { ACTION_CATALOG, CANONICAL_SEED_V1 } from "../contracts";
import type { ActionAvailability, PlayerAction } from "../core/types";
import { GameEngine } from "../engine/game";

export interface BalanceRunMetrics {
  seed: number;
  turnsRequested: number;
  turnsPlayed: number;
  escaped: boolean;
  survived: boolean;
  depth: number;
  level: number;
  fame: number;
  finalHealth: number;
  finalPressure: number;
  averageTurnMs: number;
  p95TurnMs: number;
  maxTurnMs: number;
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
    survivalRate: number;
    averageFame: number;
    averageLevel: number;
    averageTurnMs: number;
    p95TurnMs: number;
    maxTurnMs: number;
    archetypeDistribution: Record<string, number>;
    actionUsage: Record<string, number>;
    deadActionTypes: string[];
  };
}

export interface LongRunWindowMetrics {
  turns: number;
  batch: BalanceBatchMetrics;
}

export interface LongRunSuiteMetrics {
  generatedAt: string;
  seeds: number[];
  windows: LongRunWindowMetrics[];
  summary: {
    deadActionTypesAcrossWindows: string[];
    worstP95TurnMs: number;
    worstMaxTurnMs: number;
    performanceBudgetMs: number;
    withinPerformanceBudget: boolean;
  };
}

const increment = (target: Record<string, number>, key: string, amount = 1): void => {
  target[key] = (target[key] ?? 0) + amount;
};

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const percentile = (values: number[], rank: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * rank)));
  return sorted[index] ?? 0;
};

const deadActionTypes = (usage: Record<string, number>): string[] => {
  const catalogTypes = ACTION_CATALOG.actions.map((row) => row.actionType);
  return catalogTypes.filter((actionType) => Number(usage[actionType] ?? 0) <= 0);
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
  // Keep long-run harness bounded. Pressure/perf stress is covered by dedicated pressure tests.
  game.state.config.hostileSpawnPerTurn = 0;
  let transitions = 0;
  const usage: Record<string, number> = {};
  const turnDurationsMs: number[] = [];
  let previousArchetype = game.player.archetypeHeading;

  for (let turn = 0; turn < turns; turn += 1) {
    if (game.state.escaped || game.player.health <= 0) {
      break;
    }
    const startedAt = performance.now();
    const action = chooseAction(game.availableActions(game.player), turn);
    increment(usage, action.actionType, 1);
    game.dispatch(action);
    turnDurationsMs.push(performance.now() - startedAt);
    if (game.player.archetypeHeading !== previousArchetype) {
      transitions += 1;
      previousArchetype = game.player.archetypeHeading;
    }
  }

  const status = game.status();
  const finalHealth = Number(game.player.health ?? 0);
  return {
    seed,
    turnsRequested: turns,
    turnsPlayed: turnDurationsMs.length,
    escaped: game.state.escaped,
    survived: finalHealth > 0,
    depth: Number(status.depth ?? game.player.depth),
    level: Number(status.level ?? 1),
    fame: Number(game.player.features.Fame ?? 0),
    finalHealth,
    finalPressure: Number(status.pressure ?? 0),
    averageTurnMs: average(turnDurationsMs),
    p95TurnMs: percentile(turnDurationsMs, 0.95),
    maxTurnMs: turnDurationsMs.length > 0 ? Math.max(...turnDurationsMs) : 0,
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
  const p95AcrossRuns = runs.length > 0 ? Math.max(...runs.map((run) => run.p95TurnMs)) : 0;
  const maxAcrossRuns = runs.length > 0 ? Math.max(...runs.map((run) => run.maxTurnMs)) : 0;
  return {
    generatedAt: new Date().toISOString(),
    seeds: orderedSeeds,
    turnsPerRun: turns,
    runs,
    aggregate: {
      escapeRate: runs.filter((run) => run.escaped).length / divisor,
      survivalRate: runs.filter((run) => run.survived).length / divisor,
      averageFame: runs.reduce((sum, run) => sum + run.fame, 0) / divisor,
      averageLevel: runs.reduce((sum, run) => sum + run.level, 0) / divisor,
      averageTurnMs: runs.reduce((sum, run) => sum + run.averageTurnMs, 0) / divisor,
      p95TurnMs: p95AcrossRuns,
      maxTurnMs: maxAcrossRuns,
      archetypeDistribution,
      actionUsage: aggregateActionUsage,
      deadActionTypes: deadActionTypes(aggregateActionUsage),
    },
  };
};

export const simulateLongRunSuite = (
  seeds: number[],
  windows: number[] = [100, 250, 500],
  performanceBudgetMs = 2000,
): LongRunSuiteMetrics => {
  const orderedSeeds = seeds.length > 0 ? [...seeds] : [CANONICAL_SEED_V1];
  const orderedWindows = [...new Set(windows.map((value) => Math.max(1, Math.trunc(value))))].sort((a, b) => a - b);
  const results: LongRunWindowMetrics[] = orderedWindows.map((turns) => ({
    turns,
    batch: simulateBalanceBatch(orderedSeeds, turns),
  }));

  const deadUnion = new Set<string>();
  let worstP95TurnMs = 0;
  let worstMaxTurnMs = 0;

  for (const row of results) {
    for (const actionType of row.batch.aggregate.deadActionTypes) {
      deadUnion.add(actionType);
    }
    worstP95TurnMs = Math.max(worstP95TurnMs, row.batch.aggregate.p95TurnMs);
    worstMaxTurnMs = Math.max(worstMaxTurnMs, row.batch.aggregate.maxTurnMs);
  }

  return {
    generatedAt: new Date().toISOString(),
    seeds: orderedSeeds,
    windows: results,
    summary: {
      deadActionTypesAcrossWindows: [...deadUnion].sort(),
      worstP95TurnMs,
      worstMaxTurnMs,
      performanceBudgetMs,
      withinPerformanceBudget: worstP95TurnMs <= performanceBudgetMs,
    },
  };
};
