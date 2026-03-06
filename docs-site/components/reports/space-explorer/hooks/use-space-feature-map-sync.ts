import { useEffect } from "react";
import { CONTENT_SPACE_KEYS, type ContentSpaceKey } from "@/lib/space-explorer-runtime";
import type { RuntimeFeatureSchemaRow } from "@/components/reports/space-explorer/config";

type SetSpaceFeatureMap = (
  next:
    | Record<ContentSpaceKey, string[]>
    | ((prev: Record<ContentSpaceKey, string[]>) => Record<ContentSpaceKey, string[]>)
) => void;

interface UseSpaceFeatureMapSyncParams {
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  setSpaceFeatureMap: SetSpaceFeatureMap;
}

export function useSpaceFeatureMapSync({
  runtimeFeatureSchema,
  setSpaceFeatureMap,
}: UseSpaceFeatureMapSyncParams) {
  useEffect(() => {
    const combinedIds = runtimeFeatureSchema.map((row) => row.featureId);
    const bySpace = new Map<ContentSpaceKey, string[]>(
      CONTENT_SPACE_KEYS.map((space) => [space, []])
    );

    for (const row of runtimeFeatureSchema) {
      for (const spaceId of row.spaces ?? []) {
        if (!CONTENT_SPACE_KEYS.includes(spaceId as ContentSpaceKey)) continue;
        const key = spaceId as ContentSpaceKey;
        const current = bySpace.get(key) ?? [];
        if (!current.includes(row.featureId)) {
          bySpace.set(key, [...current, row.featureId]);
        }
      }
    }

    setSpaceFeatureMap((prev) => {
      const nextCombined = [...new Set(combinedIds)];
      const nextDialogue = bySpace.get("content-dialogue") ?? [];
      const nextSkill = bySpace.get("content-skill") ?? [];
      const nextArchetype = bySpace.get("content-archetype") ?? [];
      const unchanged =
        JSON.stringify(prev["content-combined"] ?? []) ===
          JSON.stringify(nextCombined) &&
        JSON.stringify(prev["content-dialogue"] ?? []) ===
          JSON.stringify(nextDialogue) &&
        JSON.stringify(prev["content-skill"] ?? []) ===
          JSON.stringify(nextSkill) &&
        JSON.stringify(prev["content-archetype"] ?? []) ===
          JSON.stringify(nextArchetype);
      if (unchanged) return prev;
      return {
        ...prev,
        "content-combined": nextCombined,
        "content-dialogue": nextDialogue,
        "content-skill": nextSkill,
        "content-archetype": nextArchetype,
      };
    });
  }, [runtimeFeatureSchema, setSpaceFeatureMap]);
}
