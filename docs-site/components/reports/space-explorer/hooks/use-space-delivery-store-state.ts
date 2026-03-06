import { useShallow } from "zustand/react/shallow";
import { useContentDeliveryStore } from "@/components/reports/space-explorer/stores/content-delivery-store";

export function useSpaceDeliveryStoreState() {
  return useContentDeliveryStore(
    useShallow((state) => ({
      deliveryBusy: state.busy,
      deliveryVersionDraft: state.versionDraft,
      deliveryPluginVersion: state.pluginVersion,
      deliveryRuntimeVersion: state.runtimeVersion,
      deliverySelection: state.selection,
      lastPublishedVersion: state.lastPublishedVersion,
      lastPulledVersion: state.lastPulledVersion,
      setDeliveryBusy: state.setBusy,
      setDeliveryVersionDraft: state.setVersionDraft,
      setDeliveryPluginVersion: state.setPluginVersion,
      setDeliveryRuntimeVersion: state.setRuntimeVersion,
      setDeliverySelection: state.setSelection,
      setLastPublishedVersion: state.setLastPublishedVersion,
      setLastPulledVersion: state.setLastPulledVersion,
    }))
  );
}
