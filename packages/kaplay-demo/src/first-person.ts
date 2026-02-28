import type { GameObj } from "kaplay";
import { add, color, go, scene, text, rect, vec2, area, anchor } from "kaplay";
import type { ActionGroup, ActionItem, CutsceneMessage, FeedMessage } from "@dungeonbreak/engine";
import type { GameState } from "./engine-bridge";

const W = 800;
const H = 600;
const PAD = 16;
const LINE_H = 20;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

export function registerFirstPersonScene(
  getState: () => GameState,
  onDispatch: (result: { feed: FeedMessage[]; cutscenes: CutsceneMessage[]; escaped: boolean }) => void,
  onRefresh: () => void,
): void {
  scene("firstPerson", () => {
    let feedLines: string[] = [];
    let cutsceneQueue: CutsceneMessage[] = [];

    const addFeed = (msgs: FeedMessage[]) => {
      for (const m of msgs) {
        feedLines.push(m.text);
      }
      feedLines = feedLines.slice(-80);
    };

    const render = () => {
      getScene()?.getAll().forEach((o) => o.destroy());
      const state = getState();
      const y = vec2(PAD, PAD);

      add([
        text(state.look, { width: W - PAD * 2, size: 14 }),
        pos(y.x, y.y),
        color(220, 220, 220),
      ]);
      y.y += LINE_H * 4;

      for (const group of state.groups) {
        for (const item of group.items) {
          if (item.action.kind !== "player" || !item.available) continue;
          const pa = item.action.playerAction;
          const btn = add([
            rect(W - PAD * 2 - 4, 28, { radius: 4 }),
            pos(PAD, y.y),
            area(),
            color(60, 60, 80),
            anchor("topleft"),
            "action-btn",
            { action: pa, label: item.label },
          ]);
          add([
            text(truncate(item.label, 45), { size: 12 }),
            pos(PAD + 8, y.y + 6),
            anchor("topleft"),
            color(200, 200, 200),
          ]);
          btn.onClick(() => {
            onDispatch({ feed: [], cutscenes: [], escaped: false });
            onRefresh();
          });
          y.y += 34;
        }
      }

      y.y += LINE_H;

      add([
        text("--- Feed ---", { size: 12 }),
        pos(PAD, y.y),
        color(160, 160, 160),
      ]);
      y.y += LINE_H;

      const startFeedY = y.y;
      const maxFeedH = H - startFeedY - PAD - 40;
      const visibleLines = Math.floor(maxFeedH / LINE_H);
      const tail = feedLines.slice(-visibleLines);
      for (const line of tail) {
        add([
          text(truncate(line, 100), { size: 11, width: W - PAD * 2 }),
          pos(PAD, y.y),
          color(180, 180, 180),
        ]);
        y.y += LINE_H;
      }
    };

    onRefresh();
    render();
  });
}

function getScene(): { getAll: () => GameObj[] } | null {
  try {
    return (window as unknown as { __kaplay_getScene?: () => unknown }).__kaplay_getScene?.() as { getAll: () => GameObj[] } | null;
  } {
    return null;
  }
}
