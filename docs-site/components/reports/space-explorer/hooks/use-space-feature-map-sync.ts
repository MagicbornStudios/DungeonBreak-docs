import { useEffect } from "react";
import { type ContentSpaceKey } from "@/lib/space-explorer-runtime";
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

    setSpaceFeatureMap((prev) => {
      const nextCombined = [...new Set(combinedIds)];
      const nextDialogue = nextCombined;
      const nextSkill = nextCombined;
      const nextArchetype = nextCombined;
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
