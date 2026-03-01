/**
 * Browser-side playthrough runner. Runs GameEngine for N turns and builds
 * a report compatible with the playthrough analyzer (agent-play-report/v2 schema).
 */

import {
  ACTION_CATALOG,
  ACTION_POLICIES,
  CANONICAL_SEED_V1,
  GameEngine,
  type ActionAvailability,
  type PlayerAction,
} from "@dungeonbreak/engine";

const DEFAULT_PRIORITY =
  ACTION_POLICIES.policies.find((p) => p.policyId === "agent-play-default")?.priorityOrder ?? [
    "choose_dialogue", "evolve_skill", "fight", "flee", "steal", "recruit", "murder",
    "search", "talk", "train", "live_stream", "move", "rest", "speak",
  ];

const EXPECTED_ACTIONS = ACTION_CATALOG.actions.map((row) => row.actionType);

function toAction(row: ActionAvailability): PlayerAction {
  if (row.actionType === "choose_dialogue") {
    const options = (row.payload?.options as Array<{ optionId: string }> | undefined) ?? [];
    return {
      actionType: "choose_dialogue",
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (row.actionType === "evolve_skill") {
    return {
      actionType: "evolve_skill",
      payload: { skillId: String(row.payload?.skillId ?? "") },
    };
  }
  if (row.actionType === "live_stream") {
    return {
      actionType: "live_stream",
      payload: { effort: 10 },
    };
  }
  if (row.actionType === "speak") {
    return {
      actionType: "speak",
      payload: { intentText: "Browser run: push forward." },
    };
  }
  return {
    actionType: row.actionType as PlayerAction["actionType"],
    payload: { ...(row.payload ?? {}) },
  };
}

function chooseAction(rows: ActionAvailability[], priorityOrder: readonly string[]): PlayerAction {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) {
    return { actionType: "rest", payload: {} };
  }
  for (const actionType of priorityOrder) {
    const found = legal.find((row) => row.actionType === actionType);
    if (found) return toAction(found);
  }
  return toAction(legal[0] as ActionAvailability);
}

export type BrowserReport = {
  schemaVersion: string;
  seed: number;
  turnsRequested: number;
  actionCoverage: {
    expected: string[];
    covered: string[];
    missing: string[];
  };
  run: {
    turnsPlayed: number;
    actionTrace: Array<{
      playerTurn: number;
      action: PlayerAction;
      source: string;
      eventCount: number;
      playerEventCount: number;
      nonPlayerEventCount: number;
    }>;
    playerTimeline: Array<{
      playerTurn: number;
      depth: number;
      roomId: string;
      chapter: number;
      act: number;
      skills?: string[];
    }>;
    turnTimeline: Array<{
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
    }>;
  };
};

function getSkills(player: { skills?: Record<string, { skillId: string; unlocked: boolean }> }): string[] {
  if (!player.skills) return [];
  return Object.values(player.skills)
    .filter((s) => s.unlocked)
    .map((s) => s.skillId);
}

function countChapterLines(pages: Record<number, { chapter?: string[]; entities?: Record<string, string[]> }>): number {
  let total = 0;
  for (const page of Object.values(pages)) {
    total += (page.chapter ?? []).length;
    for (const lines of Object.values(page.entities ?? {})) {
      total += lines.length;
    }
  }
  return total;
}

export function runPlaythrough(
  seed: number = CANONICAL_SEED_V1,
  turns: number = 75,
  priorityOrderOverride?: string[],
): BrowserReport {
  const priority = priorityOrderOverride ?? DEFAULT_PRIORITY;
  const engine = GameEngine.create(seed);
  const covered = new Set<string>();
  const actionTrace: BrowserReport["run"]["actionTrace"] = [];
  const playerTimeline: BrowserReport["run"]["playerTimeline"] = [];
  const turnTimeline: BrowserReport["run"]["turnTimeline"] = [];

  for (let turn = 0; turn < turns; turn += 1) {
    if (engine.state.escaped || engine.player.health <= 0) break;

    const beforeSnapshot = engine.snapshot();
    const playerBefore = engine.player;
    const beforeSkills = getSkills(playerBefore);
    const beforePageCount = countChapterLines(beforeSnapshot.chapterPages ?? {});

    const rows = engine.availableActions(engine.player);
    const availableActionTypes = [...new Set(rows.filter((r) => r.available).map((r) => r.actionType))].sort();
    const dialogueRows = rows.filter((r) => r.available && r.actionType === "choose_dialogue");
    const dialogueOptionsPresented = dialogueRows.flatMap((r) => {
      const opts = (r.payload?.options as Array<{ optionId: string }> | undefined) ?? [];
      return opts.map((o) => ({ optionId: o.optionId }));
    });

    const action = chooseAction(rows, priority);
    covered.add(action.actionType);

    const result = engine.dispatch(action);
    const events = result.events;
    const playerAfter = engine.player;
    const afterSkills = getSkills(playerAfter);
    const afterSnapshot = engine.snapshot();
    const afterPageCount = countChapterLines(afterSnapshot.chapterPages ?? {});
    const status = engine.status();

    const chapter = Number(status.chapter ?? 1);
    const act = Number(status.act ?? 1);

    playerTimeline.push({
      playerTurn: turn + 1,
      depth: playerAfter.depth,
      roomId: playerAfter.roomId,
      chapter,
      act,
      skills: afterSkills,
    });

    turnTimeline.push({
      playerTurn: turn + 1,
      selectedAction: { actionType: action.actionType },
      availableActionTypes,
      dialogueOptionsPresented: dialogueOptionsPresented.length > 0 ? dialogueOptionsPresented : undefined,
      pageDelta: {
        totalNewChapterLines: Math.max(0, afterPageCount - beforePageCount),
        totalNewEntityLines: 0,
      },
      playerBefore: { skills: beforeSkills },
      playerAfter: { skills: afterSkills },
    });

    actionTrace.push({
      playerTurn: turn + 1,
      action,
      source: "policy",
      eventCount: events.length,
      playerEventCount: events.filter((e) => e.actorId === engine.state.playerId).length,
      nonPlayerEventCount: events.filter((e) => e.actorId !== engine.state.playerId).length,
    });
  }

  const coveredList = [...covered].sort();
  const missing = EXPECTED_ACTIONS.filter((t) => !covered.has(t));

  return {
    schemaVersion: "agent-play-report/v2",
    seed,
    turnsRequested: turns,
    actionCoverage: {
      expected: [...EXPECTED_ACTIONS],
      covered: coveredList,
      missing,
    },
    run: {
      turnsPlayed: actionTrace.length,
      actionTrace,
      playerTimeline,
      turnTimeline,
    },
  };
}
