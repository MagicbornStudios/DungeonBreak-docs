import { useShallow } from "zustand/react/shallow";
import { useModelSchemaViewerStore } from "@/components/reports/space-explorer/stores/model-schema-viewer-store";

export function useSpaceModelSchemaViewerState() {
  return useModelSchemaViewerStore(
    useShallow((state) => ({
      modelInstances: state.modelInstances,
      replaceModelInstances: state.replaceModelInstances,
      activeModelSchemaId: state.activeModelSchemaId,
      activeModelInstanceId: state.activeModelInstanceId,
      setActiveModelSelection: state.setActiveSelection,
    }))
  );
}
