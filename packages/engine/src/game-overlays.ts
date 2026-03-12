import {
  GAME_OVERLAY_DOCUMENT_VERSION,
  type GameOverlayDocument,
} from "./content-schema";
import dungeonbreakOverlayJson from "./escape-the-dungeon/contracts/source/games/dungeonbreak/overlay.json";
import escapeTheDungeonOverlayJson from "./escape-the-dungeon/contracts/source/games/escape-the-dungeon/overlay.json";

function normalizeOverlay(
  value: typeof dungeonbreakOverlayJson
): GameOverlayDocument {
  return {
    schemaVersion: GAME_OVERLAY_DOCUMENT_VERSION,
    overlayId: value.overlayId,
    label: value.label,
    description: value.description,
    warningCategories: [...value.warningCategories],
  };
}

export const GAME_OVERLAY_DOCUMENTS = [
  normalizeOverlay(escapeTheDungeonOverlayJson),
  normalizeOverlay(dungeonbreakOverlayJson),
] as const;

export const GAME_OVERLAY_BY_ID = new Map<string, GameOverlayDocument>(
  GAME_OVERLAY_DOCUMENTS.map((overlay) => [overlay.overlayId, overlay])
);
