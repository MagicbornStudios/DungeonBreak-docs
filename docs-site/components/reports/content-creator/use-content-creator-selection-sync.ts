"use client";

import { useEffect } from "react";
import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";

export function useContentCreatorSelectionSync(params: {
  open: boolean;
  activeModelSchemaId: string;
  activeModelInstanceId: string | null;
  selectedTreeNodeId: string;
  modelTreeNodeById: Map<string, ContentCreatorTreeNode>;
  onSetSelectedTreeNodeId: (next: string) => void;
  noModelSelectedId: string;
}) {
  const {
    open,
    activeModelSchemaId,
    activeModelInstanceId,
    selectedTreeNodeId,
    modelTreeNodeById,
    onSetSelectedTreeNodeId,
    noModelSelectedId,
  } = params;

  useEffect(() => {
    if (!open) return;
    if (selectedTreeNodeId && modelTreeNodeById.has(selectedTreeNodeId)) return;
    if (activeModelInstanceId) {
      onSetSelectedTreeNodeId(`instance:${activeModelInstanceId}`);
      return;
    }
    if (activeModelSchemaId && activeModelSchemaId !== noModelSelectedId) {
      onSetSelectedTreeNodeId(`model:${activeModelSchemaId}`);
      return;
    }
    onSetSelectedTreeNodeId("");
  }, [
    open,
    activeModelSchemaId,
    activeModelInstanceId,
    selectedTreeNodeId,
    modelTreeNodeById,
    onSetSelectedTreeNodeId,
    noModelSelectedId,
  ]);
}

