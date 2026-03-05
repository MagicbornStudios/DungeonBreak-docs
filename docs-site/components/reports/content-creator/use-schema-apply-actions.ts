"use client";

import { useCallback } from "react";
import {
  buildSchemaVersionSnapshot,
  hasSchemaSnapshotChangedForSections,
  validateCanonicalAssets,
  validateModelSchemaRows,
  type SchemaVersionSnapshot,
} from "@/components/reports/content-creator/schema-versioning";
import {
  parseCanonicalAssets,
  parseModelSchemaRows,
} from "@/components/reports/content-creator/schema-json-utils";

type FeatureRef = {
  featureId: string;
  spaces: string[];
  required?: boolean;
  defaultValue?: number;
};

type RuntimeModelSchemaRow = {
  modelId: string;
  label: string;
  description?: string;
  extendsModelId?: string;
  attachedStatModelIds?: string[];
  featureRefs: FeatureRef[];
};

type ModelInstanceBinding = {
  id: string;
  name: string;
  modelId: string;
  canonical: boolean;
};

type UseSchemaApplyActionsParams = {
  modelsSchemaDraft: string;
  statsSchemaDraft: string;
  canonicalSchemaDraft: string;
  currentSchemaSnapshot: SchemaVersionSnapshot;
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  normalizeModelId: (value: string) => string;
  formatModelIdForUi: (value: string) => string;
  onReplaceModelSchemas: (models: RuntimeModelSchemaRow[]) => void;
  onReplaceCanonicalAssets: (assets: ModelInstanceBinding[]) => void;
  onSetJsonApplyError: (next: string) => void;
};

export function useSchemaApplyActions({
  modelsSchemaDraft,
  statsSchemaDraft,
  canonicalSchemaDraft,
  currentSchemaSnapshot,
  runtimeModelSchemas,
  normalizeModelId,
  formatModelIdForUi,
  onReplaceModelSchemas,
  onReplaceCanonicalAssets,
  onSetJsonApplyError,
}: UseSchemaApplyActionsParams) {
  const applyModelsAndStatsSchemaDraft = useCallback(() => {
    try {
      const parsedModels = parseModelSchemaRows(modelsSchemaDraft, "models", normalizeModelId).filter(
        (row) => !row.modelId.endsWith("stats"),
      );
      const parsedStats = parseModelSchemaRows(statsSchemaDraft, "stats", normalizeModelId).map((row) => ({
        ...row,
        modelId: row.modelId.endsWith("stats") ? row.modelId : `${row.modelId}stats`,
      }));
      const nextRows = [...parsedStats, ...parsedModels];
      const nextSnapshot = buildSchemaVersionSnapshot({
        modelsJson: modelsSchemaDraft,
        statsJson: statsSchemaDraft,
        canonicalJson: canonicalSchemaDraft,
      });
      if (
        !hasSchemaSnapshotChangedForSections(currentSchemaSnapshot, nextSnapshot, [
          "models",
          "stats",
        ])
      ) {
        onSetJsonApplyError("No schema changes detected.");
        return;
      }
      const validationErrors = validateModelSchemaRows(nextRows);
      if (validationErrors.length > 0) {
        onSetJsonApplyError(validationErrors.join(" "));
        return;
      }
      onReplaceModelSchemas(nextRows);
      onSetJsonApplyError("");
    } catch (error) {
      onSetJsonApplyError(error instanceof Error ? error.message : "Failed to apply schema JSON.");
    }
  }, [
    canonicalSchemaDraft,
    currentSchemaSnapshot,
    modelsSchemaDraft,
    normalizeModelId,
    onReplaceModelSchemas,
    onSetJsonApplyError,
    statsSchemaDraft,
  ]);

  const applyCanonicalSchemaDraft = useCallback(() => {
    try {
      const assets = parseCanonicalAssets(canonicalSchemaDraft, normalizeModelId, formatModelIdForUi);
      const nextSnapshot = buildSchemaVersionSnapshot({
        modelsJson: modelsSchemaDraft,
        statsJson: statsSchemaDraft,
        canonicalJson: canonicalSchemaDraft,
      });
      if (
        !hasSchemaSnapshotChangedForSections(currentSchemaSnapshot, nextSnapshot, [
          "canonical",
        ])
      ) {
        onSetJsonApplyError("No schema changes detected.");
        return;
      }
      const validationErrors = validateCanonicalAssets(
        assets,
        new Set(runtimeModelSchemas.map((row) => row.modelId)),
      );
      if (validationErrors.length > 0) {
        onSetJsonApplyError(validationErrors.join(" "));
        return;
      }
      onReplaceCanonicalAssets(assets);
      onSetJsonApplyError("");
    } catch (error) {
      onSetJsonApplyError(error instanceof Error ? error.message : "Failed to apply canonical JSON.");
    }
  }, [
    canonicalSchemaDraft,
    currentSchemaSnapshot,
    formatModelIdForUi,
    modelsSchemaDraft,
    normalizeModelId,
    onReplaceCanonicalAssets,
    onSetJsonApplyError,
    runtimeModelSchemas,
    statsSchemaDraft,
  ]);

  return {
    applyModelsAndStatsSchemaDraft,
    applyCanonicalSchemaDraft,
  };
}
