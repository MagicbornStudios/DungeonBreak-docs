import type { KAPLAYCtx } from "kaplay";
import { registerCombatScene as registerCombatSceneModule } from "./combat-scene";
import {
  type NavigationOverlayKind,
  setPendingNavigationOverlay,
} from "./navigation-overlay";
import { registerNavigationScene as registerNavigationSceneModule } from "./navigation-scene";
import { registerRuneForgeScene as registerRuneForgeSceneModule } from "./rune-forge-scene";
import type { SceneCallbacks } from "./scene-contracts";
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
  k.scene("gridDialogue", () => {
    setPendingNavigationOverlay("dialogue");
    cb.setRefresh(() => {
      setPendingNavigationOverlay("dialogue");
      k.go("gridNavigation");
    });
    k.go("gridNavigation");
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
