import {
  type CutsceneMessage,
  extractCutsceneQueue,
  type FeedMessage,
  GameEngine,
  type GameSnapshot,
  type PlayerAction,
  type TurnResult,
  toFeedMessages,
} from "@dungeonbreak/engine";

interface TurnSyncRequest {
  kind: "sync";
  requestId: number;
  seed: number;
  snapshot: GameSnapshot;
}

interface TurnDispatchRequest {
  action: PlayerAction;
  kind: "dispatch";
  requestId: number;
}

interface CastPreparedSpellRequest {
  kind: "castPreparedSpell";
  requestId: number;
  skillId: string;
}

interface PrepareSpellSlotRequest {
  kind: "prepareSpellSlot";
  requestId: number;
  skillId: string | null;
  slotIndex: number;
}

interface ForgeSpellRecipeRequest {
  kind: "forgeSpellRecipe";
  options?: { customName?: string | null; slotIndex?: number | null };
  requestId: number;
  runeCombo: string[];
}

interface ForgeSpellEvolutionRequest {
  kind: "forgeSpellEvolution";
  requestId: number;
  runeCombo: string[];
  sourceSkillId: string;
}

interface RenameSpellRequest {
  kind: "renameSpell";
  requestId: number;
  requestedName: string | null;
  skillId: string;
}

type TurnRequest =
  | TurnSyncRequest
  | TurnDispatchRequest
  | CastPreparedSpellRequest
  | PrepareSpellSlotRequest
  | ForgeSpellRecipeRequest
  | ForgeSpellEvolutionRequest
  | RenameSpellRequest;

type TurnResponse =
  | {
      kind: "sync";
      ok: true;
      requestId: number;
    }
  | {
      cutscenes: CutsceneMessage[];
      escaped: boolean;
      feed: FeedMessage[];
      kind:
        | "dispatch"
        | "castPreparedSpell"
        | "forgeSpellRecipe"
        | "forgeSpellEvolution";
      ok: true;
      requestId: number;
      snapshot: GameSnapshot;
    }
  | {
      kind: "prepareSpellSlot" | "renameSpell";
      message: string;
      ok: true;
      requestId: number;
      snapshot: GameSnapshot;
    }
  | {
      error: string;
      kind: TurnRequest["kind"];
      ok: false;
      requestId: number;
    };

let workerSeed: number | null = null;
let workerEngine: GameEngine | null = null;

function toResponse(
  kind: TurnRequest["kind"],
  requestId: number,
  error: unknown
): Extract<TurnResponse, { ok: false }> {
  return {
    error: error instanceof Error ? error.message : String(error),
    kind,
    ok: false,
    requestId,
  };
}

function ensureWorkerEngine(seed: number): GameEngine {
  if (!workerEngine || workerSeed !== seed) {
    workerEngine = GameEngine.create(seed);
    workerSeed = seed;
  }
  return workerEngine;
}

function requireWorkerEngine(): GameEngine {
  if (!workerEngine) {
    throw new Error("Turn worker received a request before sync.");
  }
  return workerEngine;
}

function toTurnSuccess(
  kind:
    | "dispatch"
    | "castPreparedSpell"
    | "forgeSpellRecipe"
    | "forgeSpellEvolution",
  requestId: number,
  engine: GameEngine,
  result: TurnResult
): Extract<TurnResponse, { ok: true; snapshot: GameSnapshot }> {
  return {
    cutscenes: extractCutsceneQueue(result),
    escaped: result.escaped,
    feed: toFeedMessages(result),
    kind,
    ok: true,
    requestId,
    snapshot: engine.snapshot(),
  };
}

self.onmessage = (event: MessageEvent<TurnRequest>) => {
  const request = event.data;
  try {
    if (request.kind === "sync") {
      const engine = ensureWorkerEngine(request.seed);
      engine.restore(request.snapshot);
      const response: TurnResponse = {
        kind: "sync",
        ok: true,
        requestId: request.requestId,
      };
      self.postMessage(response);
      return;
    }

    const engine = requireWorkerEngine();

    switch (request.kind) {
      case "dispatch": {
        self.postMessage(
          toTurnSuccess(
            "dispatch",
            request.requestId,
            engine,
            engine.dispatch(request.action)
          )
        );
        return;
      }
      case "castPreparedSpell": {
        self.postMessage(
          toTurnSuccess(
            "castPreparedSpell",
            request.requestId,
            engine,
            engine.castPreparedSpell(request.skillId)
          )
        );
        return;
      }
      case "forgeSpellRecipe": {
        self.postMessage(
          toTurnSuccess(
            "forgeSpellRecipe",
            request.requestId,
            engine,
            engine.forgeSpellRecipe(request.runeCombo, request.options)
          )
        );
        return;
      }
      case "forgeSpellEvolution": {
        self.postMessage(
          toTurnSuccess(
            "forgeSpellEvolution",
            request.requestId,
            engine,
            engine.forgeSpellEvolution(request.sourceSkillId, request.runeCombo)
          )
        );
        return;
      }
      case "prepareSpellSlot": {
        const outcome =
          request.skillId === null
            ? engine.clearPreparedSpellSlot(request.slotIndex)
            : engine.prepareSpell(request.slotIndex, request.skillId);
        if (!outcome.ok) {
          throw new Error(`Spell prep failed: ${outcome.reason}.`);
        }
        const response: TurnResponse = {
          kind: "prepareSpellSlot",
          message:
            request.skillId === null
              ? `Cleared spell slot ${request.slotIndex + 1}.`
              : `Prepared ${request.skillId.replace(/_/g, " ")} in slot ${request.slotIndex + 1}.`,
          ok: true,
          requestId: request.requestId,
          snapshot: engine.snapshot(),
        };
        self.postMessage(response);
        return;
      }
      case "renameSpell": {
        const outcome = engine.renameKnownSpell(
          request.skillId,
          request.requestedName
        );
        if (!outcome.ok) {
          throw new Error(outcome.message);
        }
        const response: TurnResponse = {
          kind: "renameSpell",
          message: outcome.message,
          ok: true,
          requestId: request.requestId,
          snapshot: engine.snapshot(),
        };
        self.postMessage(response);
        return;
      }
      default: {
        request satisfies never;
      }
    }
  } catch (error) {
    self.postMessage(toResponse(request.kind, request.requestId, error));
  }
};
