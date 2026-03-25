import type {
  CutsceneMessage,
  FeedMessage,
  GameSnapshot,
  PlayerAction,
} from "@dungeonbreak/engine";
import {
  type DispatchResult,
  dispatch,
  dispatchForgedSpellEvolution,
  dispatchForgedSpellRecipe,
  dispatchPreparedSpell,
  type GameState,
  refreshState,
  restoreSnapshot,
} from "./engine-bridge";
import type { PendingTurnState } from "./scene-contracts";

interface WorkerSyncRequest {
  kind: "sync";
  requestId: number;
  seed: number;
  snapshot: GameSnapshot;
}

interface WorkerDispatchRequest {
  action: PlayerAction;
  kind: "dispatch";
  requestId: number;
}

interface WorkerCastPreparedSpellRequest {
  kind: "castPreparedSpell";
  requestId: number;
  skillId: string;
}

interface WorkerPrepareSpellSlotRequest {
  kind: "prepareSpellSlot";
  requestId: number;
  skillId: string | null;
  slotIndex: number;
}

interface WorkerForgeSpellRecipeRequest {
  kind: "forgeSpellRecipe";
  options?: { customName?: string | null; slotIndex?: number | null };
  requestId: number;
  runeCombo: string[];
}

interface WorkerForgeSpellEvolutionRequest {
  kind: "forgeSpellEvolution";
  requestId: number;
  runeCombo: string[];
  sourceSkillId: string;
}

interface WorkerRenameSpellRequest {
  kind: "renameSpell";
  requestId: number;
  requestedName: string | null;
  skillId: string;
}

type WorkerRequest =
  | WorkerSyncRequest
  | WorkerDispatchRequest
  | WorkerCastPreparedSpellRequest
  | WorkerPrepareSpellSlotRequest
  | WorkerForgeSpellRecipeRequest
  | WorkerForgeSpellEvolutionRequest
  | WorkerRenameSpellRequest;

type WorkerTurnResponseKind =
  | "dispatch"
  | "castPreparedSpell"
  | "forgeSpellRecipe"
  | "forgeSpellEvolution";

type WorkerMutationResponseKind = "prepareSpellSlot" | "renameSpell";

type WorkerResponse =
  | {
      kind: "sync";
      ok: true;
      requestId: number;
    }
  | {
      cutscenes: CutsceneMessage[];
      escaped: boolean;
      feed: FeedMessage[];
      kind: WorkerTurnResponseKind;
      ok: true;
      requestId: number;
      snapshot: GameSnapshot;
    }
  | {
      kind: WorkerMutationResponseKind;
      message: string;
      ok: true;
      requestId: number;
      snapshot: GameSnapshot;
    }
  | {
      error: string;
      kind: WorkerRequest["kind"];
      ok: false;
      requestId: number;
    };

type SnapshotMutationResult =
  | {
      message: string;
      ok: true;
      snapshot: GameSnapshot;
    }
  | {
      error: string;
      ok: false;
    };

export interface TurnRunner {
  dispatchPlayerAction: (
    state: GameState,
    action: PlayerAction
  ) => Promise<DispatchResult>;
  castPreparedSpell: (
    state: GameState,
    skillId: string
  ) => Promise<DispatchResult>;
  prepareSpellSlot: (
    state: GameState,
    slotIndex: number,
    skillId: string | null
  ) => Promise<SnapshotMutationResult>;
  forgeSpellRecipe: (
    state: GameState,
    runeCombo: string[],
    options?: { customName?: string | null; slotIndex?: number | null }
  ) => Promise<DispatchResult>;
  forgeSpellEvolution: (
    state: GameState,
    sourceSkillId: string,
    runeCombo: string[]
  ) => Promise<DispatchResult>;
  renameSpell: (
    state: GameState,
    skillId: string,
    requestedName: string | null
  ) => Promise<SnapshotMutationResult>;
  dispose: () => void;
  getState: () => PendingTurnState;
  syncState: (state: GameState) => Promise<void>;
}

const IDLE_TURN_STATE: PendingTurnState = {
  pending: false,
  pendingLabel: null,
};

function supportsWorkerTurns(): boolean {
  return typeof Worker !== "undefined";
}

function toStatusText(nextState: GameState): string {
  return [
    `Depth ${nextState.status.depth ?? "?"} - ${nextState.status.roomId ?? "?"}`,
    `Act ${nextState.status.act ?? "?"} / Chapter ${nextState.status.chapter ?? "?"}`,
    `HP ${nextState.status.health ?? "?"} | Mana ${nextState.status.mana ?? "?"} | Level ${nextState.status.level ?? "?"}`,
  ].join("\n");
}

function createWorkerTurnRunner(): TurnRunner {
  const worker = new Worker("./engine-turn-worker.js");
  let nextRequestId = 1;
  let pendingState: PendingTurnState = IDLE_TURN_STATE;
  let activeRequestId: number | null = null;
  let syncedSeed: number | null = null;
  let syncedSnapshotHash = "";
  let syncInFlight = false;
  let pendingSync: {
    deferreds: Array<{
      reject: (reason?: unknown) => void;
      resolve: () => void;
    }>;
    nextHash: string;
    state: GameState;
  } | null = null;

  const setPendingState = (pending: boolean, pendingLabel: string | null) => {
    pendingState = pending ? { pending: true, pendingLabel } : IDLE_TURN_STATE;
  };

  const snapshotHash = (snapshot: GameSnapshot): string => {
    const player = snapshot.entities[snapshot.playerId];
    return [
      snapshot.turnIndex,
      player?.depth ?? "",
      player?.roomId ?? "",
      snapshot.activeCompanionId ?? "",
      snapshot.discoveredRoomsByDepth[String(player?.depth ?? "")]?.length ?? 0,
      Object.keys(snapshot.entities).length,
    ].join("|");
  };

  const settleSyncDeferreds = (
    deferreds: Array<{
      reject: (reason?: unknown) => void;
      resolve: () => void;
    }>,
    error?: Error
  ) => {
    for (const deferred of deferreds) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }
  };

  const flushSyncQueue = () => {
    if (syncInFlight || !pendingSync) {
      return;
    }
    const current = pendingSync;
    pendingSync = null;
    syncInFlight = true;
    const requestId = nextRequestId++;

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.requestId !== requestId) {
        return;
      }
      cleanup();
      if (event.data.ok) {
        syncedSeed = current.state.seed;
        syncedSnapshotHash = current.nextHash;
        settleSyncDeferreds(current.deferreds);
      } else {
        settleSyncDeferreds(current.deferreds, new Error(event.data.error));
      }
      flushSyncQueue();
    };

    const handleError = (event: ErrorEvent) => {
      cleanup();
      settleSyncDeferreds(
        current.deferreds,
        new Error(event.message || "Turn worker sync failed.")
      );
      flushSyncQueue();
    };

    const cleanup = () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      syncInFlight = false;
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({
      kind: "sync",
      requestId,
      seed: current.state.seed,
      snapshot: current.state.snapshot,
    } satisfies WorkerRequest);
  };

  const syncState = async (state: GameState): Promise<void> => {
    const nextHash = snapshotHash(state.snapshot);
    if (
      syncedSeed === state.seed &&
      syncedSnapshotHash === nextHash &&
      !syncInFlight &&
      pendingSync === null
    ) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const deferred = { resolve, reject };
      if (
        pendingSync &&
        pendingSync.state.seed === state.seed &&
        pendingSync.nextHash === nextHash
      ) {
        pendingSync.deferreds.push(deferred);
      } else if (pendingSync) {
        pendingSync = {
          deferreds: [...pendingSync.deferreds, deferred],
          nextHash,
          state,
        };
      } else {
        pendingSync = {
          deferreds: [deferred],
          nextHash,
          state,
        };
      }
      flushSyncQueue();
    });
  };

  const executeRequest = async (
    state: GameState,
    buildRequest: (requestId: number) => WorkerRequest,
    pendingLabel: string | null
  ): Promise<WorkerResponse | { error: string; ok: false }> => {
    if (activeRequestId !== null) {
      return {
        error: "A turn is already resolving.",
        ok: false,
      };
    }

    const requestId = nextRequestId++;
    const request = buildRequest(requestId);
    activeRequestId = requestId;
    setPendingState(true, pendingLabel);

    try {
      await syncState(state);
    } catch (error) {
      activeRequestId = null;
      setPendingState(false, null);
      return {
        error:
          error instanceof Error ? error.message : "Turn worker sync failed.",
        ok: false,
      };
    }

    return new Promise<WorkerResponse | { error: string; ok: false }>(
      (resolve) => {
        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.requestId !== requestId) {
            return;
          }
          cleanup();
          resolve(event.data);
        };

        const handleError = (event: ErrorEvent) => {
          cleanup();
          resolve({
            error: event.message || "Turn worker failed.",
            ok: false,
          });
        };

        const cleanup = () => {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
          activeRequestId = null;
          setPendingState(false, null);
        };

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);
        worker.postMessage(request);
      }
    );
  };

  const toDispatchResult = (
    state: GameState,
    response: WorkerResponse | { error: string; ok: false },
    expectedKind: WorkerTurnResponseKind
  ): DispatchResult => {
    if (!response.ok) {
      return {
        error: response.error,
        ok: false,
      };
    }
    if (response.kind !== expectedKind) {
      return {
        error: `Turn worker returned an unexpected ${response.kind} response.`,
        ok: false,
      };
    }
    syncedSeed = state.seed;
    syncedSnapshotHash = snapshotHash(response.snapshot);
    const nextState = restoreSnapshot(state, response.snapshot);
    return {
      cutscenes: response.cutscenes,
      escaped: response.escaped,
      feed: response.feed,
      look: nextState.look,
      ok: true,
      snapshot: response.snapshot,
      status: nextState.status,
      statusText: toStatusText(nextState),
    };
  };

  const toSnapshotMutationResult = (
    state: GameState,
    response: WorkerResponse | { error: string; ok: false },
    expectedKind: WorkerMutationResponseKind
  ): SnapshotMutationResult => {
    if (!response.ok) {
      return {
        error: response.error,
        ok: false,
      };
    }
    if (response.kind !== expectedKind) {
      return {
        error: `Turn worker returned an unexpected ${response.kind} response.`,
        ok: false,
      };
    }
    syncedSeed = state.seed;
    syncedSnapshotHash = snapshotHash(response.snapshot);
    return {
      message: response.message,
      ok: true,
      snapshot: response.snapshot,
    };
  };

  return {
    dispatchPlayerAction: async (state, action) => {
      const response = await executeRequest(
        state,
        (requestId) => ({
          action,
          kind: "dispatch",
          requestId,
        }),
        "Resolving turn..."
      );
      return toDispatchResult(state, response, "dispatch");
    },
    castPreparedSpell: async (state, skillId) => {
      const response = await executeRequest(
        state,
        (requestId) => ({
          kind: "castPreparedSpell",
          requestId,
          skillId,
        }),
        "Casting spell..."
      );
      return toDispatchResult(state, response, "castPreparedSpell");
    },
    prepareSpellSlot: async (state, slotIndex, skillId) => {
      const response = await executeRequest(
        state,
        (requestId) => ({
          kind: "prepareSpellSlot",
          requestId,
          skillId,
          slotIndex,
        }),
        "Preparing spell..."
      );
      return toSnapshotMutationResult(state, response, "prepareSpellSlot");
    },
    forgeSpellRecipe: async (state, runeCombo, options = {}) => {
      const response = await executeRequest(
        state,
        (requestId) => ({
          kind: "forgeSpellRecipe",
          options,
          requestId,
          runeCombo,
        }),
        "Forging spell..."
      );
      return toDispatchResult(state, response, "forgeSpellRecipe");
    },
    forgeSpellEvolution: async (state, sourceSkillId, runeCombo) => {
      const response = await executeRequest(
        state,
        (requestId) => ({
          kind: "forgeSpellEvolution",
          requestId,
          runeCombo,
          sourceSkillId,
        }),
        "Evolving spell..."
      );
      return toDispatchResult(state, response, "forgeSpellEvolution");
    },
    renameSpell: async (state, skillId, requestedName) => {
      const response = await executeRequest(
        state,
        (requestId) => ({
          kind: "renameSpell",
          requestId,
          requestedName,
          skillId,
        }),
        "Renaming spell..."
      );
      return toSnapshotMutationResult(state, response, "renameSpell");
    },
    dispose: () => {
      worker.terminate();
      activeRequestId = null;
      setPendingState(false, null);
      syncedSeed = null;
      syncedSnapshotHash = "";
      if (pendingSync) {
        settleSyncDeferreds(
          pendingSync.deferreds,
          new Error("Turn worker disposed before sync completed.")
        );
      }
      pendingSync = null;
      syncInFlight = false;
    },
    getState: () => pendingState,
    syncState,
  };
}

function createFallbackTurnRunner(): TurnRunner {
  let pendingState: PendingTurnState = IDLE_TURN_STATE;

  const runDispatch = async (
    task: () => DispatchResult
  ): Promise<DispatchResult> => {
    pendingState = {
      pending: true,
      pendingLabel: null,
    };
    try {
      return await new Promise<DispatchResult>((resolve) => {
        setTimeout(() => {
          resolve(task());
        }, 0);
      });
    } finally {
      pendingState = IDLE_TURN_STATE;
    }
  };

  const runSnapshotMutation = async (
    task: () => SnapshotMutationResult
  ): Promise<SnapshotMutationResult> => {
    pendingState = {
      pending: true,
      pendingLabel: null,
    };
    try {
      return await new Promise<SnapshotMutationResult>((resolve) => {
        setTimeout(() => {
          resolve(task());
        }, 0);
      });
    } finally {
      pendingState = IDLE_TURN_STATE;
    }
  };

  return {
    dispatchPlayerAction: (state, action) => {
      return runDispatch(() => dispatch(state, action));
    },
    castPreparedSpell: (state, skillId) => {
      return runDispatch(() => dispatchPreparedSpell(state, skillId));
    },
    prepareSpellSlot: (state, slotIndex, skillId) => {
      return runSnapshotMutation(() => {
        const outcome =
          skillId === null
            ? state.engine.clearPreparedSpellSlot(slotIndex)
            : state.engine.prepareSpell(slotIndex, skillId);
        if (!outcome.ok) {
          return {
            error: `Spell prep failed: ${outcome.reason}.`,
            ok: false,
          };
        }
        const nextState = refreshState(state);
        return {
          message:
            skillId === null
              ? `Cleared spell slot ${slotIndex + 1}.`
              : `Prepared ${skillId.replace(/_/g, " ")} in slot ${slotIndex + 1}.`,
          ok: true,
          snapshot: nextState.snapshot,
        };
      });
    },
    forgeSpellRecipe: (state, runeCombo, options = {}) => {
      return runDispatch(() =>
        dispatchForgedSpellRecipe(state, runeCombo, options)
      );
    },
    forgeSpellEvolution: (state, sourceSkillId, runeCombo) => {
      return runDispatch(() =>
        dispatchForgedSpellEvolution(state, sourceSkillId, runeCombo)
      );
    },
    renameSpell: (state, skillId, requestedName) => {
      return runSnapshotMutation(() => {
        const outcome = state.engine.renameKnownSpell(skillId, requestedName);
        if (!outcome.ok) {
          return {
            error: outcome.message,
            ok: false,
          };
        }
        const nextState = refreshState(state);
        return {
          message: outcome.message,
          ok: true,
          snapshot: nextState.snapshot,
        };
      });
    },
    dispose: () => {
      pendingState = IDLE_TURN_STATE;
    },
    getState: () => pendingState,
    syncState: async () => undefined,
  };
}

export function createTurnRunner(): TurnRunner {
  if (!supportsWorkerTurns()) {
    return createFallbackTurnRunner();
  }
  try {
    return createWorkerTurnRunner();
  } catch {
    return createFallbackTurnRunner();
  }
}
