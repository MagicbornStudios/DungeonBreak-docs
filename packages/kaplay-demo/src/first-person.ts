import type { KAPLAYCtx } from "kaplay";
import {
  addButton,
  addChip,
  addFooterStatus,
  addFeedBlock,
  addHeader,
  addPanel,
  addRoomInfoPanel,
  addTabBar,
  clearUi,
  LINE_H,
  PAD,
  UI_TAG,
} from "./shared";
import type { SceneCallbacks } from "./scene-contracts";
import { actionTone, formatActionLabel } from "./ui-context";

const W = 800;
const H = 600;

export function registerFirstPersonScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const tabs = ["Actions", "Feed", "Status"] as const;
  let activeTab: (typeof tabs)[number] = "Actions";

  k.scene("firstPerson", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = addHeader(
        k,
        W,
        "Escape the Dungeon - First-Person",
        "[2] Grid | [Look/Save/Load in actions]",
      );
      y = addTabBar(k, PAD, y, tabs, activeTab, (tab) => {
        activeTab = tab as (typeof tabs)[number];
        render();
      });
      y += 2;

      addPanel(k, PAD, y, W - PAD * 2, 136);
      k.add([
        k.text(state.look, { width: W - PAD * 2 - 12, size: 12 }),
        k.pos(PAD + 6, y + 6),
        k.color(225, 228, 236),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += 140;

      y = addRoomInfoPanel(
        k,
        PAD,
        y,
        W - PAD * 2,
        state.status,
        state.look.split("\n").slice(1, 3).join(" "),
      );
      y += 4;

      if (activeTab === "Actions") {
        k.add([
          k.text("Actions", { size: 11 }),
          k.pos(PAD, y),
          k.color(160, 170, 190),
          k.anchor("topleft"),
          UI_TAG,
        ]);
        y += LINE_H;

        for (const group of state.groups) {
          k.add([
            k.text(group.title, { size: 10 }),
            k.pos(PAD, y),
            k.color(122, 132, 154),
            k.anchor("topleft"),
            UI_TAG,
          ]);
          y += LINE_H;

          for (const item of group.items) {
            const blocked = item.blockedReasons.length > 0 ? ` (${item.blockedReasons[0]})` : "";
            y = addButton(
              k,
              PAD,
              y,
              W - PAD * 2,
              `${formatActionLabel(item)}${blocked}`,
              () => cb.doAction(item.action),
              item.available,
              { tone: actionTone(item.action) },
            );
            if (y > 430) break;
          }

          if (y > 430) break;
        }
      } else if (activeTab === "Feed") {
        y = addFeedBlock(k, PAD, y, W - PAD * 2, cb.feedLines, 12);
      } else {
        let chipX = PAD;
        const health = Number(state.status.health ?? 0);
        const energy = Number(state.status.energy ?? 0);
        const act = String(state.status.act ?? "?");
        const chapter = String(state.status.chapter ?? "?");
        chipX = addChip(k, chipX, y, `Act ${act}`, "neutral");
        chipX = addChip(k, chipX, y, `Chapter ${chapter}`, "neutral");
        chipX = addChip(k, chipX, y, `HP ${String(state.status.health ?? "?")}`, health <= 25 ? "danger" : "good");
        addChip(k, chipX, y, `Energy ${String(state.status.energy ?? "?")}`, energy <= 20 ? "warn" : "good");
        y += 24;

        const nearbyLine = state.look
          .split("\n")
          .find((line) => line.toLowerCase().startsWith("nearby:"))
          ?.trim();
        addChip(k, PAD, y, nearbyLine ?? "Nearby: unknown", nearbyLine?.toLowerCase().includes("none") ? "good" : "warn");
        y += 28;
        y = addButton(k, PAD, y, 180, "[LOOK] Look", () => cb.doAction({ kind: "system", systemAction: "look" }), true, {
          tone: "neutral",
        });
        y = addButton(
          k,
          PAD,
          y,
          180,
          "[SAVE] Save",
          () => cb.doAction({ kind: "system", systemAction: "save_slot" }),
          true,
          { tone: "accent" },
        );
        y = addButton(
          k,
          PAD,
          y,
          180,
          "[LOAD] Load",
          () => cb.doAction({ kind: "system", systemAction: "load_slot" }),
          true,
          { tone: "accent" },
        );
      }

      if (activeTab !== "Feed") {
        y = addFeedBlock(k, PAD, Math.max(y + 4, 436), W - PAD * 2, cb.feedLines, 6);
      }

      addFooterStatus(k, PAD, Math.min(H - 22, y + 2), state.status);
    };

    k.onKeyPress("2", () => k.go("gridNavigation"));
    cb.setRefresh(render);
    render();
  });
}
