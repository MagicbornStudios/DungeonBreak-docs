import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ACTION_CATALOG, CANONICAL_SEED_V1, GameEngine, type PlayerAction } from "@dungeonbreak/engine";
import { applyReplayFixtureSetup, hashSnapshot, type ReplayFixture } from "@dungeonbreak/engine/replay";

import { GameSessionStore } from "./session-store.js";

type AgentRunResult = {
  seed: number;
  turnsRequested: number;
  turnsPlayed: number;
  sessionId: string;
  actionUsage: Record<string, number>;
  actionTrace: PlayerAction[];
  finalHash: string;
  finalStatus: Record<string, unknown>;
  escaped: boolean;
};

const FORCE_ORDER = ACTION_CATALOG.actions.map((row) => row.actionType);
const PRIORITY_ORDER = [
  "choose_dialogue",
  "evolve_skill",
  "fight",
  "flee",
  "steal",
  "recruit",
  "murder",
  "search",
  "talk",
  "train",
  "live_stream",
  "move",
  "rest",
  "speak",
] as const;

const loadDenseFixture = (): ReplayFixture | null => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fixturePath = path.resolve(__dirname, "../../engine/test-fixtures/canonical-dense-trace-v1.json");
  if (!fs.existsSync(fixturePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(fixturePath, "utf8")) as ReplayFixture;
};

const toAction = (actionType: string, payload: Record<string, unknown>): PlayerAction => {
  if (actionType === "choose_dialogue") {
    const options = (payload.options as Array<{ optionId: string }> | undefined) ?? [];
    return {
      actionType: "choose_dialogue",
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (actionType === "evolve_skill") {
    return {
      actionType: "evolve_skill",
      payload: { skillId: String(payload.skillId ?? "") },
    };
  }
  if (actionType === "live_stream") {
    return {
      actionType: "live_stream",
      payload: { effort: 10 },
    };
  }
  if (actionType === "speak") {
    return {
      actionType: "speak",
      payload: { intentText: "Agent run: hold formation and keep moving." },
    };
  }
  return {
    actionType: actionType as PlayerAction["actionType"],
    payload: { ...payload },
  };
};

const chooseAction = (
  rows: Array<{ actionType: string; available: boolean; payload: Record<string, unknown> }>,
  turnIndex: number,
  covered: Set<string>,
): PlayerAction => {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) {
    return { actionType: "rest", payload: {} };
  }

  if (turnIndex < FORCE_ORDER.length) {
    const forcedType = FORCE_ORDER[turnIndex];
    const forced = legal.find((row) => row.actionType === forcedType);
    if (forced) {
      covered.add(forced.actionType);
      return toAction(forced.actionType, forced.payload);
    }
  }

  for (const actionType of PRIORITY_ORDER) {
    const found = legal.find((row) => row.actionType === actionType);
    if (found) {
      covered.add(found.actionType);
      return toAction(found.actionType, found.payload);
    }
  }

  const fallback = legal[0] as { actionType: string; payload: Record<string, unknown> };
  covered.add(fallback.actionType);
  return toAction(fallback.actionType, fallback.payload);
};

const runAgentSession = (seed: number, turns: number, sessionId: string): AgentRunResult => {
  const store = new GameSessionStore();
  const session = store.createSession(seed, sessionId);
  const seededFixture = loadDenseFixture();
  if (seededFixture?.setup) {
    const prepared = GameEngine.create(seed);
    applyReplayFixtureSetup(prepared, seededFixture.setup);
    store.restoreSnapshot(session.sessionId, prepared.snapshot());
  }
  const covered = new Set<string>();
  const actionUsage: Record<string, number> = {};
  const actionTrace: PlayerAction[] = [];

  for (let turn = 0; turn < turns; turn += 1) {
    const legal = store.listActions(session.sessionId);
    let action: PlayerAction | null = null;
    const scripted = seededFixture?.actions?.[turn];
    if (scripted) {
      action = scripted;
    }
    if (!action) {
      action = chooseAction(legal, turn, covered);
    } else {
      covered.add(action.actionType);
    }
    actionTrace.push(action);
    actionUsage[action.actionType] = Number(actionUsage[action.actionType] ?? 0) + 1;
    const result = store.dispatchAction(session.sessionId, action);
    if (Boolean((result.status as Record<string, unknown>).escaped ?? false)) {
      break;
    }
  }

  const finalSnapshot = store.getSnapshot(session.sessionId);
  return {
    seed,
    turnsRequested: turns,
    turnsPlayed: actionTrace.length,
    sessionId: session.sessionId,
    actionUsage,
    actionTrace,
    finalHash: hashSnapshot(finalSnapshot),
    finalStatus: store.getStatus(session.sessionId),
    escaped: Boolean(finalSnapshot.escaped),
  };
};

const main = () => {
  const turns = Number(process.env.DUNGEONBREAK_AGENT_TURNS ?? 120);
  const seed = Number(process.env.DUNGEONBREAK_AGENT_SEED ?? CANONICAL_SEED_V1);
  const effectiveTurns = Number.isFinite(turns) && turns > 0 ? Math.trunc(turns) : 120;
  const effectiveSeed = Number.isFinite(seed) ? Math.trunc(seed) : CANONICAL_SEED_V1;

  const runA = runAgentSession(effectiveSeed, effectiveTurns, "agent-run-a");
  const runB = runAgentSession(effectiveSeed, effectiveTurns, "agent-run-b");
  if (runA.finalHash !== runB.finalHash) {
    throw new Error(`Agent run is non-deterministic. Hash A=${runA.finalHash}, Hash B=${runB.finalHash}`);
  }
  if (JSON.stringify(runA.actionTrace) !== JSON.stringify(runB.actionTrace)) {
    throw new Error("Agent run action trace drifted across repeated deterministic sessions.");
  }

  const report = {
    generatedAt: new Date().toISOString(),
    seed: effectiveSeed,
    turnsRequested: effectiveTurns,
    determinism: {
      finalHash: runA.finalHash,
      repeatedRunHash: runB.finalHash,
      passed: true,
    },
    actionCoverage: {
      expected: FORCE_ORDER,
      covered: [...new Set(runA.actionTrace.map((action) => action.actionType))].sort(),
      missing: FORCE_ORDER.filter(
        (actionType) => !runA.actionTrace.some((action) => action.actionType === actionType),
      ),
    },
    run: runA,
  };

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "../../..");
  const outputDir = path.resolve(repoRoot, ".planning/test-reports");
  const outputPath = path.resolve(outputDir, "agent-play-report.json");

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Agent play report written: ${outputPath}`);
  console.log(`Deterministic final hash: ${runA.finalHash}`);
  console.log(`Turns played: ${runA.turnsPlayed}/${effectiveTurns}`);
  console.log(`Missing action types: ${report.actionCoverage.missing.join(", ") || "none"}`);
};

main();
