import kaplay from "kaplay";
import { initialFeed, type CutsceneMessage, type FeedMessage, type PlayUiAction } from "@dungeonbreak/engine";
import {
  createGameBridge,
  loadGameBridge,
  saveGame,
  dispatch,
  refreshState,
  type GameState,
  type DispatchResult,
} from "./engine-bridge";
import { registerFirstPersonScene } from "./first-person";
import { registerGridScene } from "./grid";
import { addCutsceneOverlay } from "./shared";
import type { SceneCallbacks } from "./scene-contracts";
import { createUiStateStore } from "./ui-state-store";
import { formatActionButtonLabel } from "./action-renderer";

const W = 800;
const H = 600;

function main() {
  const k = kaplay({
    width: W,
    height: H,
    scale: 1,
    crisp: true,
    background: [15, 23, 42],
  });

  k.setBackground(15, 23, 42);

  let state: GameState | null = null;
  const feedLines: string[] = [];
  let cutsceneQueue: CutsceneMessage[] = [];
  let refreshFn: () => void = () => {};
  const uiStore = createUiStateStore();

  const addFeed = (msgs: FeedMessage[]) => {
    for (const msg of msgs) {
      feedLines.push(msg.text);
    }
  };

  const setRefresh = (fn: () => void) => {
    refreshFn = fn;
  };

  const processCutscenes = () => {
    if (cutsceneQueue.length === 0) {
      refreshFn();
      return;
    }

    const message = cutsceneQueue[0];
    k.destroyAll("cutscene");
    addCutsceneOverlay(k, W, H, message.title, message.text, () => {
      cutsceneQueue = cutsceneQueue.slice(1);
      processCutscenes();
    });
  };

  const doAction = (action: PlayUiAction) => {
    if (!state) return;
    const preActionGroups = state.groups;

    if (action.kind === "system") {
      if (action.systemAction === "look" || action.systemAction === "status") {
        state = refreshState(state);
        refreshFn();
        return;
      }

      if (action.systemAction === "save_slot") {
        void saveGame(state).then(() => {
          feedLines.push("Saved to autosave slot.");
          refreshFn();
        });
        return;
      }

      if (action.systemAction === "load_slot") {
        void loadGameBridge().then((loaded) => {
          if (!loaded) {
            feedLines.push("No autosave found.");
            refreshFn();
            return;
          }
          state = loaded;
          feedLines.push("Loaded autosave.");
          refreshFn();
        });
        return;
      }
      return;
    }

    const result = dispatch(state, action.playerAction) as DispatchResult;
    if (!result.ok) {
      feedLines.push(result.error);
      refreshFn();
      return;
    }

    addFeed(result.feed);
    state = refreshState(state);
    uiStore.setFogFromStatus(state.status);

    if (action.playerAction.actionType === "talk" || action.playerAction.actionType === "choose_dialogue") {
      const sourceItem = preActionGroups
        .flatMap((group) => group.items)
        .find((item) => JSON.stringify(item.action) === JSON.stringify(action));
      const label = sourceItem ? formatActionButtonLabel(sourceItem) : action.playerAction.actionType;
      uiStore.recordDialogueStep(action, Number(state.status.turn ?? 0), label);
    }

    if (result.cutscenes.length > 0) {
      cutsceneQueue = result.cutscenes;
      processCutscenes();
      return;
    }

    if (result.escaped) {
      feedLines.push("You escaped the dungeon.");
    }

    void saveGame(state).then(() => refreshFn());
  };

  const boot = async () => {
    uiStore.hydrate();
    const loaded = await loadGameBridge();
    state = loaded ?? createGameBridge();

    if (!loaded) {
      addFeed(initialFeed(state.engine));
      await saveGame(state);
    } else {
      feedLines.push("Autosave loaded.");
    }
    uiStore.setFogFromStatus(state.status);

    const callbacks: SceneCallbacks = {
      getState: () => state as GameState,
      getUiState: () => uiStore.getState(),
      doAction,
      setRefresh,
      feedLines,
    };

    registerFirstPersonScene(k, callbacks);
    registerGridScene(k, callbacks);

    k.go("firstPerson");
  };

  k.scene("menu", () => {
    k.add([
      k.text("Escape the Dungeon", { size: 32 }),
      k.pos(W / 2, H / 2 - 60),
      k.color(255, 255, 255),
      k.anchor("center"),
    ]);
    k.add([
      k.text("Loading...", { size: 14 }),
      k.pos(W / 2, H / 2),
      k.color(180, 180, 180),
      k.anchor("center"),
    ]);
  });

  k.go("menu");
  void boot();
}

main();
