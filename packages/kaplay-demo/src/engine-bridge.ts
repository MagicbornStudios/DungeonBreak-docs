import {
  type ActionGroup,
  buildActionGroups,
  type CutsceneMessage,
  createPersistence,
  extractCutsceneQueue,
  type FeedMessage,
  GameEngine,
  type GameSnapshot,
  type PersistenceAdapter,
  type PlayerAction,
  toFeedMessages,
} from "@dungeonbreak/engine";

const AUTO_SLOT = "autosave";
const DEFAULT_SEED = 7;

export interface GameState {
  engine: GameEngine;
  persistence: PersistenceAdapter;
  seed: number;
  look: string;
  status: Record<string, unknown>;
  groups: ActionGroup[];
}

function formatStatus(s: Record<string, unknown>): string {
  return [
    `Depth ${s.depth ?? "?"} - ${s.roomId ?? "?"}`,
    `Act ${s.act ?? "?"} / Chapter ${s.chapter ?? "?"}`,
    `HP ${s.health ?? "?"} | Mana ${s.mana ?? "?"} | Level ${s.level ?? "?"}`,
  ].join("\n");
}

export function createGameBridge(seed = DEFAULT_SEED): GameState {
  const engine = GameEngine.create(seed);
  const persistence = createPersistence();
  return {
    engine,
    persistence,
    seed,
    look: engine.look(),
    status: engine.status(),
    groups: buildActionGroups(engine),
  };
}

export async function loadGameBridge(
  seed = DEFAULT_SEED
): Promise<GameState | null> {
  const persistence = createPersistence();
  const loaded = await persistence.loadSlot(AUTO_SLOT);
  if (!loaded) {
    return null;
  }

  const engine = GameEngine.create(seed);
  engine.restore(loaded.snapshot);
  return {
    engine,
    persistence,
    seed,
    look: engine.look(),
    status: engine.status(),
    groups: buildActionGroups(engine),
  };
}

export async function saveGame(state: GameState): Promise<void> {
  await state.persistence.saveSlot(
    AUTO_SLOT,
    state.engine.snapshot(),
    "Auto Save"
  );
}

export type DispatchResult =
  | {
      ok: true;
      feed: FeedMessage[];
      cutscenes: CutsceneMessage[];
      escaped: boolean;
      look: string;
      snapshot: GameSnapshot;
      status: Record<string, unknown>;
      statusText: string;
    }
  | { ok: false; error: string };

function buildDispatchSuccess(
  state: GameState,
  options: {
    cutscenes: CutsceneMessage[];
    escaped: boolean;
    feed: FeedMessage[];
    snapshot: GameSnapshot;
  }
): DispatchResult {
  const status = state.engine.status();
  return {
    ok: true,
    feed: options.feed,
    cutscenes: options.cutscenes,
    escaped: options.escaped,
    look: state.engine.look(),
    snapshot: options.snapshot,
    status,
    statusText: formatStatus(status),
  };
}

export function dispatch(
  state: GameState,
  action: PlayerAction
): DispatchResult {
  const result = state.engine.dispatch(action);
  const feed = toFeedMessages(result);
  const cutscenes = extractCutsceneQueue(result);
  return buildDispatchSuccess(state, {
    cutscenes,
    escaped: result.escaped,
    feed,
    snapshot: state.engine.snapshot(),
  });
}

export function dispatchPreparedSpell(
  state: GameState,
  skillId: string
): DispatchResult {
  const result = state.engine.castPreparedSpell(skillId);
  const feed = toFeedMessages(result);
  const cutscenes = extractCutsceneQueue(result);
  return buildDispatchSuccess(state, {
    cutscenes,
    escaped: result.escaped,
    feed,
    snapshot: state.engine.snapshot(),
  });
}

export function dispatchForgedSpellRecipe(
  state: GameState,
  runeCombo: string[],
  options: { customName?: string | null; slotIndex?: number | null } = {}
): DispatchResult {
  const result = state.engine.forgeSpellRecipe(runeCombo, options);
  const feed = toFeedMessages(result);
  const cutscenes = extractCutsceneQueue(result);
  return buildDispatchSuccess(state, {
    cutscenes,
    escaped: result.escaped,
    feed,
    snapshot: state.engine.snapshot(),
  });
}

export function dispatchForgedSpellEvolution(
  state: GameState,
  sourceSkillId: string,
  runeCombo: string[]
): DispatchResult {
  const result = state.engine.forgeSpellEvolution(sourceSkillId, runeCombo);
  const feed = toFeedMessages(result);
  const cutscenes = extractCutsceneQueue(result);
  return buildDispatchSuccess(state, {
    cutscenes,
    escaped: result.escaped,
    feed,
    snapshot: state.engine.snapshot(),
  });
}

export function restoreSnapshot(
  state: GameState,
  snapshot: GameSnapshot
): GameState {
  state.engine.restore(snapshot);
  return refreshState(state);
}

export function refreshState(state: GameState): GameState {
  return {
    ...state,
    look: state.engine.look(),
    status: state.engine.status(),
    groups: buildActionGroups(state.engine),
  };
}
