"use client";

import type { ComponentProps, ReactNode } from "react";
import { CanonicalInfoPanelContent, ModelInfoPanelContent, ModelsInfoPanelContent, StatsInfoPanelContent } from "@/components/reports/content-creator/info-panel-content";
import { ContentCreatorCodePanel } from "@/components/reports/content-creator/code-panel";
import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";
import {
  isCanonicalSelection as resolveIsCanonicalSelection,
  isModelsSelection as resolveIsModelsSelection,
  isStatsSelection as resolveIsStatsSelection,
  resolveInfoPanelName,
  resolveInfoPanelTone,
} from "@/components/reports/content-creator/selection-utils";

type StatsProps = ComponentProps<typeof StatsInfoPanelContent>;
type ModelsProps = ComponentProps<typeof ModelsInfoPanelContent>;
type ModelProps = ComponentProps<typeof ModelInfoPanelContent>;
type CanonicalProps = ComponentProps<typeof CanonicalInfoPanelContent>;
type CodePanelProps = ComponentProps<typeof ContentCreatorCodePanel>;

export function useContentCreatorInfoPanel(params: {
  selectedTreeNode: ContentCreatorTreeNode | null;
  statsProps: StatsProps;
  modelsProps: ModelsProps;
  modelProps: ModelProps;
  canonicalProps: Omit<CanonicalProps, "sharedCodeBlockPanel">;
  codePanelProps: CodePanelProps;
}) {
  const { selectedTreeNode, statsProps, modelsProps, modelProps, canonicalProps, codePanelProps } = params;

  const isStatsSelection = resolveIsStatsSelection(selectedTreeNode);
  const isModelsSelection = resolveIsModelsSelection(selectedTreeNode);
  const isCanonicalSelection = resolveIsCanonicalSelection(selectedTreeNode);

  const sharedCodeBlockPanel = <ContentCreatorCodePanel {...codePanelProps} />;
  const canonicalInfoPanelContent = (
    <CanonicalInfoPanelContent {...canonicalProps} sharedCodeBlockPanel={sharedCodeBlockPanel} />
  );

  const infoPanelName = resolveInfoPanelName({
    selectedTreeNode,
    isCanonicalSelection,
    isStatsSelection,
    isModelsSelection,
  });
  const infoPanelTone = resolveInfoPanelTone({
    selectedTreeNode,
    isCanonicalSelection,
    isStatsSelection,
  });

  const infoPanelContent: ReactNode = !selectedTreeNode ? (
    <p className="text-xs text-muted-foreground">Select a node to view details.</p>
  ) : isCanonicalSelection ? (
    canonicalInfoPanelContent
  ) : isStatsSelection ? (
    <StatsInfoPanelContent {...statsProps} />
  ) : isModelsSelection && selectedTreeNode.id === "group:models" ? (
    <ModelsInfoPanelContent {...modelsProps} />
  ) : (
    <ModelInfoPanelContent {...modelProps} />
  );

  return {
    infoPanelName,
    infoPanelTone,
    infoPanelContent,
    sharedCodeBlockPanel,
    isCanonicalSelection,
  };
}

