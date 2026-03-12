import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { AuthoringApplyResult, AuthoringChatOperation } from "@/components/ai/authoring-chat-panel";
import {
  downloadJson,
  type BuiltBundlePayload,
  type ModelInstanceBinding,
  type RuntimeFeatureSchemaRow,
  type RuntimeModelSchemaRow,
  type SpaceVectorPackOverrides,
} from "@/components/reports/space-explorer/config";
import { normalizeModelId, slugify } from "@/lib/space-explorer-schema";
import { validatePatchSchema } from "@/components/reports/space-explorer/config";

type UseAuthoringOperationsArgs = {
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  setSpaceOverrides: Dispatch<SetStateAction<SpaceVectorPackOverrides | undefined>>;
  replaceModelInstances: (nextInstances: ModelInstanceBinding[]) => void;
  setActiveModelSelection: (modelId: string, instanceId: string | null) => void;
  draftName: string;
  setBuilderMessage: (message: string) => void;
  setBaseSpaceVectors: (next: SpaceVectorPackOverrides | undefined) => void;
};

export function useAuthoringOperations({
  runtimeFeatureSchema,
  runtimeModelSchemas,
  modelInstances,
  setSpaceOverrides,
  replaceModelInstances,
  setActiveModelSelection,
  draftName,
  setBuilderMessage,
  setBaseSpaceVectors,
}: UseAuthoringOperationsArgs) {
  return useCallback(
    async (
      operations: AuthoringChatOperation[]
    ): Promise<AuthoringApplyResult> => {
      if (!Array.isArray(operations) || operations.length === 0) {
        return { ok: false, summary: "No operations were proposed." };
      }

      const nextFeatureSchema = runtimeFeatureSchema.map((row) => ({
        ...row,
        groups: [...row.groups],
        spaces: [...row.spaces],
      }));
      const nextModelSchemas = runtimeModelSchemas.map((row) => ({
        ...row,
        featureRefs: row.featureRefs.map((ref) => ({
          ...ref,
          spaces: [...ref.spaces],
        })),
      }));
      const nextModelInstances = modelInstances.map((row) => ({ ...row }));

      const errors: string[] = [];
      const applied: string[] = [];
      let nextSelection: { modelId: string; instanceId: string | null } | null =
        null;
      let buildRequest: { patchName?: string; download?: boolean } | null =
        null;

      for (const operation of operations) {
        switch (operation.op) {
          case "add_feature_schema": {
            const featureId = slugify(operation.featureId);
            const spaces = operation.spaces
              .map((row) => row.trim())
              .filter((row) => row.length > 0);
            if (!featureId || spaces.length === 0) {
              errors.push(
                `Invalid add_feature_schema operation for '${operation.featureId}'.`
              );
              break;
            }
            const nextRow: RuntimeFeatureSchemaRow = {
              featureId,
              label: operation.label?.trim() || featureId,
              groups:
                operation.groups
                  ?.map((row) => row.trim())
                  .filter((row) => row.length > 0) ?? ["content_features"],
              spaces,
              defaultValue: Number.isFinite(operation.defaultValue)
                ? operation.defaultValue
                : 0,
            };
            const existingIndex = nextFeatureSchema.findIndex(
              (row) => row.featureId === featureId
            );
            if (existingIndex >= 0) {
              nextFeatureSchema[existingIndex] = nextRow;
            } else {
              nextFeatureSchema.push(nextRow);
            }
            applied.push(`feature:${featureId}`);
            break;
          }
          case "set_feature_default": {
            const featureId = slugify(operation.featureId);
            const featureRow = nextFeatureSchema.find(
              (row) => row.featureId === featureId
            );
            if (!featureRow) {
              errors.push(
                `Feature '${featureId}' not found for set_feature_default.`
              );
              break;
            }
            featureRow.defaultValue = operation.defaultValue;
            applied.push(`feature-default:${featureId}`);
            break;
          }
          case "create_model_schema": {
            const modelId = normalizeModelId(operation.modelId);
            if (!modelId) {
              errors.push(
                `Invalid modelId '${operation.modelId}' for create_model_schema.`
              );
              break;
            }
            if (nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(`Model '${modelId}' already exists.`);
              break;
            }
            const featureIds =
              operation.featureIds
                ?.map((row) => slugify(row))
                .filter((row) => row.length > 0) ??
              nextFeatureSchema.slice(0, 4).map((row) => row.featureId);
            const dedupedFeatureIds = [...new Set(featureIds)];
            if (dedupedFeatureIds.length === 0) {
              errors.push(`Model '${modelId}' has no feature refs.`);
              break;
            }
            const defaultSpaces = operation.spaces
              ?.map((row) => row.trim())
              .filter((row) => row.length > 0);
            const featureRefs = dedupedFeatureIds
              .map((featureId) => {
                const featureRow = nextFeatureSchema.find(
                  (row) => row.featureId === featureId
                );
                if (!featureRow) return null;
                return {
                  featureId,
                  spaces:
                    defaultSpaces && defaultSpaces.length > 0
                      ? [...defaultSpaces]
                      : [...featureRow.spaces],
                  required: false,
                  defaultValue: featureRow.defaultValue,
                };
              })
              .filter((row): row is NonNullable<typeof row> => Boolean(row));
            if (featureRefs.length === 0) {
              errors.push(
                `Model '${modelId}' only referenced unknown features.`
              );
              break;
            }
            nextModelSchemas.push({
              modelId,
              label: operation.label?.trim() || modelId,
              description:
                operation.description?.trim() ||
                `Created via authoring chat (${new Date().toISOString()})`,
              extendsModelId: operation.extendsModelId
                ? normalizeModelId(operation.extendsModelId)
                : undefined,
              featureRefs,
            });
            nextSelection = { modelId, instanceId: null };
            applied.push(`model:${modelId}`);
            break;
          }
          case "update_model_metadata": {
            const modelId = normalizeModelId(operation.modelId);
            const modelRow = nextModelSchemas.find(
              (row) => row.modelId === modelId
            );
            if (!modelRow) {
              errors.push(
                `Model '${modelId}' not found for update_model_metadata.`
              );
              break;
            }
            if (operation.label)
              modelRow.label = operation.label.trim() || modelRow.label;
            if (operation.description)
              modelRow.description = operation.description.trim();
            applied.push(`model-metadata:${modelId}`);
            break;
          }
          case "add_model_feature_ref": {
            const modelId = normalizeModelId(operation.modelId);
            const featureId = slugify(operation.featureId);
            const modelRow = nextModelSchemas.find(
              (row) => row.modelId === modelId
            );
            const featureRow = nextFeatureSchema.find(
              (row) => row.featureId === featureId
            );
            if (!modelRow || !featureRow) {
              errors.push(
                `Could not add feature ref '${featureId}' to model '${modelId}'.`
              );
              break;
            }
            const existingRef = modelRow.featureRefs.find(
              (ref) => ref.featureId === featureId
            );
            const spaces = operation.spaces
              ?.map((row) => row.trim())
              .filter((row) => row.length > 0);
            if (existingRef) {
              existingRef.spaces =
                spaces && spaces.length > 0 ? spaces : existingRef.spaces;
              if (typeof operation.required === "boolean")
                existingRef.required = operation.required;
              if (Number.isFinite(operation.defaultValue))
                existingRef.defaultValue = operation.defaultValue;
            } else {
              modelRow.featureRefs.push({
                featureId,
                spaces:
                  spaces && spaces.length > 0 ? spaces : [...featureRow.spaces],
                required: operation.required ?? false,
                defaultValue: Number.isFinite(operation.defaultValue)
                  ? operation.defaultValue
                  : featureRow.defaultValue,
              });
            }
            applied.push(`model-feature:${modelId}.${featureId}`);
            break;
          }
          case "remove_model_feature_ref": {
            const modelId = normalizeModelId(operation.modelId);
            const featureId = slugify(operation.featureId);
            const modelRow = nextModelSchemas.find(
              (row) => row.modelId === modelId
            );
            if (!modelRow) {
              errors.push(
                `Model '${modelId}' not found for remove_model_feature_ref.`
              );
              break;
            }
            modelRow.featureRefs = modelRow.featureRefs.filter(
              (row) => row.featureId !== featureId
            );
            applied.push(`remove-model-feature:${modelId}.${featureId}`);
            break;
          }
          case "create_canonical_asset": {
            const modelId = normalizeModelId(operation.modelId);
            if (!nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(
                `Model '${modelId}' not found for create_canonical_asset.`
              );
              break;
            }
            const base = modelId.replace(/\./g, "_");
            const index =
              nextModelInstances.filter((row) => row.modelId === modelId)
                .length + 1;
            nextModelInstances.push({
              id: `${base}-asset-${Date.now()}-${index}`,
              name:
                operation.name?.trim() ||
                `${modelId.split(".")[0] ?? "asset"}_asset_${index}`,
              modelId,
              canonical: true,
            });
            applied.push(`canonical-asset:${modelId}`);
            break;
          }
          case "rename_model_instance": {
            const row = nextModelInstances.find(
              (item) => item.id === operation.instanceId
            );
            if (!row) {
              errors.push(
                `Model instance '${operation.instanceId}' not found for rename_model_instance.`
              );
              break;
            }
            const nextName = operation.name.trim();
            if (!nextName) {
              errors.push(
                `Model instance '${operation.instanceId}' rename cannot be empty.`
              );
              break;
            }
            row.name = nextName;
            applied.push(`rename-instance:${operation.instanceId}`);
            break;
          }
          case "set_canonical_state": {
            const row = nextModelInstances.find(
              (item) => item.id === operation.instanceId
            );
            if (!row) {
              errors.push(
                `Model instance '${operation.instanceId}' not found for set_canonical_state.`
              );
              break;
            }
            row.canonical = operation.canonical;
            applied.push(`canonical-state:${operation.instanceId}`);
            break;
          }
          case "set_active_selection": {
            const modelId = normalizeModelId(operation.modelId);
            if (!nextModelSchemas.some((row) => row.modelId === modelId)) {
              errors.push(
                `Model '${modelId}' not found for set_active_selection.`
              );
              break;
            }
            const instanceId = operation.instanceId ?? null;
            if (
              instanceId &&
              !nextModelInstances.some((row) => row.id === instanceId)
            ) {
              errors.push(
                `Instance '${instanceId}' not found for set_active_selection.`
              );
              break;
            }
            nextSelection = { modelId, instanceId };
            applied.push(`select:${modelId}`);
            break;
          }
          case "build_bundle":
            buildRequest = {
              patchName: operation.patchName,
              download: operation.download,
            };
            applied.push("build-bundle");
            break;
          default:
            errors.push("Unsupported operation.");
        }
      }

      setSpaceOverrides((prev) => ({
        ...(prev ?? {}),
        featureSchema: nextFeatureSchema,
        modelSchemas: nextModelSchemas,
        contentBindings: {
          ...((
            prev as { contentBindings?: Record<string, unknown> } | undefined
          )?.contentBindings ?? {}),
          modelInstances: nextModelInstances,
          canonicalModelInstances: nextModelInstances.filter(
            (row) => row.canonical
          ),
        },
      }));
      replaceModelInstances(nextModelInstances);
      if (nextSelection) {
        setActiveModelSelection(
          nextSelection.modelId,
          nextSelection.instanceId
        );
      }

      const validationErrors = validatePatchSchema({
        featureSchema: nextFeatureSchema,
        modelSchemas: nextModelSchemas,
      });

      if (buildRequest && validationErrors.length === 0) {
        try {
          const patchName =
            buildRequest.patchName?.trim() ||
            draftName.trim() ||
            "space-vectors.patch";
          const response = await fetch("/api/content-packs/build-bundle", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              patchName,
              spaceVectorsPatch: {
                featureSchema: nextFeatureSchema,
                modelSchemas: nextModelSchemas,
                contentBindings: {
                  modelInstances: nextModelInstances,
                  canonicalModelInstances: nextModelInstances.filter(
                    (row) => row.canonical
                  ),
                },
              },
            }),
          });
          const body = (await response.json()) as {
            ok: boolean;
            bundle?: BuiltBundlePayload;
            manifest?: {
              canonicalAssets?: unknown[];
              models?: unknown[];
              features?: unknown[];
            };
            error?: string;
          };
          if (!body.ok || !body.bundle) {
            errors.push(body.error ?? "Bundle build failed.");
          } else {
            const canonicalCount = Array.isArray(body.manifest?.canonicalAssets)
              ? body.manifest.canonicalAssets.length
              : 0;
            const modelCount = Array.isArray(body.manifest?.models)
              ? body.manifest.models.length
              : nextModelSchemas.length;
            const featureCount = Array.isArray(body.manifest?.features)
              ? body.manifest.features.length
              : nextFeatureSchema.length;
            setBuilderMessage(
              `Chat bundle build complete: models ${modelCount}, features ${featureCount}, canonical assets ${canonicalCount}.`
            );
            if (buildRequest.download) {
              const outName = `${slugify(patchName)}.content-pack.bundle.v1.json`;
              downloadJson(outName, body.bundle);
              if (body.manifest) {
                downloadJson(
                  `${slugify(patchName)}.content-pack.manifest.v1.json`,
                  body.manifest
                );
              }
            }
            const overrides = body.bundle.packs?.spaceVectors;
            if (overrides && typeof overrides === "object") {
              setBaseSpaceVectors(overrides);
            }
          }
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      } else if (buildRequest && validationErrors.length > 0) {
        errors.push(
          `Bundle build skipped due to validation errors (${validationErrors.length}).`
        );
      }

      if (errors.length > 0) {
        return {
          ok: false,
          summary: `Applied ${applied.length} operation(s) with ${errors.length} issue(s).`,
          validationErrors: [...validationErrors, ...errors],
        };
      }
      return {
        ok: true,
        summary: `Applied ${applied.length} operation(s).`,
        validationErrors,
      };
    },
    [
      runtimeFeatureSchema,
      runtimeModelSchemas,
      modelInstances,
      setSpaceOverrides,
      replaceModelInstances,
      setActiveModelSelection,
      draftName,
      setBuilderMessage,
      setBaseSpaceVectors,
    ]
  );
}
