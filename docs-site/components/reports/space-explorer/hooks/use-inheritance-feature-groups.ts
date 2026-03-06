import { useMemo } from "react";

type StatContentLevel = {
  modelId: string;
  featureIds: string[];
  color: string;
  colorBorder: string;
  colorSoft: string;
};

export type InheritanceFeatureGroup = {
  modelId: string;
  isBase: boolean;
  isEnabled: boolean;
  color: string;
  colorBorder: string;
  colorSoft: string;
  featureIds: string[];
};

interface UseInheritanceFeatureGroupsParams {
  activeFeatureSpace: string | null;
  runtimeSpaceFeatureIds: string[];
  statContentLevels: StatContentLevel[];
  enabledStatLevelById: Record<string, boolean>;
}

export function useInheritanceFeatureGroups({
  activeFeatureSpace,
  runtimeSpaceFeatureIds,
  statContentLevels,
  enabledStatLevelById,
}: UseInheritanceFeatureGroupsParams) {
  return useMemo(() => {
    if (!activeFeatureSpace) {
      return [] as InheritanceFeatureGroup[];
    }

    const allowed = new Set(runtimeSpaceFeatureIds);
    return statContentLevels
      .map((level, index) => {
        const featureIds = level.featureIds.filter((featureId) =>
          allowed.has(featureId)
        );
        return {
          modelId: level.modelId,
          isBase: index === 0,
          isEnabled: enabledStatLevelById[level.modelId] ?? true,
          color: level.color,
          colorBorder: level.colorBorder,
          colorSoft: level.colorSoft,
          featureIds,
        };
      })
      .filter((row) => row.featureIds.length > 0);
  }, [
    activeFeatureSpace,
    runtimeSpaceFeatureIds,
    statContentLevels,
    enabledStatLevelById,
  ]);
}
