import type { ComponentProps, Dispatch, SetStateAction } from "react";
import { SpaceExplorerHeader } from "@/components/reports/space-explorer/space-explorer-header";

type HeaderProps = ComponentProps<typeof SpaceExplorerHeader>;

type UseSpaceExplorerHeaderPropsParams = Omit<
  HeaderProps,
  | "onOpenContentCreator"
  | "onRunQuickTestMode"
  | "onPublishDelivery"
  | "onPullDelivery"
  | "onExportGeneratedOutputs"
> & {
  setModelSchemaModalOpen: Dispatch<SetStateAction<boolean>>;
  runQuickTestMode: () => Promise<void> | void;
  publishDeliveryVersion: () => Promise<void> | void;
  pullDeliveryVersion: () => Promise<void> | void;
  exportGeneratedOutputs: () => void;
};

export function useSpaceExplorerHeaderProps({
  setModelSchemaModalOpen,
  runQuickTestMode,
  publishDeliveryVersion,
  pullDeliveryVersion,
  exportGeneratedOutputs,
  ...rest
}: UseSpaceExplorerHeaderPropsParams): HeaderProps {
  return {
    ...rest,
    onOpenContentCreator: () => setModelSchemaModalOpen(true),
    onRunQuickTestMode: () => {
      void runQuickTestMode();
    },
    onPublishDelivery: () => {
      void publishDeliveryVersion();
    },
    onPullDelivery: () => {
      void pullDeliveryVersion();
    },
    onExportGeneratedOutputs: exportGeneratedOutputs,
  };
}
