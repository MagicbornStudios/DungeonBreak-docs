import type { PlayUiAction } from "@dungeonbreak/engine";
import type { GameState } from "./engine-bridge";

export type SceneCallbacks = {
  getState: () => GameState;
  doAction: (action: PlayUiAction) => void;
  setRefresh: (fn: () => void) => void;
  feedLines: string[];
};
