import { ACTION_TYPE } from "@dungeonbreak/engine";
import type { KAPLAYCtx } from "kaplay";
import {
  firstItemByActionType,
  formatActionButtonLabel,
  itemsByActionType,
} from "./action-renderer";
import { registerCombatScene as registerCombatSceneModule } from "./combat-scene";
import { renderGridFooter, renderGridFrame } from "./grid-frame";
import { nearestEnemyLabel } from "./navigation-helpers";
import {
  type NavigationOverlayKind,
  setPendingNavigationOverlay,
} from "./navigation-overlay";
import { registerNavigationScene as registerNavigationSceneModule } from "./navigation-scene";
import { registerRuneForgeScene as registerRuneForgeSceneModule } from "./rune-forge-scene";
import type { SceneCallbacks } from "./scene-contracts";
import { addButton, clearUi } from "./shared";
import { renderSectionHeaderMolecule } from "./ui/molecules";
import { createWidgetRegistry } from "./widget-registry";
import { registerWorldMapScene as registerWorldMapSceneModule } from "./world-map-scene";

function registerMapScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  k.scene("gridMap", () => {
    setPendingNavigationOverlay(null);
    cb.setRefresh(() => {
      setPendingNavigationOverlay(null);
      k.go("gridNavigation");
    });
    k.go("gridNavigation");
  });
}

function registerLegacyOverlayScene(
  k: KAPLAYCtx,
  cb: SceneCallbacks,
  sceneId:
    | "gridInventory"
    | "gridSpellbook"
    | "gridJournal"
    | "gridStats"
    | "gridEquipped",
  overlay: NavigationOverlayKind
): void {
  k.scene(sceneId, () => {
    setPendingNavigationOverlay(overlay);
    cb.setRefresh(() => {
      setPendingNavigationOverlay(overlay);
      k.go("gridNavigation");
    });
    k.go("gridNavigation");
  });
}

function registerInventoryScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  registerLegacyOverlayScene(k, cb, "gridInventory", "bag");
}

function registerSpellbookScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  registerLegacyOverlayScene(k, cb, "gridSpellbook", "spellbook");
}

function registerJournalScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  registerLegacyOverlayScene(k, cb, "gridJournal", "journal");
}

function registerStatsScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  registerLegacyOverlayScene(k, cb, "gridStats", "stats");
}

function registerEquippedScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  registerLegacyOverlayScene(k, cb, "gridEquipped", "equipped");
}

function registerDialogueScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  const widgets = createWidgetRegistry(k);
  k.scene("gridDialogue", () => {
    const render = () => {
      clearUi(k);
      const { state, shell } = renderGridFrame(k, cb, widgets, {
        title: "Dialogue",
        subtitle: "[J] Journal | [Esc] Navigation",
        journalTitle: "Dialogue Log",
        journalMaxLines: 8,
      });
      const uiState = cb.getUiState();
      let y = renderSectionHeaderMolecule(k, {
        x: shell.centerX,
        y: shell.innerY,
        title: "Conversation",
        subtitle: `Nearby: ${nearestEnemyLabel(state)}`,
      });
      y = widgets.renderDialogueProgress({
        x: shell.centerX,
        y,
        width: shell.centerWidth,
        ui: uiState,
        timelineLimit: 3,
      });
      y += 8;

      const options = itemsByActionType(state, "choose_dialogue");
      if (options.length === 0) {
        y = addButton(
          k,
          shell.centerX,
          y,
          shell.centerWidth,
          "No dialogue options available",
          () => {
            // Disabled placeholder to preserve the action list layout.
          },
          false
        );
      } else {
        y = widgets.renderActionList({
          x: shell.centerX,
          y,
          width: shell.centerWidth,
          items: options,
          onAction: (option) => {
            cb.doAction(option.action);
            k.go("gridNavigation");
          },
          maxItems: 10,
          compact: true,
        });
      }

      const talkAction = firstItemByActionType(state, ACTION_TYPE.TALK);
      y += 4;
      y = addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        talkAction
          ? formatActionButtonLabel(talkAction)
          : "[TALK] Talk (Unavailable)",
        () => {
          if (!talkAction) {
            return;
          }
          cb.doAction(talkAction.action);
          k.go("gridNavigation");
        },
        Boolean(talkAction?.available),
        { tone: "neutral" }
      );

      addButton(
        k,
        shell.centerX,
        y,
        shell.centerWidth,
        "[Esc] Back to Floor",
        () => k.go("gridNavigation")
      );
      const hints = [
        "[M] Map",
        "[O] World",
        "[T] Dialogue",
        "[J] Journal",
        "[P] Spellbook",
        "[V] Stats",
        "[Q] Equipped",
        "[B] Bag",
        "[Esc] Navigation",
      ];
      renderGridFooter(k, state, hints);
    };

    k.onKeyPress("m", () => k.go("gridMap"));
    k.onKeyPress("o", () => k.go("gridWorldMap"));
    k.onKeyPress("j", () => k.go("gridJournal"));
    k.onKeyPress("p", () => k.go("gridSpellbook"));
    k.onKeyPress("v", () => k.go("gridNavigation"));
    k.onKeyPress("q", () => k.go("gridEquipped"));
    k.onKeyPress("escape", () => k.go("gridNavigation"));

    cb.setRefresh(render);
    render();
  });
}

export function registerGridScene(k: KAPLAYCtx, cb: SceneCallbacks): void {
  registerNavigationSceneModule(k, cb);
  registerMapScene(k, cb);
  registerWorldMapSceneModule(k, cb);
  registerCombatSceneModule(k, cb);
  registerRuneForgeSceneModule(k, cb);
  registerInventoryScene(k, cb);
  registerSpellbookScene(k, cb);
  registerJournalScene(k, cb);
  registerStatsScene(k, cb);
  registerEquippedScene(k, cb);
  registerDialogueScene(k, cb);
}
