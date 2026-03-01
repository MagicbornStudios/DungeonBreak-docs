/**
 * Pure playthrough analysis — same logic as engine-mcp playthrough-analyzer.
 * Accepts report object, returns analysis (no fs).
 */

type ActionTraceEntry = {
  playerTurn: number;
  action: { actionType: string; payload?: Record<string, unknown> };
  source?: string;
  eventCount?: number;
  playerEventCount?: number;
  nonPlayerEventCount?: number;
};

type PlayerTimelinePoint = {
  playerTurn: number;
  depth: number;
  roomId: string;
  chapter: number;
  act: number;
  skills?: string[];
};

type TurnTimelineEntry = {
  playerTurn: number;
  selectedAction: { actionType: string };
  availableActionTypes: string[];
  dialogueOptionsPresented?: { optionId: string }[];
  pageDelta?: {
    totalNewChapterLines?: number;
    totalNewEntityLines?: number;
  };
  playerBefore?: { skills?: string[] };
  playerAfter?: { skills?: string[] };
};

type ReportRun = {
  turnsPlayed: number;
  actionTrace: ActionTraceEntry[];
  playerTimeline: PlayerTimelinePoint[];
  turnTimeline: TurnTimelineEntry[];
};

type Report = {
  schemaVersion?: string;
  seed: number;
  turnsRequested: number;
  actionCoverage: { expected: string[]; covered: string[]; missing: string[] };
  run: ReportRun;
};

export type AnalysisOutput = {
  schemaVersion: string;
  sourceReport: string;
  replayability: {
    actionDiversityEntropy: number;
    actionCoverageRatio: number;
    uniqueActionRoomPairs: number;
    moveOnlyRun: boolean;
    insufficientExcitementWarning: boolean;
  };
  excitement: {
    perTurnScores: number[];
    rollingWindowSize: number;
    rollingAverage: number[];
    meanExcitement: number;
  };
  emergent: {
    novelEventCombinations: number;
    actionTypeEntropy: number;
  };
};

const HIGH_SIGNAL_ACTIONS = new Set([
  "fight",
  "flee",
  "choose_dialogue",
  "talk",
  "speak",
  "evolve_skill",
  "search",
  "cutscene",
]);

function shannonEntropy(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

function computeReplayability(report: Report): AnalysisOutput["replayability"] {
  const { actionTrace, playerTimeline } = report.run;
  const { expected, covered, missing } = report.actionCoverage;

  const actionCounts: Record<string, number> = {};
  for (const row of actionTrace) {
    const t = row.action.actionType;
    actionCounts[t] = (actionCounts[t] ?? 0) + 1;
  }
  const total = actionTrace.length;
  const probs = Object.values(actionCounts).map((c) => c / total);
  const actionDiversityEntropy = total > 0 ? shannonEntropy(probs) : 0;

  const actionCoverageRatio =
    expected.length > 0 ? covered.length / expected.length : 0;

  const pairs = new Set<string>();
  for (let i = 0; i < actionTrace.length; i++) {
    const a = actionTrace[i];
    const pt = playerTimeline[i] ?? playerTimeline[playerTimeline.length - 1];
    const roomFeature = pt?.roomId ?? "unknown";
    pairs.add(`${a.action.actionType}:${roomFeature}`);
  }
  const uniqueActionRoomPairs = pairs.size;

  const moveOnlyRun =
    actionTrace.length > 0 &&
    actionTrace.every((r) => r.action.actionType === "move");

  const nonMoveActions = expected.filter((t) => t !== "move");
  const missingNonMove = missing.filter((t) => t !== "move");
  const insufficientExcitementWarning =
    nonMoveActions.length > 0 && missingNonMove.length >= nonMoveActions.length;

  return {
    actionDiversityEntropy,
    actionCoverageRatio,
    uniqueActionRoomPairs,
    moveOnlyRun,
    insufficientExcitementWarning,
  };
}

function computeExcitement(report: Report): AnalysisOutput["excitement"] {
  const { turnTimeline, actionTrace } = report.run;
  const WINDOW = 5;

  const perTurnScores: number[] = [];
  for (let i = 0; i < turnTimeline.length; i++) {
    const turn = turnTimeline[i];
    const trace = actionTrace[i];
    let score = 0;

    if (trace && HIGH_SIGNAL_ACTIONS.has(trace.action.actionType)) {
      score += 1;
    }
    const dialogueCount = turn?.dialogueOptionsPresented?.length ?? 0;
    if (dialogueCount > 0) score += 1;
    const chapterLines = turn?.pageDelta?.totalNewChapterLines ?? 0;
    if (chapterLines > 0) score += 1;
    const entityLines = turn?.pageDelta?.totalNewEntityLines ?? 0;
    if (entityLines > 0) score += 0.5;

    const beforeSkills = turn?.playerBefore?.skills?.length ?? 0;
    const afterSkills = turn?.playerAfter?.skills?.length ?? 0;
    if (afterSkills > beforeSkills) score += 2;

    perTurnScores.push(score);
  }

  const rollingAverage: number[] = [];
  for (let i = 0; i < perTurnScores.length; i++) {
    const start = Math.max(0, i - WINDOW + 1);
    const slice = perTurnScores.slice(start, i + 1);
    rollingAverage.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }

  const meanExcitement =
    perTurnScores.length > 0
      ? perTurnScores.reduce((a, b) => a + b, 0) / perTurnScores.length
      : 0;

  return {
    perTurnScores,
    rollingWindowSize: WINDOW,
    rollingAverage,
    meanExcitement,
  };
}

function computeEmergent(report: Report): AnalysisOutput["emergent"] {
  const { actionTrace, playerTimeline } = report.run;

  const combos = new Set<string>();
  for (let i = 0; i < actionTrace.length; i++) {
    const a = actionTrace[i];
    const pt = playerTimeline[i] ?? playerTimeline[playerTimeline.length - 1];
    const depth = pt?.depth ?? 0;
    const roomId = pt?.roomId ?? "?";
    combos.add(`${a.action.actionType}|${depth}|${roomId}`);
  }

  const actionCounts: Record<string, number> = {};
  for (const row of actionTrace) {
    const t = row.action.actionType;
    actionCounts[t] = (actionCounts[t] ?? 0) + 1;
  }
  const total = actionTrace.length;
  const probs = Object.values(actionCounts).map((c) => c / total);
  const actionTypeEntropy = total > 0 ? shannonEntropy(probs) : 0;

  return {
    novelEventCombinations: combos.size,
    actionTypeEntropy,
  };
}

export function analyzeReport(report: Report): AnalysisOutput {
  if (!report.run?.actionTrace || !report.actionCoverage) {
    throw new Error("Invalid report: missing run.actionTrace or actionCoverage");
  }

  const replayability = computeReplayability(report);
  const excitement = computeExcitement(report);
  const emergent = computeEmergent(report);

  return {
    schemaVersion: "playthrough-analysis/v1",
    sourceReport: "browser-generated",
    replayability,
    excitement,
    emergent,
  };
}
