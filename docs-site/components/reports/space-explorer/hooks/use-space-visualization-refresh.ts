import { useCallback, type Dispatch, type SetStateAction } from "react";
import { recomputeSpaceData } from "@/lib/space-recompute";
import type { SpaceData } from "@/components/reports/space-explorer/config";

interface UseSpaceVisualizationRefreshParams {
  data: SpaceData;
  visualizationScope: "content-pack";
  setVizRefreshTick: Dispatch<SetStateAction<number>>;
  setVizRefreshedAt: Dispatch<SetStateAction<string | null>>;
  setData: Dispatch<SetStateAction<SpaceData>>;
}

export function useSpaceVisualizationRefresh({
  data,
  visualizationScope,
  setVizRefreshTick,
  setVizRefreshedAt,
  setData,
}: UseSpaceVisualizationRefreshParams) {
  return useCallback(() => {
    setVizRefreshTick((tick) => tick + 1);
    setVizRefreshedAt(new Date().toLocaleTimeString());
    if (visualizationScope === "content-pack") {
      return;
    }
    if (!data?.content?.length) return;
    const next = recomputeSpaceData(
      data.content.map((point) => ({
        type: point.type,
        id: point.id,
        name: point.name,
        branch: point.branch,
        vector: point.vector,
        vectorCombined: point.vectorCombined,
        unlockRadius: point.unlockRadius,
      })),
      data.traitNames ?? []
    ) as SpaceData;
    setData(next);
  }, [data, visualizationScope, setVizRefreshTick, setVizRefreshedAt, setData]);
}
