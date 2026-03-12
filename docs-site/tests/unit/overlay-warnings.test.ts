import { describe, expect, test } from "vitest";
import {
  CUSTOM_OVERLAY_ID,
  getOverlayDiagnostics,
} from "@/components/reports/space-explorer/overlay-warnings";

describe("overlay warnings", () => {
  test("returns no warnings when custom overlay is active", () => {
    const diagnostics = getOverlayDiagnostics(CUSTOM_OVERLAY_ID, null);

    expect(diagnostics.activeOverlay).toBeNull();
    expect(diagnostics.statuses).toEqual([]);
    expect(diagnostics.options.some((row) => row.overlayId === CUSTOM_OVERLAY_ID))
      .toBe(true);
  });

  test("summarizes warning categories from the active payload", () => {
    const diagnostics = getOverlayDiagnostics("escape-the-dungeon", {
      schemaVersion: "content-pack.bundle.v1",
      packs: {
        dungeonLayouts: {
          dungeons: [{ dungeonId: "unit-dungeon" }],
        },
        itemPack: {
          items: [{ itemId: "potion", tags: ["currency"] }],
        },
        questPack: {
          quests: [{ questId: "escape" }],
        },
        cutscenePack: {
          cutscenes: [{ cutsceneId: "intro" }],
        },
        skillPack: {
          skills: [{ skillId: "arc_burst" }],
        },
        dialoguePack: {
          clusters: [{ clusterId: "npc_intro" }],
        },
        archetypePack: {
          archetypes: [{ archetypeId: "enemy_brute" }],
        },
        spaceVectors: {
          modelSchemas: [
            {
              modelId: "entity.enemy_brute",
              label: "Enemy Brute",
              featureRefs: [],
            },
            {
              modelId: "character.shopkeeper",
              label: "Shopkeeper",
              featureRefs: [],
            },
          ],
        },
      },
    });

    expect(diagnostics.activeOverlay?.overlayId).toBe("escape-the-dungeon");
    expect(diagnostics.missingCount).toBe(0);
    expect(diagnostics.statuses.every((row) => row.ready)).toBe(true);
  });
});
