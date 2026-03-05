"use client";

import { useCallback, useState } from "react";
import { useContentCreatorTreeState } from "@/components/reports/content-creator/use-content-creator-tree-state";

export function useContentCreatorModalController() {
  const { selectedTreeNodeId, setSelectedTreeNodeId, toggleTreeNode, isExpanded } = useContentCreatorTreeState();

  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [canonicalTab, setCanonicalTab] = useState<"edit" | "code">("edit");
  const [objectSectionTab, setObjectSectionTab] = useState<"models" | "canonical">("models");
  const [modelsNavigatorMode, setModelsNavigatorMode] = useState<"tree" | "json">("tree");
  const [canonicalNavigatorMode, setCanonicalNavigatorMode] = useState<"tree" | "json">("tree");
  const [canonicalCreateName, setCanonicalCreateName] = useState("");
  const [newStatFeatureId, setNewStatFeatureId] = useState("");
  const [newStatModelIdDraft, setNewStatModelIdDraft] = useState("");
  const [newStatLabelDraft, setNewStatLabelDraft] = useState("");
  const [newStatTemplateModelId, setNewStatTemplateModelId] = useState<string | undefined>(undefined);

  const setNavigatorMode = useCallback(
    (nextMode: "tree" | "json") => {
      if (objectSectionTab === "models") {
        setModelsNavigatorMode(nextMode);
        return;
      }
      setCanonicalNavigatorMode(nextMode);
    },
    [objectSectionTab],
  );

  return {
    selectedTreeNodeId,
    setSelectedTreeNodeId,
    toggleTreeNode,
    isExpanded,
    codePanelOpen,
    setCodePanelOpen,
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
  };
}

