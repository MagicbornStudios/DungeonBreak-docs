import type {
  CutsceneMessage,
  FeedMessage,
  GameSnapshot,
  PlayerAction,
} from "@dungeonbreak/engine";
import {
  type DispatchResult,
  dispatch,
  type GameState,
  restoreSnapshot,
} from "./engine-bridge";
import type { PendingTurnState } from "./scene-contracts";

interface WorkerRequest {
  action: PlayerAction;
  requestId: number;
  seed: number;
  snapshot: GameSnapshot;
}

type WorkerResponse =
  | {
      cutscenes: CutsceneMessage[];
      escaped: boolean;
      feed: FeedMessage[];
      ok: true;
      requestId: number;
      snapshot: GameSnapshot;
    }
  | {
      error: string;
      ok: false;
      requestId: number;
    };

export interface TurnRunner {
  dispatchPlayerAction: (
    state: GameState,
    action: PlayerAction
  ) => Promise<DispatchResult>;
  dispose: () => void;
  getState: () => PendingTurnState;
}

const IDLE_TURN_STATE: PendingTurnState = {
  pending: false,
  pendingLabel: null,
};

function supportsWorkerTurns(): boolean {
  return typeof Worker !== "undefined";
}

function createWorkerTurnRunner(): TurnRunner {
  const worker = new Worker("./engine-turn-worker.js");
  let nextRequestId = 1;
  let pendingState: PendingTurnState = IDLE_TURN_STATE;
  let activeRequestId: number | null = null;

  const setPendingState = (pendingLabel: string | null) => {
    pendingState =
      pendingLabel === null
        ? IDLE_TURN_STATE
        : {
            pending: true,
            pendingLabel,
          };
  };

  return {
    dispatchPlayerAction: (state, action) => {
      if (activeRequestId !== null) {
        return Promise.resolve({
          error: "A turn is already resolving.",
          ok: false,
        });
      }

      const requestId = nextRequestId++;
      activeRequestId = requestId;
      setPendingState("Resolving turn...");

      return new Promise<DispatchResult>((resolve) => {
        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.requestId !== requestId) {
            return;
          }
          cleanup();
          if (!event.data.ok) {
            resolve({
              error: event.data.error,
              ok: false,
            });
            return;
          }
          const nextState = restoreSnapshot(state, event.data.snapshot);
          resolve({
            cutscenes: event.data.cutscenes,
            escaped: event.data.escaped,
            feed: event.data.feed,
            look: nextState.look,
            ok: true,
            snapshot: event.data.snapshot,
            status: nextState.status,
            statusText: [
              `Depth ${nextState.status.depth ?? "?"} - ${nextState.status.roomId ?? "?"}`,
              `Act ${nextState.status.act ?? "?"} / Chapter ${nextState.status.chapter ?? "?"}`,
              `HP ${nextState.status.health ?? "?"} | Mana ${nextState.status.mana ?? "?"} | Level ${nextState.status.level ?? "?"}`,
            ].join("\n"),
          });
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
          setPendingState(null);
        };

        worker.addEventListener("message", handleMessage);
        worker.addEventListener("error", handleError);
        const snapshot = state.engine.snapshot();
        const request: WorkerRequest = {
          action,
          requestId,
          seed: state.seed,
          snapshot,
        };
        worker.postMessage(request);
      });
    },
    dispose: () => {
      worker.terminate();
      activeRequestId = null;
      setPendingState(null);
    },
    getState: () => pendingState,
  };
}

function createFallbackTurnRunner(): TurnRunner {
  let pendingState: PendingTurnState = IDLE_TURN_STATE;
  return {
    dispatchPlayerAction: async (state, action) => {
      pendingState = {
        pending: true,
        pendingLabel: "Resolving turn...",
      };
      try {
        return await new Promise<DispatchResult>((resolve) => {
          setTimeout(() => {
            resolve(dispatch(state, action));
          }, 0);
        });
      } finally {
        pendingState = IDLE_TURN_STATE;
      }
    },
    dispose: () => {
      pendingState = IDLE_TURN_STATE;
    },
    getState: () => pendingState,
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
