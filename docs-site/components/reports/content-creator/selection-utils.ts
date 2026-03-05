import type { ContentCreatorTreeNode } from "@/components/reports/content-creator/tree-builder";

export type InfoPanelTone = "none" | "canonical" | "stats" | "models";

export function isStatsSelection(selectedTreeNode: ContentCreatorTreeNode | null): boolean {
  return !!selectedTreeNode && (
    selectedTreeNode.id === "group:stats" ||
    selectedTreeNode.id.startsWith("stats:") ||
    (!!selectedTreeNode.modelId && selectedTreeNode.modelId.endsWith("stats") && !selectedTreeNode.canonical)
  );
}

export function isModelsSelection(selectedTreeNode: ContentCreatorTreeNode | null): boolean {
  return !!selectedTreeNode && (
    selectedTreeNode.id === "group:models" ||
    selectedTreeNode.id.startsWith("models:") ||
    selectedTreeNode.nodeType === "model-group" ||
    (!!selectedTreeNode.modelId && !selectedTreeNode.modelId.endsWith("stats") && !selectedTreeNode.canonical)
  );
}

export function isCanonicalSelection(selectedTreeNode: ContentCreatorTreeNode | null): boolean {
  return !!selectedTreeNode && (
    selectedTreeNode.id === "group:canonical" ||
    selectedTreeNode.id.startsWith("canonical-model:") ||
    selectedTreeNode.canonical === true
  );
}

export function resolveInfoPanelName(params: {
  selectedTreeNode: ContentCreatorTreeNode | null;
  isCanonicalSelection: boolean;
  isStatsSelection: boolean;
  isModelsSelection: boolean;
}): string {
  const { selectedTreeNode, isCanonicalSelection, isStatsSelection, isModelsSelection } = params;
  if (!selectedTreeNode) return "none";
  if (isCanonicalSelection) return "canonicalInfoPanelContent";
  if (isStatsSelection) return "statsInfoPanelContent";
  if (isModelsSelection && selectedTreeNode.id === "group:models") return "modelsInfoPanelContent";
  return "modelInfoPanelContent";
}

export function resolveInfoPanelTone(params: {
  selectedTreeNode: ContentCreatorTreeNode | null;
  isCanonicalSelection: boolean;
  isStatsSelection: boolean;
}): InfoPanelTone {
  const { selectedTreeNode, isCanonicalSelection, isStatsSelection } = params;
  if (!selectedTreeNode) return "none";
  if (isCanonicalSelection) return "canonical";
  if (isStatsSelection) return "stats";
  return "models";
}
