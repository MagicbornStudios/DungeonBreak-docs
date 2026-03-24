import {
  type CutsceneMessage,
  extractCutsceneQueue,
  type FeedMessage,
  GameEngine,
  type GameSnapshot,
  type PlayerAction,
  toFeedMessages,
} from "@dungeonbreak/engine";

interface TurnDispatchRequest {
  action: PlayerAction;
  requestId: number;
  seed: number;
  snapshot: GameSnapshot;
}

type TurnDispatchResponse =
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

function toResponse(
  requestId: number,
  error: unknown
): Extract<TurnDispatchResponse, { ok: false }> {
  return {
    error: error instanceof Error ? error.message : String(error),
    ok: false,
    requestId,
  };
}

self.onmessage = (event: MessageEvent<TurnDispatchRequest>) => {
  const { action, requestId, seed, snapshot } = event.data;
  try {
    const engine = GameEngine.create(seed);
    engine.restore(snapshot);
    const result = engine.dispatch(action);
    const response: TurnDispatchResponse = {
      cutscenes: extractCutsceneQueue(result),
      escaped: result.escaped,
      feed: toFeedMessages(result),
      ok: true,
      requestId,
      snapshot: engine.snapshot(),
    };
    self.postMessage(response);
  } catch (error) {
    self.postMessage(toResponse(requestId, error));
  }
};
