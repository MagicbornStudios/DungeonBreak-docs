import type { KAPLAYCtx } from "kaplay";
import {
  addButton,
  addFooterStatus,
  addPanel,
  addRoomInfoPanel,
  clearUi,
  LINE_H,
  PAD,
  UI_TAG,
} from "./shared";
import type { SceneCallbacks } from "./scene-contracts";
import { renderSceneLayout } from "./scene-layout";
import { createWidgetRegistry } from "./widget-registry";
import { renderActionListPanel } from "./panel-components";
import { renderPanelSchema } from "./panel-schema";
import { buildDialogueProgressBlock, buildFogStatusBlock } from "./scene-blocks";
import { eventLogMaxLinesForHeight } from "./panel-formulas";

const W = 800;
const H = 600;
const LOOK_PANEL_HEIGHT = 136;
const LOOK_PANEL_TEXT_INSET = 6;
const LOOK_PANEL_TEXT_WIDTH_OFFSET = 12;
const LOOK_PANEL_BOTTOM_GAP = 4;
const STATUS_BLOCK_GAP = 4;
const PRIMARY_SYSTEM_BUTTON_WIDTH = 180;
const ACTIONS_MAX_VISIBLE_ITEMS = 8;
const ACTIONS_PANEL_MAX_Y = 430;
const EVENT_FEED_MIN_Y = 436;
const EVENT_FEED_HEIGHT = 130;
const FOOTER_SAFE_OFFSET = 22;
const FOOTER_TOP_OFFSET = 2;

export function registerFirstPersonScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const tabs = ["Actions", "Feed", "Status"] as const;
  let activeTab: (typeof tabs)[number] = "Actions";
  const widgets = createWidgetRegistry(k);

  k.scene("firstPerson", () => {
    const render = () => {
      clearUi(k);
      const state = cb.getState();
      let y = renderSceneLayout(k, {
        width: W,
        title: "Escape the Dungeon - First-Person",
        subtitle: "[2] Grid | [Look/Save/Load in actions]",
        tabs,
      }, {
        activeTab,
        onSelectTab: (tab) => {
          activeTab = tab as (typeof tabs)[number];
          render();
        },
      });

      addPanel(k, PAD, y, W - PAD * 2, LOOK_PANEL_HEIGHT);
      k.add([
        k.text(state.look, { width: W - PAD * 2 - LOOK_PANEL_TEXT_WIDTH_OFFSET, size: 12 }),
        k.pos(PAD + LOOK_PANEL_TEXT_INSET, y + LOOK_PANEL_TEXT_INSET),
        k.color(225, 228, 236),
        k.anchor("topleft"),
        UI_TAG,
      ]);
      y += LOOK_PANEL_HEIGHT + LOOK_PANEL_BOTTOM_GAP;

      y = addRoomInfoPanel(
        k,
        PAD,
        y,
        W - PAD * 2,
        state.status,
        state.look.split("\n").slice(1, 3).join(" "),
      );
      y += STATUS_BLOCK_GAP;

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

          y = renderActionListPanel(k, PAD, y, W - PAD * 2, group.items, (item) => cb.doAction(item.action), {
            maxItems: ACTIONS_MAX_VISIBLE_ITEMS,
            compact: false,
          });
          if (y > ACTIONS_PANEL_MAX_Y) break;
        }
      } else if (activeTab === "Feed") {
        y = widgets.renderEventLog({
          x: PAD,
          y,
          width: W - PAD * 2,
          title: "[LOG] Narrative",
          lines: cb.feedLines,
          maxLines: 12,
        });
      } else {
        const uiState = cb.getUiState();
        y = renderPanelSchema(
          k,
          buildFogStatusBlock(uiState, state.status, state.look, {
            x: PAD,
            y,
            width: W - PAD * 2,
          }),
        ) + STATUS_BLOCK_GAP;
        y = renderPanelSchema(
          k,
          buildDialogueProgressBlock(uiState, {
            x: PAD,
            y,
            width: W - PAD * 2,
          }),
        ) + STATUS_BLOCK_GAP;
        y = addButton(k, PAD, y, PRIMARY_SYSTEM_BUTTON_WIDTH, "[LOOK] Look", () => cb.doAction({ kind: "system", systemAction: "look" }), true, {
          tone: "neutral",
        });
        y = addButton(
          k,
          PAD,
          y,
          PRIMARY_SYSTEM_BUTTON_WIDTH,
          "[SAVE] Save",
          () => cb.doAction({ kind: "system", systemAction: "save_slot" }),
          true,
          { tone: "accent" },
        );
        y = addButton(
          k,
          PAD,
          y,
          PRIMARY_SYSTEM_BUTTON_WIDTH,
          "[LOAD] Load",
          () => cb.doAction({ kind: "system", systemAction: "load_slot" }),
          true,
          { tone: "accent" },
        );
      }

      if (activeTab !== "Feed") {
        y = widgets.renderEventLog({
          x: PAD,
          y: Math.max(y + STATUS_BLOCK_GAP, EVENT_FEED_MIN_Y),
          width: W - PAD * 2,
          title: "[LOG] Event Feed",
          lines: cb.feedLines,
          maxLines: eventLogMaxLinesForHeight(EVENT_FEED_HEIGHT),
        });
      }

      addFooterStatus(k, PAD, Math.min(H - FOOTER_SAFE_OFFSET, y + FOOTER_TOP_OFFSET), state.status);
    };

    k.onKeyPress("2", () => k.go("gridNavigation"));
    cb.setRefresh(render);
    render();
  });
}
