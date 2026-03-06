import { useMemo } from "react";
import type { ReportData } from "@/lib/space-explorer-shared";
import type {
  RuntimeFeatureSchemaRow,
  RuntimeModelSchemaRow,
} from "@/components/reports/space-explorer/config";

type CanonicalAssetOption = {
  id: string;
  name: string;
  modelId: string;
};

interface UseSpaceAuthoringChatContextParams {
  activeModelSchemaId: string;
  activeModelInstanceId: string | null;
  runtimeSpaceView: string;
  selectedTurn: number;
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  canonicalAssetOptions: CanonicalAssetOption[];
  report: ReportData | null;
  selectedModelForSpaceViewId: string;
  patchValidationErrors: string[];
}

export function useSpaceAuthoringChatContext({
  activeModelSchemaId,
  activeModelInstanceId,
  runtimeSpaceView,
  selectedTurn,
  runtimeModelSchemas,
  runtimeFeatureSchema,
  canonicalAssetOptions,
  report,
  selectedModelForSpaceViewId,
  patchValidationErrors,
}: UseSpaceAuthoringChatContextParams) {
  return useMemo(
    () => ({
      activeModelSchemaId,
      activeModelInstanceId,
      activeSpaceView: runtimeSpaceView,
      selectedTurn,
      modelSchemaCount: runtimeModelSchemas.length,
      featureSchemaCount: runtimeFeatureSchema.length,
      canonicalAssetCount: canonicalAssetOptions.length,
      reportLoaded: Boolean(report),
      selectedModel: selectedModelForSpaceViewId || "none",
      modelIds: runtimeModelSchemas.map((row) => row.modelId),
      featureIds: runtimeFeatureSchema.map((row) => row.featureId),
      canonicalAssets: canonicalAssetOptions.map((row) => ({
        id: row.id,
        name: row.name,
        modelId: row.modelId,
      })),
      validationErrors: patchValidationErrors,
    }),
    [
      activeModelSchemaId,
      activeModelInstanceId,
      runtimeSpaceView,
      selectedTurn,
      runtimeModelSchemas,
      runtimeFeatureSchema,
      canonicalAssetOptions,
      report,
      selectedModelForSpaceViewId,
      patchValidationErrors,
    ]
  );
}
