import assert from "node:assert/strict";

import {
  ACTION_CATALOG,
  ACTION_POLICIES,
  ACTION_TYPE,
  CANONICAL_SEED_V1,
  buildActionGroups,
  GameEngine,
  type PlayerAction,
} from "@dungeonbreak/engine";

import { hashSnapshot } from "../src/hash-snapshot.ts";
import { GameSessionStore } from "../src/session-store.ts";

type AvailableActionRow = {
  actionType: string;
  available: boolean;
  payload: Record<string, unknown>;
};

const FORCE_ORDER = ACTION_CATALOG.actions.map((row) => row.actionType);
const PRIORITY_ORDER: readonly string[] =
  ACTION_POLICIES.policies.find((policy) => policy.policyId === "agent-play-default")?.priorityOrder ?? FORCE_ORDER;
const TURN_COUNT = 75;

const toAction = (actionType: string, payload: Record<string, unknown>): PlayerAction => {
  if (actionType === ACTION_TYPE.CHOOSE_DIALOGUE) {
    const options = (payload.options as Array<{ optionId: string }> | undefined) ?? [];
    return {
      actionType: ACTION_TYPE.CHOOSE_DIALOGUE,
      payload: options[0]?.optionId ? { optionId: options[0].optionId } : {},
    };
  }
  if (actionType === ACTION_TYPE.EVOLVE_SKILL) {
    return {
      actionType: ACTION_TYPE.EVOLVE_SKILL,
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
      payload: { intentText: "Parity smoke policy run." },
    };
  }
  return {
    actionType: actionType as PlayerAction["actionType"],
    payload: structuredClone(payload),
  };
};

const chooseAction = (rows: AvailableActionRow[], turnIndex: number, covered: Set<string>): PlayerAction => {
  const legal = rows.filter((row) => row.available);
  if (legal.length === 0) {
    return { actionType: ACTION_TYPE.REST, payload: {} };
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
    const row = legal.find((candidate) => candidate.actionType === actionType);
    if (row) {
      covered.add(row.actionType);
      return toAction(row.actionType, row.payload);
    }
  }

  const fallback = legal[0] as AvailableActionRow;
  covered.add(fallback.actionType);
  return toAction(fallback.actionType, fallback.payload);
};

const store = new GameSessionStore();
const session = store.createSession(CANONICAL_SEED_V1, "parity-smoke");
const sessionId = session.sessionId;

const directEngine = GameEngine.create(CANONICAL_SEED_V1);
const initialPresenterActionTypes = new Set(
  buildActionGroups(directEngine)
    .flatMap((group) => group.items)
    .filter((item) => item.action.kind === "player")
    .map((item) => item.action.playerAction.actionType),
);

const initialStoreActionTypes = new Set(store.listActions(sessionId).map((action) => action.actionType));
for (const actionType of initialStoreActionTypes) {
  assert.ok(initialPresenterActionTypes.has(actionType), `Presenter is missing MCP action type '${actionType}'.`);
}

const catalogActionTypes = new Set(ACTION_CATALOG.actions.map((row) => row.actionType));
for (const actionType of initialStoreActionTypes) {
  assert.ok(catalogActionTypes.has(actionType), `MCP action '${actionType}' is not in ACTION_CATALOG.`);
}

const covered = new Set<string>();
let turnsPlayed = 0;
for (let turnIndex = 0; turnIndex < TURN_COUNT; turnIndex += 1) {
  const storeRows = store.listActions(sessionId) as AvailableActionRow[];
  const presenterActionTypes = new Set(
    buildActionGroups(directEngine)
      .flatMap((group) => group.items)
      .filter((item) => item.action.kind === "player")
      .map((item) => item.action.playerAction.actionType),
  );

  for (const actionType of new Set(storeRows.map((row) => row.actionType))) {
    assert.ok(presenterActionTypes.has(actionType), `Presenter is missing MCP action type '${actionType}' on turn ${turnIndex + 1}.`);
    assert.ok(catalogActionTypes.has(actionType), `MCP action '${actionType}' is not in ACTION_CATALOG on turn ${turnIndex + 1}.`);
  }

  const action = chooseAction(storeRows, turnIndex, covered);
  directEngine.dispatch(structuredClone(action));
  directEngine.status();
  directEngine.look();
  directEngine.recentCutscenes(6);
  directEngine.recentDeeds(6);
  store.dispatchAction(sessionId, structuredClone(action));

  const directHash = hashSnapshot(directEngine.snapshot());
  const storeHash = hashSnapshot(store.getSnapshot(sessionId));
  assert.equal(storeHash, directHash, `MCP parity drift detected after turn ${turnIndex + 1}.`);
  turnsPlayed += 1;
}

const mcpSnapshotHash = hashSnapshot(store.getSnapshot(sessionId));

console.log(
  `MCP parity smoke passed. Session ${sessionId} hash ${mcpSnapshotHash} after ${turnsPlayed} deterministic policy turns; covered ${covered.size} action types.`,
);
