import type { PlayUiAction } from "@dungeonbreak/engine";
import type { GameState } from "./engine-bridge";

export type DialogueProgressStep = {
  turn: number;
  kind: "talk" | "choose_dialogue";
  optionId?: string;
  label: string;
};

export type FogMetrics = {
  radius: number;
  levelFactor: number;
  comprehensionFactor: number;
  awarenessFactor: number;
};

export type UiSessionState = {
  dialogue: {
    sequence: number;
    steps: DialogueProgressStep[];
  };
  fog: FogMetrics;
};

export type SceneCallbacks = {
  getState: () => GameState;
  getUiState: () => UiSessionState;
  doAction: (action: PlayUiAction) => void;
  setRefresh: (fn: () => void) => void;
  feedLines: string[];
};
