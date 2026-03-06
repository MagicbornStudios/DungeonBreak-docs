import type { ComponentProps } from "react";
import { VisualizationSection } from "@/components/reports/space-explorer/visualization-section";

type VisualizationSectionProps = ComponentProps<typeof VisualizationSection>;

type UseSpaceVisualizationSectionPropsParams = Omit<
  VisualizationSectionProps,
  "layers"
> & {
  dimensionNodesByLayer: VisualizationSectionProps["layers"];
};

export function useSpaceVisualizationSectionProps({
  dimensionNodesByLayer,
  ...rest
}: UseSpaceVisualizationSectionPropsParams): VisualizationSectionProps {
  return {
    ...rest,
    layers: dimensionNodesByLayer,
  };
}
