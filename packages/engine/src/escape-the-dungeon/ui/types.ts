import type { PlayerAction } from "../core/types";

export type FeedTone = "system" | "player" | "event" | "warning" | "cutscene";

export interface FeedMessage {
  id: string;
  text: string;
  tone: FeedTone;
  turnIndex?: number;
}

export interface CutsceneMessage {
  id: string;
  title: string;
  text: string;
  turnIndex: number;
}

export type SystemAction = "look" | "status" | "save_slot" | "load_slot";

export type PlayUiAction =
  | {
      kind: "system";
      systemAction: SystemAction;
    }
  | {
      kind: "player";
      playerAction: PlayerAction;
    };

export interface ActionItem {
  id: string;
  label: string;
  available: boolean;
  blockedReasons: string[];
  uiIntent?: string;
  uiScreen?: string;
  uiPriority?: number;
  action: PlayUiAction;
}

export interface ActionGroup {
  id: string;
  title: string;
  items: ActionItem[];
}
