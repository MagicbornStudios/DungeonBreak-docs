import {
  extractCanonicalInstancesPatch,
  extractSpaceVectorSchemaPatch,
} from "@dungeonbreak/engine/content-schema";
import { GAME_OVERLAY_DOCUMENTS } from "@dungeonbreak/engine";
import type { ActivePackPayload } from "@/components/reports/space-explorer/config";

export const CUSTOM_OVERLAY_ID = "custom";

export type OverlaySelectOption = {
  overlayId: string;
  label: string;
  description?: string;
};

export type OverlayWarningStatus = {
  category: string;
  label: string;
  ready: boolean;
  detail: string;
};

type OverlayDiagnostics = {
  activeOverlay: (typeof GAME_OVERLAY_DOCUMENTS)[number] | null;
  options: OverlaySelectOption[];
  statuses: OverlayWarningStatus[];
  missingCount: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  rooms: "Rooms",
  items: "Items",
  enemies: "Enemies",
  spells: "Spells",
  quests: "Quests",
  cutscenes: "Cutscenes",
  economy: "Economy",
  characters: "Characters",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function countByPrefix(values: string[], prefixes: readonly string[]): number {
  return values.filter((value) =>
    prefixes.some((prefix) => value.startsWith(prefix))
  ).length;
}

function countByKeyword(values: string[], keywords: readonly string[]): number {
  return values.filter((value) =>
    keywords.some((keyword) => value.toLowerCase().includes(keyword))
  ).length;
}

function extractPackPayload(payload: ActivePackPayload | null): {
  packs: Record<string, unknown>;
  schema: Record<string, unknown>;
  canonicalInstances: ReturnType<typeof extractCanonicalInstancesPatch>;
} {
  const packs = asRecord(asRecord(payload)?.packs) ?? {};
  const schemaSource =
    asRecord(packs.spaceVectors) ?? asRecord(payload) ?? ({} as Record<string, unknown>);
  return {
    packs,
    schema: extractSpaceVectorSchemaPatch(schemaSource),
    canonicalInstances: extractCanonicalInstancesPatch(schemaSource) ??
      extractCanonicalInstancesPatch(payload),
  };
}

function collectModelIds(schema: Record<string, unknown>): string[] {
  return asArray(schema.modelSchemas)
    .map((row) => asRecord(row)?.modelId)
    .filter((value): value is string => typeof value === "string");
}

function collectCanonicalModelIds(
  canonicalInstances: ReturnType<typeof extractCanonicalInstancesPatch>
): string[] {
  return [
    ...asArray(canonicalInstances?.modelInstances),
    ...asArray(canonicalInstances?.canonicalModelInstances),
  ]
    .map((row) => asRecord(row)?.modelId)
    .filter((value): value is string => typeof value === "string");
}

function summarizeCategory(
  category: string,
  payload: ReturnType<typeof extractPackPayload>
): OverlayWarningStatus {
  const { packs, schema, canonicalInstances } = payload;
  const modelIds = [
    ...collectModelIds(schema),
    ...collectCanonicalModelIds(canonicalInstances),
  ];
  const uniqueModelIds = [...new Set(modelIds)];
  const roomTemplates = asArray(asRecord(packs.roomTemplates)?.templates).length;
  const itemCount = asArray(asRecord(packs.itemPack)?.items).length;
  const questCount = asArray(asRecord(packs.questPack)?.quests).length;
  const cutsceneCount = asArray(asRecord(packs.cutscenePack)?.cutscenes).length;
  const skillCount = asArray(asRecord(packs.skillPack)?.skills).length;
  const dungeonCount = asArray(asRecord(packs.dungeonLayouts)?.dungeons).length;
  const dialogueClusterCount = asArray(asRecord(packs.dialoguePack)?.clusters).length;
  const archetypeCount = asArray(asRecord(packs.archetypePack)?.archetypes).length;
  const currencyItemCount = asArray(asRecord(packs.itemPack)?.items).filter(
    (row) => asArray(asRecord(row)?.tags).some((tag) => tag === "currency")
  ).length;

  switch (category) {
    case "rooms": {
      const roomModelCount = countByPrefix(uniqueModelIds, ["room."]);
      const ready = dungeonCount > 0 || roomTemplates > 0 || roomModelCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(dungeonCount, roomTemplates, roomModelCount)} room source(s)`
          : "No room layouts, room templates, or room models detected",
      };
    }
    case "items": {
      const itemModelCount = countByPrefix(uniqueModelIds, ["item."]);
      const ready = itemCount > 0 || itemModelCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(itemCount, itemModelCount)} item source(s)`
          : "No item pack entries or item models detected",
      };
    }
    case "enemies": {
      const enemyModelCount = countByKeyword(uniqueModelIds, [
        "enemy",
        "hostile",
        "boss",
        "monster",
      ]);
      const ready = enemyModelCount > 0 || archetypeCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(enemyModelCount, archetypeCount)} enemy source(s)`
          : "No enemy-tagged models or hostile archetypes detected",
      };
    }
    case "spells": {
      const spellModelCount = countByPrefix(uniqueModelIds, ["spell.", "skill."]);
      const ready = skillCount > 0 || spellModelCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(skillCount, spellModelCount)} spell or skill source(s)`
          : "No spell/skill pack entries or spell models detected",
      };
    }
    case "quests": {
      const questModelCount = countByPrefix(uniqueModelIds, ["quest."]);
      const ready = questCount > 0 || questModelCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(questCount, questModelCount)} quest source(s)`
          : "No quest entries or quest models detected",
      };
    }
    case "cutscenes": {
      const cutsceneModelCount = countByPrefix(uniqueModelIds, ["cutscene."]);
      const ready = cutsceneCount > 0 || cutsceneModelCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(cutsceneCount, cutsceneModelCount)} cutscene source(s)`
          : "No cutscene entries or cutscene models detected",
      };
    }
    case "economy": {
      const economyModelCount = countByKeyword(uniqueModelIds, ["currency", "economy", "shop"]);
      const ready = currencyItemCount > 0 || economyModelCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(currencyItemCount, economyModelCount)} economy source(s)`
          : "No currency-tagged items or economy models detected",
      };
    }
    case "characters": {
      const characterModelCount = countByPrefix(uniqueModelIds, ["entity.", "character."]);
      const ready =
        characterModelCount > 0 || dialogueClusterCount > 0 || archetypeCount > 0;
      return {
        category,
        label: CATEGORY_LABELS[category],
        ready,
        detail: ready
          ? `${Math.max(characterModelCount, dialogueClusterCount, archetypeCount)} character source(s)`
          : "No character models, dialogue clusters, or archetypes detected",
      };
    }
    default:
      return {
        category,
        label: CATEGORY_LABELS[category] ?? category,
        ready: true,
        detail: "No diagnostics configured",
      };
  }
}

export function getOverlayDiagnostics(
  selectedOverlayId: string,
  activePackPayload: ActivePackPayload | null
): OverlayDiagnostics {
  const options: OverlaySelectOption[] = [
    {
      overlayId: CUSTOM_OVERLAY_ID,
      label: "Custom / No Overlay",
      description: "No warnings-only game checklist applied.",
    },
    ...GAME_OVERLAY_DOCUMENTS.map((overlay) => ({
      overlayId: overlay.overlayId,
      label: overlay.label,
      description: overlay.description,
    })),
  ];
  const activeOverlay =
    GAME_OVERLAY_DOCUMENTS.find(
      (overlay) => overlay.overlayId === selectedOverlayId
    ) ?? null;
  if (!activeOverlay) {
    return {
      activeOverlay: null,
      options,
      statuses: [],
      missingCount: 0,
    };
  }

  const payload = extractPackPayload(activePackPayload);
  const statuses = activeOverlay.warningCategories.map((category: string) =>
    summarizeCategory(category, payload)
  );

  return {
    activeOverlay,
    options,
    statuses,
    missingCount: statuses.filter((status: OverlayWarningStatus) => !status.ready)
      .length,
  };
}
