import {
  buildActionGroups,
  createPersistence,
  extractCutsceneQueue,
  GameEngine,
  toFeedMessages,
  type ActionGroup,
  type CutsceneMessage,
  type FeedMessage,
  type GameSnapshot,
  type PlayerAction,
  type PersistenceAdapter,
  type RuntimeContentPackOverrides,
} from "@dungeonbreak/engine";

const DEFAULT_SEED = 7;

type GameBridgeOptions = {
  contentPacks?:
    | RuntimeContentPackOverrides
    | { packs?: RuntimeContentPackOverrides | null }
    | null;
  slotId?: string;
};

export type GameState = {
  engine: GameEngine;
  persistence: PersistenceAdapter;
  look: string;
  status: Record<string, unknown>;
  groups: ActionGroup[];
  slotId: string;
};

function formatStatus(s: Record<string, unknown>): string {
  return [
    `Depth ${s.depth ?? "?"} - ${s.roomId ?? "?"}`,
    `Act ${s.act ?? "?"} / Chapter ${s.chapter ?? "?"}`,
    `HP ${s.health ?? "?"} | Energy ${s.energy ?? "?"} | Level ${s.level ?? "?"}`,
  ].join("\n");
}

export function createGameBridge(
  seed = DEFAULT_SEED,
  options?: GameBridgeOptions,
): GameState {
  const engine = GameEngine.create(seed, { contentPacks: options?.contentPacks });
  const persistence = createPersistence();
  return {
    engine,
    persistence,
    look: engine.look(),
    status: engine.status(),
    groups: buildActionGroups(engine),
    slotId: options?.slotId ?? "autosave",
  };
}

export async function loadGameBridge(
  seed = DEFAULT_SEED,
  options?: GameBridgeOptions,
): Promise<GameState | null> {
  const persistence = createPersistence();
  const slotId = options?.slotId ?? "autosave";
  const loaded = await persistence.loadSlot(slotId);
  if (!loaded) return null;

  const engine = GameEngine.create(seed, { contentPacks: options?.contentPacks });
  engine.restore(loaded.snapshot);
  return {
    engine,
    persistence,
    look: engine.look(),
    status: engine.status(),
    groups: buildActionGroups(engine),
    slotId,
  };
}

export async function saveGame(state: GameState): Promise<void> {
  await state.persistence.saveSlot(state.slotId, state.engine.snapshot(), "Auto Save");
}

export type DispatchResult = {
  ok: true;
  feed: FeedMessage[];
  cutscenes: CutsceneMessage[];
  escaped: boolean;
  look: string;
  status: Record<string, unknown>;
  statusText: string;
} | { ok: false; error: string };

export function dispatch(state: GameState, action: PlayerAction): DispatchResult {
  const result = state.engine.dispatch(action);
  const feed = toFeedMessages(result);
  const cutscenes = extractCutsceneQueue(result);
  return {
    ok: true,
    feed,
    cutscenes,
    escaped: result.escaped,
    look: state.engine.look(),
    status: state.engine.status(),
    statusText: formatStatus(state.engine.status()),
  };
}

export function refreshState(state: GameState): GameState {
  return {
    ...state,
    look: state.engine.look(),
    status: state.engine.status(),
    groups: buildActionGroups(state.engine),
  };
}
