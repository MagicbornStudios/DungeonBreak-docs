import { useShallow } from "zustand/react/shallow";
import { useSpaceExplorerUiStore } from "@/components/reports/space-explorer/stores/ui-store";

export function useSpaceUiControls() {
  return useSpaceExplorerUiStore(
    useShallow((state) => ({
      vizMode: state.vizMode,
      setVizMode: state.setVizMode,
      distanceAlgorithm: state.distanceAlgorithm,
      setDistanceAlgorithm: state.setDistanceAlgorithm,
      nearestK: state.nearestK,
      setNearestK: state.setNearestK,
      runtimeSpaceView: state.runtimeSpaceView,
      setRuntimeSpaceView: state.setRuntimeSpaceView,
      spaceFeatureMap: state.spaceFeatureMap,
      setSpaceFeatureMap: state.setSpaceFeatureMap,
      customFeatureValues: state.customFeatureValues,
      setCustomFeatureValues: state.setCustomFeatureValues,
      customFeatureLabels: state.customFeatureLabels,
      setCustomFeatureLabels: state.setCustomFeatureLabels,
      scopeRootModelId: state.scopeRootModelId,
      setScopeRootModelId: state.setScopeRootModelId,
      hiddenModelIds: state.hiddenModelIds,
      setHiddenModelIds: state.setHiddenModelIds,
    }))
  );
}
