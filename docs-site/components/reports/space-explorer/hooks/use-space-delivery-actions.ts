import { type Dispatch, type SetStateAction, useCallback, useMemo } from "react";
import { analyzeReport } from "@/lib/playthrough-analyzer";
import { runPlaythrough } from "@/lib/playthrough-runner";
import { parseModelInstancesFromContentBindings, slugify } from "@/lib/space-explorer-schema";
import type { ActionTraceEntry, DeliveryPullResponse, DeliveryVersionRecord, PackIdentity, ReportData } from "@/lib/space-explorer-shared";
import { downloadJson, validatePatchSchema, type BuiltBundlePayload, type ModelInstanceBinding, type PatchDraft, type ReportIdentity, type RuntimeFeatureSchemaRow, type RuntimeModelSchemaRow, type SpaceVectorPackOverrides } from "@/components/reports/space-explorer/config";

interface UseSpaceDeliveryActionsParams {
  draftName: string;
  setDrafts: Dispatch<SetStateAction<PatchDraft[]>>;
  draftsCount: number;
  setBuilderMessage: Dispatch<SetStateAction<string>>;
  setBundleBusy: Dispatch<SetStateAction<boolean>>;
  setQuickTestBusy: Dispatch<SetStateAction<boolean>>;
  setPipelineLoading: Dispatch<SetStateAction<boolean>>;
  setTestModeGeneratedAt: Dispatch<SetStateAction<string | null>>;
  testModeAllowed: boolean;
  reportPolicyId: string;
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  modelInstances: ModelInstanceBinding[];
  baseSpaceVectors: SpaceVectorPackOverrides | undefined;
  selectedPresetId: string;
  presets: Array<{ id: string; label: string; model: RuntimeModelSchemaRow }>;
  setSpaceOverrides: Dispatch<SetStateAction<SpaceVectorPackOverrides | undefined>>;
  replaceModelInstances: (instances: ModelInstanceBinding[]) => void;
  setBaseSpaceVectors: Dispatch<SetStateAction<SpaceVectorPackOverrides | undefined>>;
  persistActivePackSnapshot: (identity: PackIdentity, bundle?: Record<string, unknown>) => void;
  setLoadedPackIdentity: Dispatch<SetStateAction<PackIdentity | null>>;
  setLoadedReportIdentity: Dispatch<SetStateAction<ReportIdentity | null>>;
  setReport: Dispatch<SetStateAction<ReportData | null>>;
  setSelectedTurn: Dispatch<SetStateAction<number>>;
  setTestModeEnabled: (enabled: boolean) => void;
  deliveryVersionDraft: string;
  deliveryPluginVersion: string;
  deliveryRuntimeVersion: string;
  setDeliveryBusy: (busy: boolean) => void;
  setLastPublishedVersion: (version: string) => void;
  setLastPulledVersion: (version: string) => void;
  setDeliverySelection: (selection: DeliveryPullResponse | null) => void;
}

export function useSpaceDeliveryActions({
  draftName,
  setDrafts,
  draftsCount,
  setBuilderMessage,
  setBundleBusy,
  setQuickTestBusy,
  setPipelineLoading,
  setTestModeGeneratedAt,
  testModeAllowed,
  reportPolicyId,
  runtimeFeatureSchema,
  runtimeModelSchemas,
  modelInstances,
  baseSpaceVectors,
  selectedPresetId,
  presets,
  setSpaceOverrides,
  replaceModelInstances,
  setBaseSpaceVectors,
  persistActivePackSnapshot,
  setLoadedPackIdentity,
  setLoadedReportIdentity,
  setReport,
  setSelectedTurn,
  setTestModeEnabled,
  deliveryVersionDraft,
  deliveryPluginVersion,
  deliveryRuntimeVersion,
  setDeliveryBusy,
  setLastPublishedVersion,
  setLastPulledVersion,
  setDeliverySelection,
}: UseSpaceDeliveryActionsParams) {
  const patchValidationErrors = useMemo(
    () =>
      validatePatchSchema({
        featureSchema: runtimeFeatureSchema,
        modelSchemas: runtimeModelSchemas,
      }),
    [runtimeFeatureSchema, runtimeModelSchemas]
  );

  const diffSummary = useMemo(() => {
    const baseFeatures = new Set(
      (
        (baseSpaceVectors?.featureSchema as RuntimeFeatureSchemaRow[] | undefined) ?? []
      ).map((row) => row.featureId)
    );
    const currentFeatures = new Set(runtimeFeatureSchema.map((row) => row.featureId));
    const baseModels = new Set(
      (
        (baseSpaceVectors?.modelSchemas as RuntimeModelSchemaRow[] | undefined) ?? []
      ).map((row) => row.modelId)
    );
    const currentModels = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const featureAdded = [...currentFeatures].filter((id) => !baseFeatures.has(id)).length;
    const featureRemoved = [...baseFeatures].filter((id) => !currentFeatures.has(id)).length;
    const modelAdded = [...currentModels].filter((id) => !baseModels.has(id)).length;
    const modelRemoved = [...baseModels].filter((id) => !currentModels.has(id)).length;
    return { featureAdded, featureRemoved, modelAdded, modelRemoved };
  }, [baseSpaceVectors, runtimeFeatureSchema, runtimeModelSchemas]);

  const applyPreset = useCallback(() => {
    const preset = presets.find((row) => row.id === selectedPresetId);
    if (!preset) return;
    const presetModel = preset.model;
    const current = runtimeModelSchemas.filter((model) => model.modelId !== presetModel.modelId);
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      modelSchemas: [...current, presetModel],
    }));
    setBuilderMessage(`Applied preset: ${preset.label}`);
  }, [presets, selectedPresetId, runtimeModelSchemas, setSpaceOverrides, setBuilderMessage]);

  const saveDraft = useCallback(() => {
    const name = draftName.trim() || `space-vectors-draft-${draftsCount + 1}`;
    const draft: PatchDraft = {
      id: `${slugify(name)}-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      patch: {
        featureSchema: runtimeFeatureSchema,
        modelSchemas: runtimeModelSchemas,
      },
    };
    setDrafts((prev) => [draft, ...prev].slice(0, 30));
    setBuilderMessage(`Saved draft: ${name}`);
  }, [draftName, draftsCount, runtimeFeatureSchema, runtimeModelSchemas, setDrafts, setBuilderMessage]);

  const loadDraft = useCallback((draft: PatchDraft) => {
    setSpaceOverrides((prev) => ({
      ...(prev ?? {}),
      featureSchema: draft.patch.featureSchema,
      modelSchemas: draft.patch.modelSchemas,
    }));
    setBuilderMessage(`Loaded draft: ${draft.name}`);
  }, [setSpaceOverrides, setBuilderMessage]);

  const deleteDraft = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((row) => row.id !== draftId));
  }, [setDrafts]);

  const downloadReleaseBundle = useCallback(async () => {
    if (patchValidationErrors.length > 0) {
      setBuilderMessage("Fix validation errors before building full bundle.");
      return;
    }
    setBundleBusy(true);
    try {
      const response = await fetch("/api/content-packs/build-bundle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patchName: draftName.trim() || "space-vectors.patch",
          spaceVectorsPatch: {
            featureSchema: runtimeFeatureSchema,
            modelSchemas: runtimeModelSchemas,
            contentBindings: {
              modelInstances,
              canonicalModelInstances: modelInstances.filter((row) => row.canonical),
            },
          },
        }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        bundle?: unknown;
        manifest?: unknown;
        error?: string;
      };
      if (!body.ok || !body.bundle) {
        setBuilderMessage(body.error ?? "Bundle build failed.");
        return;
      }
      const outName = `${slugify(draftName.trim() || "space-vectors")}.content-pack.bundle.v1.json`;
      downloadJson(outName, body.bundle);
      if (body.manifest) {
        const manifestName = `${slugify(draftName.trim() || "space-vectors")}.content-pack.manifest.v1.json`;
        downloadJson(manifestName, body.manifest);
      }
      setBuilderMessage(`Built and downloaded full bundle: ${outName}`);
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBundleBusy(false);
    }
  }, [patchValidationErrors.length, setBuilderMessage, setBundleBusy, draftName, runtimeFeatureSchema, runtimeModelSchemas, modelInstances]);

  const runQuickTestMode = useCallback(async () => {
    if (!testModeAllowed) {
      setBuilderMessage("Test mode is only available in development.");
      return;
    }
    if (patchValidationErrors.length > 0) {
      setBuilderMessage("Fix validation errors before running test mode.");
      return;
    }
    setQuickTestBusy(true);
    setPipelineLoading(true);
    setTestModeGeneratedAt(null);
    try {
      const response = await fetch("/api/content-packs/build-bundle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patchName: `test-mode-${slugify(draftName.trim() || "content-schema")}`,
          spaceVectorsPatch: {
            featureSchema: runtimeFeatureSchema,
            modelSchemas: runtimeModelSchemas,
            contentBindings: {
              modelInstances,
              canonicalModelInstances: modelInstances.filter((row) => row.canonical),
            },
          },
        }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        bundle?: BuiltBundlePayload;
        error?: string;
      };
      if (!body.ok || !body.bundle) {
        setBuilderMessage(body.error ?? "Failed to build test mode bundle.");
        return;
      }
      const bundle = body.bundle;
      const overrides = bundle.packs?.spaceVectors;
      if (overrides) {
        setSpaceOverrides(overrides);
        setBaseSpaceVectors(overrides);
        const instances = parseModelInstancesFromContentBindings(overrides);
        if (instances.length > 0) {
          replaceModelInstances(instances);
        }
      }
      const identity: PackIdentity = {
        source: "test-mode:space-explorer",
        packId: String(bundle.patchName ?? "test-mode.content-pack.bundle.v1"),
        packVersion: String(bundle.generatedAt ?? new Date().toISOString()),
        packHash: String(bundle.hashes?.overall ?? "unknown"),
        schemaVersion: String(bundle.schemaVersion ?? "content-pack.bundle.v1"),
        engineVersion: String(bundle.enginePackage?.version ?? "unknown"),
      };
      setLoadedPackIdentity(identity);
      persistActivePackSnapshot(identity, bundle as Record<string, unknown>);
      setLoadedReportIdentity({
        source: "test-mode:browser-playthrough",
        packId: identity.packId,
        packVersion: identity.packVersion,
        packHash: identity.packHash,
        schemaVersion: identity.schemaVersion,
        engineVersion: identity.engineVersion,
      });
      const report = runPlaythrough(undefined, 75, undefined, reportPolicyId);
      const reportWithBinding = {
        ...report,
        packBinding: {
          packId: identity.packId,
          packVersion: identity.packVersion,
          packHash: identity.packHash,
          schemaVersion: identity.schemaVersion,
          engineVersion: identity.engineVersion,
        },
      };
      const analysis = analyzeReport(reportWithBinding as Parameters<typeof analyzeReport>[0]);
      try {
        sessionStorage.setItem(
          "dungeonbreak-browser-report",
          JSON.stringify({ report: reportWithBinding, analysis })
        );
      } catch {
        // ignore session storage failures
      }
      setReport({
        seed: report.seed,
        run: {
          actionTrace: report.run.actionTrace as ActionTraceEntry[],
        },
      });
      setSelectedTurn(0);
      setTestModeEnabled(true);
      setTestModeGeneratedAt(new Date().toISOString());
      setBuilderMessage("Test mode complete: bundle built, report generated, and visualization bound to fresh object content.");
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPipelineLoading(false);
      setQuickTestBusy(false);
    }
  }, [testModeAllowed, patchValidationErrors.length, setBuilderMessage, setQuickTestBusy, setPipelineLoading, setTestModeGeneratedAt, draftName, runtimeFeatureSchema, runtimeModelSchemas, modelInstances, setSpaceOverrides, setBaseSpaceVectors, replaceModelInstances, setLoadedPackIdentity, persistActivePackSnapshot, setLoadedReportIdentity, reportPolicyId, setReport, setSelectedTurn, setTestModeEnabled]);

  const publishDeliveryVersion = useCallback(async () => {
    if (patchValidationErrors.length > 0) {
      setBuilderMessage("Fix validation errors before publishing.");
      return;
    }
    const nextVersion = deliveryVersionDraft.trim();
    if (!nextVersion) {
      setBuilderMessage("Set a version before publishing.");
      return;
    }
    setDeliveryBusy(true);
    try {
      const buildResponse = await fetch("/api/content-packs/build-bundle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patchName: `delivery-${slugify(nextVersion)}`,
          spaceVectorsPatch: {
            featureSchema: runtimeFeatureSchema,
            modelSchemas: runtimeModelSchemas,
            contentBindings: {
              modelInstances,
              canonicalModelInstances: modelInstances.filter((row) => row.canonical),
            },
          },
        }),
      });
      const buildBody = (await buildResponse.json()) as {
        ok: boolean;
        bundle?: BuiltBundlePayload;
        error?: string;
      };
      if (!buildBody.ok || !buildBody.bundle) {
        setBuilderMessage(buildBody.error ?? "Failed to build bundle for publish.");
        return;
      }
      const publishResponse = await fetch("/api/content-packs/delivery/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: nextVersion,
          bundle: buildBody.bundle,
          compatibility: {
            pluginVersion: deliveryPluginVersion.trim() || "*",
            runtimeVersion: deliveryRuntimeVersion.trim() || "*",
            contentSchemaVersion: String(buildBody.bundle.schemaVersion ?? "content-pack.bundle.v1"),
          },
        }),
      });
      const publishBody = (await publishResponse.json()) as {
        ok: boolean;
        version?: string;
        record?: DeliveryVersionRecord;
        error?: string;
      };
      if (!publishBody.ok || !publishBody.record) {
        setBuilderMessage(publishBody.error ?? "Publish failed.");
        return;
      }
      setLastPublishedVersion(publishBody.version ?? publishBody.record.version);
      setBuilderMessage(`Published delivery version '${publishBody.version}' (${publishBody.record.packId} @ ${publishBody.record.packHash.slice(0, 10)}...).`);
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDeliveryBusy(false);
    }
  }, [patchValidationErrors.length, deliveryVersionDraft, setBuilderMessage, setDeliveryBusy, runtimeFeatureSchema, runtimeModelSchemas, modelInstances, deliveryPluginVersion, deliveryRuntimeVersion, setLastPublishedVersion]);

  const pullDeliveryVersion = useCallback(async () => {
    setDeliveryBusy(true);
    try {
      const response = await fetch("/api/content-packs/delivery/pull", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          compatibility: {
            pluginVersion: deliveryPluginVersion.trim() || undefined,
            runtimeVersion: deliveryRuntimeVersion.trim() || undefined,
          },
        }),
      });
      const body = (await response.json()) as DeliveryPullResponse;
      if (!body.ok || !body.record || !body.downloads) {
        setBuilderMessage(body.error ?? "No matching delivery version found.");
        return;
      }
      setDeliverySelection(body);
      setLastPulledVersion(body.record.version);
      setBuilderMessage(`Pulled delivery version '${body.record.version}'. Use links to fetch bundle/manifest.`);
    } catch (error) {
      setBuilderMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDeliveryBusy(false);
    }
  }, [setDeliveryBusy, deliveryPluginVersion, deliveryRuntimeVersion, setBuilderMessage, setDeliverySelection, setLastPulledVersion]);

  return {
    patchValidationErrors,
    diffSummary,
    applyPreset,
    saveDraft,
    loadDraft,
    deleteDraft,
    downloadReleaseBundle,
    runQuickTestMode,
    publishDeliveryVersion,
    pullDeliveryVersion,
  };
}
