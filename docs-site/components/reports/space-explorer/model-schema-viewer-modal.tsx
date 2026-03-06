"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { hashToUnit } from "@/lib/space-explorer-shared";
import {
  buildDefaultStatModifierMappings,
  buildJsonSchemaForModel,
  buildSingleSchemaFileForLanguage,
  codeLanguageForTabId,
  formatModelIdForUi,
  normalizeModelId,
  resolveParentModelId,
  toFileStem,
} from "@/lib/space-explorer-schema";
import { HelpInfo } from "@/components/reports/space-explorer/aux-controls";
import { useModelSchemaViewerStore } from "@/components/reports/space-explorer/stores/model-schema-viewer-store";
import { buildSchemaVersionSnapshot } from "@/components/reports/content-creator/schema-versioning";
import { useSchemaEditorState } from "@/components/reports/content-creator/use-schema-editor-state";
import { useStatImpactDialogState } from "@/components/reports/content-creator/use-stat-impact-dialog-state";
import { TreeStatModifierSubmenu } from "@/components/reports/content-creator/tree-stat-modifier-submenu";
import { useContentCreatorCodeEditorState } from "@/components/reports/content-creator/use-content-creator-code-editor-state";
import { useMigrationScriptClipboard } from "@/components/reports/content-creator/use-migration-script-clipboard";
import { useContentCreatorActions } from "@/components/reports/content-creator/use-content-creator-actions";
import { ContentCreatorSidebarPanel } from "@/components/reports/content-creator/sidebar-panel";
import { ContentCreatorSidebarContent } from "@/components/reports/content-creator/sidebar-content";
import { ContentCreatorInfoPanelShell } from "@/components/reports/content-creator/info-panel-shell";
import { StatImpactDialog } from "@/components/reports/content-creator/stat-impact-dialog";
import { ContentCreatorModalShell } from "@/components/reports/content-creator/modal-shell";
import { useSchemaApplyActions } from "@/components/reports/content-creator/use-schema-apply-actions";
import { useContentCreatorMenuActions } from "@/components/reports/content-creator/use-content-creator-menu-actions";
import { useContentCreatorCodeTabs } from "@/components/reports/content-creator/use-content-creator-code-tabs";
import { useContentCreatorDrafts } from "@/components/reports/content-creator/use-content-creator-drafts";
import { useContentCreatorSelectionEffects } from "@/components/reports/content-creator/use-content-creator-selection-effects";
import { useContentCreatorSelectionSync } from "@/components/reports/content-creator/use-content-creator-selection-sync";
import { useContentCreatorStatImpactActions } from "@/components/reports/content-creator/use-content-creator-stat-impact-actions";
import { useContentCreatorCodePayloads } from "@/components/reports/content-creator/use-content-creator-code-payloads";
import { useContentCreatorInfoPanel } from "@/components/reports/content-creator/use-content-creator-info-panel";
import { usePanelResolvedFeatureRefs } from "@/components/reports/content-creator/use-panel-resolved-feature-refs";
import { useContentCreatorSidebarProps } from "@/components/reports/content-creator/use-content-creator-sidebar-props";
import { useContentCreatorDerivedData } from "@/components/reports/content-creator/use-content-creator-derived-data";
import { useContentCreatorModalController } from "@/components/reports/content-creator/use-content-creator-modal-controller";
import { buildMigrationScript } from "@/components/reports/content-creator/migration-script";
import { useContentCreatorCounts } from "@/components/reports/content-creator/use-content-creator-counts";
import { useContentCreatorStatSubmenus } from "@/components/reports/content-creator/use-content-creator-stat-submenus";
import { isCanonicalSelection as resolveIsCanonicalSelection } from "@/components/reports/content-creator/selection-utils";
import {
  NO_MODEL_SELECTED,
  type ContentPoint,
  type ModelInstanceBinding,
  type RuntimeFeatureSchemaRow,
  type RuntimeModelSchemaRow,
} from "@/components/reports/space-explorer/config";

export type ModelSchemaViewerModalProps = {
  open: boolean;
  onClose: () => void;
  inferredKaelModelId: string;
  runtimeModelSchemas: RuntimeModelSchemaRow[];
  runtimeFeatureSchema: RuntimeFeatureSchemaRow[];
  runtimeContentObjects: ContentPoint[];
  onUpdateModelMetadata: (
    modelId: string,
    updates: { label?: string; description?: string }
  ) => void;
  onDeleteModelSchema: (modelId: string) => void;
  onCreateModelSchema: (
    modelId: string,
    label?: string,
    templateModelId?: string
  ) => void;
  onAddFeatureRefToModel: (modelId: string, featureId: string) => void;
  onRemoveFeatureRefFromModel: (modelId: string, featureId: string) => void;
  onUpdateFeatureRefDefaultValue: (
    modelId: string,
    featureId: string,
    defaultValue: number | null
  ) => void;
  onAttachStatModelToModel: (modelId: string, statModelId: string) => void;
  onToggleStatModifierForStatSet: (
    targetStatModelId: string,
    modifierStatModelId: string,
    enabled: boolean
  ) => void;
  onUpdateStatModifierMapping: (
    targetStatModelId: string,
    modifierStatModelId: string,
    modifierFeatureId: string,
    targetFeatureId: string
  ) => void;
  onReplaceModelSchemas: (models: RuntimeModelSchemaRow[]) => void;
  onReplaceCanonicalAssets: (assets: ModelInstanceBinding[]) => void;
  onOpenCanonicalAssetInExplorer: (selection: {
    modelId: string;
    instanceId: string | null;
  }) => void;
};
export function ModelSchemaViewerModal({
  open,
  onClose,
  inferredKaelModelId,
  runtimeModelSchemas,
  runtimeFeatureSchema,
  runtimeContentObjects,
  onUpdateModelMetadata,
  onDeleteModelSchema,
  onCreateModelSchema,
  onAddFeatureRefToModel,
  onRemoveFeatureRefFromModel,
  onUpdateFeatureRefDefaultValue,
  onAttachStatModelToModel,
  onToggleStatModifierForStatSet,
  onUpdateStatModifierMapping,
  onReplaceModelSchemas,
  onReplaceCanonicalAssets,
  onOpenCanonicalAssetInExplorer,
}: ModelSchemaViewerModalProps) {
  const {
    activeModelSchemaId,
    activeModelInstanceId,
    modelInstances,
    initFromSchemas,
    setActiveSelection,
    addCanonicalAsset,
    renameModelInstance,
    deleteModelInstance,
    migrationOps,
    clearMigrationOps,
  } = useModelSchemaViewerStore(
    useShallow((state) => ({
      activeModelSchemaId: state.activeModelSchemaId,
      activeModelInstanceId: state.activeModelInstanceId,
      modelInstances: state.modelInstances,
      initFromSchemas: state.initFromSchemas,
      setActiveSelection: state.setActiveSelection,
      addCanonicalAsset: state.addCanonicalAsset,
      renameModelInstance: state.renameModelInstance,
      deleteModelInstance: state.deleteModelInstance,
      migrationOps: state.migrationOps,
      clearMigrationOps: state.clearMigrationOps,
    }))
  );
  const { copiedScript, copyMigrationScript } = useMigrationScriptClipboard();
  const {
    selectedTreeNodeId,
    setSelectedTreeNodeId,
    toggleTreeNode,
    isExpanded,
    codePanelOpen,
    canonicalTab,
    setCanonicalTab,
    objectSectionTab,
    setObjectSectionTab,
    modelsNavigatorMode,
    canonicalNavigatorMode,
    setNavigatorMode,
    canonicalCreateName,
    setCanonicalCreateName,
    newStatFeatureId,
    setNewStatFeatureId,
    newStatModelIdDraft,
    setNewStatModelIdDraft,
    newStatLabelDraft,
    setNewStatLabelDraft,
    newStatTemplateModelId,
    setNewStatTemplateModelId,
  } = useContentCreatorModalController();

  useEffect(() => {
    if (!open) return;
    initFromSchemas(runtimeModelSchemas, inferredKaelModelId);
  }, [open, runtimeModelSchemas, inferredKaelModelId, initFromSchemas]);

  const activeModelSchema = useMemo(
    () =>
      runtimeModelSchemas.find((row) => row.modelId === activeModelSchemaId) ??
      null,
    [runtimeModelSchemas, activeModelSchemaId]
  );

  const migrationScript = useMemo(
    () => buildMigrationScript(migrationOps),
    [migrationOps]
  );
  const {
    activeNavigatorMode,
    activeTreeData,
    featureDefaultMap,
    modelTreeNodeById,
    statModelIds,
    statColorByModelId,
    attachedStatModelIdsByModelId,
    modelsSchemaJson,
    statsSchemaJson,
    canonicalAssetsSchemaJson,
  } = useContentCreatorDerivedData({
    runtimeModelSchemas,
    runtimeFeatureSchema,
    modelInstances,
    objectSectionTab,
    modelsNavigatorMode,
    canonicalNavigatorMode,
    formatModelIdForUi,
    hashToUnit,
  });
  const selectedTreeNode = useMemo(
    () =>
      selectedTreeNodeId
        ? (modelTreeNodeById.get(selectedTreeNodeId) ?? null)
        : null,
    [selectedTreeNodeId, modelTreeNodeById]
  );
  const contentObjectById = useMemo(
    () =>
      new Map(
        runtimeContentObjects.map(
          (objectPoint) => [objectPoint.id, objectPoint] as const
        )
      ),
    [runtimeContentObjects]
  );
  const {
    jsonSyntaxMounted,
    jsonSectionOpen,
    jsonSectionEditorMode,
    modelsSchemaDraft,
    statsSchemaDraft,
    canonicalSchemaDraft,
    jsonApplyError,
    deferredModelsSchemaJson,
    deferredStatsSchemaJson,
    deferredCanonicalSchemaJson,
    setJsonSectionOpen,
    setJsonSectionEditorMode,
    setModelsSchemaDraft,
    setStatsSchemaDraft,
    setCanonicalSchemaDraft,
    setJsonApplyError,
  } = useSchemaEditorState({
    modelsSchemaJson,
    statsSchemaJson,
    canonicalSchemaJson: canonicalAssetsSchemaJson,
    activeNavigatorMode,
    objectSectionTab,
  });
  const currentSchemaSnapshot = useMemo(
    () =>
      buildSchemaVersionSnapshot({
        modelsJson: modelsSchemaJson,
        statsJson: statsSchemaJson,
        canonicalJson: canonicalAssetsSchemaJson,
      }),
    [modelsSchemaJson, statsSchemaJson, canonicalAssetsSchemaJson]
  );
  const {
    pendingStatImpactAction,
    pendingStatImpactChoice,
    pendingStatImpactReplacementId,
    openStatImpactDialog,
    closeStatImpactDialog,
    setPendingStatImpactChoice,
    setPendingStatImpactReplacementId,
  } = useStatImpactDialogState(statModelIds);
  const { applyModelsAndStatsSchemaDraft, applyCanonicalSchemaDraft } =
    useSchemaApplyActions({
      modelsSchemaDraft,
      statsSchemaDraft,
      canonicalSchemaDraft,
      currentSchemaSnapshot,
      runtimeModelSchemas,
      normalizeModelId,
      formatModelIdForUi,
      onReplaceModelSchemas,
      onReplaceCanonicalAssets,
      onSetJsonApplyError: setJsonApplyError,
    });
  const selectedContentObject = useMemo(() => {
    if (selectedTreeNode?.nodeType !== "object" || !selectedTreeNode.objectId)
      return null;
    return contentObjectById.get(selectedTreeNode.objectId) ?? null;
  }, [selectedTreeNode, contentObjectById]);
  const panelModelId =
    selectedTreeNode?.modelId ?? activeModelSchema?.modelId ?? null;
  const panelModelSchema = useMemo(
    () =>
      panelModelId
        ? (runtimeModelSchemas.find((row) => row.modelId === panelModelId) ??
          null)
        : null,
    [runtimeModelSchemas, panelModelId]
  );
  const panelResolvedFeatureRefs = usePanelResolvedFeatureRefs({
    panelModelSchema,
    runtimeModelSchemas,
    featureDefaultMap,
    normalizeModelId,
  });
  const panelStatGroups = useMemo(() => {
    if (!panelModelSchema)
      return [] as Array<{
        statModelId: string;
        label: string;
        color: string;
        features: RuntimeModelSchemaRow["featureRefs"];
      }>;
    const byId = new Map(
      runtimeModelSchemas.map((row) => [row.modelId, row] as const)
    );
    const idSet = new Set(runtimeModelSchemas.map((row) => row.modelId));
    const modelChain: RuntimeModelSchemaRow[] = [];
    const visitedModels = new Set<string>();
    let modelCursor: RuntimeModelSchemaRow | undefined = panelModelSchema;
    while (modelCursor && !visitedModels.has(modelCursor.modelId)) {
      visitedModels.add(modelCursor.modelId);
      modelChain.unshift(modelCursor);
      const parentId = resolveParentModelId(modelCursor.modelId, idSet, byId);
      modelCursor = parentId ? byId.get(parentId) : undefined;
    }
    const statModelIds: string[] = [];
    const seenStatIds = new Set<string>();
    for (const model of modelChain) {
      const candidates = [
        ...(model.extendsModelId && model.extendsModelId.endsWith("stats")
          ? [model.extendsModelId]
          : []),
        ...(model.attachedStatModelIds ?? []).filter((id) =>
          id.endsWith("stats")
        ),
      ];
      for (const candidate of candidates) {
        const normalized = normalizeModelId(candidate);
        if (!normalized || seenStatIds.has(normalized) || !byId.has(normalized))
          continue;
        seenStatIds.add(normalized);
        statModelIds.push(normalized);
      }
    }
    const groups: Array<{
      statModelId: string;
      label: string;
      color: string;
      features: RuntimeModelSchemaRow["featureRefs"];
    }> = [];
    const consumedFeatureIds = new Set<string>();
    for (const statModelId of statModelIds) {
      const statFeatureIds = new Set<string>();
      const visitedStats = new Set<string>();
      let statCursor: RuntimeModelSchemaRow | undefined = byId.get(statModelId);
      while (statCursor && !visitedStats.has(statCursor.modelId)) {
        visitedStats.add(statCursor.modelId);
        for (const ref of statCursor.featureRefs) {
          statFeatureIds.add(ref.featureId);
        }
        const parentId = resolveParentModelId(statCursor.modelId, idSet, byId);
        const parent = parentId ? byId.get(parentId) : undefined;
        statCursor =
          parent && parent.modelId.endsWith("stats") ? parent : undefined;
      }
      const features = panelResolvedFeatureRefs.filter((ref) => {
        if (!statFeatureIds.has(ref.featureId)) return false;
        if (consumedFeatureIds.has(ref.featureId)) return false;
        consumedFeatureIds.add(ref.featureId);
        return true;
      });
      if (features.length === 0) continue;
      groups.push({
        statModelId,
        label: formatModelIdForUi(statModelId),
        color: statColorByModelId.get(statModelId) ?? "hsl(195, 85%, 62%)",
        features,
      });
    }
    const remainder = panelResolvedFeatureRefs.filter(
      (ref) => !consumedFeatureIds.has(ref.featureId)
    );
    if (remainder.length > 0) {
      groups.push({
        statModelId: "__model__",
        label: "model",
        color: "hsl(220, 8%, 60%)",
        features: remainder,
      });
    }
    return groups;
  }, [
    panelModelSchema,
    panelResolvedFeatureRefs,
    runtimeModelSchemas,
    normalizeModelId,
    statColorByModelId,
  ]);
  const panelModelInstance = useMemo(() => {
    if (!selectedTreeNode?.instanceId) return null;
    return (
      modelInstances.find((row) => row.id === selectedTreeNode.instanceId) ??
      null
    );
  }, [selectedTreeNode, modelInstances]);
  const activeModelJsonSchema = useMemo(
    () =>
      panelModelSchema
        ? buildJsonSchemaForModel(
            panelModelSchema,
            runtimeModelSchemas,
            featureDefaultMap
          )
        : null,
    [panelModelSchema, runtimeModelSchemas, featureDefaultMap]
  );
  const { activeObjectDefinition, definitionCode, marshalledObjectCode } =
    useContentCreatorCodePayloads({
      panelModelSchema,
      activeModelJsonSchema,
      selectedContentObject,
      featureDefaultMap,
    });
  useContentCreatorSelectionSync({
    open,
    activeModelSchemaId,
    activeModelInstanceId,
    selectedTreeNodeId,
    modelTreeNodeById,
    onSetSelectedTreeNodeId: setSelectedTreeNodeId,
    noModelSelectedId: NO_MODEL_SELECTED,
  });
  const {
    modelLabelDraft,
    modelDescriptionDraft,
    canonicalNameDraft,
    setModelLabelDraft,
    setModelDescriptionDraft,
    setCanonicalNameDraft,
  } = useContentCreatorDrafts(panelModelSchema, panelModelInstance);
  const canonicalCreateModelId = panelModelSchema?.modelId ?? "";
  const {
    suggestDerivedModelId,
    suggestDerivedStatId,
    createSchemaViaTree,
    promptCreateCanonicalAsset,
  } = useContentCreatorActions({
    activeModelSchemaId: activeModelSchema?.modelId ?? null,
    normalizeModelId,
    formatModelIdForUi,
    toFileStem,
    onCreateModelSchema,
    onAddCanonicalAsset: addCanonicalAsset,
    onSetNewStatModelIdDraft: setNewStatModelIdDraft,
    onSetNewStatLabelDraft: setNewStatLabelDraft,
    onSetNewStatTemplateModelId: setNewStatTemplateModelId,
    onSetSelectedTreeNodeId: setSelectedTreeNodeId,
    onSetObjectSectionTab: setObjectSectionTab,
    onSetCanonicalTab: setCanonicalTab,
  });
  const { handleDetachStatFromModelWithImpact, submitPendingStatImpactAction } =
    useContentCreatorStatImpactActions({
      runtimeModelSchemas,
      modelInstances,
      statModelIds,
      pendingStatImpactAction,
      pendingStatImpactChoice,
      pendingStatImpactReplacementId,
      normalizeModelId,
      onReplaceModelSchemas,
      onReplaceCanonicalAssets,
      onOpenStatImpactDialog: openStatImpactDialog,
      onCloseStatImpactDialog: closeStatImpactDialog,
    });
  const renderStatAttachDetachSubmenus = useContentCreatorStatSubmenus({
    runtimeModelSchemas,
    statModelIds,
    statColorByModelId,
    onAttachStatModelToModel,
    onDetachStatFromModelWithImpact: handleDetachStatFromModelWithImpact,
  });
  const toggleStatModifierForStatSet = useCallback(
    (targetStatModelId: string, modifierStatModelId: string, enabled: boolean) => {
      if (!targetStatModelId || !modifierStatModelId) return;
      if (targetStatModelId === modifierStatModelId) return;
      const byId = new Map(
        runtimeModelSchemas.map((row) => [row.modelId, row] as const)
      );
      const targetStat = byId.get(targetStatModelId);
      const modifierStat = byId.get(modifierStatModelId);
      if (!targetStat || !modifierStat) return;
      if (!targetStat.modelId.endsWith("stats")) return;
      if (!modifierStat.modelId.endsWith("stats")) return;
      const nextModels = runtimeModelSchemas.map((row) => {
        if (row.modelId !== targetStatModelId) return row;
        const current = row.statModifiers ?? [];
        if (enabled) {
          if (
            current.some(
              (modifier) =>
                modifier.modifierStatModelId === modifierStatModelId
            )
          ) {
            return row;
          }
          return {
            ...row,
            statModifiers: [
              ...current,
              {
                modifierStatModelId,
                mappings: buildDefaultStatModifierMappings(
                  targetStat,
                  modifierStat
                ),
              },
            ],
          };
        }
        return {
          ...row,
          statModifiers: current.filter(
            (modifier) => modifier.modifierStatModelId !== modifierStatModelId
          ),
        };
      });
      onReplaceModelSchemas(nextModels);
    },
    [runtimeModelSchemas, onReplaceModelSchemas]
  );
  const renderStatModifierSubmenu = useCallback(
    (targetStatModelId: string, keyPrefix: string) => {
      const target = runtimeModelSchemas.find(
        (row) => row.modelId === targetStatModelId
      );
      if (!target || !target.modelId.endsWith("stats")) return null;
      const activeModifierIds = (target.statModifiers ?? [])
        .map((modifier) => normalizeModelId(modifier.modifierStatModelId))
        .filter((id) => id.endsWith("stats"));
      return (
        <TreeStatModifierSubmenu
          targetStatModelId={targetStatModelId}
          keyPrefix={keyPrefix}
          statModelIds={statModelIds}
          activeModifierIds={activeModifierIds}
          statColorByModelId={statColorByModelId}
          onToggleModifier={(modifierStatModelId, enabled) =>
            onToggleStatModifierForStatSet(
              targetStatModelId,
              modifierStatModelId,
              enabled
            )
          }
        />
      );
    },
    [
      normalizeModelId,
      onToggleStatModifierForStatSet,
      runtimeModelSchemas,
      statColorByModelId,
      statModelIds,
    ]
  );
  const {
      renderGroupContextMenuItems,
      renderStatsModelDeleteItem,
      renderModelDeleteItem,
  } = useContentCreatorMenuActions({
    runtimeModelSchemas,
    modelInstances,
    createSchemaViaTree,
    onDeleteModelSchema,
    onOpenStatImpactDialog: openStatImpactDialog,
  });
  const codeTabs = useContentCreatorCodeTabs({
    panelModelSchema,
    panelModelInstance,
    selectedContentObject,
    runtimeModelSchemas,
    featureDefaultMap,
    definitionCode,
    marshalledObjectCode,
    toFileStem,
    buildSingleSchemaFileForLanguage,
  });
  const {
    activeCodeTabId,
    activeCodeFile,
    objectEditorCode,
    copiedEditorCode,
    setActiveCodeTabId,
    resetEditorCode,
    copyEditorCode,
  } = useContentCreatorCodeEditorState(codeTabs);
  const hasCodePreview = !!activeCodeFile;
  const { canonicalAssetCount, modelDefinitionCount, linkedCanonicalCount } =
    useContentCreatorCounts({
      runtimeModelSchemas,
      modelInstances,
      panelModelId: panelModelSchema?.modelId,
    });

  const isCanonicalSelection = resolveIsCanonicalSelection(selectedTreeNode);
  useContentCreatorSelectionEffects({
    selectedTreeNode,
    onSetCanonicalTab: setCanonicalTab,
    onSetObjectSectionTab: setObjectSectionTab,
  });
  const {
    infoPanelName,
    infoPanelTone,
    infoPanelContent,
    sharedCodeBlockPanel,
  } = useContentCreatorInfoPanel({
    selectedTreeNode,
    statsProps: {
      selectedTreeNode,
      panelModelSchema,
      runtimeModelSchemas,
      runtimeFeatureSchema,
      statColorByModelId,
      featureDefaultMap,
      newStatFeatureId,
      newStatModelIdDraft,
      newStatLabelDraft,
      newStatTemplateModelId,
      onSetNewStatFeatureId: setNewStatFeatureId,
      onSetNewStatModelIdDraft: setNewStatModelIdDraft,
      onSetNewStatLabelDraft: setNewStatLabelDraft,
      onCreateModelSchema,
      onSelectTreeNodeId: setSelectedTreeNodeId,
      onAddFeatureRefToModel,
      onRemoveFeatureRefFromModel,
      onUpdateFeatureRefDefaultValue,
      onDeleteModelSchema,
      onUpdateStatModifierMapping,
      normalizeModelId,
    },
    modelsProps: {
      selectedTreeNode,
      canonicalAssetCount,
      modelDefinitionCount,
    },
    modelProps: {
      panelModelSchema,
      selectedContentObject,
      modelLabelDraft,
      modelDescriptionDraft,
      panelResolvedFeatureRefs,
      statGroups: panelStatGroups,
      featureDefaultMap,
      linkedCanonicalCount,
      migrationOpsCount: migrationOps.length,
      migrationScript,
      copiedScript,
      onSetModelLabelDraft: setModelLabelDraft,
      onSetModelDescriptionDraft: setModelDescriptionDraft,
      onUpdateModelMetadata,
      onDeleteModelSchema,
      onCopyMigrationScript: () => copyMigrationScript(migrationScript),
      onClearMigrationOps: clearMigrationOps,
    },
    canonicalProps: {
      panelModelSchema,
      panelModelInstance,
      panelResolvedFeatureRefs,
      featureDefaultMap,
      canonicalTab,
      canonicalCreateName,
      canonicalCreateModelId,
      canonicalNameDraft,
      onSetCanonicalTab: setCanonicalTab,
      onSetCanonicalCreateName: setCanonicalCreateName,
      onSetCanonicalNameDraft: setCanonicalNameDraft,
      onAddCanonicalAsset: addCanonicalAsset,
      onRenameModelInstance: renameModelInstance,
      onDeleteModelInstance: deleteModelInstance,
      onOpenCanonicalAssetInExplorer,
    },
    codePanelProps: {
      codeTabs,
      activeCodeFile,
      activeCodeTabId,
      objectEditorCode,
      copiedEditorCode,
      onSelectCodeTab: setActiveCodeTabId,
      onResetCode: resetEditorCode,
      onCopyCode: copyEditorCode,
      codeLanguageForTabId,
    },
  });
  const sidebarContentProps = useContentCreatorSidebarProps({
    activeNavigatorMode,
    treeProps: {
      nodes: activeTreeData,
      runtimeModelSchemas,
      attachedStatModelIdsByModelId,
      statColorByModelId,
      activeModelInstanceId,
      selectedTreeNodeId,
      isExpanded,
      toggleTreeNode,
      setSelectedTreeNodeId,
      setActiveSelection,
      renderGroupItems: renderGroupContextMenuItems,
      renderStatAttachDetachSubmenus,
      renderStatModifierSubmenu,
      renderStatsModelDeleteItem,
      renderModelDeleteItem,
      suggestDerivedStatId,
      suggestDerivedModelId,
      formatModelIdForUi,
      createSchemaViaTree,
      onCreateCanonicalAsset: promptCreateCanonicalAsset,
    },
    schemaEditorProps: {
      objectSectionTab,
      jsonApplyError,
      jsonSectionOpen,
      jsonSectionEditorMode,
      modelsSchemaDraft,
      statsSchemaDraft,
      canonicalSchemaDraft,
      deferredModelsSchemaJson,
      deferredStatsSchemaJson,
      deferredCanonicalSchemaJson,
      jsonSyntaxMounted,
      onSetJsonSectionOpen: setJsonSectionOpen,
      onSetJsonSectionEditorMode: setJsonSectionEditorMode,
      onSetModelsSchemaDraft: setModelsSchemaDraft,
      onSetStatsSchemaDraft: setStatsSchemaDraft,
      onSetCanonicalSchemaDraft: setCanonicalSchemaDraft,
      onApplyModelsAndStatsSchemaDraft: applyModelsAndStatsSchemaDraft,
      onApplyCanonicalSchemaDraft: applyCanonicalSchemaDraft,
    },
  });

  if (!open) return null;
  return (
    <>
      <ContentCreatorModalShell
        onClose={onClose}
        helpNode={
          <HelpInfo
            tone="context"
            title="Content Creator"
            body="Create and manage model objects and canonical assets. Select nodes in the object tree to inspect metadata, stats, and code representations."
          />
        }
        sidebar={
          <ContentCreatorSidebarPanel
            objectSectionTab={objectSectionTab}
            activeNavigatorMode={activeNavigatorMode}
            selectedLabel={selectedTreeNode ? selectedTreeNode.name : "none"}
            onSetObjectSectionTab={setObjectSectionTab}
            onSetNavigatorMode={setNavigatorMode}
          >
            <ContentCreatorSidebarContent {...sidebarContentProps} />
          </ContentCreatorSidebarPanel>
        }
        infoPanel={
          <ContentCreatorInfoPanelShell
            infoPanelTone={infoPanelTone}
            infoPanelName={infoPanelName}
            infoPanelContent={infoPanelContent}
            codePanelOpen={codePanelOpen}
            sharedCodeBlockPanel={sharedCodeBlockPanel}
            helpNode={
              <HelpInfo
                tone="context"
                title="Info Panel"
                body="Inspect selected object tree nodes, view model metadata, review stats, and browse generated code/schema/data tabs."
              />
            }
          />
        }
      />
      <StatImpactDialog
        pendingStatImpactAction={pendingStatImpactAction}
        pendingStatImpactChoice={pendingStatImpactChoice}
        pendingStatImpactReplacementId={pendingStatImpactReplacementId}
        statModelIds={statModelIds}
        onSetPendingStatImpactChoice={setPendingStatImpactChoice}
        onSetPendingStatImpactReplacementId={setPendingStatImpactReplacementId}
        onClose={closeStatImpactDialog}
        onSubmit={submitPendingStatImpactAction}
      />
    </>
  );
}

