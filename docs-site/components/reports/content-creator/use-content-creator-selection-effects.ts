"use client";

import { useEffect } from "react";
import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";

export function useContentCreatorSelectionEffects(params: {
  selectedTreeNode: ContentCreatorTreeNode | null;
  onSetCanonicalTab: (next: "edit" | "code") => void;
  onSetObjectSectionTab: (next: "models" | "canonical") => void;
}) {
  const { selectedTreeNode, onSetCanonicalTab, onSetObjectSectionTab } = params;

  useEffect(() => {
    if (!selectedTreeNode?.id.startsWith("canonical-model:")) return;
    onSetCanonicalTab("edit");
  }, [onSetCanonicalTab, selectedTreeNode?.id]);

  useEffect(() => {
    if (!selectedTreeNode) return;
    if (
      selectedTreeNode.id === "group:canonical" ||
      selectedTreeNode.id.startsWith("canonical:") ||
      selectedTreeNode.id.startsWith("canonical-model:") ||
      selectedTreeNode.canonical
    ) {
      onSetObjectSectionTab("canonical");
      return;
    }
    onSetObjectSectionTab("models");
  }, [onSetObjectSectionTab, selectedTreeNode]);
}
