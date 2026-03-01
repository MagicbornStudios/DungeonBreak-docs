import type { PlayUiAction } from "@dungeonbreak/engine";
import { formulaRegistry } from "@dungeonbreak/engine";
import type { UiSessionState } from "./scene-contracts";

const UI_STATE_STORAGE_KEY = "dungeonbreak:kaplay:ui-state:v1";

function initialUiState(): UiSessionState {
  return {
    dialogue: {
      sequence: 0,
      steps: [],
    },
    fog: {
      radius: 1,
      levelFactor: 0,
      comprehensionFactor: 0,
      awarenessFactor: 0,
    },
  };
}

export function createUiStateStore() {
  let state: UiSessionState = initialUiState();

  const persist = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // no-op
    }
  };

  const hydrate = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(UI_STATE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<UiSessionState>;
      state = {
        ...state,
        ...parsed,
        dialogue: {
          ...state.dialogue,
          ...(parsed.dialogue ?? {}),
          steps: parsed.dialogue?.steps ?? state.dialogue.steps,
        },
        fog: {
          ...state.fog,
          ...(parsed.fog ?? {}),
        },
      };
    } catch {
      // no-op
    }
  };

  return {
    getState(): UiSessionState {
      return state;
    },
    hydrate,
    setFogFromStatus(status: Record<string, unknown>) {
      state = {
        ...state,
        fog: formulaRegistry.fogMetrics(status),
      };
      persist();
    },
    recordDialogueStep(
      action: PlayUiAction,
      turn: number,
      label: string,
    ) {
      if (action.kind !== "player") return;
      if (action.playerAction.actionType !== "talk" && action.playerAction.actionType !== "choose_dialogue") return;
      state = {
        ...state,
        dialogue: {
          sequence: state.dialogue.sequence + 1,
          steps: [
            ...state.dialogue.steps,
            {
              turn,
              kind: action.playerAction.actionType,
              optionId:
                action.playerAction.actionType === "choose_dialogue"
                  ? String(action.playerAction.payload.optionId ?? "")
                  : undefined,
              label,
            },
          ].slice(-20),
        },
      };
      persist();
    },
  };
}
