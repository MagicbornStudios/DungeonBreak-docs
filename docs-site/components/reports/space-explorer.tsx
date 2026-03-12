"use client";

import {
  ACTION_POLICIES,
  type LevelContentPack,
} from "@dungeonbreak/engine";
import {
  buildCanonicalInstancesDocument,
  buildContentSchemaDocument,
  buildLevelContentDocument,
} from "@dungeonbreak/engine/content-schema";
import * as EngineRuntime from "@dungeonbreak/engine";
import { useCallback, useMemo, useRef, useState } from "react";
import { type PackIdentity } from "@/lib/space-explorer-shared";
import {
  codeLanguageForTabId,
  formatModelIdForUi,
  slugify,
} from "@/lib/space-explorer-schema";
import {
  writeActiveContentPackSnapshot,
  type ActiveContentPackIdentity,
} from "@/lib/active-content-pack";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { Tabs } from "@/components/ui/tabs";
import { AuthoringAssistantWidget } from "@/components/ai/authoring-assistant-widget";
import { useDevToolsStore } from "@/components/app-content/dev-tools-store";
import { ModelSchemaViewerModal } from "@/components/reports/space-explorer/model-schema-viewer-modal";
import { ContentPackPanel } from "@/components/reports/space-explorer/content-pack-panel";
import { AssetControlPanel } from "@/components/reports/space-explorer/asset-control-panel";
import { LevelContentPanel } from "@/components/reports/space-explorer/level-content-panel";
import { VisualizationSection } from "@/components/reports/space-explorer/visualization-section";
import { SpaceExplorerHeader } from "@/components/reports/space-explorer/space-explorer-header";
import { RuntimeSpacePlot } from "@/components/reports/space-explorer/runtime-space-plot";
import { useVisualizationInfo } from "@/components/reports/space-explorer/hooks/use-visualization-info";
import { useSchemaEditorActions } from "@/components/reports/space-explorer/hooks/use-schema-editor-actions";
import { useAuthoringOperations } from "@/components/reports/space-explorer/hooks/use-authoring-operations";
import { usePackAndReportSources } from "@/components/reports/space-explorer/hooks/use-pack-and-report-sources";
import { useContentPackDimensions } from "@/components/reports/space-explorer/hooks/use-content-pack-dimensions";
import { useInheritanceFeatureGroups } from "@/components/reports/space-explorer/hooks/use-inheritance-feature-groups";
import { useSpaceAuthoringChatContext } from "@/components/reports/space-explorer/hooks/use-space-authoring-chat-context";
import { useSpaceFeatureMapSync } from "@/components/reports/space-explorer/hooks/use-space-feature-map-sync";
import { useSpacePlayerVectors } from "@/components/reports/space-explorer/hooks/use-space-player-vectors";
import { useSpaceModelSchemaViewerState } from "@/components/reports/space-explorer/hooks/use-space-model-schema-viewer-state";
import { useSpaceRuntimeSchema } from "@/components/reports/space-explorer/hooks/use-space-runtime-schema";
import { useSpaceRuntimeMetrics } from "@/components/reports/space-explorer/hooks/use-space-runtime-metrics";
import { useSpaceDeliveryActions } from "@/components/reports/space-explorer/hooks/use-space-delivery-actions";
import { useSpaceDeliveryStoreState } from "@/components/reports/space-explorer/hooks/use-space-delivery-store-state";
import { useSpaceLifecycleEffects } from "@/components/reports/space-explorer/hooks/use-space-lifecycle-effects";
import { useSpaceExplorerHeaderProps } from "@/components/reports/space-explorer/hooks/use-space-explorer-header-props";
import { useSpaceBuilderDeliveryState } from "@/components/reports/space-explorer/hooks/use-space-builder-delivery-state";
import { useSpaceUiControls } from "@/components/reports/space-explorer/hooks/use-space-ui-controls";
import { useSpaceViewState } from "@/components/reports/space-explorer/hooks/use-space-view-state";
import { useSpaceVisualizationSectionProps } from "@/components/reports/space-explorer/hooks/use-space-visualization-section-props";
import { useSpaceVisualizationRefresh } from "@/components/reports/space-explorer/hooks/use-space-visualization-refresh";
import {
  downloadText,
  downloadJson,
  MODEL_PRESETS,
  TEST_MODE_LOADING_STATES,
} from "@/components/reports/space-explorer/config";
import { type ColorBy } from "@/components/reports/space-explorer/view-helpers";
import {
  CUSTOM_OVERLAY_ID,
  getOverlayDiagnostics,
} from "@/components/reports/space-explorer/overlay-warnings";

export function SpaceExplorer() {
  const {
    vizMode,
    setVizMode,
    distanceAlgorithm,
    setDistanceAlgorithm,
    nearestK,
    setNearestK,
    runtimeSpaceView,
    setRuntimeSpaceView,
    spaceFeatureMap,
    setSpaceFeatureMap,
    customFeatureValues,
    setCustomFeatureValues,
    customFeatureLabels,
    setCustomFeatureLabels,
    scopeRootModelId,
    setScopeRootModelId,
    hiddenModelIds,
    setHiddenModelIds,
  } = useSpaceUiControls();
  const {
    data,
    setData,
    error,
    spaceOverrides,
    setSpaceOverrides,
    selectedPoint,
    setSelectedPoint,
    report,
    setReport,
    selectedTurn,
    setSelectedTurn,
    vizInfoTabId,
    setVizInfoTabId,
    vizInfoEditorCode,
    setVizInfoEditorCode,
    vizInfoCopied,
    setVizInfoCopied,
    overlayVisibility,
    setOverlayVisibility,
    vizRefreshTick,
    setVizRefreshTick,
    vizRefreshedAt,
    setVizRefreshedAt,
    visualizationScope,
    packTreeView,
    setPackTreeView,
    enabledStatSpaces,
    setEnabledStatSpaces,
    statSetValuesById,
    setStatSetValuesById,
    statSetDeltaValuesById,
    setStatSetDeltaValuesById,
    modelSchemaModalOpen,
    setModelSchemaModalOpen,
    behaviorWindowSeconds,
    behaviorStepSeconds,
    newFeatureId,
    setNewFeatureId,
    newFeatureGroup,
    newFeatureSpaces,
    newModelId,
    newModelLabel,
    newModelSpaces,
    selectedModelFeatureIds,
    setSelectedModelFeatureIds,
    enabledStatLevelById,
    setEnabledStatLevelById,
  } = useSpaceViewState();
  const reportPolicyId =
    ACTION_POLICIES.policies.find(
      (row) => row.policyId === "agent-play-default"
    )?.policyId ??
    ACTION_POLICIES.policies[0]?.policyId ??
    "";
  const {
    modelInstances,
    replaceModelInstances,
    activeModelSchemaId,
    activeModelInstanceId,
    setActiveModelSelection,
  } = useSpaceModelSchemaViewerState();
  const {
    baseSpaceVectors,
    setBaseSpaceVectors,
    drafts,
    setDrafts,
    draftName,
    selectedPresetId,
    builderMessage,
    setBuilderMessage,
    bundleBusy,
    setBundleBusy,
    quickTestBusy,
    setQuickTestBusy,
    testModeGeneratedAt,
    setTestModeGeneratedAt,
    pipelineLoading,
    setPipelineLoading,
    spaceDataLoading,
    loadedPackIdentity,
    setLoadedPackIdentity,
    loadedReportIdentity,
    setLoadedReportIdentity,
    generatedOutputs,
    setGeneratedOutputs,
    activePackPayload,
    setActivePackPayload,
    lastAutoVizPackKeyRef,
  } = useSpaceBuilderDeliveryState();
  const testModeAllowed = process.env.NODE_ENV === "development";
  const storedTestModeEnabled = useDevToolsStore(
    (state) => state.testModeEnabled
  );
  const testModeBundleSource = useDevToolsStore(
    (state) => state.testModeBundleSource
  );
  const showUiIds = useDevToolsStore((state) => state.showUiIds);
  const setTestModeEnabled = useDevToolsStore(
    (state) => state.setTestModeEnabled
  );
  const testModeEnabled = testModeAllowed && storedTestModeEnabled;
  const persistActivePackSnapshot = useCallback(
    (identity: PackIdentity, bundle?: Record<string, unknown>) => {
      const nextIdentity: ActiveContentPackIdentity = {
        source: identity.source,
        packId: identity.packId,
        packVersion: identity.packVersion,
        packHash: identity.packHash,
        schemaVersion: identity.schemaVersion,
        engineVersion: identity.engineVersion,
        reportId: identity.reportId,
      };
      writeActiveContentPackSnapshot({
        updatedAt: new Date().toISOString(),
        identity: nextIdentity,
        bundle,
      });
    },
    []
  );
  const {
    deliveryBusy,
    deliveryVersionDraft,
    deliveryPluginVersion,
    deliveryRuntimeVersion,
    deliverySelection,
    lastPublishedVersion,
    lastPulledVersion,
    setDeliveryBusy,
    setDeliveryVersionDraft,
    setDeliveryPluginVersion,
    setDeliveryRuntimeVersion,
    setDeliverySelection,
    setLastPublishedVersion,
    setLastPulledVersion,
  } = useSpaceDeliveryStoreState();
  const {
    packOptions,
    selectedPackOptionId,
    setSelectedPackOptionId,
    reportOptions,
    selectedReportOptionId,
    setSelectedReportOptionId,
    handlePackUpload,
    handlePackOptionSelect,
  } = usePackAndReportSources({
    loadedPackVersion: loadedPackIdentity?.packVersion,
    testModeEnabled,
    testModeBundleSource,
    persistActivePackSnapshot,
    replaceModelInstances,
    spaceOverrides,
    setSpaceOverrides,
    setBaseSpaceVectors,
    setLoadedPackIdentity,
    setBuilderMessage,
    setReport,
    setLoadedReportIdentity,
    setGeneratedOutputs,
    setActivePackPayload,
  });
  const packUploadInputRef = useRef<HTMLInputElement | null>(null);
  const markerColorBy: ColorBy = "branch";
  const [selectedOverlayId, setSelectedOverlayId] = useState(CUSTOM_OVERLAY_ID);

  const { combinedVector, movementBudget } = useSpacePlayerVectors({
    statSetValuesById,
    statSetDeltaValuesById,
  });

  const {
    unifiedModel,
    runtimeFeatureSchema,
    runtimeModelSchemas,
    featureDefaultsById,
    selectedModelForSpaceView,
    selectedModelForSpaceViewId,
    modelOptions,
    canonicalAssetOptions,
  } = useSpaceRuntimeSchema({
    runtimeModule: EngineRuntime,
    spaceOverrides,
    behaviorWindowSeconds,
    behaviorStepSeconds,
    modelInstances,
    activeModelSchemaId,
  });
  const {
    modelHueById,
    effectiveScopeRootModelId,
    packTreeRoots,
    expandedPackTreeModelIds,
    togglePackTreeModel,
    effectiveStatSpaceIds,
    scopedSchemaNodes,
    scopedCanonicalNodes,
    statSpaceOverlays,
    layerSpaceOverlays,
    scopePathCrumbs,
    selectCanonicalAssetInPackScope,
    selectedScopeTreeNodeId,
    groupedPackTreeRoots,
    statsRootHueByModelId,
    modelSectionRootById,
    topScopedContributors,
    dimensionNodesByLayer,
  } = useContentPackDimensions({
    runtimeModelSchemas,
    canonicalAssetOptions,
    activeModelInstanceId,
    scopeRootModelId,
    hiddenModelIds,
    enabledStatSpaces,
    setEnabledStatSpaces,
    setScopeRootModelId,
    setActiveModelSelection,
  });
  const {
    selectedInfoModelSchema,
    selectedInfoAsset,
    infoSchemaTabs,
    activeInfoSchemaTab,
    selectedCanonicalAsset,
    selectedModelInheritanceChain,
    statContentLevels,
    contentPackInfoEnabled,
    statSchemaById,
    selectedAssetStatLevelSchemas,
    statModifiersEnabled,
    enabledStatFeatureIdSet,
  } = useVisualizationInfo({
    runtimeModelSchemas,
    activeModelSchemaId,
    modelInstances,
    activeModelInstanceId,
    featureDefaultsById,
    vizInfoTabId,
    setVizInfoTabId,
    setVizInfoEditorCode,
    visualizationScope,
    selectedModelForSpaceView,
    vizMode,
    setVizMode,
    canonicalAssetOptions,
    enabledStatLevelById,
    setEnabledStatLevelById,
  });
  useSpaceLifecycleEffects({
    loadedPackIdentity,
    lastAutoVizPackKeyRef,
    setVizMode,
    setData,
    setSelectedPoint,
    drafts,
    setDrafts,
    report,
    selectedTurn,
    setStatSetValuesById,
    setStatSetDeltaValuesById,
    activeModelSchemaId,
    modelOptions,
    setActiveModelSelection,
    runtimeSpaceView,
    setRuntimeSpaceView,
    selectedModelFeatureIds,
    setSelectedModelFeatureIds,
    runtimeFeatureSchema,
  });

  const {
    createModelSchemaFromTree,
    addFeatureToSchema,
    addModelSchema,
    addFeatureRefToModel,
    removeFeatureRefFromModel,
    updateStatModifierMapping,
    updateFeatureRefDefaultValue,
    attachStatModelToModel,
    toggleStatModifierForStatSet,
    updateModelMetadata,
    deleteModelSchema,
    replaceModelSchemas,
    replaceCanonicalAssets,
  } = useSchemaEditorActions({
    runtimeModelSchemas,
    runtimeFeatureSchema,
    selectedModelForSpaceViewId,
    setSpaceOverrides,
    setActiveModelSelection,
    newFeatureId,
    newFeatureSpaces,
    newFeatureGroup,
    setSelectedModelFeatureIds,
    setNewFeatureId,
    newModelId,
    newModelLabel,
    newModelSpaces,
    selectedModelFeatureIds,
    modelInstances,
    replaceModelInstances,
  });

  const {
    patchValidationErrors,
    runQuickTestMode,
    publishDeliveryVersion,
    pullDeliveryVersion,
  } = useSpaceDeliveryActions({
    draftName,
    setDrafts,
    draftsCount: drafts.length,
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
    presets: MODEL_PRESETS,
    setSpaceOverrides,
    replaceModelInstances,
    setBaseSpaceVectors,
    persistActivePackSnapshot,
    setLoadedPackIdentity,
    setLoadedReportIdentity,
    setReport,
    setSelectedTurn,
    setTestModeEnabled,
    setGeneratedOutputs,
    setActivePackPayload,
    deliveryVersionDraft,
    deliveryPluginVersion,
    deliveryRuntimeVersion,
    setDeliveryBusy,
    setLastPublishedVersion,
    setLastPulledVersion,
    setDeliverySelection,
  });

  const applyAuthoringOperations = useAuthoringOperations({
    runtimeFeatureSchema,
    runtimeModelSchemas,
    modelInstances,
    spaceOverrides,
    setSpaceOverrides,
    replaceModelInstances,
    setActiveModelSelection,
    draftName,
    setBuilderMessage,
    setBaseSpaceVectors,
    setActivePackPayload,
  });

  const {
    getFeatureValue,
    setFeatureValue,
    runtimeSpaceFeatureIds,
    selectedModelSpacePoints,
    player3d,
    content,
    contentCoords,
    effectiveAlgorithm,
    nearestRows,
    activeFeatureSpace,
  } = useSpaceRuntimeMetrics({
    runtimeSpaceView,
    distanceAlgorithm,
    nearestK,
    data,
    statSetValuesById,
    statSetDeltaValuesById,
    setStatSetValuesById,
    customFeatureValues,
    setCustomFeatureValues,
    spaceFeatureMap,
    statContentLevels,
    enabledStatFeatureIdSet,
    combinedVector,
    spaceOverrides,
    unifiedModel,
    movementBudget,
    selectedModelInheritanceChain,
    featureDefaultsById,
    runtimeFeatureSchema,
  });

  const PlotlyComponent = RuntimeSpacePlot;

  const featuresByInheritanceGroup = useInheritanceFeatureGroups({
    activeFeatureSpace,
    runtimeSpaceFeatureIds,
    statContentLevels,
    enabledStatLevelById,
  });

  useSpaceFeatureMapSync({
    runtimeFeatureSchema,
    setSpaceFeatureMap,
  });

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-amber-500">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Run <code>pnpm --dir docs-site run space:precompute</code> to generate
          space-data.json
        </p>
      </div>
    );
  }

  if (spaceDataLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted-foreground">
          Loading Space Explorer data...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground">Loading space data...</p>
      </div>
    );
  }

  const maxTurn = report?.run.actionTrace.length ?? 0;
  const authoringChatContext = useSpaceAuthoringChatContext({
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
  });
  const handleRefreshVisualization = useSpaceVisualizationRefresh({
    data,
    visualizationScope,
    setVizRefreshTick,
    setVizRefreshedAt,
    setData,
  });
  const handleExportContentSchema = useCallback(() => {
    const runtime = EngineRuntime as {
      resolveSpaceVectorPack?: (
        overrides?: Record<string, unknown>
      ) => Record<string, unknown>;
    };
    const resolvedPack =
      typeof runtime.resolveSpaceVectorPack === "function"
        ? runtime.resolveSpaceVectorPack(spaceOverrides)
        : {
            ...(spaceOverrides ?? {}),
            featureSchema: runtimeFeatureSchema,
            modelSchemas: runtimeModelSchemas,
          };
    const payload = buildContentSchemaDocument(
      {
        ...resolvedPack,
        featureSchema: runtimeFeatureSchema,
        modelSchemas: runtimeModelSchemas,
      },
      {
        schemaId: "space-explorer.test-mode",
        title: "Space Explorer Content Schema",
        description:
          "Browser-exported schema document from the current Space Explorer session.",
        generatedAt: new Date().toISOString(),
      }
    );
    const stem = slugify(loadedPackIdentity?.packId ?? "space-explorer");
    downloadJson(`${stem}.content-schema.document.v1.json`, payload);
  }, [
    loadedPackIdentity?.packId,
    runtimeFeatureSchema,
    runtimeModelSchemas,
    spaceOverrides,
  ]);
  const handleExportCanonicalInstances = useCallback(() => {
    const runtime = EngineRuntime as {
      resolveSpaceVectorPack?: (
        overrides?: Record<string, unknown>
      ) => Record<string, unknown>;
    };
    const resolvedPack =
      typeof runtime.resolveSpaceVectorPack === "function"
        ? runtime.resolveSpaceVectorPack(spaceOverrides)
        : {
            ...(spaceOverrides ?? {}),
          };
    const payload = buildCanonicalInstancesDocument(
      {
        ...resolvedPack,
        contentBindings: {
          ...((resolvedPack.contentBindings as
            | Record<string, unknown>
            | undefined) ?? {}),
          modelInstances,
          canonicalModelInstances: modelInstances.filter(
            (row) => row.canonical
          ),
        },
      },
      {
        documentId: "space-explorer.test-mode-canonical-instances",
        title: "Space Explorer Canonical Instances",
        description:
          "Browser-exported canonical instance bindings from the current Space Explorer session.",
        generatedAt: new Date().toISOString(),
      }
    );
    const stem = slugify(loadedPackIdentity?.packId ?? "space-explorer");
    downloadJson(`${stem}.canonical-instances.document.v1.json`, payload);
  }, [loadedPackIdentity?.packId, modelInstances, spaceOverrides]);
  const handleExportLevelContent = useCallback(() => {
    const activePackPacks =
      activePackPayload &&
      typeof activePackPayload === "object" &&
      !Array.isArray(activePackPayload)
        ? ((activePackPayload as { packs?: unknown }).packs ?? null)
        : null;
    const packsRecord =
      activePackPacks &&
      typeof activePackPacks === "object" &&
      !Array.isArray(activePackPacks)
        ? (activePackPacks as { levelContent?: LevelContentPack })
        : null;
    const runtime = EngineRuntime as unknown as {
      RUNTIME_CONTENT_PACKS?: { levelContent?: LevelContentPack };
    };
    const levelContent =
      packsRecord?.levelContent ?? runtime.RUNTIME_CONTENT_PACKS?.levelContent ?? { levels: [] };
    const payload = buildLevelContentDocument(levelContent, {
      documentId: "space-explorer.test-mode-level-content",
      title: "Space Explorer Level Content",
      description:
        "Browser-exported level content document from the current Space Explorer session.",
      generatedAt: new Date().toISOString(),
    });
    const stem = slugify(loadedPackIdentity?.packId ?? "space-explorer");
    downloadJson(`${stem}.level-content.document.v1.json`, payload);
  }, [activePackPayload, loadedPackIdentity?.packId]);
  const overlayDiagnostics = useMemo(
    () => getOverlayDiagnostics(selectedOverlayId, activePackPayload),
    [selectedOverlayId, activePackPayload]
  );
  const activePackPacks = useMemo(() => {
    if (
      !activePackPayload ||
      typeof activePackPayload !== "object" ||
      Array.isArray(activePackPayload)
    ) {
      return null;
    }
    const candidate = (activePackPayload as { packs?: unknown }).packs;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return null;
    }
    return candidate as { levelContent?: LevelContentPack };
  }, [activePackPayload]);
  const levelBrowserPayload = useMemo(() => {
    const runtime = EngineRuntime as unknown as {
      RUNTIME_CONTENT_PACKS?: { levelContent?: LevelContentPack };
      buildLevelBrowserPayload?: (
        levelContent: LevelContentPack
      ) => Record<string, unknown>;
    };
    const levelContent =
      activePackPacks?.levelContent ?? runtime.RUNTIME_CONTENT_PACKS?.levelContent ?? null;
    if (!levelContent || typeof runtime.buildLevelBrowserPayload !== "function") {
      return null;
    }
    return runtime.buildLevelBrowserPayload(levelContent);
  }, [activePackPacks]);
  const headerProps = useSpaceExplorerHeaderProps({
    showUiIds,
    setModelSchemaModalOpen,
    runQuickTestMode,
    testModeAllowed,
    quickTestBusy,
    pipelineLoading,
    loadedPackIdentity,
    testModeEnabled,
    testModeGeneratedAt,
    selectedPackOptionId,
    setSelectedPackOptionId,
    packOptions,
    onSelectPackOption: handlePackOptionSelect,
    packUploadInputRef,
    onPackUpload: handlePackUpload,
    onExportContentSchema: handleExportContentSchema,
    onExportLevelContent: handleExportLevelContent,
    onExportCanonicalInstances: handleExportCanonicalInstances,
    generatedOutputs,
    selectedOverlayId,
    setSelectedOverlayId,
    overlayOptions: overlayDiagnostics.options,
    overlayStatuses: overlayDiagnostics.statuses,
    activeOverlayLabel: overlayDiagnostics.activeOverlay?.label ?? null,
    activeOverlayDescription: overlayDiagnostics.activeOverlay?.description,
    overlayMissingCount: overlayDiagnostics.missingCount,
    exportGeneratedOutputs: () => {
      for (const output of generatedOutputs) {
        downloadText(output.fileName, output.text, output.contentType);
      }
    },
    selectedReportOptionId,
    setSelectedReportOptionId,
    reportOptions,
    deliveryVersionDraft,
    deliveryPluginVersion,
    deliveryRuntimeVersion,
    deliveryBusy,
    bundleBusy,
    lastPublishedVersion,
    lastPulledVersion,
    deliverySelection,
    setDeliveryVersionDraft,
    setDeliveryPluginVersion,
    setDeliveryRuntimeVersion,
    publishDeliveryVersion,
    pullDeliveryVersion,
  });
  const visualizationSectionProps = useSpaceVisualizationSectionProps({
    visualizationScope,
    scopePathCrumbs,
    effectiveScopeRootModelId,
    setScopeRootModelId,
    setActiveModelSelection,
    effectiveStatSpaceIds,
    enabledStatSpaces,
    setEnabledStatSpaces,
    modelHueById,
    selectedTurn,
    maxTurn,
    setSelectedTurn,
    handleRefreshVisualization,
    vizRefreshedAt,
    effectiveAlgorithm,
    nearestRows,
    vizMode,
    setVizMode,
    contentPackInfoEnabled,
    statModifiersEnabled,
    distanceAlgorithm,
    setDistanceAlgorithm,
    nearestK,
    setNearestK,
    scopedCanonicalNodes,
    vizRefreshTick,
    dimensionNodesByLayer,
    selectedCanonicalAsset,
    canonicalAssetOptions,
    selectCanonicalAssetInPackScope,
    statSpaceOverlays,
    overlayVisibility,
    setOverlayVisibility,
    layerSpaceOverlays,
    activeModelSchemaId,
    testModeEnabled,
    testModeGeneratedAt,
    PlotlyComponent,
    content,
    contentCoords,
    player3d,
    selectedModelSpacePoints,
    markerColorBy,
    selectedPoint,
    setSelectedPoint,
    scopedSchemaNodes,
    topScopedContributors,
    formatModelIdForUi,
    selectedInfoAsset,
    selectedInfoModelSchema,
    infoSchemaTabs,
    vizInfoTabId,
    setVizInfoTabId,
    activeInfoSchemaTab,
    vizInfoEditorCode,
    setVizInfoEditorCode,
    vizInfoCopied,
    setVizInfoCopied,
    codeLanguageForTabId,
    selectedAssetStatLevelSchemas,
    statSchemaById,
    getFeatureValue,
  });

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <MultiStepLoader
        loadingStates={TEST_MODE_LOADING_STATES.map((row) => ({
          text: row.text,
        }))}
        loading={pipelineLoading}
        duration={900}
        loop={false}
      />
      <section
        id="panel-content-space-explorer"
        data-ui-id="panel-content-space-explorer"
        data-theme-context="header"
        className={`overflow-hidden rounded border bg-background ${
          testModeEnabled
            ? "border-emerald-400/50 shadow-[0_0_0_1px_rgba(16,185,129,0.18)]"
            : "border-border"
        }`}
      >
        <SpaceExplorerHeader {...headerProps} />
        <div className="grid gap-0 xl:grid-cols-[520px_minmax(0,1fr)]">
          <div
            id="panel-controls-left"
            data-ui-id="panel-controls-left"
            className="space-y-3 border-b border-border p-3 xl:border-r xl:border-b-0"
          >
            <Tabs value={visualizationScope} className="space-y-3">
              <AssetControlPanel
                selectedCanonicalAsset={selectedCanonicalAsset}
                activeModelInstanceId={activeModelInstanceId}
                canonicalAssetOptions={canonicalAssetOptions}
                setActiveModelSelection={setActiveModelSelection}
                setSelectedPoint={setSelectedPoint}
                activeFeatureSpace={activeFeatureSpace}
                featuresByInheritanceGroup={featuresByInheritanceGroup}
                formatModelIdForUi={formatModelIdForUi}
                setEnabledStatLevelById={setEnabledStatLevelById}
                featureDefaultsById={featureDefaultsById}
                getFeatureValue={getFeatureValue}
                setFeatureValue={setFeatureValue}
              />

              <ContentPackPanel
                loadedPackIdentity={loadedPackIdentity}
                setScopeRootModelId={setScopeRootModelId}
                setActiveModelSelection={setActiveModelSelection}
                packTreeView={packTreeView}
                setPackTreeView={setPackTreeView}
                selectedScopeTreeNodeId={selectedScopeTreeNodeId}
                packTreeRoots={packTreeRoots}
                groupedPackTreeRoots={groupedPackTreeRoots}
                expandedPackTreeModelIds={expandedPackTreeModelIds}
                hiddenModelIds={hiddenModelIds}
                activeModelInstanceId={activeModelInstanceId}
                modelHueById={modelHueById}
                statsRootHueByModelId={statsRootHueByModelId}
                modelSectionRootById={modelSectionRootById}
                togglePackTreeModel={togglePackTreeModel}
                selectCanonicalAssetInPackScope={
                  selectCanonicalAssetInPackScope
                }
                setHiddenModelIds={setHiddenModelIds}
              />

              <LevelContentPanel payload={levelBrowserPayload} />
            </Tabs>
          </div>

          <div
            id="panel-summary-right"
            data-ui-id="panel-summary-right"
            className="p-3"
          >
            <VisualizationSection {...visualizationSectionProps} />
          </div>
        </div>
      </section>

      <ModelSchemaViewerModal
        open={modelSchemaModalOpen}
        onClose={() => setModelSchemaModalOpen(false)}
        runtimeModelSchemas={runtimeModelSchemas}
        runtimeFeatureSchema={runtimeFeatureSchema}
        runtimeContentObjects={data.content ?? []}
        onUpdateModelMetadata={updateModelMetadata}
        onDeleteModelSchema={deleteModelSchema}
        onCreateModelSchema={createModelSchemaFromTree}
        onAddFeatureRefToModel={addFeatureRefToModel}
        onRemoveFeatureRefFromModel={removeFeatureRefFromModel}
        onUpdateFeatureRefDefaultValue={updateFeatureRefDefaultValue}
        onAttachStatModelToModel={attachStatModelToModel}
        onToggleStatModifierForStatSet={toggleStatModifierForStatSet}
        onUpdateStatModifierMapping={updateStatModifierMapping}
        onReplaceModelSchemas={replaceModelSchemas}
        onReplaceCanonicalAssets={replaceCanonicalAssets}
        onOpenCanonicalAssetInExplorer={({ modelId, instanceId }) => {
          setActiveModelSelection(modelId, instanceId);
          setModelSchemaModalOpen(false);
        }}
      />
      <AuthoringAssistantWidget
        endpoint="/api/ai/space-authoring-chat"
        context={authoringChatContext}
        onApplyOperations={applyAuthoringOperations}
      />
    </div>
  );
}
